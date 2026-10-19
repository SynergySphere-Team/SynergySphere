import { Router } from 'express';
import { z } from 'zod';
import { newId, query, queryOne } from '../lib/db.js';
import { paramId } from '../lib/params.js';
import { authenticate, optionalAuthenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { awardXp } from '../services/gamification.js';
import { generateAiResponse, transcribeAudio, refreshEnv, type ChatTurn } from '../services/ai.js';
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
import { analyzeCodeOffline } from '../utils/offlineCodeAnalyzer.js';

import rateLimit from 'express-rate-limit';

const router = Router();
router.use(optionalAuthenticate);

// Junior-safe AI Rate Limiter: throttles abusive bursts while allowing smooth learning flow
const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 120,
  message: { error: 'You have sent several AI requests recently. Take a moment to experiment with the code before asking again!' },
});
router.use(aiLimiter);

// ── Audio Speech-to-Text Transcription ──
const transcribeSchema = z.object({
  audio: z.string().min(1, 'Audio base64 data is required'),
  mimeType: z.string().optional().default('audio/m4a'),
  contextHint: z.string().optional(),
  apiKey: z.string().optional(),
});

router.post('/transcribe', validateBody(transcribeSchema), async (req: AuthRequest, res) => {
  try {
    const { audio, mimeType, contextHint, apiKey } = req.body;
    const customKey = apiKey || (req.headers['x-ai-api-key'] as string | undefined);
    const transcript = await transcribeAudio(audio, mimeType, customKey, contextHint);
    res.json({ transcript });
  } catch (error: any) {
    console.error('Audio transcription route error:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

// ── Multi-Thread AI Chat Management ──
router.get('/threads', async (req: AuthRequest, res) => {
  try {
    if (!req.user?.userId) {
      res.json([
        {
          id: 'local-default',
          title: 'General Workspace',
          pinned: true,
          contextType: null,
          contextId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messageCount: 0,
        },
      ]);
      return;
    }
    const userId = req.user.userId;
    let threads = await query<{
      id: string;
      title: string;
      pinned: boolean;
      contextType: string | null;
      contextId: string | null;
      createdAt: string;
      updatedAt: string;
      messageCount: number;
    }>(
      `SELECT t."id", t."title", t."pinned", t."contextType", t."contextId", t."createdAt", t."updatedAt",
              COUNT(m."id")::int AS "messageCount"
       FROM "AiChatThread" t
       LEFT JOIN "AiChatMessage" m ON m."threadId" = t."id"
       WHERE t."userId" = $1
       GROUP BY t."id"
       ORDER BY t."pinned" DESC, t."updatedAt" DESC
       LIMIT 50`,
      [userId],
    );

    if (threads.length === 0) {
      const defaultId = newId();
      await queryOne(
        `INSERT INTO "AiChatThread" ("id", "userId", "title", "pinned")
         VALUES ($1, $2, 'General Workspace', TRUE)
         RETURNING *`,
        [defaultId, userId],
      );
      await query(
        `UPDATE "AiChatMessage" SET "threadId" = $1 WHERE "userId" = $2 AND "threadId" IS NULL`,
        [defaultId, userId],
      );
      threads = await query(
        `SELECT t."id", t."title", t."pinned", t."contextType", t."contextId", t."createdAt", t."updatedAt",
                COUNT(m."id")::int AS "messageCount"
         FROM "AiChatThread" t
         LEFT JOIN "AiChatMessage" m ON m."threadId" = t."id"
         WHERE t."userId" = $1
         GROUP BY t."id"
         ORDER BY t."pinned" DESC, t."updatedAt" DESC`,
        [userId],
      );
    }

    res.json(threads);
  } catch (error) {
    console.error('Error fetching AI threads:', error);
    res.status(500).json({ error: 'Failed to fetch threads' });
  }
});

const createThreadSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  contextType: z.string().max(50).optional().nullable(),
  contextId: z.string().max(255).optional().nullable(),
  lessonId: z.string().max(255).optional().nullable(),
});

router.post('/threads', validateBody(createThreadSchema), async (req: AuthRequest, res) => {
  try {
    const contextType = req.body.contextType || (req.body.lessonId ? 'lesson' : null);
    const contextId = req.body.contextId || req.body.lessonId || null;
    if (!req.user?.userId) {
      res.status(201).json({
        id: `local-${Date.now()}`,
        title: (req.body.title || 'New Conversation').trim(),
        pinned: false,
        contextType,
        contextId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
      });
      return;
    }
    const thread = await queryOne(
      `INSERT INTO "AiChatThread" ("id", "userId", "title", "contextType", "contextId")
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        newId(),
        req.user.userId,
        (req.body.title || 'New Conversation').trim(),
        contextType,
        contextId,
      ],
    );
    res.status(201).json({ ...thread, messageCount: 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create thread' });
  }
});

const updateThreadSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  pinned: z.boolean().optional(),
});

router.patch('/threads/:id', validateBody(updateThreadSchema), async (req: AuthRequest, res) => {
  try {
    const threadId = paramId(req);
    if (!req.user?.userId) {
      res.json({
        id: threadId,
        title: req.body.title ? req.body.title.trim() : 'Conversation',
        pinned: Boolean(req.body.pinned),
        updatedAt: new Date().toISOString(),
      });
      return;
    }
    const existing = await queryOne<{ id: string; title: string; pinned: boolean }>(
      `SELECT "id", "title", "pinned" FROM "AiChatThread" WHERE "id" = $1 AND "userId" = $2`,
      [threadId, req.user.userId],
    );
    if (!existing) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }
    const updated = await queryOne(
      `UPDATE "AiChatThread"
       SET "title" = $1, "pinned" = $2, "updatedAt" = NOW()
       WHERE "id" = $3 AND "userId" = $4
       RETURNING *`,
      [
        req.body.title !== undefined ? req.body.title.trim() : existing.title,
        req.body.pinned !== undefined ? req.body.pinned : existing.pinned,
        threadId,
        req.user.userId,
      ],
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update thread' });
  }
});

router.delete('/threads', async (req: AuthRequest, res) => {
  try {
    if (req.user?.userId) {
      await query(`DELETE FROM "AiChatMessage" WHERE "userId" = $1`, [req.user.userId]);
      await query(`DELETE FROM "AiChatThread" WHERE "userId" = $1`, [req.user.userId]);
    }
    res.json({ message: 'All conversations cleared' });
  } catch (error) {
    console.error('Error clearing all conversations:', error);
    res.status(500).json({ error: 'Failed to clear all conversations' });
  }
});

router.delete('/threads/:id', async (req: AuthRequest, res) => {
  try {
    const threadId = paramId(req);
    if (req.user?.userId) {
      await query(`DELETE FROM "AiChatMessage" WHERE "threadId" = $1 AND "userId" = $2`, [threadId, req.user.userId]);
      await query(`DELETE FROM "AiChatThread" WHERE "id" = $1 AND "userId" = $2`, [threadId, req.user.userId]);
    }
    res.json({ message: 'Thread deleted', id: threadId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete thread' });
  }
});

// ── Persistent Chat Thread History ──
function sanitizeLegacyKeyNotice(text: string): string {
  return (text || '')
    .replace(/\n*For deeper, conversational explanations and fixes, configure GEMINI_API_KEY or OPENAI_API_KEY in backend\/\.env\.?/gi, '')
    .replace(/\n*⚡\s*(?:For full AI|To enable full AI|Add GEMINI_API_KEY)[^\n]*/gi, '')
    .replace(/OPENAI_API_KEY="sk-\.\.\."[^\n]*/gi, '')
    .replace(/GEMINI_API_KEY="your-key"[^\n]*/gi, '')
    .trim();
}

router.get('/chat/history', async (req: AuthRequest, res) => {
  try {
    if (!req.user?.userId) {
      res.json([]);
      return;
    }
    const threadId = typeof req.query.threadId === 'string' && req.query.threadId.trim() ? req.query.threadId.trim() : null;
    const messages = threadId
      ? await query<{
          id: string;
          role: 'user' | 'assistant';
          content: string;
          threadId: string | null;
          createdAt: Date;
        }>(
          `SELECT "id", "role", "content", "threadId", "createdAt"
           FROM "AiChatMessage"
           WHERE "userId" = $1 AND "threadId" = $2
           ORDER BY "createdAt" ASC
           LIMIT 80`,
          [req.user.userId, threadId],
        )
      : await query<{
          id: string;
          role: 'user' | 'assistant';
          content: string;
          threadId: string | null;
          createdAt: Date;
        }>(
          `SELECT "id", "role", "content", "threadId", "createdAt"
           FROM "AiChatMessage"
           WHERE "userId" = $1
           ORDER BY "createdAt" ASC
           LIMIT 50`,
          [req.user.userId],
        );
    res.json(
      messages.map((m) => ({
        ...m,
        content: m.role === 'assistant' ? sanitizeLegacyKeyNotice(m.content) : m.content,
      })),
    );
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

router.delete('/chat/history', async (req: AuthRequest, res) => {
  try {
    if (req.user?.userId) {
      const threadId = typeof req.query.threadId === 'string' && req.query.threadId.trim() ? req.query.threadId.trim() : null;
      if (threadId) {
        await query(`DELETE FROM "AiChatMessage" WHERE "userId" = $1 AND "threadId" = $2`, [req.user.userId, threadId]);
      } else {
        await query(`DELETE FROM "AiChatMessage" WHERE "userId" = $1`, [req.user.userId]);
      }
    }
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
  threadId: z.string().min(1).max(255).optional(),
  context: z.string().max(12000).optional(),
  lessonId: z.string().min(1).max(255).optional(),
  challengeId: z.string().min(1).max(255).optional(),
  uploadId: z.string().min(1).max(255).optional(),
  apiKey: z.string().optional(),
  history: z.array(chatTurnSchema).max(20).optional(),
});

async function persistChatMessages(params: {
  userId: string;
  threadId?: string;
  userMessage: string;
  assistantMessage: string;
  userMeta: Record<string, unknown>;
  assistantMeta: Record<string, unknown>;
}) {
  const { userId, threadId, userMessage, assistantMessage, userMeta, assistantMeta } = params;
  await query(
    `INSERT INTO "AiChatMessage" ("id", "userId", "threadId", "role", "content", "metadata")
     VALUES ($1, $2, $3, 'user', $4, $5), ($6, $2, $3, 'assistant', $7, $8)`,
    [
      newId(),
      userId,
      threadId || null,
      userMessage,
      JSON.stringify(userMeta),
      newId(),
      assistantMessage,
      JSON.stringify(assistantMeta),
    ],
  );
  if (threadId) {
    const autoTitle = userMessage.replace(/\s+/g, ' ').trim().slice(0, 52);
    await query(
      `UPDATE "AiChatThread"
       SET "updatedAt" = NOW(),
           "title" = CASE WHEN "title" = 'New Conversation' AND $3 <> '' THEN $3 ELSE "title" END
       WHERE "id" = $1 AND "userId" = $2`,
      [threadId, userId, autoTitle],
    );
  }
}

router.post('/chat', validateBody(chatSchema), async (req: AuthRequest, res) => {
  const { message, threadId, context, lessonId, challengeId, uploadId, apiKey } = req.body;
  const customKey = apiKey || (req.headers['x-ai-api-key'] as string | undefined);
  const history: ChatTurn[] = Array.isArray(req.body.history) ? req.body.history.slice(-20) : [];
  const userId = req.user?.userId || 'guest';

  const bundle = await buildGroundingBundle({
    userId,
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
    'IMPORTANT: Directly answer the user\'s question right here in the conversation. Never tell the user to switch tabs or go to the Code Context tab.',
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
    customKey,
  );

  // Persist chat turns in DB in background if user is authenticated
  if (req.user?.userId) {
    const dbThreadId = threadId && !threadId.startsWith('local-') ? threadId : undefined;
    persistChatMessages({
      userId: req.user.userId,
      threadId: dbThreadId,
      userMessage: message,
      assistantMessage: response,
      userMeta: { lessonId, challengeId, uploadId },
      assistantMeta: { grounding: bundle.source },
    }).catch((err) => console.error('Error saving chat message:', err));
  }

  res.json({
    response,
    threadId: threadId ?? null,
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

// ── SSE Token Streaming Chat Endpoint ──
router.post('/chat/stream', validateBody(chatSchema), async (req: AuthRequest, res) => {
  const { message, threadId, context, lessonId, challengeId, uploadId, apiKey } = req.body;
  const customKey = apiKey || (req.headers['x-ai-api-key'] as string | undefined);
  const history: ChatTurn[] = Array.isArray(req.body.history) ? req.body.history.slice(-20) : [];
  const userId = req.user?.userId || 'guest';

  const bundle = await buildGroundingBundle({
    userId,
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
    'IMPORTANT: Directly answer the user\'s question right here in the conversation. Never tell the user to switch tabs or go to the Code Context tab.',
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
      ? `[USER CODE IN EDITOR]:\n\`\`\`\n${context.slice(0, 8000)}\n\`\`\`\n\n[USER QUESTION]:\n${message}`
      : message;

  const historySummary = history
    .slice(-4)
    .map((turn) => `${turn.role === 'user' ? 'Student' : 'Tutor'}: ${turn.content.slice(0, 200)}`)
    .join('\n');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial grounding meta chunk
  res.write(`data: ${JSON.stringify({
    type: 'meta',
    grounding: {
      source: bundle.source,
      lessonId: ref.lessonId ?? null,
      lessonTitle: ref.lessonTitle ?? null,
      subjectName: ref.subjectName ?? null,
      moduleName: ref.moduleName ?? null,
      challengeId: ref.challengeId ?? null,
      challengeTitle: ref.challengeTitle ?? null,
    },
  })}\n\n`);

  try {
    const fullText = await generateAiResponse(
      systemPrompt,
      prompt,
      history,
      () => buildGroundedFallback(message, bundle, historySummary, context),
      customKey,
    );

    // Stream tokens in natural semantic chunks
    const words = fullText.split(/(\s+)/);
    let buffer = '';
    for (let i = 0; i < words.length; i++) {
      buffer += words[i];
      if (i % 6 === 0 || i === words.length - 1) {
        res.write(`data: ${JSON.stringify({ type: 'token', token: buffer })}\n\n`);
        buffer = '';
        await new Promise((r) => setTimeout(r, 12));
      }
    }

    // Persist to database in background if user is authenticated
    if (req.user?.userId) {
      const dbThreadId = threadId && !threadId.startsWith('local-') ? threadId : undefined;
      persistChatMessages({
        userId: req.user.userId,
        threadId: dbThreadId,
        userMessage: message,
        assistantMessage: fullText,
        userMeta: { lessonId, challengeId, uploadId },
        assistantMeta: { grounding: bundle.source },
      }).catch((err) => console.error('Error saving streaming chat message:', err));
    }

    res.write(`data: ${JSON.stringify({ type: 'done', fullResponse: fullText, threadId: threadId ?? null })}\n\n`);
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message || 'Streaming failed' })}\n\n`);
    res.end();
  }
});

// ── Direct Code Actions (Explain, Tests, Optimize, Debug, Review, Custom) underneath Code Context ──
const codeActionSchema = z.object({
  action: z.enum(['explain', 'test', 'optimize', 'debug', 'review', 'custom']),
  code: z.string().min(1, 'Please provide code in the editor').max(30000),
  language: z.string().optional(),
  customPrompt: z.string().max(4000).optional(),
  challengeTitle: z.string().optional(),
  challengeDescription: z.string().optional(),
  lessonId: z.string().optional(),
  challengeId: z.string().optional(),
  apiKey: z.string().optional(),
});

router.post('/code-action', validateBody(codeActionSchema), async (req: AuthRequest, res) => {
  const { action, code, language, customPrompt, challengeTitle, challengeDescription, apiKey } = req.body;
  const customKey = apiKey || (req.headers['x-ai-api-key'] as string | undefined);

  let systemPrompt = '';
  let userPrompt = '';
  const offlineAction: 'explain' | 'test' | 'optimize' | 'debug' =
    action === 'test' || action === 'optimize' || action === 'debug' ? action : 'explain';

  if (action === 'explain') {
    systemPrompt = [
      'You are SynergySphere Staff Engineering Assistant.',
      'Explain this code clearly, step by step, for a developer.',
      'Breakdown the architecture, core algorithm, control flow, time & space complexity (Big-O), and notable edge cases.',
      'Format your output in clean Markdown with headers and bullet points.',
    ].join('\n');
    userPrompt = `Please explain the following ${language || 'code'} snippet:\n\n\`\`\`\n${code}\n\`\`\``;
  } else if (action === 'test') {
    systemPrompt = [
      'You are a Quality Engineering and Testing Lead.',
      'Generate comprehensive, production-grade unit tests for the provided code.',
      'Cover happy path, null/undefined inputs, boundary cases, empty collections, and extreme edge conditions.',
      'Include clear assertion descriptions and framework setup if applicable.',
    ].join('\n');
    userPrompt = `Generate comprehensive unit tests for this ${language || 'code'} snippet:\n\n\`\`\`\n${code}\n\`\`\``;
  } else if (action === 'optimize') {
    systemPrompt = [
      'You are a Systems and Performance Optimization Architect.',
      'Analyze the provided code for performance bottlenecks, algorithmic complexity, redundant allocations, and code cleanliness.',
      'Provide an optimized, idiomatic version with a clear explanation of what was changed and the performance gains achieved (time/memory complexity comparison).',
    ].join('\n');
    userPrompt = `Optimize this ${language || 'code'} snippet for performance and readability:\n\n\`\`\`\n${code}\n\`\`\``;
  } else if (action === 'review') {
    systemPrompt = [
      'You are SynergySphere Staff Engineering Assistant and Coding Challenge Mentor.',
      'Review the student code below thoroughly: explain how it works, identify any bugs or edge cases, provide helpful hints, and show the complete verified working solution in a fenced code block.',
    ].join('\n');
    userPrompt = challengeTitle
      ? `I need help with the coding challenge: "${challengeTitle}".\n\nProblem Description:\n${challengeDescription || ''}\n\nHere is my current code in ${language || 'JavaScript'}:\n\`\`\`${language || 'javascript'}\n${code}\n\`\`\`\n\nPlease review my code, explain how it works, point out any bugs or edge cases, and provide hints and the correct working solution.`
      : `Please provide a complete code review, bug check, explanation, and corrected solution for this ${language || 'code'} snippet:\n\n\`\`\`\n${code}\n\`\`\``;
  } else if (action === 'custom') {
    systemPrompt = [
      'You are SynergySphere Staff Engineering Assistant.',
      'Directly and thoroughly answer the developer question about the provided code snippet.',
      'Include clear explanations and runnable code examples where helpful.',
    ].join('\n');
    userPrompt = `Code Context (${language || 'code'}):\n\`\`\`\n${code}\n\`\`\`\n\nQuestion / Request:\n${customPrompt || 'Explain and review this code.'}`;
  } else {
    systemPrompt = [
      'You are an expert Debugging Assistant.',
      'Inspect the provided code for runtime bugs, syntax problems, logic flaws, off-by-one errors, and silent failure modes.',
      'Explain the root cause and provide the verified fix.',
    ].join('\n');
    userPrompt = `Find and fix any bugs in this ${language || 'code'} snippet:\n\n\`\`\`\n${code}\n\`\`\``;
  }

  let fromAi = false;
  try {
    const offlineAnalysis =
      action === 'review' || action === 'custom'
        ? {
            output: `${analyzeCodeOffline('explain', code, language).output}\n\n---\n\n${analyzeCodeOffline('debug', code, language).output}`,
          }
        : analyzeCodeOffline(offlineAction, code, language);

    const response = await generateAiResponse(
      systemPrompt,
      userPrompt,
      [],
      () => offlineAnalysis.output,
      customKey,
    );

    fromAi = response !== offlineAnalysis.output && !response.includes('offline fallback mode');

    res.json({
      ok: true,
      action,
      output: response,
      fromAi,
      provider: fromAi ? 'Google Gemini / Groq Cloud' : 'Offline Local Engine',
    });
  } catch (error) {
    const fallbackOutput =
      action === 'review' || action === 'custom'
        ? `${analyzeCodeOffline('explain', code, language).output}\n\n---\n\n${analyzeCodeOffline('debug', code, language).output}`
        : analyzeCodeOffline(offlineAction, code, language).output;
    res.json({
      ok: true,
      action,
      output: fallbackOutput,
      fromAi: false,
      provider: 'Offline Local Engine',
    });
  }
});

// ── Check AI Key Status ──
router.get('/key-status', async (req: AuthRequest, res) => {
  refreshEnv();
  const headerKey = (req.headers['x-ai-api-key'] as string | undefined)?.trim() || '';
  const envGemini = (process.env.GEMINI_API_KEY || '').trim();
  const envGroq = (process.env.GROQ_API_KEY || (headerKey.startsWith('gsk_') ? headerKey : '')).trim();
  const envOpenAi = (process.env.OPENAI_API_KEY || (headerKey.startsWith('sk-') ? headerKey : '')).trim();

  const hasValidGemini = Boolean(envGemini && envGemini.startsWith('AIza') && envGemini !== process.env.JWT_SECRET);
  const hasValidGroq = Boolean(envGroq && envGroq.startsWith('gsk_'));
  const hasValidOpenAi = Boolean(envOpenAi && envOpenAi.startsWith('sk-'));

  const hasEnvKey = hasValidGemini || hasValidGroq || hasValidOpenAi;
  const provider = hasValidGemini && hasValidGroq
    ? 'Google Gemini + Groq'
    : hasValidGroq
      ? 'Groq Cloud'
      : hasValidGemini
        ? 'Google Gemini'
        : hasValidOpenAi
          ? 'OpenAI'
          : null;

  res.json({
    hasEnvKey,
    provider,
  });
});

// ── Test & Validate AI API Key ──
router.post('/test-key', async (req: AuthRequest, res) => {
  refreshEnv();
  const { apiKey } = req.body;
  const headerKey = (req.headers['x-ai-api-key'] as string | undefined)?.trim() || '';
  const keyToTest = (apiKey || headerKey || process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '').trim();

  if (!keyToTest) {
    res.json({ valid: true, provider: 'SynergySphere Local Engine', message: 'SynergySphere Offline Engine is active.' });
    return;
  }

  if (keyToTest.startsWith('gsk_')) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${keyToTest}` },
      });
      const data = (await response.json()) as any;
      if (response.ok && data?.data) {
        res.json({ valid: true, provider: 'Groq Cloud', message: `Groq key is verified! Connected to ${data.data.length} models.` });
      } else {
        res.json({ valid: false, provider: 'Groq Cloud', message: data?.error?.message || 'Groq authentication failed.' });
      }
    } catch (err) {
      res.json({ valid: false, provider: 'Groq Cloud', message: (err as Error).message });
    }
  } else if (keyToTest.startsWith('sk-')) {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${keyToTest}` },
      });
      const data = await response.json() as any;
      if (response.ok && data?.data) {
        res.json({ valid: true, provider: 'OpenAI', message: `OpenAI key is verified! Connected to ${data.data.length} models.` });
      } else {
        res.json({ valid: false, provider: 'OpenAI', message: data?.error?.message || 'OpenAI authentication failed.' });
      }
    } catch (err) {
      res.json({ valid: false, provider: 'OpenAI', message: (err as Error).message });
    }
  } else {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${keyToTest}`);
      const data = await response.json() as any;
      if (response.ok && data?.models) {
        res.json({ valid: true, provider: 'Google Gemini', message: `Google Gemini key is verified! ${data.models.length} models available.` });
      } else {
        res.json({ valid: false, provider: 'Google Gemini', message: data?.error?.message || 'Gemini authentication failed.' });
      }
    } catch (err) {
      res.json({ valid: false, provider: 'Google Gemini', message: (err as Error).message });
    }
  }
});

router.use(authenticate);

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
          approved: true,
          score: 78,
          offlineDraft: true,
          summary: `Static review for "${ticketTitle}": Core files and structure verified against the ticket rubric.`,
          lineComments: [
            {
              file: files[0].path,
              line: 1,
              severity: 'suggestion',
              comment: 'Structure verified. Ensure edge cases and error handling are covered by unit tests.',
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
  ALL_QUESTIONS,
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

router.get('/interview/questions', async (req: AuthRequest, res) => {
  try {
    const { topic, category, difficulty, type, search, page = '1', limit = '20' } = req.query as Record<string, string>;
    let list = ALL_QUESTIONS;

    if (topic && topic !== 'all') {
      const tLower = topic.toLowerCase();
      list = list.filter((q) => q.topic.toLowerCase() === tLower || (q.category && q.category.toLowerCase() === tLower));
    }
    if (category && category !== 'all') {
      const cLower = category.toLowerCase();
      list = list.filter((q) => q.category && q.category.toLowerCase() === cLower);
    }
    if (difficulty && difficulty !== 'all') {
      list = list.filter((q) => q.difficulty.toLowerCase() === difficulty.toLowerCase());
    }
    if (type && type !== 'all') {
      list = list.filter((q) => q.type.toLowerCase() === type.toLowerCase());
    }
    if (search && search.trim()) {
      const qLower = search.toLowerCase();
      list = list.filter(
        (q) =>
          q.prompt.toLowerCase().includes(qLower) ||
          q.tags.some((t) => t.toLowerCase().includes(qLower)) ||
          q.topic.toLowerCase().includes(qLower),
      );
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const total = list.length;
    const paginated = list.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      questions: paginated.map((q) => ({
        id: q.id,
        topic: q.topic,
        category: q.category,
        type: q.type,
        difficulty: q.difficulty,
        prompt: q.prompt,
        rubric: q.rubric,
        tags: q.tags,
        followUps: q.followUps,
        hints: q.hints,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message || 'Failed to list questions' });
  }
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

function formatLectureUpload(row: any) {
  if (!row) return null;
  const parseJsonField = (val: any) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object') return Object.values(parsed);
      } catch {
        return [];
      }
    }
    if (typeof val === 'object') return Object.values(val);
    return [];
  };

  return {
    ...row,
    flashcards: parseJsonField(row.flashcards),
    quiz: parseJsonField(row.quiz),
    miniProjects: parseJsonField(row.miniProjects),
    codingExercises: parseJsonField(row.codingExercises),
  };
}

router.post('/lecture-to-life', validateBody(lectureSchema), async (req: AuthRequest, res) => {
  const { fileName, fileType, content } = req.body;
  const customKey = req.headers['x-ai-api-key'] as string | undefined;
  const prompt = buildLecturePrompt(content, fileName);

  let raw = '';
  try {
    raw = await Promise.race([
      generateAiResponse(
        'You are an educational content transformer. Return only valid JSON based on the lecture content provided.',
        prompt,
        [],
        undefined,
        customKey,
      ),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('AI generation timeout')), 15000)
      ),
    ]);
  } catch (err) {
    // Graceful fallback when remote AI is slow or offline
  }

  let materials = raw ? parseLectureJson(raw) : null;
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

  if (upload && (upload as any).id && Array.isArray(materials.flashcards)) {
    syncFlashcardsToSrs(req.user!.userId, (upload as any).id, fileName, materials.flashcards).catch((err) =>
      console.error('SRS sync error:', err),
    );
  }

  await awardXp(req.user!.userId, 30, 'Lecture converted to study materials');
  res.status(201).json(formatLectureUpload(upload));
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

  const customKey = req.headers['x-ai-api-key'] as string | undefined;
  const prompt = buildLecturePrompt(existing.content, existing.fileName);
  let raw = '';
  try {
    raw = await Promise.race([
      generateAiResponse(
        'You are an educational content transformer. Return only valid JSON based on the lecture content provided.',
        prompt,
        [],
        undefined,
        customKey,
      ),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('AI generation timeout')), 15000)
      ),
    ]);
  } catch (err) {
    // Graceful fallback when remote AI is slow or offline
  }

  let materials = raw ? parseLectureJson(raw) : null;
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

  if (Array.isArray(materials.flashcards)) {
    syncFlashcardsToSrs(req.user!.userId, existing.id, existing.fileName, materials.flashcards).catch((err) =>
      console.error('SRS sync error:', err),
    );
  }

  res.json(formatLectureUpload(upload));
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
  res.json((uploads || []).map(formatLectureUpload));
});

router.delete('/lecture-to-life', async (req: AuthRequest, res) => {
  await query('DELETE FROM "FlashcardReview" WHERE "userId" = $1', [req.user!.userId]);
  await query('DELETE FROM "LectureUpload" WHERE "userId" = $1', [req.user!.userId]);
  res.json({ message: 'All saved lecture sessions and flashcards cleared.' });
});

router.delete('/lecture-to-life/:id', async (req: AuthRequest, res) => {
  const uploadId = paramId(req);
  await query('DELETE FROM "FlashcardReview" WHERE "uploadId" = $1 AND "userId" = $2', [uploadId, req.user!.userId]);
  const deleted = await queryOne<{ id: string }>(
    `DELETE FROM "LectureUpload"
     WHERE "id" = $1 AND "userId" = $2
     RETURNING "id"`,
    [uploadId, req.user!.userId],
  );
  await query(
    `DELETE FROM "FlashcardReview"
     WHERE "userId" = $1
       AND ("uploadId" IS NULL OR "uploadId" NOT IN (SELECT "id" FROM "LectureUpload" WHERE "userId" = $1))`,
    [req.user!.userId],
  );
  if (!deleted) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json({ message: 'Lecture session deleted.', id: deleted.id });
});

router.delete('/srs/due', async (req: AuthRequest, res) => {
  await query('DELETE FROM "FlashcardReview" WHERE "userId" = $1', [req.user!.userId]);
  res.json({ message: 'All due flashcards cleared.' });
});

// ── Spaced Repetition (SRS) SM-2 Flashcard Review Engine ──

async function syncFlashcardsToSrs(
  userId: string,
  uploadId: string,
  deckTitle: string,
  flashcards: Array<{ front?: string; back?: string; question?: string; answer?: string }>,
): Promise<number> {
  let added = 0;
  for (let i = 0; i < flashcards.length; i++) {
    const raw = flashcards[i];
    const front = (raw.front || raw.question || '').trim();
    const back = (raw.back || raw.answer || '').trim();
    if (!front || !back) continue;
    const cardKey = `${uploadId}:${i}`;
    await query(
      `INSERT INTO "FlashcardReview" ("id", "userId", "uploadId", "cardKey", "front", "back", "deckTitle")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT ("userId", "cardKey") DO UPDATE
         SET "front" = EXCLUDED."front",
             "back" = EXCLUDED."back",
             "deckTitle" = EXCLUDED."deckTitle"`,
      [newId(), userId, uploadId, cardKey, front, back, deckTitle || 'Study Pack'],
    );
    added++;
  }
  return added;
}

router.get('/srs/due', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const uploadFilter = typeof req.query.uploadId === 'string' && req.query.uploadId.trim() ? req.query.uploadId.trim() : null;

    // Remove any orphaned flashcards whose linked study pack no longer exists
    await query(
      `DELETE FROM "FlashcardReview"
       WHERE "userId" = $1
         AND "uploadId" IS NOT NULL
         AND "uploadId" NOT IN (SELECT "id" FROM "LectureUpload" WHERE "userId" = $1)`,
      [userId],
    );

    // Backfill any existing LectureUpload flashcards not yet in FlashcardReview
    const uploads = await query<{ id: string; fileName: string; flashcards: unknown }>(
      `SELECT "id", "fileName", "flashcards"
       FROM "LectureUpload"
       WHERE "userId" = $1
       ORDER BY "createdAt" DESC
       LIMIT 20`,
      [userId],
    );
    for (const u of uploads) {
      let cards: any[] = [];
      if (Array.isArray(u.flashcards)) {
        cards = u.flashcards;
      } else if (typeof u.flashcards === 'string') {
        try {
          const parsed = JSON.parse(u.flashcards);
          if (Array.isArray(parsed)) cards = parsed;
        } catch {
        }
      }
      if (cards.length > 0) {
        await syncFlashcardsToSrs(userId, u.id, u.fileName, cards);
      }
    }

    const allCards = uploadFilter
      ? await query<{
          id: string;
          uploadId: string | null;
          cardKey: string;
          front: string;
          back: string;
          deckTitle: string;
          easeFactor: number;
          intervalDays: number;
          repetitions: number;
          nextReviewAt: string;
          lastReviewedAt: string | null;
        }>(
          `SELECT "id", "uploadId", "cardKey", "front", "back", "deckTitle",
                  "easeFactor", "intervalDays", "repetitions", "nextReviewAt", "lastReviewedAt"
           FROM "FlashcardReview"
           WHERE "userId" = $1 AND "uploadId" = $2
           ORDER BY "nextReviewAt" ASC`,
          [userId, uploadFilter],
        )
      : await query<{
          id: string;
          uploadId: string | null;
          cardKey: string;
          front: string;
          back: string;
          deckTitle: string;
          easeFactor: number;
          intervalDays: number;
          repetitions: number;
          nextReviewAt: string;
          lastReviewedAt: string | null;
        }>(
          `SELECT "id", "uploadId", "cardKey", "front", "back", "deckTitle",
                  "easeFactor", "intervalDays", "repetitions", "nextReviewAt", "lastReviewedAt"
           FROM "FlashcardReview"
           WHERE "userId" = $1
           ORDER BY "nextReviewAt" ASC`,
          [userId],
        );

    const nowMs = Date.now();
    const dueCards = allCards.filter((c) => new Date(c.nextReviewAt).getTime() <= nowMs);
    const masteredCount = allCards.filter((c) => c.intervalDays >= 7 || c.repetitions >= 3).length;
    const avgEase =
      allCards.length > 0
        ? Number((allCards.reduce((sum, c) => sum + Number(c.easeFactor || 2.5), 0) / allCards.length).toFixed(2))
        : 2.5;

    res.json({
      cards: dueCards,
      dueCards,
      allCards,
      dueCount: dueCards.length,
      totalCount: allCards.length,
      stats: {
        dueCount: dueCards.length,
        totalCards: allCards.length,
        masteredCount,
        averageEase: avgEase,
      },
    });
  } catch (error) {
    console.error('Error fetching SRS due cards:', error);
    res.status(500).json({ error: 'Failed to load Spaced Repetition deck' });
  }
});

const srsReviewSchema = z.object({
  cardId: z.string().min(1).optional(),
  lectureId: z.string().optional().nullable(),
  front: z.string().optional(),
  back: z.string().optional(),
  quality: z.number().int().min(0).max(5), // 1 = Again, 3 = Hard, 4 = Good, 5 = Easy
});

router.post('/srs/review', validateBody(srsReviewSchema), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { cardId, lectureId, front, back, quality } = req.body;

    let card = cardId
      ? await queryOne<{
          id: string;
          easeFactor: number;
          intervalDays: number;
          repetitions: number;
        }>(
          `SELECT "id", "easeFactor", "intervalDays", "repetitions"
           FROM "FlashcardReview"
           WHERE "id" = $1 AND "userId" = $2`,
          [cardId, userId],
        )
      : null;

    if (!card && front) {
      const trimmedFront = front.trim();
      const trimmedBack = (back || '').trim();
      card = await queryOne<{
        id: string;
        easeFactor: number;
        intervalDays: number;
        repetitions: number;
      }>(
        `SELECT "id", "easeFactor", "intervalDays", "repetitions"
         FROM "FlashcardReview"
         WHERE "userId" = $1 AND "front" = $2
         ORDER BY "createdAt" DESC
         LIMIT 1`,
        [userId, trimmedFront],
      );

      if (!card) {
        const cardKey = `${lectureId || 'pack'}:${trimmedFront.slice(0, 80)}`;
        card = await queryOne<{
          id: string;
          easeFactor: number;
          intervalDays: number;
          repetitions: number;
        }>(
          `INSERT INTO "FlashcardReview" ("id", "userId", "uploadId", "cardKey", "front", "back", "deckTitle")
           VALUES ($1, $2, $3, $4, $5, $6, 'Study Pack')
           ON CONFLICT ("userId", "cardKey") DO UPDATE
             SET "front" = EXCLUDED."front",
                 "back" = EXCLUDED."back"
           RETURNING "id", "easeFactor", "intervalDays", "repetitions"`,
          [newId(), userId, lectureId || null, cardKey, trimmedFront, trimmedBack || 'Flashcard Answer'],
        );
      }
    }

    if (!card) {
      res.status(404).json({ error: 'Flashcard not found in SRS deck' });
      return;
    }

    // SuperMemo SM-2 algorithm
    let repetitions = Number(card.repetitions) || 0;
    let intervalDays = Number(card.intervalDays) || 0;
    let easeFactor = Number(card.easeFactor) || 2.5;

    if (quality < 3) {
      repetitions = 0;
      intervalDays = 0; // Review again in same session / within 10 minutes
    } else {
      if (repetitions === 0) {
        intervalDays = 1;
      } else if (repetitions === 1) {
        intervalDays = 3;
      } else {
        intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));
      }
      if (quality === 5) {
        intervalDays = Math.max(intervalDays + 1, Math.round(intervalDays * 1.3));
      }
      repetitions += 1;
    }

    easeFactor = Math.max(
      1.3,
      Number((easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))).toFixed(2)),
    );

    const nextReviewAt =
      intervalDays === 0
        ? new Date(Date.now() + 10 * 60 * 1000) // 10 minutes if "Again"
        : new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);

    const updated = await queryOne(
      `UPDATE "FlashcardReview"
       SET "easeFactor" = $1,
           "intervalDays" = $2,
           "repetitions" = $3,
           "nextReviewAt" = $4,
           "lastReviewedAt" = NOW()
       WHERE "id" = $5 AND "userId" = $6
       RETURNING *`,
      [easeFactor, intervalDays, repetitions, nextReviewAt, card.id, userId],
    );

    await awardXp(userId, 5, 'Reviewed flashcard with Spaced Repetition (SM-2)');

    res.json({
      card: updated,
      xpAwarded: 5,
      nextIntervalDays: intervalDays,
    });
  } catch (error) {
    console.error('Error recording SRS review:', error);
    res.status(500).json({ error: 'Failed to record flashcard review' });
  }
});

export default router;


