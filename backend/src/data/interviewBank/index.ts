import type { InterviewQuestion, QuestionDifficulty, QuestionType } from './types.js';
import { javaQuestions } from './java.js';
import { pythonQuestions } from './python.js';
import { javascriptQuestions } from './javascript.js';
import { typescriptQuestions } from './typescript.js';
import { cppQuestions } from './cpp.js';
import { csharpQuestions } from './csharp.js';
import { sqlQuestions } from './sql.js';
import { htmlQuestions } from './html.js';
import { cssQuestions } from './css.js';
import { reactQuestions } from './react.js';
import { nodejsQuestions } from './nodejs.js';

export * from './types.js';
export {
  javaQuestions,
  pythonQuestions,
  javascriptQuestions,
  typescriptQuestions,
  cppQuestions,
  csharpQuestions,
  sqlQuestions,
  htmlQuestions,
  cssQuestions,
  reactQuestions,
  nodejsQuestions,
};

export interface TrackDefinition {
  id: string;
  name: string;
  category: 'Language' | 'Framework' | 'Composite';
  componentTopics: string[]; // catalog ids
  description: string;
}

export const ALL_INTERVIEW_TRACKS: TrackDefinition[] = [
  // 11 Core Languages & Frameworks from Learning Hub
  { id: 'java', name: 'Java', category: 'Language', componentTopics: ['java'], description: 'Core Java, OOP, JVM, Collections, Concurrency & Spring Boot' },
  { id: 'python', name: 'Python', category: 'Language', componentTopics: ['python'], description: 'Python 3, Data Structures, OOP, AsyncIO, Generators & Decorators' },
  { id: 'javascript', name: 'JavaScript', category: 'Language', componentTopics: ['javascript'], description: 'ES6+, Event Loop, Promises, Closures, DOM & Prototypal Inheritance' },
  { id: 'typescript', name: 'TypeScript', category: 'Language', componentTopics: ['typescript'], description: 'Generics, Utility Types, Discriminated Unions, Narrowing & Type System' },
  { id: 'cpp', name: 'C++', category: 'Language', componentTopics: ['cpp'], description: 'Modern C++17/20, Pointers, RAII, STL, Move Semantics & Templates' },
  { id: 'csharp', name: 'C#', category: 'Language', componentTopics: ['csharp'], description: '.NET CLR, LINQ, Async/Await, Memory, ASP.NET Core & EF Core' },
  { id: 'sql', name: 'SQL', category: 'Language', componentTopics: ['sql'], description: 'Relational DBs, Joins, Indexing, Window Functions, EXPLAIN & Transactions' },
  { id: 'html', name: 'HTML', category: 'Language', componentTopics: ['html'], description: 'HTML5 Semantics, Accessibility (a11y), Forms, DOM Tree & Web Components' },
  { id: 'css', name: 'CSS', category: 'Language', componentTopics: ['css'], description: 'Flexbox, Grid, Cascade, Specificity, BEM, Animations & Responsive Design' },
  { id: 'react', name: 'React', category: 'Framework', componentTopics: ['react'], description: 'Hooks, Fiber, Reconciliation, State Management, Portals & React 18' },
  { id: 'nodejs', name: 'Node.js', category: 'Framework', componentTopics: ['nodejs'], description: 'Event Loop, Libuv, Streams, Worker Threads, Buffers & Architecture' },

  // Composite Role Tracks
  {
    id: 'web-dev',
    name: 'Web Development',
    category: 'Composite',
    componentTopics: ['html', 'css', 'javascript', 'react'],
    description: 'Modern front-end & web engineering: HTML5, CSS Grid, Modern JS & React',
  },
  {
    id: 'backend',
    name: 'Backend',
    category: 'Composite',
    componentTopics: ['java', 'python', 'nodejs', 'sql'],
    description: 'Server architectures, APIs, SQL databases, concurrency & distributed systems',
  },
  {
    id: 'full-stack',
    name: 'Full-Stack',
    category: 'Composite',
    componentTopics: ['html', 'css', 'javascript', 'typescript', 'react', 'nodejs', 'sql'],
    description: 'End-to-end web engineering across client, server, database, and DevOps',
  },
];

export const QUESTION_BANK_BY_TOPIC: Record<string, InterviewQuestion[]> = {
  java: javaQuestions,
  python: pythonQuestions,
  javascript: javascriptQuestions,
  typescript: typescriptQuestions,
  cpp: cppQuestions,
  csharp: csharpQuestions,
  sql: sqlQuestions,
  html: htmlQuestions,
  css: cssQuestions,
  react: reactQuestions,
  nodejs: nodejsQuestions,
};

export const ALL_QUESTIONS: InterviewQuestion[] = [
  ...javaQuestions,
  ...pythonQuestions,
  ...javascriptQuestions,
  ...typescriptQuestions,
  ...cppQuestions,
  ...csharpQuestions,
  ...sqlQuestions,
  ...htmlQuestions,
  ...cssQuestions,
  ...reactQuestions,
  ...nodejsQuestions,
];

export const QUESTION_MAP: Map<string, InterviewQuestion> = new Map(
  ALL_QUESTIONS.map((q) => [q.id, q])
);

/**
 * Resolves any incoming topic string (slug or display name or alias) to matching TrackDefinition
 */
