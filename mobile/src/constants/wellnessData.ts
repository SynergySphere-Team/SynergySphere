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
    url: 'https://www.typescriptlang.org/docs/handbook/2/narrowing.html',
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

export const MOOD_TAG_CATEGORIES = [
  {
    category: 'Flow & Momentum',
    color: '#10b981',
    icon: 'flash',
    tags: ['#flow-state', '#shipped-feature', '#breakthrough', '#clean-code'],
  },
  {
    category: 'Focus & Context',
    color: '#3b82f6',
    icon: 'bulb',
    tags: ['#deep-work', '#exam-prep', '#code-review', '#architecture'],
  },
  {
    category: 'Cognitive Friction',
    color: '#f43f5e',
    icon: 'warning',
    tags: ['#debugging-hell', '#sleep-deprived', '#syntax-errors', '#deadline-crunch'],
  },
];

export const STRESS_ANCHORS: Record<number, { label: string; desc: string; color: string }> = {
  1: { label: 'Deep Zen', desc: 'Completely relaxed, zero cognitive tension', color: '#10b981' },
  2: { label: 'Calm Pace', desc: 'Clear mind, minimal friction', color: '#10b981' },
  3: { label: 'Mild Pressure', desc: 'Manageable workload, focused attention', color: '#3b82f6' },
  4: { label: 'Engaged', desc: 'Positive challenge, active problem-solving', color: '#3b82f6' },
  5: { label: 'Moderate Load', desc: 'Balanced cognitive demand', color: '#f59e0b' },
  6: { label: 'Building Tension', desc: 'Starting to feel mental friction', color: '#f59e0b' },
  7: { label: 'High Strain', desc: 'Significant stress, decision fatigue creeping in', color: '#f97316' },
  8: { label: 'Heavy Friction', desc: 'Struggling with blockers, patience fraying', color: '#f97316' },
  9: { label: 'Severe Strain', desc: 'Near boiling point, syntax frustration', color: '#ef4444' },
  10: { label: 'Acute Overwhelm', desc: 'Cognitive burnout threshold, step away now', color: '#ef4444' },
};

export const MOOD_ANCHORS: Record<number, { label: string; desc: string; color: string }> = {
  1: { label: 'Exhausted', desc: 'Mentally checked out or resentful', color: '#ef4444' },
  2: { label: 'Frustrated', desc: 'Annoyed by stubborn bugs or obstacles', color: '#f97316' },
  3: { label: 'Disheartened', desc: 'Low enthusiasm, feeling stuck', color: '#f59e0b' },
  4: { label: 'Flat', desc: 'Low emotional engagement', color: '#a855f7' },
  5: { label: 'Steady', desc: 'Balanced, pragmatic mindset', color: '#a855f7' },
  6: { label: 'Content', desc: 'Smooth sailing, no major complaints', color: '#8b5cf6' },
  7: { label: 'Optimistic', desc: 'Good rhythm and positive outlook', color: '#3b82f6' },
  8: { label: 'Confident', desc: 'High agency, enjoying challenges', color: '#10b981' },
  9: { label: 'Flow State', desc: 'Time flying, effortless productivity', color: '#10b981' },
  10: { label: 'Peak Euphoria', desc: 'Major breakthrough, triumphant momentum', color: '#10b981' },
};

export const ENERGY_ANCHORS: Record<number, { label: string; desc: string; color: string }> = {
  1: { label: 'Depleted', desc: 'Physical and mental depletion', color: '#ef4444' },
  2: { label: 'Exhausted', desc: 'Struggling to keep eyes open', color: '#f97316' },
  3: { label: 'Sluggish', desc: 'Heavy brain fog, low focus bandwidth', color: '#f59e0b' },
  4: { label: 'Low Reserve', desc: 'Can do simple tasks, not deep architecture', color: '#f59e0b' },
  5: { label: 'Adequate', desc: 'Standard working baseline', color: '#14b8a6' },
  6: { label: 'Alert', desc: 'Clear-headed and attentive', color: '#14b8a6' },
  7: { label: 'Energized', desc: 'Strong focus, ready for deep work sprints', color: '#10b981' },
  8: { label: 'Vibrant', desc: 'High stamina, firing on all cylinders', color: '#10b981' },
  9: { label: 'Surging', desc: 'Boundless mental clarity', color: '#10b981' },
  10: { label: 'Peak State', desc: 'Maximum cognitive vitality & motivation', color: '#10b981' },
};

