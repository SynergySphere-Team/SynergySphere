import type {
  InterviewQuestion,
  InterviewRole,
  InterviewType,
  InterviewerStyle,
} from './types.js';
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
import { behavioralQuestions } from './behavioral.js';
import { systemDesignQuestions } from './systemDesign.js';

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
  behavioralQuestions,
  systemDesignQuestions,
};

export interface TrackDefinition {
  id: string;
  name: string;
  category: 'Language' | 'Framework' | 'Composite' | 'Specialized';
  componentTopics: string[]; // catalog ids
  description: string;
}

export const ALL_INTERVIEW_TRACKS: TrackDefinition[] = [
  // 11 Core Languages & Frameworks from Learning Hub
  { id: 'csharp', name: 'C# / .NET', category: 'Language', componentTopics: ['csharp'], description: '.NET CLR, LINQ, Async/Await, Memory, ASP.NET Core & EF Core' },
  { id: 'java', name: 'Java', category: 'Language', componentTopics: ['java'], description: 'Core Java, OOP, JVM, Collections, Concurrency & Spring Boot' },
  { id: 'python', name: 'Python', category: 'Language', componentTopics: ['python'], description: 'Python 3, Data Structures, OOP, AsyncIO, Generators & Decorators' },
  { id: 'javascript', name: 'JavaScript', category: 'Language', componentTopics: ['javascript'], description: 'ES6+, Event Loop, Promises, Closures, DOM & Prototypal Inheritance' },
  { id: 'typescript', name: 'TypeScript', category: 'Language', componentTopics: ['typescript'], description: 'Generics, Utility Types, Discriminated Unions, Narrowing & Type System' },
  { id: 'cpp', name: 'C++', category: 'Language', componentTopics: ['cpp'], description: 'Modern C++17/20, Pointers, RAII, STL, Move Semantics & Templates' },
  { id: 'sql', name: 'SQL & Relational DBs', category: 'Language', componentTopics: ['sql'], description: 'Relational DBs, Joins, Indexing, Window Functions, EXPLAIN & Transactions' },
  { id: 'html', name: 'HTML & Accessibility', category: 'Language', componentTopics: ['html'], description: 'HTML5 Semantics, Accessibility (a11y), Forms, DOM Tree & Web Components' },
  { id: 'css', name: 'CSS & Modern Layouts', category: 'Language', componentTopics: ['css'], description: 'Flexbox, Grid, Cascade, Specificity, BEM, Animations & Responsive Design' },
  { id: 'react', name: 'React', category: 'Framework', componentTopics: ['react'], description: 'Hooks, Fiber, Reconciliation, State Management, Portals & React 18' },
  { id: 'nodejs', name: 'Node.js', category: 'Framework', componentTopics: ['nodejs'], description: 'Event Loop, Libuv, Streams, Worker Threads, Buffers & Architecture' },
  { id: 'system-design', name: 'System Design & Cloud', category: 'Specialized', componentTopics: ['system-design', 'cloud', 'security'], description: 'Distributed systems, Rate limiting, Caching, OWASP Security & Cloud Architecture' },
  { id: 'behavioral', name: 'Behavioural & Leadership', category: 'Specialized', componentTopics: ['behavioral'], description: 'STAR method, Teamwork, Conflict resolution, Production failures & Stakeholder communication' },

  // Composite Role Tracks
  {
    id: 'web-dev',
    name: 'Frontend Web Development',
    category: 'Composite',
    componentTopics: ['html', 'css', 'javascript', 'react'],
    description: 'Modern front-end & web engineering: HTML5, CSS Grid, Modern JS & React',
  },
  {
    id: 'backend',
    name: 'Backend Engineering',
    category: 'Composite',
    componentTopics: ['csharp', 'java', 'python', 'nodejs', 'sql', 'system-design'],
    description: 'Server architectures, APIs, SQL databases, concurrency & distributed systems',
  },
  {
    id: 'full-stack',
    name: 'Full-Stack Software Engineer',
    category: 'Composite',
    componentTopics: ['html', 'css', 'javascript', 'typescript', 'react', 'nodejs', 'sql', 'csharp'],
    description: 'End-to-end web engineering across client, server, database, and architecture',
  },
];

