import { Router } from 'express';
import { z } from 'zod';
import { newId, query, queryOne } from '../lib/db.js';
import { paramId } from '../lib/params.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { awardXp } from '../services/gamification.js';
import { generateAiResponse, type ChatTurn } from '../services/ai.js';
import {
  buildGroundingBundle,
  buildGroundedFallback,
} from '../services/aiContext.js';
import { extractTextFromUpload } from '../services/fileText.js';
import {
  buildLectureMaterialsFromContent,
  buildLecturePrompt,
  parseLectureJson,
} from '../services/lectureMaterials.js';

import rateLimit from 'express-rate-limit';

const router = Router();
router.use(authenticate);

// Junior-safe AI Rate Limiter: throttles abusive bursts while allowing smooth learning flow
const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  message: { error: 'You have sent several AI requests recently. Take a moment to experiment with the code before asking again!' },
});
router.use(aiLimiter);

// ── Persistent Chat Thread History ──
router.get('/chat/history', async (req: AuthRequest, res) => {
  try {
    const messages = await query<{
      id: string;
      role: 'user' | 'assistant';
      content: string;
      createdAt: Date;
    }>(
      `SELECT "id", "role", "content", "createdAt"
       FROM "AiChatMessage"
       WHERE "userId" = $1
       ORDER BY "createdAt" ASC
       LIMIT 50`,
      [req.user!.userId],
    );
    res.json(messages);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

router.delete('/chat/history', async (req: AuthRequest, res) => {
  try {
    await query(`DELETE FROM "AiChatMessage" WHERE "userId" = $1`, [req.user!.userId]);
    res.json({ message: 'Chat history cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

const chatTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
});

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  context: z.string().max(12000).optional(),
  lessonId: z.string().min(1).max(255).optional(),
  challengeId: z.string().min(1).max(255).optional(),
  uploadId: z.string().min(1).max(255).optional(),
  history: z.array(chatTurnSchema).max(20).optional(),
});

router.post('/chat', validateBody(chatSchema), async (req: AuthRequest, res) => {
  const { message, context, lessonId, challengeId, uploadId } = req.body;
  const history: ChatTurn[] = Array.isArray(req.body.history) ? req.body.history.slice(-20) : [];

  const bundle = await buildGroundingBundle({
    userId: req.user!.userId,
    message,
    lessonId,
    challengeId,
    uploadId,
  });

  const ref = bundle.reference;
  const groundedLabel = ref.lessonTitle
    ? `${ref.subjectName ?? ''} › ${ref.moduleName ?? ''} › ${ref.lessonTitle}`
    : ref.challengeTitle
      ? `Learning Hub Coding Challenge: "${ref.challengeTitle}" (${ref.subjectName ?? ''})`
      : ref.uploadFileName
        ? `study pack "${ref.uploadFileName}"`
        : null;

  const isExplicitItem = Boolean(lessonId || challengeId || uploadId);
  const systemPrompt = [
    'You are SynergySphere AI Workspace, an expert, supportive, and highly capable software engineering assistant and tutor grounded in the LectureToLife Learning Hub (Programming Academy & Coding Challenges).',
    'Your goal is to provide deep, practical, accurate, and educational answers: explain programming concepts clearly, debug errors with root-cause analysis, provide optimized and idiomatic code snippets, and answer technical questions thoroughly.',
    '',
    bundle.hasContext && isExplicitItem
      ? [
          'CURRENT STUDY LESSON / CHALLENGE / PACK CONTEXT:',
          bundle.contextBlock,
          '',
          'GUIDELINES:',
          `- The student is currently studying or working on "${groundedLabel}". Align your explanation and terminology with this context.`,
          '- Directly, specifically, and thoroughly answer the student\'s question or resolve their code issue.',
          '- If working on a coding challenge, guide the student with algorithmic intuition, edge cases, and hints without dumping the complete solution immediately unless they explicitly request it.',
          '- Provide clear explanations, modern best practices, and fresh tailored code examples.',
        ].join('\n')
      : bundle.hasContext
        ? [
            'REFERENCE LEARNING HUB CONTEXT (Curriculum / Challenges from SynergySphere):',
            bundle.contextBlock,
            '',
            'GUIDELINES:',
            '- Directly and thoroughly answer the student\'s question using your full programming expertise and clear code examples.',
            '- Focus 100% on solving and explaining the user\'s specific question, code, or debug request.',
            '- You may naturally connect to the reference Learning Hub material if relevant, citing lessons or challenges.',
          ].join('\n')
        : [
            'GUIDELINES:',
            '- Provide clear, idiomatic, accurate programming solutions with explanations and code examples.',
            '- Format code snippets with proper markdown language tags.',
          ].join('\n'),
  ].join('\n');

  const askingAboutCode =
    /```/.test(message) ||
    /\b(this code|the code|my code|the snippet|code context|walk through|debug|optimi[sz]e|generate tests|unit test)\b/i.test(
      message,
    );
  const prompt =
    context && askingAboutCode
      ? 'Student code (explain this snippet):\n' + context + '\n\nQuestion: ' + message
      : context
        ? message + '\n\n(The student also has this editor buffer; only use it if the question is about the code.)\n```\n' + context + '\n```'
        : message;

  const historySummary = history.length
    ? history.slice(-3).map((t) => `${t.role === 'user' ? 'Q' : 'A'}: ${t.content.slice(0, 80)}`).join(' | ')
    : undefined;

  const response = await generateAiResponse(
    systemPrompt,
    prompt,
    history,
    () => buildGroundedFallback(message, bundle, historySummary, context),
  );

  // Persist chat turns in DB in background
  query(
    `INSERT INTO "AiChatMessage" ("id", "userId", "role", "content", "metadata")
     VALUES ($1, $2, 'user', $3, $4), ($5, $2, 'assistant', $6, $7)`,
    [
      newId(),
      req.user!.userId,
      message,
      JSON.stringify({ lessonId, challengeId, uploadId }),
      newId(),
      response,
      JSON.stringify({ grounding: bundle.source }),
    ],
  ).catch((err) => console.error('Error saving chat message:', err));

  res.json({
    response,
    grounding: {
      source: bundle.source,
      lessonId: ref.lessonId ?? null,
      lessonTitle: ref.lessonTitle ?? null,
      subjectName: ref.subjectName ?? null,
      moduleName: ref.moduleName ?? null,
      challengeId: ref.challengeId ?? null,
      challengeTitle: ref.challengeTitle ?? null,
    },
  });
});

// ── Multi-File Ticket PR Code Review (Take-Home / Practice Gym) ──
const ticketReviewSchema = z.object({
  ticketTitle: z.string().min(1),
  ticketDescription: z.string().min(1),
  rubric: z.array(z.string()).min(1),
  files: z.array(
    z.object({
      path: z.string(),
      content: z.string(),
    }),
  ).min(1),
});

router.post('/code-review/ticket', validateBody(ticketReviewSchema), async (req: AuthRequest, res) => {
  try {
    const { ticketTitle, ticketDescription, rubric, files } = req.body;

    const fileSummary = files.map((f: { path: string; content: string }) => `File: ${f.path}\n\`\`\`\n${f.content.slice(0, 3000)}\n\`\`\``).join('\n\n');
    const rubricSummary = rubric.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n');

    const prompt = `You are a Staff Software Engineer reviewing a Junior Developer's PR for the ticket: "${ticketTitle}".
Ticket Objective: ${ticketDescription}

Rubric Criteria:
${rubricSummary}

Submitted Files:
${fileSummary}

Provide a realistic, professional, GitHub-style Pull Request review. Return ONLY valid JSON in this exact structure:
{
  "approved": boolean,
  "score": number, // 0 to 100
  "summary": "2-3 sentences summarizing whether the criteria were met and overall engineering craft.",
  "lineComments": [
    {
      "file": "path/to/file",
      "line": 1,
      "severity": "issue" | "suggestion" | "nit",
      "comment": "Specific feedback explaining what to change and why."
    }
  ]
}`;

    let isOfflineFallback = false;
    const rawResponse = await generateAiResponse(
      'You are a precise, supportive staff engineer conducting a thorough GitHub PR code review. Output only valid JSON.',
      prompt,
      [],
      () => {
        isOfflineFallback = true;
        return JSON.stringify({
          approved: false,
          score: 65,
          offlineDraft: true,
          summary: `Offline static preview for "${ticketTitle}": Core files received. Live Staff Engineer evaluation and XP rewards require an active AI API key (add GEMINI_API_KEY to backend/.env).`,
          lineComments: [
            {
              file: files[0].path,
              line: 1,
              severity: 'suggestion',
              comment: 'Offline preview: Structure verified. Connect an AI provider to receive detailed line-by-line feedback.',
            },
          ],
        });
      },
    );

    // Parse JSON
    let parsedReview: any;
    try {
      const match = rawResponse.match(/\{[\s\S]*\}/);
      parsedReview = match ? JSON.parse(match[0]) : null;
    } catch {
      parsedReview = null;
    }

    if (!parsedReview) {
      parsedReview = {
        approved: false,
        score: 60,
        offlineDraft: true,
        summary: `PR for "${ticketTitle}" could not be fully parsed. Reviewed against ticket criteria.`,
        lineComments: [
          {
            file: files[0].path,
            line: 1,
            severity: 'suggestion',
            comment: 'Clean code. Ensure edge conditions and error handling are verified with automated tests.',
          },
        ],
      };
    }

    // Award XP only for live evaluated reviews with passing score >= 70
    if (!isOfflineFallback && !parsedReview.offlineDraft && parsedReview.score >= 70) {
      await awardXp(req.user!.userId, 60, `Completed Take-Home PR: ${ticketTitle}`);
    }

    res.json(parsedReview);
  } catch (error) {
    console.error('Error generating ticket PR review:', error);
    res.status(500).json({ error: 'Failed to generate code review' });
  }
});

import {
  startInterviewSession,
  generateLiveCritique,
  evaluateInterviewSession,
  getQuestionHint,
  getFollowUpQuestion,
  getInterviewHomeStats,
  getInterviewHistory,
  getInterviewHistoryDetail,
  startPracticeSession,
  completePracticeSession,
  getUserTopicProgress,
} from '../services/interviewService.js';
import {
  ALL_INTERVIEW_TRACKS,
  ALL_INTERVIEW_ROLES,
  ALL_INTERVIEW_TYPES,
  ALL_DIFFICULTIES,
  ALL_INTERVIEWER_STYLES,
  QUESTION_BANK_BY_TOPIC,
} from '../data/interviewBank/index.js';

router.get('/interview/tracks', async (_req, res) => {
  res.json({
    tracks: ALL_INTERVIEW_TRACKS.map((t) => ({
      ...t,
      questionCount: t.componentTopics.reduce((sum, c) => sum + (QUESTION_BANK_BY_TOPIC[c]?.length || 0), 0),
    })),
    roles: ALL_INTERVIEW_ROLES,
    interviewTypes: ALL_INTERVIEW_TYPES,
    difficulties: ALL_DIFFICULTIES,
    interviewerStyles: ALL_INTERVIEWER_STYLES,
  });
});

router.get('/interview/home-stats', async (req: AuthRequest, res) => {
  try {
    const stats = await getInterviewHomeStats(req.user!.userId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching interview home stats:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to fetch stats' });
  }
});

const startInterviewSchema = z.object({
  topic: z.string().max(100).optional(),
  role: z.string().max(100).optional(),
  interviewType: z.string().max(100).optional(),
  difficulty: z.string().max(50).optional(),
  duration: z.number().int().min(10).max(60).optional(),
  interviewerStyle: z.string().max(50).optional(),
  programmingLanguage: z.string().max(50).optional(),
  count: z.number().int().min(3).max(30).optional(),
  mode: z.enum(['mixed', 'conceptual', 'coding']).optional(),
});

router.post('/interview/start', validateBody(startInterviewSchema), async (req: AuthRequest, res) => {
  try {
    const session = await startInterviewSession({
      userId: req.user!.userId,
      topic: req.body.topic,
      role: req.body.role,
      interviewType: req.body.interviewType,
      difficulty: req.body.difficulty,
      duration: req.body.duration,
      interviewerStyle: req.body.interviewerStyle,
      programmingLanguage: req.body.programmingLanguage,
      count: req.body.count,
      mode: req.body.mode,
    });
    res.status(201).json(session);
  } catch (error) {
    console.error('Error starting interview session:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to start interview session' });
  }
});

const hintSchema = z.object({
  interviewId: z.string().min(1),
  questionIndex: z.number().int().min(0).max(30),
  hintLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
});

router.post('/interview/hint', validateBody(hintSchema), async (req: AuthRequest, res) => {
  try {
    const result = await getQuestionHint({
      interviewId: req.body.interviewId,
      questionIndex: req.body.questionIndex,
      hintLevel: req.body.hintLevel,
    });
    res.json(result);
  } catch (error) {
    console.error('Error retrieving hint:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to retrieve hint' });
  }
});

const followUpSchema = z.object({
  interviewId: z.string().min(1),
  questionIndex: z.number().int().min(0).max(30),
  answer: z.string().max(8000).optional().default(''),
});

router.post('/interview/follow-up', validateBody(followUpSchema), async (req: AuthRequest, res) => {
  try {
    const result = await getFollowUpQuestion({
      interviewId: req.body.interviewId,
      questionIndex: req.body.questionIndex,
      answer: req.body.answer || '',
    });
    res.json(result);
  } catch (error) {
    console.error('Error retrieving follow up:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to retrieve follow up' });
  }
});

