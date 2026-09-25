export type QuestionType = 'conceptual' | 'coding' | 'system-design' | 'sql' | 'behavioral-tech';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface InterviewQuestion {
  id: string;
  topic: string; // catalog id: java, python, javascript, typescript, cpp, csharp, sql, html, css, react, nodejs
  type: QuestionType;
  difficulty: QuestionDifficulty;
  prompt: string; // original wording
  rubric: string[]; // 4–8 scoring bullets
  sampleAnswer: string; // for the evaluator, never shown until after submit
  tags: string[]; // e.g. collections, concurrency, indexes
  followUps?: string[];
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

export interface InterviewEvaluationResult {
  score: number; // 0-100
  feedback: string;
  weakAreas: string[];
  questionScores: QuestionEvaluation[];
  xpEarned: number;
  xpAwarded?: number;
}
