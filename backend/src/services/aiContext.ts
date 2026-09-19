/**
 * Grounding bundle builder for the SynergySphere AI Workspace.
 *
 * The AI Workspace must answer with LectureToLife Programming Academy material
 * (the W3Schools-derived curriculum already stored in backend/src/data/curriculum)
 * or with the signed-in student's own LectureUpload study packs — never generic
 * textbook copy. This module reuses the exact catalogue, materializer and search
 * logic that backs GET /api/curriculum/lessons/:id and GET /api/curriculum/search,
 * and reads the user's existing LectureUpload / LectureLessonProgress rows.
 */

import { query } from '../lib/db.js';
import {
  w3schoolsProgrammingDomain,
  W3SCHOOLS_BASE_SOURCE,
} from '../data/w3schoolsCurriculumData.js';
import type { LessonSpec, SubjectSpec, ModuleSpec } from '../data/lectureCurriculumTypes.js';
import { materializeLesson } from '../data/curriculumLessonMaterial.js';

export const GROUNDING_CHAR_LIMIT = 8000;

export type GroundingSource = 'lesson' | 'upload' | 'search' | 'none';

export interface GroundingReference {
  lessonId?: string;
  lessonTitle?: string;
  subjectName?: string;
  moduleName?: string;
  uploadId?: string;
  uploadFileName?: string;
}

export interface RecentUploadRef {
  id: string;
  fileName: string;
  summary: string | null;
  createdAt: Date | string;
  [key: string]: unknown;
}

export interface GroundedLesson {
  id: string;
  title: string;
  subjectName: string;
  moduleName: string;
  difficulty: string;
  overview: string;
  explanation: string;
  keyConcepts: Array<{ title: string; definition: string; purpose?: string }>;
  syntax: string[];
  examples: Array<{ title: string; language?: string; code: string; explanation: string }>;
  rules: string[];
  commonMistakes: string[];
  exercise?: { prompt: string; successCriteria: string };
  quiz?: { question: string; answer: string };
  challenge?: { prompt: string; successCriteria: string };
  sourceUrl: string;
}

export interface GroundedUpload {
  id: string;
  fileName: string;
  summary: string | null;
  flashcards: Array<{ front: string; back: string }>;
  quiz: Array<{ question: string; options: string[]; answer: number }>;
}

export interface GroundingBundle {
  source: GroundingSource;
  contextBlock: string;
  reference: GroundingReference;
  /** Structured matched lesson, used for no-API-key synthesis. */
  lesson?: GroundedLesson;
  /** Structured matched study pack, used for no-API-key synthesis. */
  upload?: GroundedUpload;
  /** First code example of the matched lesson, used to prefill the web editor. */
  starterCode?: string;
  starterLanguage?: string;
  recentUploads: RecentUploadRef[];
  completedLessonTitles: string[];
  hasContext: boolean;
}

/* ─────────────────────────── curriculum lookup (mirrors curriculum routes) ─────────────────────────── */

interface FlatLessonEntry {
  lesson: LessonSpec;
  subjectId: string;
  subjectName: string;
  moduleId: string;
  moduleName: string;
}

export function getAllFlatLessons(): FlatLessonEntry[] {
  const result: FlatLessonEntry[] = [];
  for (const subject of w3schoolsProgrammingDomain.subjects as SubjectSpec[]) {
    for (const mod of subject.modules as ModuleSpec[]) {
      for (const [lessonIndex, sourceLesson] of mod.lessons.entries()) {
        const les = materializeLesson(
          sourceLesson,
          subject,
          mod,
          mod.lessons[lessonIndex - 1]?.title,
        );
        result.push({
          lesson: les,
          subjectId: subject.id,
          subjectName: subject.name,
          moduleId: mod.id,
          moduleName: mod.name,
        });
      }
    }
  }
  return result;
}

function findLessonById(lessonId: string): FlatLessonEntry | undefined {
  return getAllFlatLessons().find((e) => e.lesson.id === lessonId);
}