export const ALL_INTERVIEW_ROLES: { id: InterviewRole; label: string; primaryTrack: string; description: string }[] = [
  { id: 'Software Engineering Intern', label: 'Software Engineering Intern', primaryTrack: 'csharp', description: 'Core CS fundamentals, OOP, data structures, algorithms, and clean coding' },
  { id: 'Junior Software Developer', label: 'Junior Software Developer', primaryTrack: 'full-stack', description: 'Practical coding, debugging, API integration, and collaborative version control' },
  { id: 'Software Developer', label: 'Software Developer', primaryTrack: 'csharp', description: 'SOLID principles, layered architecture, unit testing, and design patterns' },
  { id: 'Backend Developer', label: 'Backend Developer', primaryTrack: 'backend', description: 'APIs, relational databases, query optimization, caching, and concurrency' },
  { id: 'Frontend Developer', label: 'Frontend Developer', primaryTrack: 'web-dev', description: 'Component state, responsive CSS, UI performance, DOM manipulation, and UX' },
  { id: 'Full Stack Developer', label: 'Full Stack Developer', primaryTrack: 'full-stack', description: 'End-to-end delivery from database queries to interactive client UI' },
  { id: 'Mobile Developer', label: 'Mobile Developer', primaryTrack: 'react', description: 'Mobile UI lifecycle, offline state, network caching, and responsive native design' },
  { id: 'C#/.NET Developer', label: 'C# / .NET Developer', primaryTrack: 'csharp', description: '.NET CLR, LINQ, async/await, Entity Framework Core, and ASP.NET Core APIs' },
  { id: 'Java Developer', label: 'Java Developer', primaryTrack: 'java', description: 'JVM architecture, memory management, multithreading, and Spring Boot' },
  { id: 'Python Developer', label: 'Python Developer', primaryTrack: 'python', description: 'Data structures, asyncio, decorators, generators, and backend microservices' },
  { id: 'DevOps/Cloud Developer', label: 'DevOps / Cloud Developer', primaryTrack: 'system-design', description: 'CI/CD, containerization, VPCs, high-availability cloud architecture, and security' },
  { id: 'Database Developer', label: 'Database Developer', primaryTrack: 'sql', description: 'Complex JOINs, indexes, normalization, query execution plans, and transactions' },
];

export const ALL_INTERVIEW_TYPES: { id: InterviewType; label: string; description: string }[] = [
  { id: 'Technical Interview', label: 'Technical Interview', description: 'Deep technical questions evaluating architectural, conceptual, and practical depth.' },
  { id: 'Coding Interview', label: 'Coding Interview', description: 'Live algorithmic, data structure, and code implementation problems with scratchpad.' },
  { id: 'Behavioural Interview', label: 'Behavioural Interview', description: 'STAR method scenarios evaluating teamwork, conflict, failures, and communication.' },
  { id: 'System Design Interview', label: 'System Design Interview', description: 'Scalability, microservices, load balancing, caching, and distributed architecture.' },
  { id: 'Mixed Developer Interview', label: 'Mixed Developer Interview', description: 'A realistic mix of technical concepts, coding challenges, and scenario questions.' },
  { id: 'Full Developer Interview', label: 'Full Developer Interview', description: 'Complete simulation testing breadth across coding, architecture, and behavioral questions.' },
];

