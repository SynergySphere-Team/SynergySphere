import { CuratedResource, TaskDeconstruction, WellnessEntry } from './types';

export const CURATED_RESOURCE_LIBRARY: CuratedResource[] = [
  {
    id: 'res-react-hooks',
    title: 'React 19 Hooks & State Mental Models',
    description: 'Interactive cheatsheet breaking down hook lifecycles, memory closures, and modern server action boundaries.',
    url: 'https://react.dev/reference/react',
    badge: 'Interactive Docs',
    readTime: '6 min read',
    difficulty: 'Intermediate',
    techStack: 'React / Next.js',
    category: 'docs',
  },
  {
    id: 'res-spring-tx',
    title: 'Baeldung: Spring Transaction Management & Isolation Levels',
    description: 'Targeted visual walk-through on @Transactional pitfalls, rollback rules, and connection pool timeouts.',
    url: 'https://www.baeldung.com/transaction-configuration-with-jpa-and-spring',
    badge: 'Baeldung Guide',
    readTime: '8 min read',
    difficulty: 'Intermediate',
    techStack: 'Java / Spring Boot',
    category: 'guide',
  },
  {
    id: 'res-ts-narrowing',
    title: 'TypeScript Type Narrowing & Discriminated Unions',
    description: 'DevDocs rapid reference guide for eliminating stubborn any types and exhaustive switch checks.',
    url: 'https://www.typescriptlang.org/docs/handbook/2/narrowing.html',
    badge: 'DevDocs Cheatsheet',
    readTime: '4 min read',
    difficulty: 'Beginner',
    techStack: 'TypeScript',
    category: 'cheatsheet',
  },
  {
    id: 'res-sql-indexes',
    title: 'Use The Index, Luke: SQL Index Tuning & EXPLAIN ANALYZE',
    description: 'Interactive visual playground explaining B-Tree indexing, index scans vs sequential scans, and latency fixes.',
    url: 'https://use-the-index-luke.com/',
    badge: 'Visual Playground',
    readTime: '10 min read',
    difficulty: 'Advanced',
    techStack: 'SQL / PostgreSQL',
    category: 'playground',
  },
  {
    id: 'res-node-eventloop',
    title: 'What the Heck is the Event Loop Anyway? (Philip Roberts)',
    description: 'Iconic visual explainer demonstrating call stack, Web APIs, task queue, and event loop microtasks.',
    url: 'https://www.youtube.com/watch?v=8aGhZQkoFbQ',
    badge: 'Video Explainer',
    readTime: '14 min watch',
    difficulty: 'Beginner',
    techStack: 'Node.js / JavaScript',
    category: 'video',
  },
  {
    id: 'res-css-grid',
    title: 'MDN Web Docs: CSS Grid & Flexbox Mental Alignment',
    description: 'Comprehensive interactive sandbox for responsive card layouts, auto-fit repeat grids, and neon border styling.',
    url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout',
    badge: 'MDN Web Docs',
    readTime: '5 min read',
    difficulty: 'Beginner',
    techStack: 'CSS / Tailwind',
    category: 'docs',
  },
  {
    id: 'res-git-interactive',
    title: 'Oh My Git! Interactive Git Rebase & Cherry-Pick Game',
    description: 'Gamified playground to master interactive rebase, squashing commits, and resolving painful merge conflicts safely.',
    url: 'https://ohmygit.org/',
    badge: 'Dev Playground',
    readTime: '7 min playground',
    difficulty: 'Intermediate',
    techStack: 'Git / DevOps',
    category: 'playground',
  },
  {
    id: 'res-jest-unit',
    title: 'Martin Fowler: Practical Unit Testing & Assertion Rhythms',
    description: 'Concise guide to writing crisp test assertions without bloated setup code or fragile mock chains.',
    url: 'https://martinfowler.com/articles/practical-test-pyramid.html',
    badge: 'Architecture Guide',
    readTime: '9 min read',
    difficulty: 'Intermediate',
    techStack: 'Testing / QA',
    category: 'guide',
  },
];

