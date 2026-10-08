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
  W3SCHOOLS_BASE_SOURCE,
} from '../data/w3schoolsCurriculumData.js';
import type { FlatLessonEntry } from '../data/curriculumAliases.js';
import { findLessonEntry, getAllFlatLessons } from '../data/curriculumCatalog.js';
import { searchLearningHub, parseLearningHubQuery, type LearningHubMatch } from './learningHubSearch.js';
import { LEARNING_HUB_CHALLENGES, type LearningHubChallenge } from '../data/learningHubChallenges.js';

export { getAllFlatLessons, searchLearningHub, LEARNING_HUB_CHALLENGES };

export const GROUNDING_CHAR_LIMIT = 8000;

export type GroundingSource = 'lesson' | 'challenge' | 'upload' | 'search' | 'none';

export interface GroundingReference {
  lessonId?: string;
  lessonTitle?: string;
  subjectName?: string;
  moduleName?: string;
  challengeId?: string;
  challengeTitle?: string;
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

export interface GroundedChallenge {
  id: string;
  title: string;
  language: string;
  difficulty: string;
  description: string;
  starterCode?: string;
  xpReward: number;
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
  /** Structured matched coding challenge, used for no-API-key synthesis. */
  challenge?: GroundedChallenge;
  /** Structured matched study pack, used for no-API-key synthesis. */
  upload?: GroundedUpload;
  /** First code example or starter code of the matched item, used to prefill the web editor. */
  starterCode?: string;
  starterLanguage?: string;
  recentUploads: RecentUploadRef[];
  completedLessonTitles: string[];
  hasContext: boolean;
}

function findLessonById(lessonId: string): FlatLessonEntry | undefined {
  return findLessonEntry(lessonId)?.entry;
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

/* ─────────────────────────── challenge grounding ─────────────────────────── */

function challengeBlock(challenge: LearningHubChallenge): string {
  const parts: string[] = [
    `LEARNING HUB CODING CHALLENGE: ${challenge.title}`,
    `TRACK / LANGUAGE: ${challenge.language || 'Multi-language'}`,
    `DIFFICULTY: ${challenge.difficulty} (XP Reward: ${challenge.xpReward})`,
    `DESCRIPTION: ${challenge.description}`,
  ];
  if (challenge.starterCode) {
    parts.push(`STARTER CODE:\n\`\`\`${challenge.language || 'code'}\n${challenge.starterCode}\n\`\`\``);
  }
  parts.push(
    'TUTOR OBJECTIVE: Guide the student through solving this challenge step-by-step. Explain the algorithmic pattern, edge cases, and test requirements. Help with debugging without simply providing the entire solution upfront unless asked.',
  );
  return parts.join('\n\n');
}

/* ─────────────────────────── public entry point ─────────────────────────── */

export async function buildGroundingBundle(options: {
  userId: string;
  message: string;
  lessonId?: string;
  challengeId?: string;
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
    challenge?: GroundedChallenge;
    upload?: GroundedUpload;
    starterCode?: string;
    starterLanguage?: string;
  } = { source: 'none', contextBlock: '', reference: {} };

  // 1. Explicit challenge pin — from Learning Hub Coding Challenges
  if (options.challengeId) {
    const matchedChallenge = LEARNING_HUB_CHALLENGES.find((c) => c.id === options.challengeId);
    if (matchedChallenge) {
      bundle = {
        source: 'challenge',
        contextBlock: challengeBlock(matchedChallenge),
        reference: {
          challengeId: matchedChallenge.id,
          challengeTitle: matchedChallenge.title,
          subjectName: matchedChallenge.language || 'Coding Challenge',
        },
        challenge: {
          id: matchedChallenge.id,
          title: matchedChallenge.title,
          language: matchedChallenge.language || 'code',
          difficulty: matchedChallenge.difficulty,
          description: matchedChallenge.description,
          starterCode: matchedChallenge.starterCode || undefined,
          xpReward: matchedChallenge.xpReward,
        },
        starterCode: matchedChallenge.starterCode || undefined,
        starterLanguage: matchedChallenge.language || 'code',
      };
    }
  }

  // 2. Explicit lesson pin — same lesson GET /curriculum/lessons/:lessonId returns.
  if (bundle.source === 'none' && options.lessonId) {
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

  // 3. Explicit study pack — that user's LectureUpload.
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

  // 4. Free-text search using high-accuracy word recognition across Learning Hub
  if (bundle.source === 'none') {
    const matches = searchLearningHub(message, 3);
    if (matches.length > 0) {
      const best = matches[0];
      if (best.type === 'challenge' && best.rawChallenge) {
        bundle = {
          source: 'challenge',
          contextBlock: challengeBlock(best.rawChallenge),
          reference: {
            challengeId: best.id,
            challengeTitle: best.title,
            subjectName: best.subjectName,
          },
          challenge: {
            id: best.id,
            title: best.title,
            language: best.subjectName,
            difficulty: best.difficulty,
            description: best.overview,
            starterCode: best.starterCode,
            xpReward: best.rawChallenge.xpReward,
          },
          starterCode: best.starterCode,
          starterLanguage: best.starterLanguage,
        };
      } else if (best.rawLesson) {
        const lessonEntries = matches
          .map((m) => m.rawLesson)
          .filter((l): l is FlatLessonEntry => Boolean(l));
        bundle = {
          source: 'search',
          contextBlock:
            (lessonEntries.length > 1 ? lessonListBlock(lessonEntries) + '\n\n' : '') +
            lessonBlock(best.rawLesson),
          reference: {
            lessonId: best.id,
            lessonTitle: best.title,
            subjectName: best.subjectName,
            moduleName: best.moduleName,
          },
          lesson: toGroundedLesson(best.rawLesson),
          starterCode: best.starterCode,
          starterLanguage: best.starterLanguage,
        };
      }
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
    challenge: bundle.challenge,
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
  return parseLearningHubQuery(message).tokens;
}

function questionRelatesToLesson(message: string, lesson: GroundedLesson): boolean {
  const tokens = messageTokens(message);
  if (tokens.length === 0) return true;

  // If the user asks about a specific advanced topic from the glossary (e.g. closure, promise),
  // but the lesson's title/key concepts don't teach that specific topic, treat as beyond lesson.
  const glossaryTerm = tokens.find(
    (t) => GENERAL_GLOSSARY[t] || (t === 'closures' && GENERAL_GLOSSARY.closure),
  );
  if (glossaryTerm) {
    const coreTopics = [lesson.title, ...lesson.keyConcepts.map((c) => c.title)]
      .join(' ')
      .toLowerCase();
    const normalizedTerm = glossaryTerm === 'closures' ? 'closure' : glossaryTerm;
    if (!coreTopics.includes(normalizedTerm)) {
      return false;
    }
  }

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

function synthesizeChallengeAnswer(message: string, challenge: GroundedChallenge): string {
  const lines: string[] = [];
  lines.push(`Based on Learning Hub Challenge: "${challenge.title}" (${challenge.language || 'Code'} • ${challenge.difficulty})`);
  lines.push('');
  lines.push(`**Objective:** ${challenge.description}`);
  lines.push('');
  lines.push('### Problem Breakdown & Algorithm Approach:');

  const lower = challenge.title.toLowerCase();
  if (lower.includes('fizzbuzz')) {
    lines.push('1. Loop from 1 up to `n`.');
    lines.push('2. **Order of conditions matters:** check `n % 15 === 0` (or both 3 and 5) first!');
    lines.push('3. Check multiples of 3 (`n % 3 === 0`) for "Fizz".');
    lines.push('4. Check multiples of 5 (`n % 5 === 0`) for "Buzz".');
    lines.push('5. Otherwise, return the number itself.');
  } else if (lower.includes('two sum')) {
    lines.push('1. **Brute force:** O(n²) checks every pair with two nested loops.');
    lines.push('2. **Optimal O(n) solution:** Use a Map/dictionary to store numbers and their indices.');
    lines.push('3. For each number `x`, check if `target - x` is already in your map.');
    lines.push('4. If found, return `[map.get(target - x), currentIndex]`.');
  } else if (lower.includes('binary search')) {
    lines.push('1. Maintain two pointers: `left = 0` and `right = arr.length - 1`.');
    lines.push('2. While `left <= right`, compute `mid = Math.floor((left + right) / 2)`.');
    lines.push('3. If `arr[mid] === target`, return `mid`.');
    lines.push('4. If `arr[mid] < target`, move `left = mid + 1`.');
    lines.push('5. If `arr[mid] > target`, move `right = mid - 1`.');
    lines.push('6. Return `-1` if not found.');
  } else if (lower.includes('hello world')) {
    lines.push('1. Define the required function `greet()`.');
    lines.push('2. Return the exact greeting string: `"Hello, SynergySphere!"`.');
  } else if (lower.includes('sum array')) {
    lines.push('1. Iterate through the array using a loop or `.reduce((sum, x) => sum + x, 0)`.');
    lines.push('2. Ensure an empty array returns `0`.');
  } else {
    lines.push('1. Clarify expected inputs, outputs, and edge cases (e.g. empty lists, negative inputs).');
    lines.push('2. Break down the core logic into discrete steps before writing code.');
    lines.push('3. Consider time and space complexity: choose data structures that avoid unnecessary passes.');
  }

  if (challenge.starterCode) {
    lines.push('');
    lines.push('**Starter Code:**');
    lines.push('```' + (challenge.language || ''));
    lines.push(challenge.starterCode);
    lines.push('```');
  }

  lines.push('');
  lines.push(`💡 Ready to write and test your code? Open **Learning Hub → Coding Challenges** to run live tests and earn ${challenge.xpReward} XP!`);
  return lines.join('\n');
}

/**
 * Offline fallback for grounded questions. Synthesizes the answer from the
 * matched lesson / challenge / study pack (explanation, key concepts, example) instead of
 * returning canned copy. Only a question with NO matched context gets the
 * "add GEMINI_API_KEY" notice.
 */
function isAskingAboutSnippet(message: string): boolean {
  return (
    /```/.test(message) ||
    /\b(this code|the code|my code|the snippet|code context|walk through|debug|optimi[sz]e|generate tests|unit test)\b/i.test(
      message,
    )
  );
}

export function buildGroundedFallback(
  message: string,
  bundle: GroundingBundle,
  historySummary?: string,
  codeContext?: string,
): string {
  const code = isAskingAboutSnippet(message) ? extractCode(message, codeContext) : null;
  if (code) {
    const walkthrough = synthesizeCodeExplanation(message, code);
    if (!bundle.lesson && !bundle.challenge && !bundle.upload) return walkthrough;
    const grounded = bundle.lesson
      ? synthesizeLessonAnswer(message, bundle.lesson)
      : bundle.challenge
        ? synthesizeChallengeAnswer(message, bundle.challenge)
        : bundle.upload
          ? synthesizeUploadAnswer(message, bundle.upload)
          : '';
    return `${walkthrough}\n\n---\nHow this connects to LectureToLife:\n${grounded}`.slice(0, 4000);
  }

  if (!bundle.hasContext) {
    return (
      "I'm SynergySphere AI running in demo mode, and I couldn't match your question to a LectureToLife lesson, a coding challenge, or one of your study packs.\n\n" +
      'Try naming a topic from the Programming Academy (e.g. "Explain SQL JOINs" or "How does a for loop work in Python?") or ask about a challenge (e.g. "How to solve FizzBuzz?").\n\n' +
      '⚡ For full AI answers, add GEMINI_API_KEY to backend/.env (free at aistudio.google.com).'
    );
  }

  const body = bundle.lesson
    ? synthesizeLessonAnswer(message, bundle.lesson)
    : bundle.challenge
      ? synthesizeChallengeAnswer(message, bundle.challenge)
      : bundle.upload
        ? synthesizeUploadAnswer(message, bundle.upload)
        : bundle.contextBlock;

  const parts: string[] = [body];
  if (historySummary) {
    parts.push('', `(Continuing from earlier: ${historySummary})`);
  }
  return parts.join('\n').slice(0, 4000);
}

function extractCode(message: string, codeContext?: string): string | null {
  if (codeContext?.trim()) return codeContext.trim();

  const fencedCode = message.match(/```(?:[\w+-]+)?\s*\n?([\s\S]*?)```/);
  if (fencedCode?.[1]?.trim()) return fencedCode[1].trim();

  return null;
}

function inferCodeLanguage(code: string): string {
  if (/\b(public\s+)?class\s+\w+|System\.out\.print|\bvoid\s+main\b/.test(code)) return 'Java';
  if (/\bdef\s+\w+\s*\(|\bprint\(|\bimport\s+\w+/.test(code)) return 'Python';
  if (/\bSELECT\b|\bINSERT\s+INTO\b|\bCREATE\s+TABLE\b/i.test(code)) return 'SQL';
  if (/\binterface\s+\w+|:\s*(string|number|boolean)\b|\btype\s+\w+\s*=/.test(code)) return 'TypeScript';
  if (/\bfunction\s+\w+\s*\(|=>|\bconst\s+|\blet\s+/.test(code)) return 'JavaScript';
  if (/^\s*#include\s*[<\"]/.test(code)) return 'C/C++';
  return 'code';
}

function firstMatch(code: string, pattern: RegExp): string | undefined {
  return code.match(pattern)?.slice(1).find(Boolean);
}

function synthesizeCodeExplanation(message: string, code: string): string {
  const language = inferCodeLanguage(code);
  const normalizedLines = code.split(/\r?\n/);
  const codeLines = normalizedLines.filter((line) => line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('#'));
  const functionName = firstMatch(code, /(?:function|def)\s+(\w+)\s*\(|(?:public|private|protected)?\s*(?:static\s+)?[\w<>\[\]]+\s+(\w+)\s*\(/);
  const className = firstMatch(code, /\bclass\s+(\w+)/);
  const variables = [...code.matchAll(/\b(?:const|let|var|final|int|double|String|boolean)\s+(\w+)/g)]
    .map((match) => match[1])
    .filter((name, index, all) => all.indexOf(name) === index)
    .slice(0, 5);
  const hasLoop = /\b(for|while|forEach)\b/.test(code);
  const loopCount = (code.match(/\b(for|while|forEach)\b/g) || []).length;
  const hasCondition = /\b(if|else if|switch|case)\b/.test(code);
  const returns = [...code.matchAll(/\breturn\s+([^;\n}]+)/g)].map((match) => match[1].trim()).slice(0, 3);
  const isDebugRequest = /\b(debug|bug|fix|error)\b/i.test(message);
  const isOptimizationRequest = /\b(optimi[sz]e|improve|refactor|performance)\b/i.test(message);
  const isTestRequest = /\b(test|spec)\b/i.test(message);
  const purpose =
    /new\s+Set\s*\(/.test(code) && /return\s+\[?\.\.\./.test(code)
      ? 'remove duplicate values by keeping only values that have not been seen before.'
      : /\.sort\s*\(/.test(code)
        ? 'sort a collection into a chosen order.'
        : /\.filter\s*\(/.test(code)
          ? 'keep only the values that satisfy a condition.'
          : /\.map\s*\(/.test(code)
            ? 'transform each value in a collection into a new value.'
            : /\.reduce\s*\(/.test(code)
              ? 'combine a collection into one accumulated result.'
              : undefined;

  const lines: string[] = [
    `Here is a code-specific walkthrough (${language}; ${codeLines.length} non-empty lines):`,
    '',
  ];

  if (purpose) lines.push(`• **Likely purpose:** this code appears to ${purpose}`);
  if (className) lines.push(`• **Structure:** it defines the \`${className}\` class.`);
  if (functionName) lines.push(`• **Entry point:** \`${functionName}\` is the main function/method that performs the work.`);
  if (variables.length) lines.push(`• **State:** it creates \`${variables.join('`, `')}\`, which hold the values used by the logic.`);
  if (hasLoop) lines.push(`• **Iteration:** it uses ${loopCount > 1 ? `${loopCount} loop constructs` : 'a loop'} to process repeated data or steps.`);
  if (hasCondition) lines.push('• **Decisions:** its conditional logic chooses different behaviour depending on the input or current state.');
  if (returns.length) lines.push(`• **Result:** it returns ${returns.map((value) => `\`${value}\``).join(' or ')}.`);

  if (!className && !functionName && !variables.length && !hasLoop && !hasCondition && !returns.length) {
    lines.push('• This snippet is mostly expressions or declarations, so its effect comes from the values it creates or calls it makes.');
  }

  lines.push('', 'How to read it step by step:');
  normalizedLines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;

    let explanation: string | undefined;
    if (/\b(?:function|def)\s+\w+\s*\(/.test(trimmed)) explanation = 'declares a reusable function and its inputs.';
    else if (/\bclass\s+\w+/.test(trimmed)) explanation = 'declares a class that groups related data and behaviour.';
    else if (/\b(for|while|forEach)\b/.test(trimmed)) explanation = 'starts repeated work over a collection or while a condition remains true.';
    else if (/\b(if|else if|switch|case)\b/.test(trimmed)) explanation = 'checks a condition and selects the matching path.';
    else if (/\breturn\b/.test(trimmed)) explanation = 'finishes this function/method and sends a value back to its caller.';
    else if (/\b(?:const|let|var|final|int|double|String|boolean)\b/.test(trimmed)) explanation = 'creates or updates a named value used later in the code.';
    else if (/\w+\s*\(/.test(trimmed)) explanation = 'calls a function or method to perform an operation.';

    if (explanation) lines.push(`${index + 1}. Line ${index + 1}: ${explanation} (\`${trimmed.slice(0, 110)}\`)`);
  });

  lines.push('', 'Complexity and review notes:');
  if (loopCount >= 2) lines.push('• The visible loops may be O(n²) if one loop runs inside another; if they are separate, the work is closer to O(n).');
  else if (hasLoop) lines.push('• The visible loop suggests at least O(n) time for one pass through its input.');
  else lines.push('• No loops are visible, so this snippet is likely O(1) aside from any work inside called functions.');
  if (/\bvar\s+/.test(code)) lines.push('• Consider replacing \`var\` with \`const\` or \`let\` to make scope and reassignment clearer.');
  if (/<=\s*\w+\.length|<\s*=\s*\w+\.length/.test(code)) lines.push('• Check loop bounds carefully: indexing through \`.length\` usually needs \`< length\`, not \`<= length\`.');
  if (/==(?!=)/.test(code) && language === 'JavaScript') lines.push('• Consider \`===\` instead of \`==\` in JavaScript to avoid implicit type conversion.');

  if (isDebugRequest) lines.push('', 'For debugging, share the exact input, expected output, actual output, and any error message so the issue can be narrowed down.');
  if (isOptimizationRequest) lines.push('', 'For optimization, measure the slow input first; the biggest gain is usually avoiding repeated work inside the loop.');
  if (isTestRequest) lines.push('', 'Useful tests include a normal input, an empty input, a single item, duplicate values, and boundary values.');

  lines.push('', 'For deeper, conversational explanations and fixes, configure GEMINI_API_KEY or OPENAI_API_KEY in backend/.env.');
  return lines.join('\n').slice(0, 4000);
}