function toGroundedLesson(entry: FlatLessonEntry): GroundedLesson {
  const { lesson } = entry;
  return {
    id: lesson.id,
    title: lesson.title,
    subjectName: entry.subjectName,
    moduleName: entry.moduleName,
    difficulty: lesson.difficulty,
    overview: lesson.overview,
    explanation: lesson.content.explanation,
    keyConcepts: lesson.content.keyConcepts ?? [],
    syntax: lesson.content.syntax ?? [],
    examples: lesson.content.examples ?? [],
    rules: lesson.content.rules ?? [],
    commonMistakes: lesson.content.commonMistakes ?? [],
    exercise: lesson.content.exercise,
    quiz: lesson.content.quiz,
    challenge: lesson.content.challenge,
    sourceUrl:
      lesson.sources[0]?.sourceUrl || `https://www.w3schools.com/${entry.subjectId}/`,
  };
}

/* ─────────────────────────── user data ─────────────────────────── */

async function loadRecentUploads(userId: string): Promise<RecentUploadRef[]> {
  try {
    return await query<RecentUploadRef>(
      `SELECT "id", "fileName", "summary", "createdAt"
       FROM "LectureUpload"
       WHERE "userId" = $1
       ORDER BY "createdAt" DESC
       LIMIT 5`,
      [userId],
    );
  } catch {
    return [];
  }
}

async function loadCompletedLessonTitles(userId: string): Promise<string[]> {
  try {
    const rows = await query<{ title: string }>(
      `SELECT l."title"
       FROM "LectureLessonProgress" p
       JOIN "LectureLesson" l ON l."id" = p."lessonId"
       WHERE p."userId" = $1
       ORDER BY p."completedAt" DESC
       LIMIT 10`,
      [userId],
    );
    return rows.map((r) => r.title);
  } catch {
    return [];
  }
}

/* ─────────────────────────── formatting helpers ─────────────────────────── */

function lessonBlock(entry: FlatLessonEntry): string {
  const { lesson } = entry;
  const content = lesson.content;
  const parts: string[] = [];

  parts.push(`LESSON: ${lesson.title}`);
  parts.push(`PATH: ${entry.subjectName} > ${entry.moduleName}`);
  parts.push(`DIFFICULTY: ${lesson.difficulty}`);
  parts.push(`OVERVIEW: ${lesson.overview}`);
  parts.push(`EXPLANATION: ${content.explanation}`);

  if (content.keyConcepts?.length) {
    parts.push(
      'KEY CONCEPTS:\n' +
        content.keyConcepts
          .slice(0, 5)
          .map((c) => `- ${c.title}: ${c.definition}${c.purpose ? ` (used to ${c.purpose})` : ''}`)
          .join('\n'),
    );
  }

  if (content.syntax?.length) {
    parts.push(`SYNTAX:\n${content.syntax.map((s) => `- ${s}`).join('\n')}`);
  }

  if (content.examples?.length) {
    parts.push(
      content.examples
        .slice(0, 2)
        .map(
          (ex) =>
            `EXAMPLE (${ex.language || entry.subjectId}) — ${ex.title}:\n${ex.code}\n(${ex.explanation})`,
        )
        .join('\n\n'),
    );
  }

  if (content.rules?.length) {
    parts.push(`RULES:\n${content.rules.map((r) => `- ${r}`).join('\n')}`);
  }

  if (content.commonMistakes?.length) {
    parts.push(`COMMON MISTAKES:\n${content.commonMistakes.map((m) => `- ${m}`).join('\n')}`);
  }

  if (content.exercise) {
    parts.push(`EXERCISE: ${content.exercise.prompt} (success: ${content.exercise.successCriteria})`);
  }
  if (content.quiz) {
    parts.push(`QUIZ: ${content.quiz.question} — Answer: ${content.quiz.answer}`);
  }
  if (content.challenge) {
    parts.push(`CHALLENGE: ${content.challenge.prompt} (success: ${content.challenge.successCriteria})`);
  }

  parts.push(`SOURCE: ${W3SCHOOLS_BASE_SOURCE.name} — ${lessonSourceUrl(entry)}`);
  return parts.join('\n\n');
}

function lessonSourceUrl(entry: FlatLessonEntry): string {
  return entry.lesson.sources[0]?.sourceUrl || `https://www.w3schools.com/${entry.subjectId}/`;
}

function lessonListBlock(entries: FlatLessonEntry[]): string {
  return (
    'MATCHED ACADEMY LESSONS:\n' +
    entries
      .map(
        (e, i) =>
          `${i + 1}. "${e.lesson.title}" — ${e.subjectName} > ${e.moduleName} (${e.lesson.difficulty})\n   ${e.lesson.overview}`,
      )
      .join('\n')
  );
}

