export type InterviewStage =
  | 'BEHAVIORAL'
  | 'SYSTEM_DESIGN'
  | 'CODING'
  | 'DEBRIEF'
  | 'COMPLETED';

export type InterviewerPersonaId =
  | 'strict'
  | 'supportive'
  | 'distributed_systems';

export interface DynamicProbeTrigger {
  id: string;
  triggerKeywords: string[];
  minWordCount?: number;
  question: string;
  expectedConcept: string;
}

export interface InterviewerPersona {
  id: InterviewerPersonaId;
  name: string;
  title: string;
  badge: string;
  avatarIcon: string;
  accentColor: string;
  toneDescription: string;
  evaluationFocus: string;
  greetingMessage: string;
  affirmativePhrases: string[];
  probingPhrases: string[];
  dynamicProbes: DynamicProbeTrigger[];
}

export interface TestCase {
  id: string;
  inputDescription: string;
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  isHidden: boolean;
  passed?: boolean;
  executionTimeMs?: number;
}

export interface TestExecutionReport {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  memoryKb?: number;
  stdout?: string;
  testResults: TestCase[];
}

export interface InterviewStageQuestion {
  stage: InterviewStage;
  title: string;
  category: string;
  timeLimitSeconds: number; // e.g. 300 (5m) for behavioral, 900 (15m) for coding
  prompt: string;
  scenarioContext?: string;
  constraints?: string[];
  rubric: string[];
  expectedConcepts: string[];
  hints: string[];
  starterCode?: string;
  language?: string;
  testCases?: TestCase[];
}

export interface InterviewSessionState {
  sessionId: string;
  candidateRole: string;
  difficulty: 'Junior' | 'Mid' | 'Senior' | 'Staff';
  personaId: InterviewerPersonaId;
  currentStage: InterviewStage;
  currentStageIndex: number;
  stages: InterviewStageQuestion[];
  answers: Record<number, string>; // stageIndex -> textual answer
  codeDrafts: Record<number, string>; // stageIndex -> code solution
  stageTimesRemaining: Record<number, number>; // stageIndex -> seconds left
  isPaused: boolean;
  startedAt: number;
  lastSavedAt: number;
  activeFollowUp?: {
    question: string;
    stageIndex: number;
    parentTriggerId: string;
  } | null;
  testReports?: Record<number, TestExecutionReport>;
}

export type HiringRecommendation =
  | 'STRONG_HIRE'
  | 'HIRE'
  | 'LEANING_HIRE'
  | 'LEANING_NO_HIRE'
  | 'NO_HIRE';

export interface CompetencyScore {
  name: string;
  score: number; // 0 - 100
  weight: number;
  rating: 'Exceptional' | 'Strong' | 'Adequate' | 'Needs Improvement' | 'Unsatisfactory';
  feedback: string;
}

export interface FAANGScorecard {
  sessionId: string;
  role: string;
  difficulty: string;
  personaName: string;
  completedAt: string;
  overallScore: number; // 0 - 100
  recommendation: HiringRecommendation;
  summaryVerdict: string;
  stageBreakdown: Array<{
    stage: InterviewStage;
    title: string;
    score: number;
    timeSpentSeconds: number;
    keyObservation: string;
  }>;
  competencies: {
    problemSolving: CompetencyScore;
    technicalDepth: CompetencyScore;
    systemArchitecture: CompetencyScore;
    communicationStar: CompetencyScore;
    productionReadiness: CompetencyScore;
  };
  strengths: string[];
  areasForGrowth: string[];
  hiringCommitteeNotes: string;
}
