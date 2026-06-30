import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { paramId } from '../lib/params.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { awardXp } from '../services/gamification.js';
import { generateAiResponse } from '../services/ai.js';
import {
  buildLectureMaterialsFromContent,
  buildLecturePrompt,
  parseLectureJson,
} from '../services/lectureMaterials.js';

const router = Router();
router.use(authenticate);

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  context: z.string().max(12000).optional(),
});

router.post('/chat', validateBody(chatSchema), async (req: AuthRequest, res) => {
  const systemPrompt = [
    'You are SynergySphere AI Coding Assistant.',
    'Help students debug code, explain concepts, suggest improvements, generate snippets, and explain errors.',
    'Be concise, educational, and encouraging.',
  ].join('\n');

  const prompt = req.body.context
    ? 'Context:\n' + req.body.context + '\n\nQuestion: ' + req.body.message
    : req.body.message;
  const response = await generateAiResponse(systemPrompt, prompt);

  res.json({ response });
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

  const interview = await prisma.interview.create({
    data: {
      userId: req.user!.userId,
      topic: req.body.topic,
      questions,
    },
  });

  res.status(201).json(interview);
});

const answerSchema = z.object({
  interviewId: z.string(),
  answers: z.array(z.string().max(4000)).max(10),
});

router.post('/interview/evaluate', validateBody(answerSchema), async (req: AuthRequest, res) => {
  const interview = await prisma.interview.findFirst({
    where: { id: req.body.interviewId, userId: req.user!.userId },
  });
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

  const updated = await prisma.interview.update({
    where: { id: interview.id },
    data: {
      score: evaluation.score,
      feedback: evaluation.feedback,
      weakAreas: evaluation.weakAreas,
    },
  });

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

  const upload = await prisma.lectureUpload.create({
    data: {
      userId: req.user!.userId,
      fileName,
      fileType,
      content: content.slice(0, 50000),
      summary: materials.summary,
      flashcards: materials.flashcards,
      quiz: materials.quiz,
      miniProjects: materials.miniProjects,
      codingExercises: materials.codingExercises,
    },
  });

  await awardXp(req.user!.userId, 30, 'Lecture converted to study materials');
  res.status(201).json(upload);
});

router.post('/lecture-to-life/:id/regenerate', async (req: AuthRequest, res) => {
  const existing = await prisma.lectureUpload.findFirst({
    where: { id: paramId(req), userId: req.user!.userId },
  });
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

  const upload = await prisma.lectureUpload.update({
    where: { id: existing.id },
    data: {
      summary: materials.summary,
      flashcards: materials.flashcards,
      quiz: materials.quiz,
      miniProjects: materials.miniProjects,
      codingExercises: materials.codingExercises,
    },
  });

  res.json(upload);
});

router.get('/lecture-to-life', async (req: AuthRequest, res) => {
  const uploads = await prisma.lectureUpload.findMany({
    where: { userId: req.user!.userId },
    select: {
      id: true,
      fileName: true,
      fileType: true,
      summary: true,
      flashcards: true,
      quiz: true,
      miniProjects: true,
      codingExercises: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  res.json(uploads);
});

export default router;
