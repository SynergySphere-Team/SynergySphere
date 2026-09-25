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

const router = Router();
router.use(authenticate);

const chatTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
});

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  context: z.string().max(12000).optional(),
  lessonId: z.string().min(1).max(255).optional(),
  uploadId: z.string().min(1).max(255).optional(),
  history: z.array(chatTurnSchema).max(20).optional(),
});

router.post('/chat', validateBody(chatSchema), async (req: AuthRequest, res) => {
  const { message, context, lessonId, uploadId } = req.body;
  const history: ChatTurn[] = Array.isArray(req.body.history) ? req.body.history.slice(-20) : [];

  const bundle = await buildGroundingBundle({
    userId: req.user!.userId,
    message,
    lessonId,
    uploadId,
  });

  const ref = bundle.reference;
  const groundedLabel = ref.lessonTitle
    ? `${ref.subjectName ?? ''} › ${ref.moduleName ?? ''} › ${ref.lessonTitle}`
    : ref.uploadFileName
      ? `study pack "${ref.uploadFileName}"`
      : null;

  const isExplicitLesson = Boolean(lessonId || uploadId);
  const systemPrompt = [
    'You are SynergySphere AI Workspace, an expert, supportive, and highly capable software engineering assistant and tutor.',
    'Your goal is to provide deep, practical, accurate, and educational answers: explain programming concepts clearly, debug errors with root-cause analysis, provide optimized and idiomatic code snippets, and answer technical questions thoroughly.',
    '',
    bundle.hasContext && isExplicitLesson
      ? [
          'CURRENT STUDY LESSON / STUDY PACK CONTEXT:',
          bundle.contextBlock,
          '',
          'GUIDELINES:',
          `- The student is currently studying "${groundedLabel}". Align your explanation and terminology with this curriculum level.`,
          '- Directly, specifically, and thoroughly answer the student\'s question or resolve their code issue.',
          '- Provide clear explanations, modern best practices, and fresh tailored code examples. Never dump lesson notes verbatim.',
        ].join('\n')
      : bundle.hasContext
        ? [
            'REFERENCE CURRICULUM CONTEXT (Optional background info from LectureToLife):',
            bundle.contextBlock,
            '',
            'GUIDELINES:',
            '- Directly and thoroughly answer the student\'s question using your full programming expertise and clear code examples.',
            '- Focus 100% on solving and explaining the user\'s specific question, code, or debug request.',
            '- You may naturally connect to the reference curriculum if relevant, but do not restrict yourself to it.',
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

  res.json({
    response,
    grounding: {
      source: bundle.source,
      lessonId: ref.lessonId ?? null,
      lessonTitle: ref.lessonTitle ?? null,
      subjectName: ref.subjectName ?? null,
      moduleName: ref.moduleName ?? null,
    },
  });
});

import {
  startInterviewSession,
  generateLiveCritique,
  evaluateInterviewSession,
} from '../services/interviewService.js';
import {
  ALL_INTERVIEW_TRACKS,
  QUESTION_BANK_BY_TOPIC,
} from '../data/interviewBank/index.js';

router.get('/interview/tracks', async (_req, res) => {
  res.json({
    tracks: ALL_INTERVIEW_TRACKS.map((t) => ({
      ...t,
      questionCount: t.componentTopics.reduce((sum, c) => sum + (QUESTION_BANK_BY_TOPIC[c]?.length || 0), 0),
    })),
  });
});

const startInterviewSchema = z.object({
  topic: z.string().min(1).max(100),
  count: z.number().int().min(5).max(30).optional().default(10),
  mode: z.enum(['mixed', 'conceptual', 'coding']).optional().default('mixed'),
});

router.post('/interview/start', validateBody(startInterviewSchema), async (req: AuthRequest, res) => {
  try {
    const session = await startInterviewSession({
      userId: req.user!.userId,
      topic: req.body.topic,
      count: req.body.count,
      mode: req.body.mode,
    });
    res.status(201).json(session);
  } catch (error) {
    console.error('Error starting interview session:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to start interview session' });
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
});

router.post('/interview/evaluate', validateBody(evaluateSchema), async (req: AuthRequest, res) => {
  try {
    const evaluation = await evaluateInterviewSession({
      interviewId: req.body.interviewId,
      userId: req.user!.userId,
      answers: req.body.answers,
      scratchCodes: req.body.scratchCodes,
    });
    res.json(evaluation);
  } catch (error) {
    console.error('Error evaluating interview session:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to evaluate interview' });
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
