export interface WellnessEntry {
  id: string;
  stressLevel: number;
  mood: number;
  energyLevel: number;
  notes: string | null;
  date: string;
  moduleId?: string | null;
  taskId?: string | null;
  taskTitle?: string | null;
  taskStatus?: string | null;
  linkedTaskTitle?: string | null;
  linkedTaskStatus?: string | null;
  sleepHours?: number | null;
  waterIntake?: number | null;
  tags?: string[] | null;
  gratitude?: string | null;
}

export interface Task {
  id: string;
  title: string;
  status: string;
  description?: string;
  dueDate?: string;
}

export interface BurnoutRisk {
  score: number;
  level: 'LOW' | 'MODERATE' | 'CRITICAL';
  label: string;
  color: string;
  description: string;
  triggers: string[];
}

export interface StreakMilestone {
  days: number;
  label: string;
  xp: number;
  badge: string;
  achieved: boolean;
}

export interface StreakInfo {
  current: number;
  milestones: StreakMilestone[];
}

export interface ModuleStats {
  count: number;
  avgStress: number;
  avgMood: number;
  avgEnergy: number;
  highStressCount?: number;
  highEnergyCount?: number;
}

export interface Insights {
  recommendations: string[];
  averages: {
    stress: number;
    mood: number;
    energy: number;
    sleep?: number | null;
    water?: number | null;
  } | null;
  burnoutRisk?: BurnoutRisk;
  streak?: StreakInfo;
  moduleBreakdown?: Record<string, ModuleStats>;
}

export interface CuratedResource {
  id: string;
  title: string;
  description: string;
  url: string;
  badge: string;
  readTime: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  techStack: string;
  category: 'docs' | 'cheatsheet' | 'video' | 'playground' | 'guide';
}

export interface TaskDeconstruction {
  taskId: string;
  taskTitle: string;
  stressScore: number;
  energyScore: number;
  bloatAnalysis: string;
  actionableAdvice: string;
  subtasks: {
    id: string;
    title: string;
    durationMinutes: number;
    rationale: string;
    isCompleted?: boolean;
  }[];
  curatedResources: CuratedResource[];
}

export interface ModuleMetadata {
  id: string;
  label: string;
  icon: any;
  color: string;
  neonBorder: string;
  description: string;
}