function truncate(block: string): string {
  if (block.length <= GROUNDING_CHAR_LIMIT) return block;
  return block.slice(0, GROUNDING_CHAR_LIMIT - 20).replace(/\s+\S*$/, '') + '\n[…truncated]';
}

/* ─────────────────────────── upload pack grounding ─────────────────────────── */

interface UploadRow {
  id: string;
  fileName: string;
  summary: string | null;
  flashcards: unknown;
  quiz: unknown;
  [key: string]: unknown;
}

function formatFlashcards(raw: unknown): string {
  const cards = Array.isArray(raw) ? raw : [];
  return cards
    .slice(0, 6)
    .map((c: { front?: string; back?: string }) => `- Q: ${c?.front ?? ''} → A: ${c?.back ?? ''}`)
    .join('\n');
}

function formatQuiz(raw: unknown): string {
  const items = Array.isArray(raw) ? raw : [];
  return items
    .slice(0, 4)
    .map(
      (q: { question?: string; options?: string[]; answer?: number }, i) =>
        `${i + 1}. ${q?.question ?? ''}\n   Options: ${(q?.options ?? []).join(' | ')}` +
        `${typeof q?.answer === 'number' ? `\n   Correct: ${q.options?.[q.answer] ?? q.answer}` : ''}`,
    )
    .join('\n');
}

function asFlashcards(raw: unknown): Array<{ front: string; back: string }> {
  return (Array.isArray(raw) ? raw : [])
    .map((c: { front?: unknown; back?: unknown }) => ({
      front: String(c?.front ?? ''),
      back: String(c?.back ?? ''),
    }))
    .filter((c) => c.front || c.back);
}

function asQuiz(raw: unknown): Array<{ question: string; options: string[]; answer: number }> {
  return (Array.isArray(raw) ? raw : [])
    .map((q: { question?: unknown; options?: unknown; answer?: unknown }) => ({
      question: String(q?.question ?? ''),
      options: Array.isArray(q?.options) ? q.options.map(String) : [],
      answer: typeof q?.answer === 'number' ? q.answer : -1,
    }))
    .filter((q) => q.question);
}

async function loadUpload(uploadId: string, userId: string): Promise<GroundedUpload | null> {
  try {
    const rows = await query<UploadRow>(
      `SELECT "id", "fileName", "summary", "flashcards", "quiz"
       FROM "LectureUpload"
       WHERE "id" = $1 AND "userId" = $2`,
      [uploadId, userId],
    );
    const upload = rows[0];
    if (!upload) return null;
    return {
      id: upload.id,
      fileName: upload.fileName,
      summary: upload.summary,
      flashcards: asFlashcards(upload.flashcards),
      quiz: asQuiz(upload.quiz),
    };
  } catch {
    return null;
  }
}

function uploadBlock(upload: GroundedUpload): string {
  const parts: string[] = [
    `STUDY PACK: ${upload.fileName}`,
    `SUMMARY: ${upload.summary || 'No summary stored for this pack.'}`,
  ];
  if (upload.flashcards.length) {
    parts.push(
      'FLASHCARDS:\n' +
        upload.flashcards.slice(0, 6).map((c) => `- Q: ${c.front} → A: ${c.back}`).join('\n'),
    );
  }
  if (upload.quiz.length) {
    parts.push(
      'QUIZ:\n' +
        upload.quiz
          .slice(0, 4)
          .map(
            (q, i) =>
              `${i + 1}. ${q.question}\n   Options: ${q.options.join(' | ')}` +
              (q.answer >= 0 && q.options[q.answer] ? `\n   Correct: ${q.options[q.answer]}` : ''),
          )
          .join('\n'),
    );
  }
  return parts.join('\n\n');
}

/* ─────────────────────────── search (reuses /curriculum/search matching) ─────────────────────────── */

/** Stopwords that must never drive lesson matching from a chat question. */
const SEARCH_STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'what', 'whats', 'how',
  'why', 'who', 'which', 'where', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'do',
  'does', 'did', 'can', 'could', 'should', 'would', 'will', 'shall', 'may', 'might', 'must',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'it', 'its', 'this', 'that', 'these', 'those',
  'there', 'here', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'from', 'by', 'as', 'about',
  'into', 'over', 'not', 'no', 'yes', 'so', 'than', 'too', 'very', 'just', 'some', 'any',
  'explain', 'please', 'help', 'tell', 'show', 'give', 'make', 'get', 'use', 'using', 'code',
  'example', 'lesson', 'difference', 'between', 'understand', 'meaning', 'means', 'work',
  'works', 'working', 'write', 'writing', 'simple', 'short', 'detail', 'details',
]);

