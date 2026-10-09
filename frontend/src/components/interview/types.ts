export interface Question {
  id: string;
  topic: string;
  category?: string;
  type: 'conceptual' | 'coding' | 'system-design' | 'sql' | 'behavioral-tech' | string;
  difficulty: 'easy' | 'medium' | 'hard' | string;
  prompt: string;
  rubric: string[];
  tags: string[];
  followUps?: string[];
  hints?: string[];
  expectedConcepts?: string[];
  commonMistakes?: string[];
}

export interface InterviewSession {
  id: string;
  topic: string;
  role?: string;
  interviewType?: string;
  questions: Question[];
  totalQuestions: number;
}

export interface LiveCritique {
  technicalClarity: { rating: 'Weak' | 'Fair' | 'Good' | 'Strong'; note: string };
  communication: { rating: 'Weak' | 'Fair' | 'Good' | 'Strong'; note: string };
  problemSolving: { rating: 'Weak' | 'Fair' | 'Good' | 'Strong'; note: string };
  topicDepth: { rating: 'Weak' | 'Fair' | 'Good' | 'Strong'; note: string };
  missingPoints: string[];
  suggestedNextSentence: string;
  heuristicMode?: boolean;
}

export interface QuestionEvaluation {
  questionId: string;
  questionIndex: number;
  score: number;
  feedback: string;
  rubricMatches: string[];
  missedPoints: string[];
}

export interface EvaluationResult {
  score: number;
  feedback: string;
  weakAreas: string[];
  questionScores: QuestionEvaluation[];
  xpEarned: number;
  dimensions?: {
    technicalClarity?: { rating: string; score: number; feedback: string };
    communication?: { rating: string; score: number; feedback: string };
    problemSolving?: { rating: string; score: number; feedback: string };
    topicDepth?: { rating: string; score: number; feedback: string };
    codeQuality?: { rating: string; score: number; feedback: string };
    architecture?: { rating: string; score: number; feedback: string };
  };
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
}

export interface TrackInfo {
  id: string;
  name: string;
  category: 'Language' | 'Framework' | 'Composite' | 'Specialized';
  componentTopics: string[];
  description: string;
  questionCount: number;
}

export interface ProfileSignals {
  hubSkills: Array<{
    id: string;
    name: string;
    completedLessons: number;
    totalLessons: number;
    percent: number;
    unlocked: boolean;
  }>;
}

export interface InterviewHistoryItem {
  id: string;
  topic: string;
  role: string;
  interviewType: string;
  difficulty: string;
  duration: number;
  score: number;
  createdAt: string;
  feedback: string | null;
  weakAreas: string[];
}

export interface InterviewHistoryDetail extends InterviewHistoryItem {
  questions: Question[];
  evaluation?: {
    dimensions?: Record<string, { rating: string; score: number; feedback: string }>;
    strengths?: string[];
    weaknesses?: string[];
    recommendations?: string[];
    questionReviews?: Array<{
      questionId: string;
      questionPrompt: string;
      userAnswer: string;
      scratchCode?: string;
      score: number;
      feedback: string;
      rubricCoverage?: { matched: string[]; missed: string[] };
    }>;
  };
}

export interface UserTopicProgressData {
  id: string;
  userId: string;
  topic: string;
  category: string;
  attempts: number;
  correctCount: number;
  partialCount: number;
  incorrectCount: number;
  averagePerformance: number;
  currentLevel: 'Needs Practice' | 'Developing' | 'Improving' | 'Strong';
  hintsUsed: number;
  lastPractisedAt?: string;
}

export interface InterviewHomeStats {
  interviewsCompleted: number;
  questionsAnswered: number;
  practiceSessions: number;
  currentFocus: string;
  recommendedPractice: Array<{
    id: string;
    topic: string;
    category: string;
    status: string;
    reason: string;
    priorityScore: number;
    attempts: number;
    hintsUsed: number;
  }>;
  recentInterviews: InterviewHistoryItem[];
  learningPaths: Array<{
    id: string;
    title: string;
    progress: number;
    steps: string[];
    currentStep: string;
  }>;
  analytics: {
    interviewsCompleted: number;
    practiceSessions: number;
    topicsImproved: number;
    currentStreak: number;
    mostPractisedSkills: string[];
    recentImprovement: string;
  };
}
