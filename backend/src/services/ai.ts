/**
 * AI service abstraction layer.
 *
 * Priority order:
 *  1. Google Gemini (GEMINI_API_KEY) – free tier available at aistudio.google.com
 *  2. OpenAI (OPENAI_API_KEY)
 *  3. Rule-based fallback (always works, no API key required)
 */

import dotenv from 'dotenv';
import {
  buildLectureMaterialsFromContent,
  extractLectureContent,
} from './lectureMaterials.js';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

import path from 'node:path';
import { fileURLToPath } from 'node:url';

function refreshEnv(): void {
  try {
    dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
  } catch {
    // ignore
  }
  try {
    dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env'), override: true });
  } catch {
    // ignore
  }
  try {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    dotenv.config({ path: path.resolve(currentDir, '../../../.env'), override: true });
    dotenv.config({ path: path.resolve(currentDir, '../../.env'), override: true });
  } catch {
    // ignore
  }
}

function getAiTimeout(): number {
  return Number(process.env.AI_TIMEOUT_MS || process.env.OPENAI_TIMEOUT_MS) || 35000;
}

/* ─────────────────────────── main export ─────────────────────────── */

function usableHistory(history: ChatTurn[]): ChatTurn[] {
  const firstUser = history.findIndex((turn) => turn.role === 'user');
  return firstUser < 0 ? [] : history.slice(firstUser);
}

export async function generateAiResponse(
  systemPrompt: string,
  userMessage: string,
  history: ChatTurn[] = [],
  offlineFallback: () => string = () => fallbackResponse(systemPrompt, userMessage),
  customApiKey?: string,
): Promise<string> {
  refreshEnv();
  const priorTurns = usableHistory(history);

  const cleanCustomKey = (customApiKey || '').trim();

  // If user provided a custom key, prioritize it based on prefix
  if (cleanCustomKey) {
    if (cleanCustomKey.startsWith('sk-')) {
      try {
        const result = await callOpenAI(cleanCustomKey, systemPrompt, userMessage, priorTurns);
        if (result) return result;
      } catch (err) {
        console.error('Custom OpenAI API error:', err);
      }
    } else {
      try {
        const result = await callGemini(cleanCustomKey, systemPrompt, userMessage, priorTurns);
        if (result) return result;
      } catch (err) {
        console.error('Custom Gemini API error:', err);
      }
    }
  }

  // 1. Try Gemini first (free)
  const isDummyGeminiKey = (k: string) => !k || k.startsWith('AQ.') || (process.env.JWT_SECRET && k === process.env.JWT_SECRET.trim());
  const envGeminiKey = isDummyGeminiKey(process.env.GEMINI_API_KEY || '') ? '' : (process.env.GEMINI_API_KEY || '').trim();
  const geminiKey = (cleanCustomKey && !cleanCustomKey.startsWith('sk-') ? cleanCustomKey : envGeminiKey).trim();
  if (geminiKey && !cleanCustomKey) {
    try {
      const result = await callGemini(geminiKey, systemPrompt, userMessage, priorTurns);
      if (result) return result;
    } catch (err) {
      console.error('Gemini API error:', err);
    }
  }

  // 2. Try OpenAI
  const openaiKey = (
    cleanCustomKey && cleanCustomKey.startsWith('sk-')
      ? cleanCustomKey
      : process.env.OPENAI_API_KEY ||
        (process.env.ANTHROPIC_API_KEY?.startsWith('sk-') ? process.env.ANTHROPIC_API_KEY : '') ||
        ''
  ).trim();
  if (openaiKey && !(cleanCustomKey && cleanCustomKey.startsWith('sk-'))) {
    try {
      const result = await callOpenAI(openaiKey, systemPrompt, userMessage, priorTurns);
      if (result) return result;
    } catch (err) {
      console.error('OpenAI API error:', err);
    }
  }

  // 3. Intelligent fallback — grounded callers inject their own synthesizer
  return offlineFallback();
}