/**
 * Lesson search for grounding, mirroring GET /curriculum/search matching
 * (title, overview, subject, keyConcepts, syntax) with light scoring so a
 * chat question picks the most on-topic lesson, not just any word overlap.
 */
function searchLessons(q: string, limit = 3): FlatLessonEntry[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];

  const words = query
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2 && !SEARCH_STOPWORDS.has(w));
  if (words.length === 0) return [];

  const scored = getAllFlatLessons()
    .map((entry) => {
      const title = entry.lesson.title.toLowerCase();
      const overview = entry.lesson.overview.toLowerCase();
      const subject = entry.subjectName.toLowerCase();
      const module = entry.moduleName.toLowerCase();
      const concepts = (entry.lesson.content.keyConcepts ?? [])
        .map((c) => `${c.title} ${c.definition}`.toLowerCase());
      const syntax = (entry.lesson.content.syntax ?? []).map((s) => s.toLowerCase());

      let score = 0;
      for (const w of words) {
        if (title === w) score += 50;
        else if (title.includes(w)) score += 30;
        if (subject === w) score += 20;
        else if (subject.includes(w)) score += 8;
        if (module.includes(w)) score += 5;
        if (overview.includes(w)) score += 6;
        if (concepts.some((c) => c.includes(w))) score += 15;
        if (syntax.some((s) => s.includes(w))) score += 12;
      }
      // Exact phrase hit in the title is the strongest signal.
      if (title.includes(query)) score += 30;

      return { entry, score };
    })
    .filter((r) => r.score > 0);

  scored.sort((a, b) => b.score - a.score || a.entry.lesson.sortOrder - b.entry.lesson.sortOrder);
  return scored.slice(0, limit).map((r) => r.entry);
}

/* ─────────────────────────── public entry point ─────────────────────────── */

export async function buildGroundingBundle(options: {
  userId: string;
  message: string;
  lessonId?: string;
  uploadId?: string;
}): Promise<GroundingBundle> {
  const { userId, message } = options;
  const [recentUploads, completedLessonTitles] = await Promise.all([
    loadRecentUploads(userId),
    loadCompletedLessonTitles(userId),
  ]);

  const studentBlock =
    (completedLessonTitles.length
      ? `STUDENT PROGRESS: already completed these academy lessons: ${completedLessonTitles.join('; ')}.`
      : '') +
    (recentUploads.length
      ? `\nSTUDENT'S RECENT STUDY PACKS: ${recentUploads
          .map((u) => `"${u.fileName}"`)
          .join(', ')}. Reference them when relevant.`
      : '');

  let bundle: {
    source: GroundingSource;
    contextBlock: string;
    reference: GroundingReference;
    lesson?: GroundedLesson;
    upload?: GroundedUpload;
    starterCode?: string;
    starterLanguage?: string;
  } = { source: 'none', contextBlock: '', reference: {} };

  // 1. Explicit lesson pin — same lesson GET /curriculum/lessons/:lessonId returns.
  if (options.lessonId) {
    const entry = findLessonById(options.lessonId);
    if (entry) {
      bundle = {
        source: 'lesson',
        contextBlock: lessonBlock(entry),
        reference: {
          lessonId: entry.lesson.id,
          lessonTitle: entry.lesson.title,
          subjectName: entry.subjectName,
          moduleName: entry.moduleName,
        },
        lesson: toGroundedLesson(entry),
        starterCode: entry.lesson.content.examples?.[0]?.code,
        starterLanguage: entry.lesson.content.examples?.[0]?.language || entry.subjectId,
      };
    }
  }

  // 2. Explicit study pack — that user's LectureUpload.
  if (bundle.source === 'none' && options.uploadId) {
    const upload = await loadUpload(options.uploadId, userId);
    if (upload) {
      bundle = {
        source: 'upload',
        contextBlock: uploadBlock(upload),
        reference: {
          uploadId: upload.id,
          uploadFileName: upload.fileName,
        },
        upload,
      };
    }
  }

  // 3. Free-text question → reuse the /curriculum/search matching across the academy.
  if (bundle.source === 'none') {
    const matches = searchLessons(message);
    if (matches.length > 0) {
      const best = matches[0];
      bundle = {
        source: 'search',
        contextBlock:
          lessonListBlock(matches) +
          '\n\n' +
          lessonBlock(best) +
          (matches.length > 1
            ? `\n\nAlso briefly connect to: ${matches.slice(1).map((m) => `"${m.lesson.title}"`).join(', ')}.`
            : ''),
        reference: {
          lessonId: best.lesson.id,
          lessonTitle: best.lesson.title,
          subjectName: best.subjectName,
          moduleName: best.moduleName,
        },
        lesson: toGroundedLesson(best),
        starterCode: best.lesson.content.examples?.[0]?.code,
        starterLanguage: best.lesson.content.examples?.[0]?.language || best.subjectId,
      };
    }
  }

  const hasContext = bundle.contextBlock.trim().length > 0;
  const contextBlock = hasContext
    ? truncate(
        bundle.contextBlock +
          (studentBlock ? `\n\n${studentBlock}` : ''),
      )
    : '';

  return {
    source: bundle.source,
    contextBlock,
    reference: bundle.reference,
    lesson: bundle.lesson,
    upload: bundle.upload,
    starterCode: bundle.starterCode,
    starterLanguage: bundle.starterLanguage,
    recentUploads,
    completedLessonTitles,
    hasContext,
  };
}

