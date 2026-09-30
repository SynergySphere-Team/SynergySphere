export interface CuratedResource {
  id: string;
  title: string;
  description: string;
  url: string;
  badge: string;
  readTime: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  techStack: string;
}

export interface TaskDeconstruction {
  taskId: string;
  taskTitle: string;
  bloatAnalysis: string;
  actionableAdvice: string;
  subtasks: {
    id: string;
    title: string;
    durationMinutes: number;
    rationale: string;
  }[];
  curatedResources: CuratedResource[];
}

export const CURATED_RESOURCE_LIBRARY: CuratedResource[] = [
  {
    id: 'res-react-hooks',
    title: 'React 19 Hooks & Mental Models',
    description: 'DevDocs cheatsheet breaking down hook lifecycles and modern state boundaries.',
    url: 'https://react.dev/reference/react',
    badge: 'Interactive Docs',
    readTime: '6 min read',
    difficulty: 'Intermediate',
    techStack: 'React / Next.js',
  },
  {
    id: 'res-spring-tx',
    title: 'Baeldung: Spring Transaction Isolation',
    description: 'Targeted visual walk-through on @Transactional pitfalls and connection pool timeouts.',
    url: 'https://www.baeldung.com/transaction-configuration-with-jpa-and-spring',
    badge: 'Baeldung Guide',
    readTime: '8 min read',
    difficulty: 'Intermediate',
    techStack: 'Java / Spring Boot',
  },
  {
    id: 'res-ts-narrowing',
    title: 'TypeScript Type Narrowing & Unions',
    description: 'DevDocs rapid reference guide for eliminating stubborn any types.',
    url: 'https://devdocs.io/typescript/handbook/2/narrowing',
    badge: 'DevDocs Cheatsheet',
    readTime: '4 min read',
    difficulty: 'Beginner',
    techStack: 'TypeScript',
  },
  {
    id: 'res-sql-indexes',
    title: 'Use The Index, Luke: SQL Index Tuning',
    description: 'Interactive visual playground explaining B-Tree indexing and query latency fixes.',
    url: 'https://use-the-index-luke.com/',
    badge: 'Visual Playground',
    readTime: '10 min read',
    difficulty: 'Advanced',
    techStack: 'SQL / PostgreSQL',
  },
  {
    id: 'res-css-grid',
    title: 'MDN Web Docs: CSS Grid & Flexbox Alignment',
    description: 'Comprehensive interactive sandbox for responsive card layouts and neon border styling.',
    url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout',
    badge: 'MDN Web Docs',
    readTime: '5 min read',
    difficulty: 'Beginner',
    techStack: 'CSS / Tailwind',
  },
];

export function generateDynamicTaskDeconstruction(
  taskTitle: string,
  stressLevel: number,
  energyLevel: number,
): TaskDeconstruction {
  const lower = taskTitle.toLowerCase();

  let matchedResources: CuratedResource[] = [];
  if (lower.includes('java') || lower.includes('spring') || lower.includes('backend')) {
    matchedResources = [CURATED_RESOURCE_LIBRARY[1], CURATED_RESOURCE_LIBRARY[2]];
  } else if (lower.includes('sql') || lower.includes('database') || lower.includes('postgres')) {
    matchedResources = [CURATED_RESOURCE_LIBRARY[3], CURATED_RESOURCE_LIBRARY[2]];
  } else if (lower.includes('css') || lower.includes('ui') || lower.includes('style')) {
    matchedResources = [CURATED_RESOURCE_LIBRARY[4], CURATED_RESOURCE_LIBRARY[0]];
  } else {
    matchedResources = [CURATED_RESOURCE_LIBRARY[0], CURATED_RESOURCE_LIBRARY[2]];
  }

  let bloatAnalysis = '';
  let actionableAdvice = '';
  let subtasks = [];

  if (stressLevel >= 7) {
    bloatAnalysis = 'High cognitive strain (>6 Stress). Scope is likely oversized, creating decision fatigue.';
    actionableAdvice =
      'Split this session into a 25-minute Pomodoro focusing strictly on 1 minimal unit assertion. Defer the rest.';
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
    bloatAnalysis = 'Low biological energy (<5 Energy). High-complexity logic will cause syntax frustration.';
    actionableAdvice =
      'Pivot to low-cognitive-friction maintenance: write docstrings, clean lint warnings, or read a 5-min cheatsheet.';
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
    bloatAnalysis = 'Steady cognitive conditions. Great state for structured sprint.';
    actionableAdvice = 'Structure the work into two 25-minute Pomodoros with a 5-minute wind-down in between.';
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
    bloatAnalysis,
    actionableAdvice,
    subtasks,
    curatedResources: matchedResources,
  };
}

export const MOOD_TAG_OPTIONS = [
  '#flow-state',
  '#debugging-hell',
  '#exam-prep',
  '#sleep-deprived',
  '#shipped-feature',
  '#syntax-errors',
  '#deadline-crunch',
  '#breakthrough',
];

export const GRATITUDE_PROMPT_PRESETS = [
  'Cracked a stubborn bug 🐛',
  'Understood recursion 💡',
  'Shipped clean pull request 🚀',
  'Protected 8 hours of sleep 🌙',
  'Took a 15-minute walk 🌿',
];

export const WELLNESS_MODULES = [
  { id: 'PRODUCTIVITY', label: 'Tasks', color: '#10b981' },
  { id: 'LEARNING_HUB', label: 'Learning', color: '#3b82f6' },
  { id: 'AI_WORKSPACE', label: 'AI Workspace', color: '#8b5cf6' },
  { id: 'LECTURE_TO_LIFE', label: 'LectureToLife', color: '#f59e0b' },
  { id: 'COMMUNITY', label: 'Community', color: '#ec4899' },
  { id: 'INTERVIEWS', label: 'Interviews', color: '#06b6d4' },
  { id: 'GENERAL', label: 'General', color: '#64748b' },
];