export const ALL_DIFFICULTIES: { id: 'Beginner' | 'Easy' | 'Medium' | 'Hard' | 'Expert'; label: string; description: string }[] = [
  { id: 'Beginner', label: 'Beginner', description: 'Foundational syntax and core programming concepts.' },
  { id: 'Easy', label: 'Easy', description: 'Common language features, standard libraries, and simple implementations.' },
  { id: 'Medium', label: 'Medium', description: 'Questions require practical understanding, design trade-offs, and problem solving.' },
  { id: 'Hard', label: 'Hard', description: 'Deep runtime internals, performance optimization, and edge cases under load.' },
  { id: 'Expert', label: 'Expert', description: 'Architectural mastery, distributed scaling, fault tolerance, and system limits.' },
];

export const ALL_INTERVIEWER_STYLES: { id: InterviewerStyle; label: string; promptIntro: string; description: string }[] = [
  { id: 'Professional', label: 'Professional', promptIntro: 'Explain your approach clearly and objectively.', description: 'Balanced, formal, structured, and focused on engineering clarity.' },
  { id: 'Friendly', label: 'Friendly', promptIntro: 'Take your time. Walk me through your approach step by step.', description: 'Encouraging, supportive, approachable, and patient tone.' },
  { id: 'Technical', label: 'Technical', promptIntro: 'Deep dive into the runtime mechanics, memory models, and algorithmic trade-offs.', description: 'Rigorous focus on precise terminology, CLR/JVM internals, and complexity.' },
  { id: 'Challenging', label: 'Challenging', promptIntro: 'Why did you choose that approach? What are its limitations under extreme scale?', description: 'Probes edge cases, bottlenecks, alternatives, and trade-off justification.' },
];

export const QUESTION_BANK_BY_TOPIC: Record<string, InterviewQuestion[]> = {
  csharp: csharpQuestions,
  java: javaQuestions,
  python: pythonQuestions,
  javascript: javascriptQuestions,
  typescript: typescriptQuestions,
  cpp: cppQuestions,
  sql: sqlQuestions,
  html: htmlQuestions,
  css: cssQuestions,
  react: reactQuestions,
  nodejs: nodejsQuestions,
  behavioral: behavioralQuestions,
  'system-design': systemDesignQuestions,
  security: systemDesignQuestions.filter((q) => q.tags.includes('security') || q.category === 'Security'),
  cloud: systemDesignQuestions.filter((q) => q.tags.includes('cloud') || q.category === 'Cloud'),
};

/**
 * Ensures every question has 3 hints, common mistakes, expected concepts, and solution explanations
 */
export function normalizeQuestion(q: InterviewQuestion): InterviewQuestion {
  const hints: string[] = Array.isArray(q.hints) && q.hints.length >= 3
    ? q.hints.slice(0, 3)
    : [
        `Think about the foundational concepts of ${q.topic.toUpperCase()}: focus on ${q.tags.slice(0, 2).join(' and ')}.`,
        `Key architectural focus: ${q.rubric[0] || 'Explain the core mechanism, state transitions, and edge cases.'}`,
        `Technical depth: ${q.rubric[1] || 'Address performance, memory allocation, or runtime constraints.'}`,
      ];

  const commonMistakes: string[] = Array.isArray(q.commonMistakes) && q.commonMistakes.length > 0
    ? q.commonMistakes
    : [
        `Giving an overly high-level answer without explaining the underlying runtime mechanism.`,
        `Neglecting time/space complexity or failing to discuss edge conditions under concurrent load.`,
      ];

  const expectedConcepts: string[] = Array.isArray(q.expectedConcepts) && q.expectedConcepts.length > 0
    ? q.expectedConcepts
    : q.rubric.slice(0, 4);

  return {
    ...q,
    question: q.prompt,
    hints,
    commonMistakes,
    expectedConcepts,
    solutionExplanation: q.solutionExplanation || q.sampleAnswer,
    sourceType: 'SynergySphere Original',
    category: q.category || (q.topic === 'sql' ? 'Databases' : q.type === 'coding' ? 'Algorithms' : 'Programming'),
  };
}

