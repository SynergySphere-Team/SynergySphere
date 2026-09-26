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

export interface DeveloperProfile {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    xp: number;
    level: number;
  };
  hubSkills: Array<{
    id: string;
    name: string;
    completedLessons: number;
    totalLessons: number;
    percent: number;
    unlocked: boolean;
  }>;
  challenges: {
    passedTotal: number;
    byDifficulty: { EASY: number; MEDIUM: number; HARD: number };
    byLanguage: Record<string, number>;
  };
  weeklyActivity: Array<{ day: string; count: number; height: number }>;
  tasksSummary: {
    completedThisWeek: number;
    totalPending: number;
    upcoming: Array<{ id: string; title: string; dueDate: string | null; status: string }>;
  };
  offerReadiness: {
    role: string;
    overallScore: number;
    checklist: Array<{ label: string; passed: boolean; detail: string }>;
  };
  nextActions: {
    nextLesson?: { id: string; title: string; track: string; url: string };
    nextChallenge?: { id: string; title: string; language: string; difficulty: string };
    nextInterviewTopic?: { topic: string; reason: string };
  };
  starBullets?: Array<{ id: string; bullet: string; role: string; source: string }>;
}

export interface DashboardStats {
  user: Pick<User, 'firstName' | 'lastName' | 'xp' | 'level'> | null;
  levelTitle: string;
  stats: { tasksCompleted: number; challengesPassed: number; wellnessEntries: number; unreadNotifications: number; interviews?: number };
  developerProfile?: DeveloperProfile;
  interviewPrep?: InterviewPrepStats;
}

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
}

export interface Challenge { id: string; title: string; difficulty: string; description: string; language: string | null; starterCode?: string | null; xpReward: number; }
export interface LearningResource { id: string; title: string; topic: string; level: string; minutes: number; xpReward: number; source: string; url: string; outcome: string; question: string; options: string[]; answer: number; completed: boolean; }

export interface Project {
  id: string; title: string; category: string; location: string | null; organization: string;
  description: string; requirements: string | null; xpReward: number;
  hasApplied: boolean; applicationStatus: string | null; isCreator: boolean; _count: { applications: number };
  githubOwner?: string | null; githubRepo?: string | null; githubFullName?: string | null; githubUrl?: string | null;
  githubVisibility?: string | null; primaryLanguage?: string | null; isGithubBacked?: boolean;
  license?: string | null; starterTemplate?: string | null;
  githubStars?: number; githubForks?: number; contributorAvatars?: string[];
  lastActivityAt?: string | null; lastActivityMessage?: string | null; lastActivityActor?: string | null;
  techStack?: string | null; teamCapacity?: number | null; deliverableType?: string | null;
}
export interface ProjectJoinRequest { id: string; status: 'PENDING' | 'INVITATION_SENT' | 'APPROVED' | 'DECLINED'; createdAt: string; userId: string; firstName: string; lastName: string; email: string; githubUsername?: string | null; message?: string | null; invitationSentAt?: string | null; acceptedAt?: string | null; profilePicture?: string | null; }
export interface ProjectMessage { id: string; body: string; createdAt: string; userId: string; firstName: string; lastName: string; role: string; }
export interface GithubConnection { connected: boolean; username: string | null; avatarUrl: string | null; }
export interface GithubDeviceAuthorization { id: string; userCode: string; verificationUri: string; verificationUriComplete: string | null; intervalSeconds: number; expiresIn: number; }
export interface GithubActivity { id: string; projectId: string; type: string; actorLogin: string | null; actorAvatarUrl: string | null; title: string; summary: string | null; url: string | null; occurredAt: string; }

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

export interface InterviewPrepStats {
  interviewsCompleted: number;
  questionsAnswered: number;
  practiceSessions: number;
  currentFocus: string;
  recommendedPractice: Array<{
    id: string;
    topic: string;
    status: 'Not Started' | 'Needs Practice' | 'Developing' | 'Improving' | 'Strong';
    reason: string;
  }>;
}