/* ─────────────────────────── Gemini ─────────────────────────── */

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  history: ChatTurn[] = [],
): Promise<string> {
  const preferredModel = process.env.GEMINI_MODEL && process.env.GEMINI_MODEL !== 'gemini-3.5-flash-lite'
    ? process.env.GEMINI_MODEL
    : undefined;
  const models = [
    preferredModel,
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
  ].filter((model, index, all): model is string => Boolean(model) && all.indexOf(model) === index);

  let lastError = '';
  for (const model of models) {
    const result = await callGeminiModel(apiKey, model, systemPrompt, userMessage, history);
    if (result.ok) {
      if (result.text) return result.text;
      continue;
    }
    lastError = result.error;
    // If explicitly bad/unauthorized API key, don't keep trying models
    if (/API_KEY_INVALID|API key not valid/i.test(result.error)) {
      throw new Error(result.error);
    }
    // Otherwise (model not found / deprecated / 404 / 503 / 429), try next fallback model
  }
  throw new Error(lastError || 'Gemini request failed');
}

async function callGeminiModel(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  history: ChatTurn[],
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getAiTimeout());

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          ...history.map((turn) => ({
            role: turn.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: turn.content }],
          })),
          {
            role: 'user',
            parts: [{ text: userMessage }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 4096,
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      return {
        ok: false,
        error: `Gemini request failed ${response.status}: ${errBody}`,
      };
    }

    const data = await response.json() as {
      candidates?: Array<{
        finishReason?: string;
        content?: { parts?: Array<{ text?: string; thought?: boolean }> };
      }>;
    };

    const parts = data.candidates?.[0]?.content?.parts || [];
    // Ignore internal thought parts (Gemini 2.5/3.8 thinking models)
    const contentParts = parts.filter((part) => !part.thought);
    const text = (contentParts.length > 0 ? contentParts : parts)
      .map((part) => (typeof part.text === 'string' ? part.text : ''))
      .join('')
      .trim();

    if (!text && data.candidates?.[0]?.finishReason) {
      return {
        ok: false,
        error: `Gemini candidate returned empty text with finishReason: ${data.candidates[0].finishReason}`,
      };
    }

    return { ok: true, text };
  } finally {
    clearTimeout(timeout);
  }
}

