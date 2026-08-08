export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  profilePicture?: string | null;
  xp: number;
  level: number;
}

export interface AuthResponse { user: User; token: string; }

export interface Task {
  id: string;
  title: string;
  description: string | null;
  learnedNote?: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  dueDate: string | null;
  createdAt: string;
}

export interface DashboardStats {
  user: Pick<User, 'firstName' | 'lastName' | 'xp' | 'level'> | null;
  levelTitle: string;
  stats: { tasksCompleted: number; challengesPassed: number; wellnessEntries: number; unreadNotifications: number };
}

export interface WellnessEntry {
  id: string;
  stressLevel: number;
  mood: number;
  energyLevel: number;
  notes: string | null;
  date: string;
}

export interface Challenge { id: string; title: string; difficulty: string; description: string; language: string | null; xpReward: number; }

export interface Project {
  id: string; title: string; category: string; location: string | null; organization: string;
  description: string; requirements: string | null; xpReward: number;
  hasApplied: boolean; applicationStatus: string | null; _count: { applications: number };
}

export interface Notification { id: string; title: string; message: string; type: string; read: boolean; createdAt: string; }