export interface DimensionEvaluation {
  rating: 'Strong' | 'Improving' | 'Developing' | 'Needs Practice';
  score: number;
  feedback: string;
}

export interface MultiDimensionalEvaluation {
  technicalKnowledge: DimensionEvaluation;
  problemSolving: DimensionEvaluation;
  communication: DimensionEvaluation;
  coding: DimensionEvaluation;
  accuracy: DimensionEvaluation;
  timeManagement: DimensionEvaluation;
  requirementUnderstanding: DimensionEvaluation;
  codeQuality: DimensionEvaluation;
  architecture: DimensionEvaluation;
}

export interface QuestionReviewItem {
  questionId: string;
  questionIndex: number;
  question: string;
  candidateAnswer: string;
  expectedConcepts: string[];
  sampleAnswer: string;
  feedback: string;
  commonMistakes: string[];
  keyConcept: string;
  score: number;
  topicToPractice: string;
}

export interface InterviewEvaluationResult {
  score: number;
  feedback: string;
  dimensions: MultiDimensionalEvaluation;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  questionScores: Array<{
    questionId: string;
    questionIndex: number;
    score: number;
    feedback: string;
    rubricMatches: string[];
    missedPoints: string[];
  }>;
  questionReviews: QuestionReviewItem[];
  weakAreas: string[];
  xpEarned: number;
  xpAwarded?: number;
  questionsAnswered: number;
  questionsCorrect: number;
  hintsUsed: number;
  durationMinutes: number;
}

export interface RecommendedPracticeItem {
  id: string;
  topic: string;
  category: string;
  status: 'Not Started' | 'Needs Practice' | 'Developing' | 'Improving' | 'Strong';
  reason: string;
  priorityScore: number;
  attempts: number;
  hintsUsed: number;
  lastPractisedAt?: string;
}

export interface FocusedPracticeSession {
  sessionId: string;
  topic: string;
  category: string;
  difficulty: string;
  quickReview: {
    concept: string;
    example: string;
    whyItMatters: string;
    deepDive?: string;
  };
  questions: Array<{
    id: string;
    prompt: string;
    difficulty: string;
    questionType: string;
    hints: string[];
    sampleAnswer?: string;
    expectedConcepts?: string[];
  }>;
  miniAssessment: {
    id: string;
    prompt: string;
    difficulty: string;
    rubric: string[];
    expectedConcepts: string[];
  };
}

export interface PracticeCompletionResult {
  topic: string;
  questionsCompleted: number;
  totalQuestions: number;
  previousStatus: 'Not Started' | 'Needs Practice' | 'Developing' | 'Improving' | 'Strong';
  currentStatus: 'Not Started' | 'Needs Practice' | 'Developing' | 'Improving' | 'Strong';
  whatYouLearned: string[];
  stillNeedsPractice: string[];
  nextRecommendedPractice: {
    topic: string;
    reason: string;
  };
  xpAwarded: number;
}

export interface LearningPathItem {
  id: string;
  title: string;
  progress: number;
  steps: string[];
  currentStep: string;
}

export interface CommunityChannel {
  id: string;
  name: string;
  description: string | null;
  type: 'chat' | 'qa';
  emoji: string;
  messageCount: string | number;
  postCount: string | number;
}

export interface CommunityChatMessage {
  id: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  userId: string;
  firstName: string;
  lastName: string;
  replyToId: string | null;
  replyToBody: string | null;
  replyToFirstName: string | null;
  replyToLastName: string | null;
}

export interface CommunityQAPost {
  id: string;
  title: string;
  body: string;
  tags: string | null;
  isSolved: boolean;
  createdAt: string;
  updatedAt?: string;
  userId: string;
  firstName: string;
  lastName: string;
  replyCount: number;
}

export interface CommunityQAReply {
  id: string;
  body: string;
  isAccepted: boolean;
  createdAt: string;
  userId: string;
  firstName: string;
  lastName: string;
  replyToId: string | null;
  replyToBody: string | null;
  replyToFirstName: string | null;
  replyToLastName: string | null;
}

export interface CommunityPostDetail extends CommunityQAPost {
  replies: CommunityQAReply[];
}