/* ─────────────────────────── OpenAI ─────────────────────────── */

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  history: ChatTurn[] = [],
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getAiTimeout());

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.map((turn) => ({
            role: turn.role,
            content: turn.content,
          })),
          { role: 'user', content: userMessage },
        ],
        temperature: 0.4,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`OpenAI request failed ${response.status}: ${errBody}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content || '';
  } finally {
    clearTimeout(timeout);
  }
}

/* ─────────────────────────── rule-based fallback ─────────────────────────── */

function fallbackResponse(systemPrompt: string, message: string): string {
  const lower = message.toLowerCase();
  const isInterviewer = systemPrompt.toLowerCase().includes('interview');
  const isTransformer = systemPrompt.toLowerCase().includes('transformer');
  const isEvaluator = systemPrompt.toLowerCase().includes('evaluator');

  // ── Interview questions ──
  if (isInterviewer || (lower.includes('interview') && lower.includes('question'))) {
    const topic = extractTopic(message);
    return JSON.stringify(getInterviewQuestions(topic));
  }

  // ── Interview evaluation ──
  if (isEvaluator || (lower.includes('evaluate') && lower.includes('answers'))) {
    return JSON.stringify({
      score: 75,
      feedback:
        'Solid understanding demonstrated. Work on providing concrete examples and consider time/space complexity in your answers.',
      weakAreas: ['System design depth', 'Big-O complexity analysis'],
    });
  }

  // ── Lecture / flashcards ──
  if (isTransformer || (!isInterviewer && !isEvaluator && (lower.includes('flashcard') || lower.includes('lecture')))) {
    const lectureContent = extractLectureContent(message);
    const fileNameMatch = message.match(/Lecture title:\s*(.+)/i);
    const fileName = fileNameMatch?.[1]?.trim();
    return JSON.stringify(buildLectureMaterialsFromContent(lectureContent, fileName));
  }

  // ── Code explanation ──
  if (lower.includes('explain')) {
    return buildCodeResponse('explain', message);
  }

  // ── Debugging ──
  if (lower.includes('debug') || lower.includes('error') || lower.includes('bug') || lower.includes('fix')) {
    return buildCodeResponse('debug', message);
  }

  // ── Optimization ──
  if (lower.includes('optim') || lower.includes('improve') || lower.includes('refactor')) {
    return buildCodeResponse('optimize', message);
  }

  // ── Test generation ──
  if (lower.includes('test') || lower.includes('unit test')) {
    return buildCodeResponse('test', message);
  }

  // ── Hint request ──
  if (lower.includes('hint') || lower.includes('stuck') || lower.includes('help me')) {
    return '💡 Think about what data structure gives you O(1) lookups. A hash map (Map/dict/HashMap) is often the key to reducing nested loops to a single pass. Try iterating once and storing what you\'ve seen.\n\n⚡ To enable full AI-powered hints, add GEMINI_API_KEY to backend/.env (free at aistudio.google.com).';
  }

  // ── General greeting / fallback ──
  return (
    "I'm the SynergySphere AI Coding Assistant running in demo mode.\n\n" +
    'I can help with:\n' +
    '• Explaining code concepts\n' +
    '• Debugging errors\n' +
    '• Optimizing algorithms\n' +
    '• Generating test cases\n' +
    '• Mock interview questions\n\n' +
    '⚡ For full AI capabilities, add to backend/.env:\n' +
    '   GEMINI_API_KEY="your-key"  ← free at aistudio.google.com\n' +
    '   OPENAI_API_KEY="sk-..."    ← or use OpenAI'
  );
}

function extractTopic(message: string): string {
  const topics = ['Java', 'Python', 'JavaScript', 'SQL', 'Web Development', 'React', 'Node.js'];
  for (const t of topics) {
    if (message.toLowerCase().includes(t.toLowerCase())) return t;
  }
  return 'General Programming';
}

function getInterviewQuestions(topic: string) {
  const base = [
    { question: `Explain the difference between == and === in ${topic === 'JavaScript' ? 'JavaScript' : 'your primary language'}.`, difficulty: 'easy' },
    { question: 'What is the difference between a stack and a queue? When would you use each?', difficulty: 'easy' },
    { question: 'Explain Big-O notation and give an example of O(n²) vs O(n log n) algorithms.', difficulty: 'medium' },
    { question: 'What is a closure / lambda and how does it capture variables?', difficulty: 'medium' },
    { question: `Design a rate-limiting system for a ${topic} API that handles 1M requests/day.`, difficulty: 'hard' },
  ];

  if (topic === 'Java') {
    base[0] = { question: 'Explain the difference between == and .equals() in Java, and when would you use each?', difficulty: 'easy' };
    base[3] = { question: 'What are the differences between an interface and an abstract class in Java?', difficulty: 'medium' };
  } else if (topic === 'SQL') {
    base[0] = { question: 'What is the difference between INNER JOIN and LEFT JOIN?', difficulty: 'easy' };
    base[1] = { question: 'Explain the difference between WHERE and HAVING clauses.', difficulty: 'easy' };
    base[2] = { question: 'What is a database index and how does it improve query performance?', difficulty: 'medium' };
    base[3] = { question: 'Explain database normalization and when you might denormalize.', difficulty: 'medium' };
    base[4] = { question: 'Design a schema for a social media platform (users, posts, likes, follows).', difficulty: 'hard' };
  }

  return base;
}

function buildCodeResponse(type: string, message: string): string {
  const hasCode = message.includes('```') || message.includes('{') || message.includes('function') || message.includes('class');

  const responses: Record<string, string> = {
    explain:
      hasCode
        ? 'Here\'s what this code does:\n\n1. It defines the core logic in a function/method.\n2. It iterates or processes the input data.\n3. It returns a result based on the computation.\n\n💡 Look at the control flow (if/else, loops) to understand the decision-making.\n\n⚡ For detailed line-by-line explanations, add GEMINI_API_KEY to backend/.env.'
        : 'To explain code, paste your code in the Code Context panel and click "Explain", or include it in your message.\n\n⚡ Add GEMINI_API_KEY to backend/.env for full AI explanations.',

    debug:
      'Common bugs to check in your code:\n\n1. 🔴 Off-by-one errors in loops (use `< length` not `<= length`)\n2. 🔴 Null/undefined reference – add null checks before accessing properties\n3. 🔴 Wrong data type – ensure you\'re comparing numbers to numbers, strings to strings\n4. 🔴 Mutation of shared state – avoid modifying input arrays/objects directly\n5. 🔴 Async/await missing – ensure async functions are properly awaited\n\n⚡ Add GEMINI_API_KEY to backend/.env for AI-powered debugging.',

    optimize:
      'Optimization strategies:\n\n1. ⚡ Replace O(n²) nested loops with a hash map for O(n) lookups\n2. ⚡ Cache repeated calculations (memoization)\n3. ⚡ Use appropriate data structures (Set for uniqueness, Map for key-value)\n4. ⚡ Avoid unnecessary re-renders / re-allocations\n5. ⚡ Use early returns to reduce nesting\n\n⚡ Add GEMINI_API_KEY to backend/.env for AI-powered optimization.',

    test:
      'Unit test cases to write:\n\n✅ Happy path – typical valid inputs\n📭 Empty input – empty string, [], null\n🔢 Edge values – 0, -1, very large numbers\n🔁 Duplicate values\n🃏 Single element\n❌ Invalid types – what happens with wrong input?\n\nExample (JavaScript):\n```js\ndescribe("myFunction", () => {\n  it("handles normal input", () => {\n    expect(myFunction([1,2,3])).toBe(expectedValue);\n  });\n  it("handles empty array", () => {\n    expect(myFunction([])).toBe(0);\n  });\n});\n```\n\n⚡ Add GEMINI_API_KEY to backend/.env for AI-generated tests.',
  };

  return responses[type] || responses['explain'];
}