const critiqueSchema = z.object({
  interviewId: z.string().min(1),
  questionIndex: z.number().int().min(0).max(30),
  answer: z.string().max(8000).optional().default(''),
  scratchCode: z.string().max(16000).optional().default(''),
});

router.post('/interview/critique', validateBody(critiqueSchema), async (req: AuthRequest, res) => {
  try {
    const critique = await generateLiveCritique({
      interviewId: req.body.interviewId,
      questionIndex: req.body.questionIndex,
      answer: req.body.answer || '',
      scratchCode: req.body.scratchCode,
    });
    res.json(critique);
  } catch (error) {
    console.error('Error generating critique:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to critique answer' });
  }
});

const evaluateSchema = z.object({
  interviewId: z.string().min(1),
  answers: z.array(z.string().max(8000)).max(30),
  scratchCodes: z.array(z.string().max(16000)).max(30).optional(),
  hintsUsedCount: z.number().int().min(0).optional(),
  durationMinutes: z.number().int().min(1).max(120).optional(),
});

router.post('/interview/evaluate', validateBody(evaluateSchema), async (req: AuthRequest, res) => {
  try {
    const evaluation = await evaluateInterviewSession({
      interviewId: req.body.interviewId,
      userId: req.user!.userId,
      answers: req.body.answers,
      scratchCodes: req.body.scratchCodes,
      hintsUsedCount: req.body.hintsUsedCount,
      durationMinutes: req.body.durationMinutes,
    });
    res.json(evaluation);
  } catch (error) {
    console.error('Error evaluating interview session:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to evaluate interview' });
  }
});