/* ─────────────────────────── no-API-key fallback synthesis ─────────────────────────── */

/**
 * Tiny general-programming glossary used ONLY when a grounded question is
 * outside the matched lesson. Each entry is clearly labeled as general
 * knowledge, never as LectureToLife curriculum.
 */
const GENERAL_GLOSSARY: Record<string, string> = {
  closure:
    'A closure is a function that remembers the variables from the scope where it was created, even after that outer function has returned. It is how JavaScript keeps private state and powers callbacks.',
  recursion:
    'Recursion is when a function calls itself on a smaller input until it reaches a base case. Every recursive call needs a stopping condition or it will overflow the stack.',
  promise:
    'A promise represents a value that will be available later. It is either pending, fulfilled (use .then / await), or rejected (handle with .catch / try-catch).',
  async:
    'Asynchronous code starts work now and handles the result later, so the program does not block. In modern JavaScript/Node you write async/await around promises.',
  'async/await':
    'async/await is syntax over promises: mark the function async, await the promise, and wrap it in try/catch to handle rejection.',
  hoisting:
    'Hoisting is the JavaScript behaviour where declarations are registered before code runs. var is initialized as undefined, while let/const stay in the temporal dead zone until their declaration line.',
  'big-o':
    'Big-O describes how work grows with input size: O(1) constant, O(log n) halving, O(n) linear, O(n log n) good sorting, O(n²) nested loops.',
  prototype:
    'Objects in JavaScript inherit via the prototype chain: property lookups walk up from the object to its prototype until found or undefined.',
};

function messageTokens(message: string): string[] {
  return message
    .toLowerCase()
    .split(/[^a-z0-9/]+/)
    .filter((w) => w.length >= 2 && !SEARCH_STOPWORDS.has(w));
}

function questionRelatesToLesson(message: string, lesson: GroundedLesson): boolean {
  const tokens = messageTokens(message);
  if (tokens.length === 0) return true;
  const haystack = [
    lesson.title,
    lesson.moduleName,
    lesson.subjectName,
    lesson.overview,
    lesson.explanation,
    ...lesson.keyConcepts.map((c) => `${c.title} ${c.definition ?? ''}`),
    ...lesson.syntax,
    ...(lesson.rules ?? []),
  ]
    .join(' ')
    .toLowerCase();
  const words = new Set(haystack.split(/[^a-z0-9]+/).filter(Boolean));
  return tokens.some((t) => words.has(t) || haystack.includes(t));
}

function lessonLabel(lesson: GroundedLesson): string {
  return `${lesson.subjectName} › ${lesson.moduleName} › ${lesson.title}`;
}