export const SLEEP_PRESETS = [5, 6, 7, 7.5, 8, 9];
export const WATER_PRESETS = [1.0, 1.5, 2.0, 2.5, 3.0];
export const WATER_STEP = 0.25;

export const WELLNESS_MILESTONES = [
  {
    days: 3,
    name: 'Mindful Coder',
    bonusXp: 25,
    description: 'Logged 3 consecutive days of developer wellness check-ins.',
  },
  {
    days: 7,
    name: 'Balance Master',
    bonusXp: 50,
    description: 'A full week of intentional focus, hydration, and burnout pacing.',
  },
  {
    days: 14,
    name: 'Peak Resilience',
    bonusXp: 100,
    description: 'Two weeks of sustained cognitive equilibrium and high developer output.',
  },
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

export interface ClusteredSession {
  id: string;
  startTime: string;
  endTime: string;
  entryCount: number;
  primaryModuleId: string;
  avgStress: number;
  avgMood: number;
  avgEnergy: number;
  sleepHours: number | null;
  waterIntake: number | null;
  allTags: string[];
  taskTitles: string[];
  gratitudeWins: string[];
  notes: string[];
  entries: any[];
  netStrain: number; // avgStress - avgEnergy
}

export function clusterWellnessEntries(
  entries: any[],
  windowMinutes: number = 45
): ClusteredSession[] {
  if (!entries || entries.length === 0) return [];

  // Sort descending by date
  const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const clusters: ClusteredSession[] = [];

  let currentCluster: any[] = [];

  for (const entry of sorted) {
    if (currentCluster.length === 0) {
      currentCluster.push(entry);
      continue;
    }

    const prevEntry = currentCluster[currentCluster.length - 1];
    const diffMs = Math.abs(new Date(prevEntry.date).getTime() - new Date(entry.date).getTime());
    const diffMins = diffMs / (1000 * 60);

    if (diffMins <= windowMinutes) {
      currentCluster.push(entry);
    } else {
      clusters.push(createClusterSession(currentCluster));
      currentCluster = [entry];
    }
  }

  if (currentCluster.length > 0) {
    clusters.push(createClusterSession(currentCluster));
  }

  return clusters;
}

function createClusterSession(entries: any[]): ClusteredSession {
  const sortedChron = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const first = sortedChron[0];
  const last = sortedChron[sortedChron.length - 1];

  const totalStress = entries.reduce((acc, e) => acc + (e.stressLevel || 0), 0);
  const totalMood = entries.reduce((acc, e) => acc + (e.mood || 0), 0);
  const totalEnergy = entries.reduce((acc, e) => acc + (e.energyLevel || 0), 0);
  const count = entries.length;

  const avgStress = Number((totalStress / count).toFixed(1));
  const avgMood = Number((totalMood / count).toFixed(1));
  const avgEnergy = Number((totalEnergy / count).toFixed(1));

  const tagsSet = new Set<string>();
  entries.forEach((e) => e.tags?.forEach((t: string) => tagsSet.add(t)));

  const tasks = entries
    .map((e) => e.linkedTaskTitle || e.taskTitle)
    .filter((t): t is string => Boolean(t?.trim()));

  const wins = entries
    .map((e) => e.gratitude)
    .filter((g): g is string => Boolean(g?.trim()));

  const notes = entries
    .map((e) => e.notes)
    .filter((n): n is string => Boolean(n?.trim()));

  const latestSleep = entries.find((e) => e.sleepHours != null)?.sleepHours ?? null;
  const latestWater = entries.find((e) => e.waterIntake != null)?.waterIntake ?? null;

  return {
    id: `cluster-${last.id}`,
    startTime: first.date,
    endTime: last.date,
    entryCount: count,
    primaryModuleId: last.moduleId || 'GENERAL',
    avgStress,
    avgMood,
    avgEnergy,
    sleepHours: latestSleep,
    waterIntake: latestWater,
    allTags: Array.from(tagsSet),
    taskTitles: Array.from(new Set(tasks)),
    gratitudeWins: Array.from(new Set(wins)),
    notes: Array.from(new Set(notes)),
    entries: sortedChron,
    netStrain: Number((avgStress - avgEnergy).toFixed(1)),
  };
}