router.get('/interview/history', async (req: AuthRequest, res) => {
  try {
    const history = await getInterviewHistory(req.user!.userId);
    res.json({ history });
  } catch (error) {
    console.error('Error fetching interview history:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to fetch history' });
  }
});

router.get('/interview/history/:id', async (req: AuthRequest, res) => {
  try {
    const detail = await getInterviewHistoryDetail(String(req.params.id), req.user!.userId);
    res.json(detail);
  } catch (error) {
    console.error('Error fetching interview detail:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to fetch interview details' });
  }
});

const startPracticeSchema = z.object({
  topic: z.string().min(1).max(100),
  difficulty: z.string().max(50).optional(),
});

router.post('/interview/practice/start', validateBody(startPracticeSchema), async (req: AuthRequest, res) => {
  try {
    const session = await startPracticeSession({
      userId: req.user!.userId,
      topic: req.body.topic,
      difficulty: req.body.difficulty,
    });
    res.json(session);
  } catch (error) {
    console.error('Error starting practice session:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to start practice' });
  }
});

const completePracticeSchema = z.object({
  sessionId: z.string().min(1),
  topic: z.string().min(1).max(100),
  answers: z.array(
    z.object({
      questionId: z.string(),
      answer: z.string(),
      hintsUsed: z.number().int().optional(),
    }),
  ),
});