export function generateDynamicTaskDeconstruction(
  taskTitle: string,
  moduleId: string,
  stressLevel: number,
  energyLevel: number,
): TaskDeconstruction {
  const lower = taskTitle.toLowerCase();

  let matchedResources: CuratedResource[] = [];
  if (lower.includes('java') || lower.includes('spring') || lower.includes('backend')) {
    matchedResources = [CURATED_RESOURCE_LIBRARY[1], CURATED_RESOURCE_LIBRARY[2]];
  } else if (lower.includes('sql') || lower.includes('query') || lower.includes('database') || lower.includes('postgres')) {
    matchedResources = [CURATED_RESOURCE_LIBRARY[3], CURATED_RESOURCE_LIBRARY[7]];
  } else if (lower.includes('debug') || lower.includes('test') || lower.includes('assertion')) {
    matchedResources = [CURATED_RESOURCE_LIBRARY[7], CURATED_RESOURCE_LIBRARY[2]];
  } else if (lower.includes('css') || lower.includes('ui') || lower.includes('tailwind') || lower.includes('frontend')) {
    matchedResources = [CURATED_RESOURCE_LIBRARY[5], CURATED_RESOURCE_LIBRARY[0]];
  } else if (lower.includes('git') || lower.includes('pr') || lower.includes('commit') || lower.includes('merge')) {
    matchedResources = [CURATED_RESOURCE_LIBRARY[6], CURATED_RESOURCE_LIBRARY[4]];
  } else {
    matchedResources = [CURATED_RESOURCE_LIBRARY[0], CURATED_RESOURCE_LIBRARY[2]];
  }

  let bloatAnalysis = '';
  let actionableAdvice = '';
  let subtasks: TaskDeconstruction['subtasks'] = [];

  if (stressLevel >= 7) {
    bloatAnalysis =
      'Cognitive overload detected (>6 Stress). The task scope is likely too broad, creating decision fatigue and anxiety over unreached completion.';
    actionableAdvice =
      'Split this oversized block into a 25-minute Pomodoro focusing strictly on a single reproducible test assertion or isolated unit boundary. Drop the rest for now.';
    subtasks = [
      {
        id: 'sub-1',
        title: 'Isolate & write 1 minimal failing test assertion',
        durationMinutes: 15,
        rationale: 'Replaces guessing with an objective red-to-green target.',
      },
      {
        id: 'sub-2',
        title: 'Run debugger on the isolated failing step only',
        durationMinutes: 15,
        rationale: 'Limits cognitive search space to 1 function call stack.',
      },
      {
        id: 'sub-3',
        title: 'Apply surgical fix and verify test passes (Green)',
        durationMinutes: 10,
        rationale: 'Lock in quick win before taking a 5-minute breather.',
      },
    ];
  } else if (energyLevel <= 4) {
    bloatAnalysis =
      'Low biological energy detected (<5 Energy). High-complexity architecture changes will lead to syntax errors and frustration.';
    actionableAdvice =
      'Pivot to low-cognitive-friction maintenance: write docstrings, clean lint warnings, or read a curated 5-minute visual explainer before resuming.';
    subtasks = [
      {
        id: 'sub-1',
        title: 'Read 1 short curated cheatsheet or diagram',
        durationMinutes: 8,
        rationale: 'Pumps low-friction conceptual clarity without taxing brain.',
      },
      {
        id: 'sub-2',
        title: 'Document existing function signatures & comments',
        durationMinutes: 12,
        rationale: 'Maintains project momentum with effortless progress.',
      },
      {
        id: 'sub-3',
        title: 'Commit working state and schedule power nap / reset',
        durationMinutes: 5,
        rationale: 'Prevents burnout spiral from forced low-energy coding.',
      },
    ];
  } else {
    bloatAnalysis =
      'Moderate cognitive load with steady energy. Perfect condition for a structured sprint.';
    actionableAdvice =
      'Structure the work into two 25-minute Pomodoros with a 5-minute decompression break in between.';
    subtasks = [
      {
        id: 'sub-1',
        title: 'Outline input/output contracts and edge cases',
        durationMinutes: 15,
        rationale: 'Clarifies boundaries before writing implementation logic.',
      },
      {
        id: 'sub-2',
        title: 'Implement core happy-path functionality',
        durationMinutes: 25,
        rationale: 'Builds flow state on the central requirement.',
      },
      {
        id: 'sub-3',
        title: 'Handle boundary conditions & error cases',
        durationMinutes: 15,
        rationale: 'Polishes production resilience and edge cases.',
      },
    ];
  }

  return {
    taskId: 'dyn-' + Math.random().toString(36).substring(2, 9),
    taskTitle,
    stressScore: stressLevel,
    energyScore: energyLevel,
    bloatAnalysis,
    actionableAdvice,
    subtasks,
    curatedResources: matchedResources,
  };
}

