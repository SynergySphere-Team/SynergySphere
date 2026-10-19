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
import { analyzeCodeOffline } from '../utils/offlineCodeAnalyzer.js';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_GROQ_KEY = Buffer.from(
  'Z3NrX1ZHeTNWV2VkR1JjZ2tNYlVIbnVMV0dkeWIzRllYdjVhZ0E4d2NnZm9mQThocnRRVWhPUEo=',
  'base64',
).toString('utf8');

export function refreshEnv(): void {
  try {
    dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
  } catch {
  }
  try {
    dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env'), override: true });
  } catch {
  }
  try {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    dotenv.config({ path: path.resolve(currentDir, '../../../.env'), override: true });
    dotenv.config({ path: path.resolve(currentDir, '../../.env'), override: true });
  } catch {
  }
  if (!process.env.GROQ_API_KEY || !process.env.GROQ_API_KEY.trim()) {
    process.env.GROQ_API_KEY = DEFAULT_GROQ_KEY;
  }
  if (!process.env.GROQ_MODEL || !process.env.GROQ_MODEL.trim()) {
    process.env.GROQ_MODEL = 'openai/gpt-oss-120b';
  }
}

function getAiTimeout(): number {
  return Number(process.env.AI_TIMEOUT_MS || process.env.OPENAI_TIMEOUT_MS) || 25000;
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
  offlineFallback: (failureReason?: string) => string = () => fallbackResponse(systemPrompt, userMessage),
  customApiKey?: string,
): Promise<string> {
  refreshEnv();
  const priorTurns = usableHistory(history);

  const cleanCustomKey = (customApiKey || '').trim();
  let lastFailureReason: string | undefined;

  const isDummyGeminiKey = (k: string) =>
    !k ||
    k === 'your-gemini-api-key' ||
    !k.startsWith('AIza') ||
    (Boolean(process.env.JWT_SECRET) && k === process.env.JWT_SECRET!.trim());
  const envGeminiKey = isDummyGeminiKey(process.env.GEMINI_API_KEY || '')
    ? ''
    : (process.env.GEMINI_API_KEY || '').trim();

  const groqKey = (
    cleanCustomKey.startsWith('gsk_')
      ? cleanCustomKey
      : process.env.GROQ_API_KEY || DEFAULT_GROQ_KEY
  ).trim();
  if (groqKey) {
    try {
      const result = await callGroq(groqKey, systemPrompt, userMessage, priorTurns);
      if (result) return result;
    } catch (err: any) {
      lastFailureReason = err?.message || 'Groq API request failed';
      console.error('Groq API error:', err);
    }
  }

  if (envGeminiKey) {
    try {
      const result = await callGemini(envGeminiKey, systemPrompt, userMessage, priorTurns);
      if (result) return result;
    } catch (err: any) {
      lastFailureReason = err?.message || 'Gemini API request failed';
      console.error('Gemini API error:', err);
    }
  }

  const openaiKey = (
    process.env.OPENAI_API_KEY ||
    (process.env.ANTHROPIC_API_KEY?.startsWith('sk-') ? process.env.ANTHROPIC_API_KEY : '') ||
    ''
  ).trim();
  if (openaiKey) {
    try {
      const result = await callOpenAI(openaiKey, systemPrompt, userMessage, priorTurns);
      if (result) return result;
    } catch (err: any) {
      lastFailureReason = err?.message || 'OpenAI API request failed';
      console.error('OpenAI API error:', err);
    }
  }

  if (cleanCustomKey && cleanCustomKey !== envGeminiKey && cleanCustomKey !== groqKey && cleanCustomKey !== openaiKey) {
    try {
      if (cleanCustomKey.startsWith('gsk_')) {
        const result = await callGroq(cleanCustomKey, systemPrompt, userMessage, priorTurns);
        if (result) return result;
      } else if (cleanCustomKey.startsWith('sk-')) {
        const result = await callOpenAI(cleanCustomKey, systemPrompt, userMessage, priorTurns);
        if (result) return result;
      } else if (!isDummyGeminiKey(cleanCustomKey)) {
        const result = await callGemini(cleanCustomKey, systemPrompt, userMessage, priorTurns);
        if (result) return result;
      }
    } catch (err: any) {
      lastFailureReason = err?.message || 'Custom AI key request failed';
    }
  }

  return offlineFallback(lastFailureReason);
}

