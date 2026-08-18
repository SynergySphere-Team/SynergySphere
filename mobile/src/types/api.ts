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
  hasApplied: boolean; applicationStatus: string | null; isCreator: boolean; _count: { applications: number };
}
export interface ProjectMessage { id: string; body: string; createdAt: string; userId: string; firstName: string; lastName: string; role: string; }

export interface Notification { id: string; title: string; message: string; type: string; read: boolean; createdAt: string; }

export interface Leader { id: string; firstName: string; lastName: string; xp: number; level: number; profilePicture?: string | null; _count: { challengeAttempts: number; userBadges: number }; }
export interface PortfolioItem { id: string; title: string; description: string | null; projectLink: string | null; githubLink: string | null; }
export interface InterviewQuestion { question: string; difficulty: 'easy' | 'medium' | 'hard'; }
export interface Interview { id: string; topic: string; questions: InterviewQuestion[] | string; score: number | null; feedback: string | null; weakAreas: string[] | string | null; }
export interface LectureUpload {
  id: string; fileName: string; fileType: string; summary: string; createdAt: string;
  flashcards: { front: string; back: string }[] | string;
  quiz: { question: string; options: string[]; answer: number }[] | string;
  miniProjects: { title: string; description: string }[] | string;
  codingExercises: { title: string; description: string }[] | string;
}
export interface ProductivityStats { tasksCompletedToday: number; totalTasksCompleted: number; focusSessionsToday: number; focusMinutesToday: number; focusHoursToday: string; wellnessScore: number | null; statusCounts: Record<string, number>; learnedTasks: { id: string; title: string; learnedNote: string | null }[]; }
export interface AdminOverview { totalUsers: number; activeUsers: number; dailyLogins: number; challengesCompleted: number; projectApplications: number; avgInterviewScore: number; avgStressLevel: number; avgMood: number; avgEnergy: number; recentUsers: { firstName: string; lastName: string; email: string; role: string; createdAt: string }[]; }