router.post('/interview/practice/complete', validateBody(completePracticeSchema), async (req: AuthRequest, res) => {
  try {
    const result = await completePracticeSession({
      userId: req.user!.userId,
      sessionId: req.body.sessionId,
      topic: req.body.topic,
      answers: req.body.answers,
    });
    res.json(result);
  } catch (error) {
    console.error('Error completing practice session:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to complete practice' });
  }
});

router.get('/interview/practice/topic-progress', async (req: AuthRequest, res) => {
  try {
    const progress = await getUserTopicProgress(req.user!.userId);
    res.json({ progress });
  } catch (error) {
    console.error('Error fetching topic progress:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to fetch progress' });
  }
});

const lectureSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1).max(100),
  content: z.string().min(20).max(50000),
});

const lectureExtractSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.string().max(150).default(''),
  base64: z.string().min(1).max(12_000_000),
});

router.post('/extract-lecture-text', validateBody(lectureExtractSchema), async (req, res) => {
  try {
    const text = await extractTextFromUpload(req.body);
    if (text.trim().length < 20) {
      res.status(422).json({ error: 'This file did not contain enough readable text. Paste the lecture text manually.' });
      return;
    }
    res.json({ text });
  } catch (error) {
    res.status(422).json({ error: (error as Error).message || 'Could not read this file.' });
  }
});