export const MOOD_TAG_OPTIONS = [
  { label: '#flow-state', color: 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10' },
  { label: '#debugging-hell', color: 'border-pink-500/30 text-pink-300 bg-pink-500/10' },
  { label: '#exam-prep', color: 'border-amber-500/30 text-amber-300 bg-amber-500/10' },
  { label: '#sleep-deprived', color: 'border-red-500/30 text-red-300 bg-red-500/10' },
  { label: '#shipped-feature', color: 'border-cyan-500/30 text-cyan-300 bg-cyan-500/10' },
  { label: '#syntax-errors', color: 'border-purple-500/30 text-purple-300 bg-purple-500/10' },
  { label: '#deadline-crunch', color: 'border-orange-500/30 text-orange-300 bg-orange-500/10' },
  { label: '#breakthrough', color: 'border-lime-500/30 text-lime-300 bg-lime-500/10' },
];

export const GRATITUDE_PROMPT_PRESETS = [
  'Cracked a stubborn bug that had me stuck for hours 🐛',
  'Understood recursive tree traversal & memoization 💡',
  'Shipped a clean pull request with unit test coverage 🚀',
  'Protected a healthy 8 hours of restorative sleep 🌙',
  'Helped a fellow junior developer in the community chat 🤝',
  'Stepped away for a 15-minute walk when stress peaked 🌿',
];

export function generateSeedAnalyticsEntries(): WellnessEntry[] {
  const now = new Date();
  const sampleModules = ['PRODUCTIVITY', 'LEARNING_HUB', 'AI_WORKSPACE', 'COMMUNITY', 'INTERVIEWS', 'GENERAL'];
  const sampleTasks = [
    'Refactor Spring Security Filter Chain',
    'Binary Search Tree LeetCode Challenge',
    'Write WCAG Accessibility Crawl Tests',
    'PostgreSQL EXPLAIN ANALYZE Optimization',
    'Mock Technical System Design Interview',
    'Docker Compose multi-service setup',
    'Tailwind Responsive Landing Layout',
  ];

  const entries: WellnessEntry[] = [];
  for (let i = 24; i >= 0; i--) {
    const entryDate = new Date(now.getTime() - i * 86400000);
    const baseStress = i > 16 ? 7 + (i % 3) : i > 8 ? 4 + (i % 3) : 3 + (i % 4);
    const baseEnergy = i > 16 ? 4 + (i % 2) : i > 8 ? 7 + (i % 2) : 6 + (i % 3);
    const baseMood = Math.round((baseEnergy * 1.5 + (10 - baseStress)) / 2.5);

    const modId = sampleModules[i % sampleModules.length];
    const taskTitle = sampleTasks[i % sampleTasks.length];

    entries.push({
      id: `seed-${i}`,
      stressLevel: Math.min(10, Math.max(1, baseStress)),
      mood: Math.min(10, Math.max(1, baseMood)),
      energyLevel: Math.min(10, Math.max(1, baseEnergy)),
      sleepHours: 6.5 + (i % 3) * 0.5,
      waterIntake: 6 + (i % 4),
      tags: i % 2 === 0 ? ['#flow-state', '#shipped-feature'] : ['#debugging-hell'],
      gratitude: i % 3 === 0 ? 'Made great progress on clean architecture' : null,
      notes: i % 4 === 0 ? `Focused on ${taskTitle}. Paced with 25-minute Pomodoro.` : null,
      date: entryDate.toISOString(),
      moduleId: modId,
      taskId: `task-${i}`,
      taskTitle: taskTitle,
      taskStatus: i % 2 === 0 ? 'DONE' : 'IN_PROGRESS',
      linkedTaskTitle: taskTitle,
      linkedTaskStatus: i % 2 === 0 ? 'DONE' : 'IN_PROGRESS',
    });
  }

  return entries;
}