export const ALL_QUESTIONS: InterviewQuestion[] = [
  ...csharpQuestions,
  ...javaQuestions,
  ...pythonQuestions,
  ...javascriptQuestions,
  ...typescriptQuestions,
  ...cppQuestions,
  ...sqlQuestions,
  ...htmlQuestions,
  ...cssQuestions,
  ...reactQuestions,
  ...nodejsQuestions,
  ...behavioralQuestions,
  ...systemDesignQuestions,
].map(normalizeQuestion);

export const QUESTION_MAP: Map<string, InterviewQuestion> = new Map(
  ALL_QUESTIONS.map((q) => [q.id, q])
);

/**
 * Resolves any incoming topic or role string to matching TrackDefinition
 */
export function resolveTrack(topicInput?: string): TrackDefinition | undefined {
  if (!topicInput || typeof topicInput !== 'string') return undefined;
  const normalized = topicInput.trim().toLowerCase().replace(/[\s_]+/g, '-');

  // Exact slug matches
  const directMatch = ALL_INTERVIEW_TRACKS.find(
    (t) => t.id === normalized || t.name.toLowerCase() === topicInput.trim().toLowerCase()
  );
  if (directMatch) return directMatch;

  // Role matches
  const roleMatch = ALL_INTERVIEW_ROLES.find(
    (r) => r.id.toLowerCase() === topicInput.trim().toLowerCase() || r.label.toLowerCase() === topicInput.trim().toLowerCase()
  );
  if (roleMatch) {
    const track = ALL_INTERVIEW_TRACKS.find((t) => t.id === roleMatch.primaryTrack);
    if (track) return track;
  }

  // Aliases
  const aliasMap: Record<string, string> = {
    'c++': 'cpp',
    'c#': 'csharp',
    'c-sharp': 'csharp',
    'c#/.net': 'csharp',
    'c# / .net': 'csharp',
    'c#/.net developer': 'csharp',
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
    'database': 'sql',
    'databases': 'sql',
    'database developer': 'sql',
    'devops': 'system-design',
    'cloud': 'system-design',
    'devops/cloud developer': 'system-design',
    'system design': 'system-design',
    'behavioral': 'behavioral',
    'behavioural': 'behavioral',
  };

  const aliasTarget = aliasMap[normalized] || aliasMap[topicInput.trim().toLowerCase()];
  if (aliasTarget) {
    return ALL_INTERVIEW_TRACKS.find((t) => t.id === aliasTarget);
  }

  return undefined;
}

export interface SessionSelectionOptions {
  topic?: string;
  role?: string;
  interviewType?: string;
  difficulty?: 'Beginner' | 'Easy' | 'Medium' | 'Hard' | 'Expert' | string;
  duration?: number; // minutes: 10, 20, 30, 45, 60
  programmingLanguage?: string;
  interviewerStyle?: string;
  count?: number;
  mode?: 'mixed' | 'conceptual' | 'coding';
  excludedQuestionIds?: string[]; // Questions user already scored >= 80 on
  weakAreas?: string[]; // Tags or keywords to prioritize
}

/**
 * Selects questions from the bank for an interview session based on role, type, difficulty, duration & weak areas
 */