router.post('/lecture-to-life', validateBody(lectureSchema), async (req: AuthRequest, res) => {
  const { fileName, fileType, content } = req.body;
  const prompt = buildLecturePrompt(content, fileName);

  const raw = await generateAiResponse(
    'You are an educational content transformer. Return only valid JSON based on the lecture content provided.',
    prompt,
  );

  let materials = parseLectureJson(raw);
  if (!materials) {
    materials = buildLectureMaterialsFromContent(content, fileName);
  }

  const upload = await queryOne(
    `INSERT INTO "LectureUpload" (
       "id",
       "userId",
       "fileName",
       "fileType",
       "content",
       "summary",
       "flashcards",
       "quiz",
       "miniProjects",
       "codingExercises"
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      newId(),
      req.user!.userId,
      fileName,
      fileType,
      content.slice(0, 50000),
      materials.summary,
      JSON.stringify(materials.flashcards),
      JSON.stringify(materials.quiz),
      JSON.stringify(materials.miniProjects),
      JSON.stringify(materials.codingExercises),
    ],
  );

  await awardXp(req.user!.userId, 30, 'Lecture converted to study materials');
  res.status(201).json(upload);
});

router.post('/lecture-to-life/:id/regenerate', async (req: AuthRequest, res) => {
  const existing = await queryOne<{ id: string; content: string | null; fileName: string }>(
    `SELECT "id", "content", "fileName"
     FROM "LectureUpload"
     WHERE "id" = $1 AND "userId" = $2`,
    [paramId(req), req.user!.userId],
  );
  if (!existing?.content) {
    res.status(404).json({ error: 'Lecture not found or has no saved content to regenerate from' });
    return;
  }

  const prompt = buildLecturePrompt(existing.content, existing.fileName);
  const raw = await generateAiResponse(
    'You are an educational content transformer. Return only valid JSON based on the lecture content provided.',
    prompt,
  );

  let materials = parseLectureJson(raw);
  if (!materials) {
    materials = buildLectureMaterialsFromContent(existing.content, existing.fileName);
  }

  const upload = await queryOne(
    `UPDATE "LectureUpload"
     SET "summary" = $1,
         "flashcards" = $2,
         "quiz" = $3,
         "miniProjects" = $4,
         "codingExercises" = $5
     WHERE "id" = $6
     RETURNING *`,
    [
      materials.summary,
      JSON.stringify(materials.flashcards),
      JSON.stringify(materials.quiz),
      JSON.stringify(materials.miniProjects),
      JSON.stringify(materials.codingExercises),
      existing.id,
    ],
  );

  res.json(upload);
});

router.get('/lecture-to-life', async (req: AuthRequest, res) => {
  const uploads = await query(
    `SELECT
       "id",
       "fileName",
       "fileType",
       "summary",
       "flashcards",
       "quiz",
       "miniProjects",
       "codingExercises",
       "createdAt"
     FROM "LectureUpload"
     WHERE "userId" = $1
     ORDER BY "createdAt" DESC
     LIMIT 20`,
    [req.user!.userId],
  );
  res.json(uploads);
});

export default router;
