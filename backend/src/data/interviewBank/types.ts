export type QuestionType =
  | 'conceptual'
  | 'coding'
  | 'system-design'
  | 'sql'
  | 'behavioral-tech'
  | 'short-answer'
  | 'multiple-choice'
  | 'scenario'
  | 'debugging'
  | 'api-architecture'
  | 'code-review'
  | 'output-prediction';

export type QuestionDifficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';

export type InterviewRole =
  | 'Software Engineering Intern'
  | 'Junior Software Developer'
  | 'Software Developer'
  | 'Backend Developer'
  | 'Frontend Developer'
  | 'Full Stack Developer'
  | 'Mobile Developer'
  | 'C#/.NET Developer'
  | 'Java Developer'
  | 'Python Developer'
  | 'DevOps/Cloud Developer'
  | 'Database Developer';

export type InterviewType =
  | 'Technical Interview'
  | 'Coding Interview'
  | 'Behavioural Interview'
  | 'System Design Interview'
  | 'Mixed Developer Interview'
  | 'Full Developer Interview';

export type InterviewerStyle = 'Professional' | 'Friendly' | 'Technical' | 'Challenging';

export type TopicLevel = 'Not Started' | 'Needs Practice' | 'Developing' | 'Improving' | 'Strong';

export interface InterviewQuestion {
  id: string;
  category?: string; // Programming, Data Structures, Algorithms, Databases, Web/API, Software Engineering, Cloud, Security, System Design, Behavioural
  topic: string; // catalog id: java, python, javascript, typescript, cpp, csharp, sql, html, css, react, nodejs, etc.
  role?: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  prompt: string; // original wording / prompt
  question?: string; // alias to prompt
  estimatedTime?: number; // minutes
  rubric: string[]; // 4–8 scoring bullets
  evaluationCriteria?: string[];
  sampleAnswer: string; // for evaluator/review
  solutionExplanation?: string;
  expectedConcepts?: string[];
  commonMistakes?: string[];
  tags: string[]; // e.g. collections, concurrency, indexes
  followUps?: string[];
  followUpQuestions?: string[];
  hints?: string[]; // up to 3 hints (conceptual direction, specific guidance, strong guidance)
  programmingLanguage?: string;
  sourceType?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LiveCritiqueResult {
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
  score: number; // 0-100
  feedback: string;
  rubricMatches: string[];
  missedPoints: string[];
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
  score: number; // 0-100
  feedback: string;
  dimensions: MultiDimensionalEvaluation;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  questionScores: QuestionEvaluation[];
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
  status: TopicLevel;
  reason: string;
  priorityScore: number;
  attempts: number;
  hintsUsed: number;
  lastPractisedAt?: string;
}

export interface UserTopicProgressData {
  [key: string]: any;
  id: string;
  userId: string;
  topic: string;
  category: string;
  attempts: number;
  correctAnswers: number;
  incorrectAnswers: number;
  partialAnswers: number;
  hintsUsed: number;
  averagePerformance: number;
  currentLevel: TopicLevel;
  lastPractisedAt?: string;
  lastAssessedAt?: string;
  improvementTrend: 'up' | 'flat' | 'down';
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
    difficulty: QuestionDifficulty;
    questionType: QuestionType;
    hints: string[];
    sampleAnswer?: string;
    expectedConcepts?: string[];
  }>;
  miniAssessment: {
    id: string;
    prompt: string;
    difficulty: QuestionDifficulty;
    rubric: string[];
    expectedConcepts: string[];
  };
}

export interface PracticeCompletionResult {
  topic: string;
  questionsCompleted: number;
  totalQuestions: number;
  previousStatus: TopicLevel;
  currentStatus: TopicLevel;
  whatYouLearned: string[];
  stillNeedsPractice: string[];
  nextRecommendedPractice: {
    topic: string;
    reason: string;
  };
  xpAwarded: number;
}