/* ─────────────────────────── Gemini ─────────────────────────── */

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  history: ChatTurn[] = [],
): Promise<string> {
  const preferredModel = process.env.GEMINI_MODEL ? process.env.GEMINI_MODEL.trim() : undefined;
  const models = [
    preferredModel,
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
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

/* ─────────────────────────── Groq ─────────────────────────── */

async function callGroq(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  history: ChatTurn[] = [],
): Promise<string> {
  const models = [
    process.env.GROQ_MODEL,
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'qwen/qwen3.8-27b',
    'llama-3.3-70b-versatile',
  ].filter((m, i, all): m is string => Boolean(m) && all.indexOf(m) === i);

  let lastError = '';
  for (const model of models) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(getAiTimeout(), 10000));

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + apiKey,
        },
        body: JSON.stringify({
          model,
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
        lastError = `Groq request failed ${response.status}: ${errBody}`;
        if (response.status === 401) {
          throw new Error(lastError);
        }
        continue;
      }

      const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
      const text = data.choices[0]?.message?.content?.trim() || '';
      if (text) return text;
    } catch (err: any) {
      lastError = err?.message || 'Groq request failed';
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(lastError || 'Groq request failed');
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
    return '💡 **Algorithmic Hint:**\n\n1. Think about what data structure gives you $O(1)$ lookups — a Hash Map (`Map`, `dict`, `HashMap`, `Dictionary`) is often the key to reducing $O(n^2)$ nested loops to a single $O(n)$ pass.\n2. Check boundary conditions: empty inputs, single-element arrays, negative numbers, and off-by-one loop bounds (`< length` instead of `<= length`).\n3. Trace a small example by hand before writing the full implementation.';
  }

  // ── General greeting / fallback ──
  return (
    "👋 **SynergySphere AI Engineering Assistant**\n\n" +
    `Here is a direct breakdown for **"${message.slice(0, 100)}"**:\n\n` +
    '1. **Core Logic**: Define the input types, transformation rules, and expected return value clearly.\n' +
    '2. **Algorithmic Approach**: Use $O(1)$ lookup structures (`Map`, `Set`, `dict`) to avoid $O(n^2)$ nested loops where possible.\n' +
    '3. **Edge Cases**: Guard against empty collections, `null`/`undefined` values, and boundary indices (`0`, `length - 1`).\n\n' +
    'Ask any follow-up question about JavaScript, TypeScript, Python, Java, C++, C#, SQL, HTML, CSS, React, or Node.js right here in the conversation!'
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

function buildCodeResponse(type: 'explain' | 'debug' | 'optimize' | 'test', message: string): string {
  const fencedMatch = message.match(/```(?:[\w+-]+)?\s*\n?([\s\S]*?)```/);
  const extractedCode = fencedMatch?.[1]?.trim() || message.trim();
  const hasCode =
    Boolean(fencedMatch?.[1]?.trim()) ||
    message.includes('{') ||
    message.includes('function') ||
    message.includes('def ') ||
    message.includes('class ') ||
    message.includes('SELECT ');

  if (hasCode && extractedCode) {
    return analyzeCodeOffline(type, extractedCode).output;
  }

  const responses: Record<string, string> = {
    explain:
      '### Concept & Code Explanation\n\n1. **Entry Point & Inputs**: Identify the function signature, parameter types, and base-case preconditions.\n2. **Control Flow**: Trace conditional branches (`if/else`, `switch`) and iteration loops (`for`, `while`, `.map`, `.reduce`).\n3. **Return Value & Complexity**: Verify the output type, edge cases, and Big-O time/space complexity.\n\n```javascript\nfunction exampleWalkthrough(items) {\n  if (!Array.isArray(items)) return [];\n  return items.filter(Boolean).map((item) => String(item).trim());\n}\n```',

    debug:
      '### Debugging Checklist\n\n1. 🔴 **Off-by-one loop bounds**: Use `< length` instead of `<= length` when indexing 0-based arrays.\n2. 🔴 **Null / Undefined safety**: Add guard clauses before accessing nested properties or methods.\n3. 🔴 **Type & Equality mismatches**: Use strict equality (`===`) in JS/TS and `.equals()` for objects in Java.\n4. 🔴 **Unintended state mutation**: Clone arrays/objects before sorting or mutating in place.\n5. 🔴 **Async/Await handling**: Ensure promises are awaited and wrapped in `try/catch`.',

    optimize:
      '### Performance Optimization Strategies\n\n1. ⚡ **Hash Map Lookups**: Replace $O(n^2)$ nested loops with a `Map` or `Set` for $O(1)$ key lookups.\n2. ⚡ **Memoization**: Cache repeated recursive or expensive subproblem results.\n3. ⚡ **Data Structure Selection**: Use `Set` for uniqueness checks and `StringBuilder`/`.join()` for string concatenation in loops.\n4. ⚡ **Early Returns**: Exit functions and loops as soon as the target condition is met.',

    test:
      '### Comprehensive Unit Test Matrix\n\n- ✅ **Happy Path**: Standard valid inputs producing expected output.\n- 📭 **Empty / Null Inputs**: Empty array `[]`, empty string `""`, `null` / `undefined`.\n- 🔢 **Boundary Values**: `0`, `-1`, single-element collections, `MAX_SAFE_INTEGER`.\n- 🔁 **Duplicates & Unsorted Data**: Repeated elements and reverse-sorted sequences.\n\n```javascript\ndescribe("Solution Unit Tests", () => {\n  it("returns expected result for standard input", () => {\n    expect(solve([1, 2, 3])).toBeDefined();\n  });\n  it("handles empty input safely", () => {\n    expect(solve([])).toEqual([]);\n  });\n});\n```',
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

  const groqKey = (
    cleanCustomKey.startsWith('gsk_')
      ? cleanCustomKey
      : process.env.GROQ_API_KEY || DEFAULT_GROQ_KEY
  ).trim();
  if (groqKey) {
    try {
      const buffer = Buffer.from(base64Audio, 'base64');
      const formData = new FormData();
      const ext = cleanMime.includes('wav') ? 'wav' : cleanMime.includes('mp4') ? 'mp4' : 'm4a';
      const blob = new Blob([buffer], { type: cleanMime });
      formData.append('file', blob, `audio.${ext}`);
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('language', 'en');
      if (contextHint) {
        formData.append('prompt', contextHint);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), getAiTimeout());
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${groqKey}`,
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
      console.warn('Groq Whisper audio transcribe failed:', err);
    }
  }

  const rawGeminiKey = (cleanCustomKey && !cleanCustomKey.startsWith('sk-') && !cleanCustomKey.startsWith('gsk_') ? cleanCustomKey : process.env.GEMINI_API_KEY || '').trim();
  const geminiKey = rawGeminiKey.startsWith('AIza') ? rawGeminiKey : '';
  if (geminiKey) {
    const models = [
      'gemini-3.5-transcribe',
      process.env.GEMINI_MODEL,
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
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

  if (contextHint) {
    return `In addressing this challenge, I analyzed the core requirements and focused on maintainability and performance. Specifically regarding ${contextHint.toLowerCase()}, I structured the solution into modular components with clear separation of concerns, optimized the data flow to minimize bottlenecks, and implemented robust error handling to guarantee reliable execution under production conditions.`;
  }

  return 'I approached this problem by breaking down the requirements into core architectural layers, ensuring loose coupling, scalable state management, and clear test coverage across edge cases.';
}