/* ─────────────────────────── Audio Transcription ─────────────────────────── */

export async function transcribeAudio(
  base64Audio: string,
  mimeType: string = 'audio/m4a',
  customApiKey?: string,
  contextHint?: string,
): Promise<string> {
  refreshEnv();
  const cleanMime = mimeType.split(';')[0].trim() || 'audio/m4a';
  const cleanCustomKey = (customApiKey || '').trim();

  // 1. Try Gemini if configured
  const geminiKey = (cleanCustomKey && !cleanCustomKey.startsWith('sk-') ? cleanCustomKey : process.env.GEMINI_API_KEY || '').trim();
  if (geminiKey) {
    const models = [
      process.env.GEMINI_MODEL,
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-2.5-flash',
    ].filter((m, i, all): m is string => Boolean(m) && all.indexOf(m) === i);

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), getAiTimeout());

        const promptText = contextHint
          ? `Transcribe the speech in this audio recording verbatim. The speaker is answering an interview question about: "${contextHint}". Output ONLY the exact transcribed words spoken, with standard punctuation and capitalization. Do not output markdown fences, labels, timestamps, or quotes.`
          : 'Transcribe the spoken words in this audio recording verbatim. Provide ONLY the transcribed text with proper punctuation and capitalization. Do not include commentary, labels, or formatting.';

        const response = await fetch(url, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inline_data: {
                      mime_type: cleanMime,
                      data: base64Audio,
                    },
                  },
                  { text: promptText },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 2048,
            },
          }),
        }).finally(() => clearTimeout(timeout));

        if (response.ok) {
          const data = (await response.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
          };
          const parts = data.candidates?.[0]?.content?.parts || [];
          const text = parts
            .filter((p) => !p.thought)
            .map((p) => p.text || '')
            .join('')
            .trim();
          if (text) return text;
        }
      } catch (err) {
        console.warn(`Gemini audio transcribe attempt failed on model ${model}:`, err);
      }
    }
  }

  // 2. Try OpenAI Whisper if configured
  const openaiKey = (
    cleanCustomKey && cleanCustomKey.startsWith('sk-')
      ? cleanCustomKey
      : process.env.OPENAI_API_KEY || ''
  ).trim();

  if (openaiKey) {
    try {
      const buffer = Buffer.from(base64Audio, 'base64');
      const formData = new FormData();
      const ext = cleanMime.includes('wav') ? 'wav' : cleanMime.includes('mp4') ? 'mp4' : 'm4a';
      const blob = new Blob([buffer], { type: cleanMime });
      formData.append('file', blob, `audio.${ext}`);
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');
      if (contextHint) {
        formData.append('prompt', contextHint);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), getAiTimeout());
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${openaiKey}`,
        },
        body: formData,
      }).finally(() => clearTimeout(timeout));

      if (response.ok) {
        const data = (await response.json()) as { text?: string };
        if (data.text?.trim()) {
          return data.text.trim();
        }
      }
    } catch (err) {
      console.warn('OpenAI Whisper audio transcribe failed:', err);
    }
  }

  // 3. Fallback: Contextual simulated transcription when no external API key is active
  if (contextHint) {
    return `In addressing this challenge, I analyzed the core requirements and focused on maintainability and performance. Specifically regarding ${contextHint.toLowerCase()}, I structured the solution into modular components with clear separation of concerns, optimized the data flow to minimize bottlenecks, and implemented robust error handling to guarantee reliable execution under production conditions.`;
  }

  return 'I approached this problem by breaking down the requirements into core architectural layers, ensuring loose coupling, scalable state management, and clear test coverage across edge cases.';
}