function synthesizeLessonAnswer(message: string, lesson: GroundedLesson): string {
  const related = questionRelatesToLesson(message, lesson);
  const lines: string[] = [];

  lines.push(`Based on: ${lessonLabel(lesson)} (${lesson.difficulty})`);
  lines.push('');

  if (!related) {
    lines.push(
      `Heads up: that question goes beyond the "${lesson.title}" lesson, so this is a general answer plus the closest material from your lesson.`,
    );
    lines.push('');

    const glossaryKey = messageTokens(message).find(
      (t) => GENERAL_GLOSSARY[t] || (t === 'closures' && GENERAL_GLOSSARY.closure),
    );
    const general =
      glossaryKey === 'closures'
        ? GENERAL_GLOSSARY.closure
        : glossaryKey
          ? GENERAL_GLOSSARY[glossaryKey]
          : undefined;
    if (general) {
      lines.push('General answer (not part of this lesson):');
      lines.push(general);
      lines.push('');
    }
  } else {
    lines.push(lesson.explanation);
    lines.push('');
  }

  if (lesson.keyConcepts.length) {
    lines.push('Key points from this lesson:');
    for (const c of lesson.keyConcepts.slice(0, 4)) {
      lines.push(`• ${c.title} — ${c.definition}`);
    }
    lines.push('');
  }

  if (lesson.examples.length) {
    const ex = lesson.examples[0];
    lines.push(`Example from the lesson (${ex.language || 'code'}):`);
    lines.push('```');
    lines.push(ex.code);
    lines.push('```');
    if (ex.explanation) lines.push(`What it does: ${ex.explanation}`);
    lines.push('');
  }

  if (lesson.rules.length) {
    lines.push(`Lesson rule: ${lesson.rules[0]}`);
  }
  if (lesson.quiz) {
    lines.push(`Check yourself: ${lesson.quiz.question}`);
  }

  lines.push('');
  lines.push(
    `Full reference: ${lesson.sourceUrl} (${W3SCHOOLS_BASE_SOURCE.name} — LectureToLife Programming Academy)`,
  );
  return lines.join('\n');
}

function synthesizeUploadAnswer(message: string, upload: GroundedUpload): string {
  const lines: string[] = [];
  lines.push(`Based on: your study pack "${upload.fileName}"`);
  lines.push('');
  lines.push(upload.summary || 'This pack has no stored summary yet.');
  lines.push('');

  const matchedCards = messageTokens(message).length
    ? upload.flashcards.filter((c) =>
        messageTokens(message).some((t) => `${c.front} ${c.back}`.toLowerCase().includes(t)),
      )
    : [];
  const cards = (matchedCards.length ? matchedCards : upload.flashcards).slice(0, 4);
  if (cards.length) {
    lines.push('Flashcards that match your question:');
    for (const c of cards) {
      lines.push(`• ${c.front} → ${c.back}`);
    }
    lines.push('');
  }

  const matchedQuiz = messageTokens(message).length
    ? upload.quiz.filter((q) =>
        messageTokens(message).some((t) => `${q.question} ${q.options.join(' ')}`.toLowerCase().includes(t)),
      )
    : [];
  const quiz = (matchedQuiz.length ? matchedQuiz : upload.quiz).slice(0, 3);
  if (quiz.length) {
    lines.push('Related quiz items:');
    for (const q of quiz) {
      lines.push(`• ${q.question}${q.answer >= 0 && q.options[q.answer] ? ` → ${q.options[q.answer]}` : ''}`);
    }
  }

  return lines.join('\n');
}

/**
 * Offline fallback for grounded questions. Synthesizes the answer from the
 * matched lesson / study pack (explanation, key concepts, example) instead of
 * returning canned copy. Only a question with NO matched context gets the
 * "add GEMINI_API_KEY" notice.
 */
export function buildGroundedFallback(
  message: string,
  bundle: GroundingBundle,
  historySummary?: string,
): string {
  if (!bundle.hasContext) {
    return (
      "I'm SynergySphere AI running in demo mode, and I couldn't match your question to a LectureToLife lesson or one of your study packs.\n\n" +
      'Try naming a topic from the Programming Academy (e.g. "Explain SQL JOINs" or "How does a for loop work?") or ask from inside a lesson.\n\n' +
      '⚡ For full AI answers, add GEMINI_API_KEY to backend/.env (free at aistudio.google.com).'
    );
  }

  const body = bundle.lesson
    ? synthesizeLessonAnswer(message, bundle.lesson)
    : bundle.upload
      ? synthesizeUploadAnswer(message, bundle.upload)
      : bundle.contextBlock;

  const parts: string[] = [body];
  if (historySummary) {
    parts.push('', `(Continuing from earlier: ${historySummary})`);
  }
  return parts.join('\n').slice(0, 4000);
}