export function resolveTrack(topicInput?: string): TrackDefinition | undefined {
  if (!topicInput || typeof topicInput !== 'string') return undefined;
  const normalized = topicInput.trim().toLowerCase().replace(/[\s_]+/g, '-');

  // Exact slug matches
  const directMatch = ALL_INTERVIEW_TRACKS.find(
    (t) => t.id === normalized || t.name.toLowerCase() === topicInput.trim().toLowerCase()
  );
  if (directMatch) return directMatch;

  // Aliases
  const aliasMap: Record<string, string> = {
    'c++': 'cpp',
    'c#': 'csharp',
    'c-sharp': 'csharp',
    'node': 'nodejs',
    'node.js': 'nodejs',
    'js': 'javascript',
    'ts': 'typescript',
    'web': 'web-dev',
    'web-development': 'web-dev',
    'web development': 'web-dev',
    'frontend': 'web-dev',
    'front-end': 'web-dev',
    'backend': 'backend',
    'backend-developer': 'backend',
    'backend developer': 'backend',
    'fullstack': 'full-stack',
    'full-stack': 'full-stack',
    'full stack': 'full-stack',
    'full-stack developer': 'full-stack',
  };

  const aliasTarget = aliasMap[normalized] || aliasMap[topicInput.trim().toLowerCase()];
  if (aliasTarget) {
    return ALL_INTERVIEW_TRACKS.find((t) => t.id === aliasTarget);
  }

  return undefined;
}

export interface SessionSelectionOptions {
  topic: string;
  count?: 10 | 20 | 30 | number;
  mode?: 'mixed' | 'conceptual' | 'coding';
  excludedQuestionIds?: string[]; // Questions user already scored >= 80 on
  weakAreas?: string[]; // Tags or keywords to prioritize
}

/**
 * Selects questions from the bank for an interview session:
 * - 40% easy, 40% medium, 20% hard
 * - Avoids excluded question IDs unless bank is exhausted
 * - Prioritizes questions matching weak areas
 * - Filters by mode if 'conceptual' or 'coding' specified
 */
export function selectSessionQuestions(options: SessionSelectionOptions): InterviewQuestion[] {
  const track = resolveTrack(options.topic) || ALL_INTERVIEW_TRACKS[0]; // fallback to Java
  const targetCount = Math.min(Math.max(options.count || 10, 5), 30);
  const mode = options.mode || 'mixed';
  const excludedSet = new Set(options.excludedQuestionIds || []);
  const weakAreas = (options.weakAreas || []).map((w) => w.toLowerCase());

  // Aggregate questions from component topics
  let pool: InterviewQuestion[] = [];
  for (const topicId of track.componentTopics) {
    const topicQuestions = QUESTION_BANK_BY_TOPIC[topicId] || [];
    pool.push(...topicQuestions);
  }

  // Filter by mode
  if (mode === 'coding') {
    const codingOnly = pool.filter((q) => q.type === 'coding');
    if (codingOnly.length >= targetCount) {
      pool = codingOnly;
    }
  } else if (mode === 'conceptual') {
    const conceptualOnly = pool.filter((q) => q.type !== 'coding');
    if (conceptualOnly.length >= targetCount) {
      pool = conceptualOnly;
    }
  }

  // Split into fresh questions (not yet mastered) vs already answered
  let freshPool = pool.filter((q) => !excludedSet.has(q.id));
  if (freshPool.length < targetCount) {
    // Bank exhausted for this track; reuse all
    freshPool = [...pool];
  }

  // Partition by difficulty
  const easy = freshPool.filter((q) => q.difficulty === 'easy');
  const medium = freshPool.filter((q) => q.difficulty === 'medium');
  const hard = freshPool.filter((q) => q.difficulty === 'hard');

  const targetEasy = Math.round(targetCount * 0.4);
  const targetHard = Math.round(targetCount * 0.2);
  const targetMed = targetCount - targetEasy - targetHard; // ~40%

  function scoreWeakAreaRelevance(q: InterviewQuestion): number {
    if (weakAreas.length === 0) return 0;
    let score = 0;
    for (const tag of q.tags) {
      if (weakAreas.some((wa) => wa.includes(tag.toLowerCase()) || tag.toLowerCase().includes(wa))) {
        score += 3;
      }
    }
    for (const wa of weakAreas) {
      if (q.prompt.toLowerCase().includes(wa)) score += 2;
    }
    return score;
  }

  function pickFromSubpool(subpool: InterviewQuestion[], needed: number): InterviewQuestion[] {
    if (subpool.length === 0) return [];
    // Sort primarily by weak area relevance descending, with slight shuffle
    const sorted = [...subpool].sort((a, b) => {
      const scoreDiff = scoreWeakAreaRelevance(b) - scoreWeakAreaRelevance(a);
      if (scoreDiff !== 0) return scoreDiff;
      return Math.random() - 0.5;
    });
    return sorted.slice(0, needed);
  }

  const selectedEasy = pickFromSubpool(easy, targetEasy);
  const selectedMed = pickFromSubpool(medium, targetMed);
  const selectedHard = pickFromSubpool(hard, targetHard);

  const selectedSet = new Set<string>();
  const results: InterviewQuestion[] = [];

  for (const q of [...selectedEasy, ...selectedMed, ...selectedHard]) {
    if (!selectedSet.has(q.id)) {
      selectedSet.add(q.id);
      results.push(q);
    }
  }

  // If we're short of targetCount due to small category sizes, fill from remaining
  if (results.length < targetCount) {
    const remaining = freshPool.filter((q) => !selectedSet.has(q.id));
    const extra = pickFromSubpool(remaining, targetCount - results.length);
    for (const q of extra) {
      if (!selectedSet.has(q.id)) {
        selectedSet.add(q.id);
        results.push(q);
      }
    }
  }

  // Shuffle final list so difficulty is naturally distributed
  return results.sort(() => Math.random() - 0.5);
}