export function selectSessionQuestions(options: SessionSelectionOptions): InterviewQuestion[] {
  let track = options.topic ? resolveTrack(options.topic) : undefined;
  if (!track && options.role) {
    track = resolveTrack(options.role);
  }
  if (!track) {
    track = ALL_INTERVIEW_TRACKS.find((t) => t.id === 'csharp') || ALL_INTERVIEW_TRACKS[0];
  }

  // Calculate target question count from duration if count not explicitly provided
  let targetCount = options.count;
  if (!targetCount && options.duration) {
    if (options.duration <= 10) targetCount = 4;
    else if (options.duration <= 20) targetCount = 6;
    else if (options.duration <= 30) targetCount = 10;
    else if (options.duration <= 45) targetCount = 15;
    else targetCount = 20;
  }
  targetCount = Math.min(Math.max(targetCount || 10, 3), 30);

  const interviewType = (options.interviewType || '').toLowerCase();
  const difficulty = (options.difficulty || 'Medium').toLowerCase();
  const excludedSet = new Set(options.excludedQuestionIds || []);
  const weakAreas = (options.weakAreas || []).map((w) => w.toLowerCase());

  // Aggregate questions from component topics
  let pool: InterviewQuestion[] = [];
  for (const topicId of track.componentTopics) {
    const topicQuestions = (QUESTION_BANK_BY_TOPIC[topicId] || []).map(normalizeQuestion);
    pool.push(...topicQuestions);
  }

  // Add behavioural questions if Behavioral or Full/Mixed Interview
  if (interviewType.includes('behavioural') || interviewType.includes('behavioral') || interviewType.includes('full') || interviewType.includes('mixed')) {
    pool.push(...behavioralQuestions.map(normalizeQuestion));
  }

  // Add system design / security questions if System Design or Full/Mixed Interview
  if (interviewType.includes('design') || interviewType.includes('full') || interviewType.includes('mixed')) {
    pool.push(...systemDesignQuestions.map(normalizeQuestion));
  }

  // Filter by interview type / mode
  if (interviewType.includes('coding') || options.mode === 'coding') {
    const codingOnly = pool.filter((q) => q.type === 'coding');
    if (codingOnly.length >= targetCount) pool = codingOnly;
  } else if (interviewType.includes('behavioural') || interviewType.includes('behavioral')) {
    const behOnly = pool.filter((q) => q.type === 'behavioral-tech' || q.category === 'Behavioural');
    if (behOnly.length >= targetCount) pool = behOnly;
  } else if (interviewType.includes('design')) {
    const desOnly = pool.filter((q) => q.type === 'system-design' || q.category === 'System Design');
    if (desOnly.length >= targetCount) pool = desOnly;
  } else if (options.mode === 'conceptual') {
    const conceptualOnly = pool.filter((q) => q.type !== 'coding');
    if (conceptualOnly.length >= targetCount) pool = conceptualOnly;
  }

  // Split into fresh questions (not yet mastered) vs already answered
  let freshPool = pool.filter((q) => !excludedSet.has(q.id));
  if (freshPool.length < targetCount) {
    freshPool = [...pool];
  }

  // Partition by difficulty
  const easy = freshPool.filter((q) => q.difficulty === 'easy');
  const medium = freshPool.filter((q) => q.difficulty === 'medium');
  const hard = freshPool.filter((q) => q.difficulty === 'hard');

  let targetEasy: number;
  let targetMed: number;
  let targetHard: number;

  if (difficulty === 'beginner') {
    targetEasy = Math.round(targetCount * 0.7);
    targetMed = Math.round(targetCount * 0.3);
    targetHard = 0;
  } else if (difficulty === 'easy') {
    targetEasy = Math.round(targetCount * 0.6);
    targetMed = Math.round(targetCount * 0.3);
    targetHard = targetCount - targetEasy - targetMed;
  } else if (difficulty === 'hard') {
    targetEasy = Math.round(targetCount * 0.1);
    targetMed = Math.round(targetCount * 0.4);
    targetHard = targetCount - targetEasy - targetMed;
  } else if (difficulty === 'expert') {
    targetEasy = 0;
    targetMed = Math.round(targetCount * 0.3);
    targetHard = targetCount - targetMed;
  } else {
    // Medium (default: ~40% easy, ~40% medium, ~20% hard)
    targetEasy = Math.round(targetCount * 0.4);
    targetHard = Math.round(targetCount * 0.2);
    targetMed = targetCount - targetEasy - targetHard;
  }

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
    if (subpool.length === 0 || needed <= 0) return [];
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

  // Shuffle final list so questions flow naturally
  return results.sort(() => Math.random() - 0.5);
}
