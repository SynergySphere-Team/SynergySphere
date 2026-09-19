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

  const systemPrompt = [
    'You are the SynergySphere AI Workspace assistant for LectureToLife Programming Academy.',
    'You help students debug code, explain concepts, suggest improvements, generate snippets, and explain errors.',
    'Be concise, educational, encouraging, and match the lesson\'s difficulty level.',
    '',
    bundle.hasContext
      ? [
          'GROUNDED CONTEXT (from LectureToLife Programming Academy / the student\'s study pack):',
          bundle.contextBlock,
          '',
          'STRICT RULES:',
          '1. Ground every substantive claim in the GROUNDED CONTEXT above. Do not switch to a different curriculum.',
          `2. When the matched lesson is relevant, name it using its full path: "${groundedLabel ?? 'the matched lesson'}".`,
          '3. Reuse that lesson\'s key concepts, syntax, examples, quiz, and exercise instead of inventing your own material.',
          '4. If the student\'s question is outside the provided context, say so explicitly first (e.g. "That is outside this lesson…"), then still answer helpfully and generally.',
          '5. Refer to the student\'s completed lessons and study packs when they are relevant to the question.',
        ].join('\n')
      : [
          'No LessonToLife context matched this question.',
          'Answer helpfully and generally, and suggest the student open a lesson in the Programming Academy or ask from inside a lesson so you can ground the answer.',
        ].join('\n'),
  ].join('\n');

  const prompt = context
    ? 'Code Context:\n' + context + '\n\nQuestion: ' + message
    : message;

  const historySummary = history.length
    ? history.slice(-3).map((t) => `${t.role === 'user' ? 'Q' : 'A'}: ${t.content.slice(0, 80)}`).join(' | ')
    : undefined;

  const response = await generateAiResponse(
    systemPrompt,
    prompt,
    history,
    () => buildGroundedFallback(message, bundle, historySummary),
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

const interviewSchema = z.object({
  topic: z.enum(['Java', 'Python', 'SQL', 'Web Development']),
});

router.post('/interview/start', validateBody(interviewSchema), async (req: AuthRequest, res) => {
  const prompt = 'Generate 5 technical interview questions for ' + req.body.topic + '. Return JSON array: [{"question":"...","difficulty":"easy|medium|hard"}]';

  const raw = await generateAiResponse('You are a technical interviewer.', prompt);
  let questions;
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    questions = match ? JSON.parse(match[0]) : [{ question: raw, difficulty: 'medium' }];
  } catch {
    questions = [{ question: 'Tell me about your experience with ' + req.body.topic, difficulty: 'easy' }];
  }

  const interview = await queryOne(
    `INSERT INTO "Interview" ("id", "userId", "topic", "questions")
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [newId(), req.user!.userId, req.body.topic, JSON.stringify(questions)],
  );

  res.status(201).json(interview);
});

const answerSchema = z.object({
  interviewId: z.string(),
  answers: z.array(z.string().max(4000)).max(10),
});

router.post('/interview/evaluate', validateBody(answerSchema), async (req: AuthRequest, res) => {
  const interview = await queryOne<{ id: string; topic: string; questions: unknown; score: number | null }>(
    `SELECT *
     FROM "Interview"
     WHERE "id" = $1 AND "userId" = $2`,
    [req.body.interviewId, req.user!.userId],
  );
  if (!interview) {
    res.status(404).json({ error: 'Interview not found' });
    return;
  }

  const prompt = [
    'Evaluate these interview answers for ' + interview.topic + '.',
    'Questions: ' + JSON.stringify(interview.questions),
    'Answers: ' + JSON.stringify(req.body.answers),
    'Return JSON: {"score":0-100,"feedback":"...","weakAreas":["..."]}',
  ].join('\n');

  const raw = await generateAiResponse('You are a technical interviewer evaluator.', prompt);
  let evaluation = { score: 70, feedback: 'Good effort!', weakAreas: ['Practice more'] };
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) evaluation = JSON.parse(match[0]);
  } catch { /* use defaults */ }

  const updated = await queryOne(
    `UPDATE "Interview"
     SET "score" = $1, "feedback" = $2, "weakAreas" = $3
     WHERE "id" = $4
     RETURNING *`,
    [evaluation.score, evaluation.feedback, JSON.stringify(evaluation.weakAreas), interview.id],
  );

  const alreadyScored = interview.score !== null;
  if (!alreadyScored) {
    await awardXp(req.user!.userId, 100, 'Completed mock interview: ' + interview.topic);
  }
  res.json(updated);
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
