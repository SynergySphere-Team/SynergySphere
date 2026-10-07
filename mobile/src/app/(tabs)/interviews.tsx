import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Notice } from '@/components/Screen';
import { Button, Card, Heading } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import { InterviewTimer } from '@/components/interview/InterviewTimer';
import { VoiceWaveformInput } from '@/components/interview/VoiceWaveformInput';
import { PersonaHeader } from '@/components/interview/PersonaHeader';
import { FAANGScorecardView } from '@/components/interview/FAANGScorecardView';
import { MobileCodeEditor } from '@/components/coding/MobileCodeEditor';
import { TestExecutionRunner } from '@/components/coding/TestExecutionRunner';
import { executeCodeTestSuite } from '@/services/codeRunner';
import {
  triggerMediumHaptic,
  triggerSuccessHaptic,
  enableKeepAwake,
  disableKeepAwake,
} from '@/services/nativePolish';
import {
  saveInterviewDraft,
  loadInterviewDraft,
  clearInterviewDraft,
} from '@/services/interviewStorage';
import {
  INTERVIEWER_PERSONAS,
  generate4StageInterview,
  evaluateDynamicFollowUp,
  generateFAANGScorecard,
} from '@/services/interviewEngine';
import type {
  InterviewSessionState,
  InterviewerPersonaId,
  FAANGScorecard,
  TestExecutionReport,
} from '@/types/interview';
import type {
  InterviewEvaluationResult,
  RecommendedPracticeItem,
  FocusedPracticeSession,
  PracticeCompletionResult,
  LearningPathItem,
} from '@/types/api';

interface TrackItem {
  id: string;
  name: string;
  category: string;
  questionCount: number;
  description: string;
}

interface RoleItem {
  id: string;
  label: string;
  primaryTrack: string;
  description: string;
}

interface InterviewTypeItem {
  id: string;
  label: string;
  description: string;
}

interface DifficultyItem {
  id: string;
  label: string;
  description: string;
}

interface InterviewerStyleItem {
  id: string;
  label: string;
  promptIntro: string;
  description: string;
}

interface QuestionItem {
  id: string;
  topic: string;
  type: string;
  difficulty: 'easy' | 'medium' | 'hard' | string;
  prompt: string;
  rubric: string[];
  tags: string[];
  hints?: string[];
  followUps?: string[];
  expectedConcepts?: string[];
}

interface LiveCritique {
  technicalClarity?: { rating: string; note: string };
  communication?: { rating: string; note: string };
  problemSolving?: { rating: string; note: string };
  topicDepth?: { rating: string; note: string };
  missingPoints?: string[];
  suggestedNextSentence?: string;
  heuristicMode?: boolean;
}

interface HomeStats {
  interviewsCompleted: number;
  questionsAnswered: number;
  practiceSessions: number;
  currentFocus: string;
  recommendedPractice: RecommendedPracticeItem[];
  recentInterviews: Array<{
    id: string;
    topic: string;
    role: string;
    interviewType: string;
    difficulty: string;
    duration: number;
    score: number;
    createdAt: string;
    feedback?: string;
    weakAreas?: string[];
  }>;
  learningPaths: LearningPathItem[];
  analytics: {
    interviewsCompleted: number;
    practiceSessions: number;
    topicsImproved: number;
    currentStreak: number;
    mostPractisedSkills: string[];
    recentImprovement: string;
  };
}

// Robust fallback catalogs for offline and instantaneous loading
const DEFAULT_TRACKS: TrackItem[] = [
  { id: 'csharp', name: 'C# / .NET', category: 'Language', questionCount: 15, description: '.NET CLR, LINQ, Async/Await, ASP.NET Core & EF Core' },
  { id: 'java', name: 'Java', category: 'Language', questionCount: 15, description: 'Core Java, OOP, JVM, Collections, Concurrency & Spring Boot' },
  { id: 'python', name: 'Python', category: 'Language', questionCount: 15, description: 'Python 3, Data Structures, OOP, AsyncIO, Generators & Decorators' },
  { id: 'javascript', name: 'JavaScript', category: 'Language', questionCount: 15, description: 'ES6+, Event Loop, Promises, Closures & Prototypal Inheritance' },
  { id: 'typescript', name: 'TypeScript', category: 'Language', questionCount: 15, description: 'Generics, Utility Types, Discriminated Unions & Type System' },
  { id: 'react', name: 'React', category: 'Framework', questionCount: 15, description: 'Hooks, Fiber, Reconciliation, State Management & React 18' },
  { id: 'nodejs', name: 'Node.js', category: 'Framework', questionCount: 15, description: 'Event Loop, Libuv, Streams, Worker Threads & Microservices' },
  { id: 'sql', name: 'SQL & Relational DBs', category: 'Language', questionCount: 15, description: 'Relational DBs, Joins, Indexing, Window Functions & Transactions' },
  { id: 'system-design', name: 'System Design & Cloud', category: 'Specialized', questionCount: 12, description: 'Distributed systems, Rate limiting, Caching & Cloud Architecture' },
  { id: 'behavioral', name: 'Behavioural & Leadership', category: 'Specialized', questionCount: 10, description: 'STAR method, Teamwork, Conflict resolution & Production incidents' },
];

const DEFAULT_ROLES: RoleItem[] = [
  { id: 'Software Engineering Intern', label: 'Software Engineering Intern', primaryTrack: 'csharp', description: 'Core CS fundamentals, OOP, data structures, algorithms, and clean coding' },
  { id: 'Junior Software Developer', label: 'Junior Software Developer', primaryTrack: 'full-stack', description: 'Practical coding, debugging, API integration, and collaborative git workflows' },
  { id: 'Software Developer', label: 'Software Developer', primaryTrack: 'csharp', description: 'SOLID principles, layered architecture, unit testing, and design patterns' },
  { id: 'Backend Developer', label: 'Backend Developer', primaryTrack: 'backend', description: 'APIs, relational databases, query optimization, caching, and concurrency' },
  { id: 'Frontend Developer', label: 'Frontend Developer', primaryTrack: 'web-dev', description: 'Component state, responsive CSS, UI performance, DOM manipulation, and UX' },
  { id: 'Full Stack Developer', label: 'Full Stack Developer', primaryTrack: 'full-stack', description: 'End-to-end delivery from database queries to interactive client UI' },
  { id: 'Mobile Developer', label: 'Mobile Developer', primaryTrack: 'react', description: 'Mobile UI lifecycle, offline state, network caching, and responsive native design' },
  { id: 'C#/.NET Developer', label: 'C# / .NET Developer', primaryTrack: 'csharp', description: '.NET CLR, LINQ, async/await, Entity Framework Core, and ASP.NET Core APIs' },
  { id: 'Java Developer', label: 'Java Developer', primaryTrack: 'java', description: 'JVM architecture, memory management, multithreading, and Spring Boot' },
  { id: 'Python Developer', label: 'Python Developer', primaryTrack: 'python', description: 'Data structures, asyncio, decorators, generators, and backend microservices' },
  { id: 'DevOps/Cloud Developer', label: 'DevOps / Cloud Developer', primaryTrack: 'system-design', description: 'CI/CD, containerization, VPCs, high-availability cloud architecture, and security' },
  { id: 'Database Developer', label: 'Database Developer', primaryTrack: 'sql', description: 'Complex JOINs, indexes, normalization, query execution plans, and transactions' },
];

const DEFAULT_INTERVIEW_TYPES: InterviewTypeItem[] = [
  { id: 'Technical Interview', label: 'Technical Interview', description: 'Core computer science, language runtime mechanics, and problem-solving' },
  { id: 'System Design', label: 'System Design', description: 'High-level architectures, scaling, caching, and distributed data systems' },
  { id: 'Behavioral', label: 'Behavioral & Leadership', description: 'STAR method questions, teamwork, ownership, and conflict resolution' },
  { id: 'Live Coding', label: 'Live Coding Challenge', description: 'Algorithm implementation, test cases, and time/space complexity' },
];

const DEFAULT_DIFFICULTIES: DifficultyItem[] = [
  { id: 'Easy', label: 'Easy (Junior / Intern)', description: 'Foundational syntax, basic collections, and conceptual definitions' },
  { id: 'Medium', label: 'Medium (Mid-Level)', description: 'Performance trade-offs, internal mechanics, concurrency, and real-world scenarios' },
  { id: 'Hard', label: 'Hard (Senior / Staff)', description: 'Complex edge cases, internal memory management, race conditions, and architecture' },
];

const DEFAULT_INTERVIEWER_STYLES: InterviewerStyleItem[] = [
  { id: 'Professional', label: 'Professional', promptIntro: 'Formal, structured, and focused on production engineering standards.', description: 'Balanced evaluation following standard industry interview rubrics' },
  { id: 'Friendly', label: 'Friendly & Supportive', promptIntro: 'Warm, collaborative, offering constructive guidance throughout.', description: 'Encouraging tone with helpful nudges for early-career developers' },
  { id: 'Technical', label: 'Deep Technical', promptIntro: 'In-depth follow-ups targeting internal runtimes and optimization.', description: 'Probing questions about byte-level memory and algorithmic trade-offs' },
  { id: 'Challenging', label: 'Challenging & Fast-Paced', promptIntro: 'Strict evaluation pushing constraints, boundary cases, and edge scenarios.', description: 'Stress-test your readiness with high-bar expectations' },
];

const DEFAULT_QUESTIONS: QuestionItem[] = [
  {
    id: 'q-default-1',
    topic: 'Software Engineering Fundamentals',
    type: 'conceptual',
    difficulty: 'medium',
    prompt: 'Explain the principles of clean architecture, separation of concerns, and how you approach error handling in production applications.',
    rubric: ['Separation of concerns', 'Error handling strategies', 'Maintainability', 'Testing strategies'],
    tags: ['architecture', 'fundamentals', 'clean-code'],
    hints: ['Think about how different layers (data, domain, presentation) communicate.', 'Mention fail-fast vs resilient retries.'],
  },
  {
    id: 'q-default-2',
    topic: 'Data Consistency & Transactions',
    type: 'technical',
    difficulty: 'medium',
    prompt: 'How do database transactions ensure data consistency? Explain ACID properties with a concrete e-commerce checkout example.',
    rubric: ['Atomicity', 'Consistency', 'Isolation levels', 'Durability'],
    tags: ['sql', 'database', 'transactions'],
    hints: ['Consider what happens if payment succeeds but inventory update fails.'],
  },
  {
    id: 'q-default-3',
    topic: 'Concurrency & Asynchronous Execution',
    type: 'technical',
    difficulty: 'medium',
    prompt: 'What are race conditions and deadlocks? How do modern language runtimes handle asynchronous I/O compared to CPU-bound multithreading?',
    rubric: ['Race conditions', 'Deadlock detection/prevention', 'Async/Await vs Threads', 'Event loop / Thread pool'],
    tags: ['concurrency', 'async', 'performance'],
    hints: ['Contrast thread blocking with non-blocking event loops.'],
  },
  {
    id: 'q-default-4',
    topic: 'API Design & Optimization',
    type: 'system-design',
    difficulty: 'medium',
    prompt: 'Describe best practices for designing a resilient, scalable REST or GraphQL API, including rate limiting, pagination, and caching strategies.',
    rubric: ['Idempotency', 'HTTP status codes', 'Pagination strategies', 'Cache-Control & Redis'],
    tags: ['api', 'system-design', 'caching'],
    hints: ['Discuss cursor-based vs offset pagination and HTTP cache headers.'],
  },
  {
    id: 'q-default-5',
    topic: 'Engineering Trade-offs & Production Incidents',
    type: 'behavioral',
    difficulty: 'medium',
    prompt: 'Walk through a challenging technical bug or production incident you resolved. How did you diagnose the root cause, mitigate immediate impact, and prevent recurrence?',
    rubric: ['STAR structure', 'Root cause analysis', 'Telemetry & Observability', 'Post-mortem prevention'],
    tags: ['behavioral', 'debugging', 'leadership'],
    hints: ['Structure your response: Situation, Task, Action, Result, and Prevention.'],
  },
];

export default function InterviewsScreen() {
  const searchParams = useLocalSearchParams<{ autoPractice?: string }>();
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';
  const primaryAccent = isLight ? '#1e6827' : colors.primary;

  // Navigation mode: 'hub' (Dashboard) | 'setup' (Launch Interview) | 'library' (Browse Topics) | 'history' (Past Sessions & Stats)
  const [activeTab, setActiveTab] = useState<'hub' | 'setup' | 'library' | 'history'>('hub');

  // Metadata catalogs
  const [tracks, setTracks] = useState<TrackItem[]>(DEFAULT_TRACKS);
  const [roles, setRoles] = useState<RoleItem[]>(DEFAULT_ROLES);
  const [interviewTypes, setInterviewTypes] = useState<InterviewTypeItem[]>(DEFAULT_INTERVIEW_TYPES);
  const [difficulties, setDifficulties] = useState<DifficultyItem[]>(DEFAULT_DIFFICULTIES);
  const [interviewerStyles, setInterviewerStyles] = useState<InterviewerStyleItem[]>(DEFAULT_INTERVIEWER_STYLES);
  const [homeStats, setHomeStats] = useState<HomeStats | null>(null);

  // Setup form states
  const [selectedRole, setSelectedRole] = useState('Full Stack Developer');
  const [selectedType, setSelectedType] = useState('Technical Interview');
  const [selectedDifficulty, setSelectedDifficulty] = useState('Medium');
  const [selectedDuration, setSelectedDuration] = useState<10 | 20 | 30 | 45 | 60>(20);
  const [selectedLanguage, setSelectedLanguage] = useState('TypeScript');
  const [selectedStyle, setSelectedStyle] = useState('Professional');

  // Phase 1 & 2: Realistic Interview Engine & Coding Test Runner State
  const [realisticSession, setRealisticSession] = useState<InterviewSessionState | null>(null);
  const [savedDraft, setSavedDraft] = useState<InterviewSessionState | null>(null);
  const [faangScorecard, setFaangScorecard] = useState<FAANGScorecard | null>(null);
  const [selectedPersonaId, setSelectedPersonaId] = useState<InterviewerPersonaId>('strict');
  const [isSessionPaused, setIsSessionPaused] = useState(false);
  const [codingTestReport, setCodingTestReport] = useState<TestExecutionReport | null>(null);

  // Phase 4: Screen Keep-Awake during active realistic session
  useEffect(() => {
    if (realisticSession && !isSessionPaused) {
      enableKeepAwake('realistic-interview');
    } else {
      disableKeepAwake('realistic-interview');
    }
    return () => {
      disableKeepAwake('realistic-interview');
    };
  }, [realisticSession, isSessionPaused]);

  // Topic library filter & search
  const [topicSearch, setTopicSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Active interview state
  const [activeInterview, setActiveInterview] = useState<{
    id: string;
    topic: string;
    role: string;
    interviewType: string;
    difficulty: string;
    duration: number;
    interviewerStyle: string;
    interviewerGreeting?: string;
    questions: QuestionItem[];
  } | null>(null);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [scratchCode, setScratchCode] = useState('// Scratchpad for algorithms and syntax\n');
  const [activeHints, setActiveHints] = useState<Record<number, string[]>>({});
  const [hintsUsedCount, setHintsUsedCount] = useState(0);
  const [hintLoading, setHintLoading] = useState(false);

  // Voice recording mock / speech-to-text
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer states (timestamp based)
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Follow up state
  const [currentFollowUp, setCurrentFollowUp] = useState<string | null>(null);

  const interviewScrollRef = useRef<ScrollView>(null);

  // Live critique
  const [critique, setCritique] = useState<LiveCritique | null>(null);
  const [critiqueLoading, setCritiqueLoading] = useState(false);
  const critiqueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Evaluation & Results
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<InterviewEvaluationResult | null>(null);
  const [reviewExpandedIndex, setReviewExpandedIndex] = useState<number | null>(null);

  // Focused Practice Session state
  const [practiceSession, setPracticeSession] = useState<FocusedPracticeSession | null>(null);
  const [practiceStep, setPracticeStep] = useState<'review' | 'questions' | 'assessment' | 'complete'>('review');
  const [practiceQuestionIndex, setPracticeQuestionIndex] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState<string[]>([]);
  const [practiceHintsUsed, setPracticeHintsUsed] = useState<number[]>([]);
  const [assessmentAnswer, setAssessmentAnswer] = useState('');
  const [practiceResult, setPracticeResult] = useState<PracticeCompletionResult | null>(null);
  const [practiceLoading, setPracticeLoading] = useState(false);

  // History inspection
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // 1. Initial Load of Metadata & Stats
  const loadDashboardData = useCallback(async () => {
    try {
      setError('');
      const [tracksRes, statsRes] = await Promise.all([
        api.get<{
          tracks: TrackItem[];
          roles: RoleItem[];
          interviewTypes: InterviewTypeItem[];
          difficulties: DifficultyItem[];
          interviewerStyles: InterviewerStyleItem[];
        }>('/ai/interview/tracks').catch(() => null),
        api.get<HomeStats>('/ai/interview/home-stats').catch(() => null),
      ]);

      if (tracksRes) {
        if (tracksRes.tracks?.length) setTracks(tracksRes.tracks);
        if (tracksRes.roles?.length) setRoles(tracksRes.roles);
        if (tracksRes.interviewTypes?.length) setInterviewTypes(tracksRes.interviewTypes);
        if (tracksRes.difficulties?.length) setDifficulties(tracksRes.difficulties);
        if (tracksRes.interviewerStyles?.length) setInterviewerStyles(tracksRes.interviewerStyles);
      }

      if (statsRes) {
        setHomeStats(statsRes);
        if (statsRes.recentInterviews?.length) {
          setHistoryList(statsRes.recentInterviews);
        }
      }
    } catch (e) {
      console.warn('Could not load interview data:', e);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    if (activeInterview || practiceSession) return;
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [activeInterview, practiceSession, loadDashboardData]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle autoPractice route param if directed from Dashboard
  useEffect(() => {
    if (searchParams?.autoPractice && !practiceSession && !activeInterview) {
      startPractice(searchParams.autoPractice);
    }
  }, [searchParams?.autoPractice]);

  // Draft Restoration on mount
  useEffect(() => {
    loadInterviewDraft().then((draft) => {
      if (draft && draft.currentStage !== 'COMPLETED') {
        setSavedDraft(draft);
      }
    });
  }, []);

  // Timer Hook for Realistic 4-Stage Interview
  useEffect(() => {
    if (!realisticSession || isSessionPaused) return;

    const interval = setInterval(() => {
      setRealisticSession((prev) => {
        if (!prev || prev.isPaused) return prev;
        const currentIdx = prev.currentStageIndex;
        const currentTime = prev.stageTimesRemaining[currentIdx] ?? 300;
        const nextTime = Math.max(0, currentTime - 1);

        const updatedTimes = {
          ...prev.stageTimesRemaining,
          [currentIdx]: nextTime,
        };

        const updatedState = {
          ...prev,
          stageTimesRemaining: updatedTimes,
        };

        // Auto-save draft every 15 seconds
        if (nextTime > 0 && nextTime % 15 === 0) {
          saveInterviewDraft(updatedState);
        }

        return updatedState;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [realisticSession, isSessionPaused]);

  function startRealisticInterview(resumeDraft = false) {
    if (resumeDraft && savedDraft) {
      setRealisticSession(savedDraft);
      setFaangScorecard(null);
      setActiveInterview(null);
      setSavedDraft(null);
      setIsSessionPaused(false);
      return;
    }

    const stages = generate4StageInterview(
      selectedRole,
      selectedDifficulty as any,
      selectedLanguage
    );

    const initialTimes: Record<number, number> = {};
    stages.forEach((s, i) => {
      initialTimes[i] = s.timeLimitSeconds;
    });

    const newSession: InterviewSessionState = {
      sessionId: `faang-${Date.now()}`,
      candidateRole: selectedRole,
      difficulty: selectedDifficulty as any,
      personaId: selectedPersonaId,
      currentStage: stages[0].stage,
      currentStageIndex: 0,
      stages,
      answers: {},
      codeDrafts: {
        2: stages[2]?.starterCode || '',
      },
      stageTimesRemaining: initialTimes,
      isPaused: false,
      startedAt: Date.now(),
      lastSavedAt: Date.now(),
      activeFollowUp: null,
    };

    setRealisticSession(newSession);
    setFaangScorecard(null);
    setActiveInterview(null);
    setSavedDraft(null);
    setIsSessionPaused(false);
    saveInterviewDraft(newSession);
  }

  function handleRealisticAnswerChange(text: string) {
    if (!realisticSession) return;
    const stageIdx = realisticSession.currentStageIndex;
    const persona = INTERVIEWER_PERSONAS[realisticSession.personaId] || INTERVIEWER_PERSONAS.strict;

    let followUp = realisticSession.activeFollowUp;
    if (!followUp && text.trim().split(/\s+/).length >= 15) {
      const probeResult = evaluateDynamicFollowUp(persona, stageIdx, text);
      if (probeResult) {
        followUp = {
          question: probeResult.question,
          stageIndex: stageIdx,
          parentTriggerId: probeResult.parentTriggerId,
        };
      }
    }

    const nextState: InterviewSessionState = {
      ...realisticSession,
      answers: {
        ...realisticSession.answers,
        [stageIdx]: text,
      },
      activeFollowUp: followUp,
      lastSavedAt: Date.now(),
    };
    setRealisticSession(nextState);
    saveInterviewDraft(nextState);
  }

  function handleRealisticVoiceAppend(text: string) {
    if (!realisticSession) return;
    const stageIdx = realisticSession.currentStageIndex;
    const current = realisticSession.answers[stageIdx] || '';
    const updated = current ? `${current}\n\n${text}` : text;
    handleRealisticAnswerChange(updated);
  }

  function handleRealisticCodeChange(code: string) {
    if (!realisticSession) return;
    const stageIdx = realisticSession.currentStageIndex;
    const nextState: InterviewSessionState = {
      ...realisticSession,
      codeDrafts: {
        ...realisticSession.codeDrafts,
        [stageIdx]: code,
      },
      lastSavedAt: Date.now(),
    };
    setRealisticSession(nextState);
    saveInterviewDraft(nextState);
  }

  async function handleRunRealisticCodeTests(): Promise<TestExecutionReport> {
    if (!realisticSession) {
      throw new Error('No active realistic interview session.');
    }
    const currentStage = realisticSession.stages[realisticSession.currentStageIndex];
    const candidateCode =
      realisticSession.codeDrafts[realisticSession.currentStageIndex] ||
      currentStage?.starterCode ||
      '';
    const testCases = currentStage?.testCases || [];

    const report = await executeCodeTestSuite(candidateCode, testCases);
    setCodingTestReport(report);
    return report;
  }

  function handleRealisticNextStage() {
    if (!realisticSession) return;
    triggerMediumHaptic();
    const nextIdx = realisticSession.currentStageIndex + 1;
    if (nextIdx < realisticSession.stages.length) {
      const nextStage = realisticSession.stages[nextIdx].stage;
      const nextState: InterviewSessionState = {
        ...realisticSession,
        currentStageIndex: nextIdx,
        currentStage: nextStage,
        activeFollowUp: null,
        lastSavedAt: Date.now(),
      };
      setRealisticSession(nextState);
      saveInterviewDraft(nextState);
      setCodingTestReport(null);
      interviewScrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      completeRealisticInterview();
    }
  }

  function completeRealisticInterview() {
    if (!realisticSession) return;
    triggerSuccessHaptic();
    setEvaluating(true);
    setTimeout(() => {
      const scorecard = generateFAANGScorecard(realisticSession);
      setFaangScorecard(scorecard);
      setRealisticSession(null);
      setCodingTestReport(null);
      setEvaluating(false);
      clearInterviewDraft();
      loadDashboardData();
    }, 1200);
  }

  function handleRealisticExit() {
    Alert.alert(
      'Exit Simulated Interview?',
      'Your progress has been preserved to local draft storage. You can resume anytime from the Practice Hub.',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Save & Exit',
          style: 'destructive',
          onPress: () => {
            if (realisticSession) {
              saveInterviewDraft(realisticSession);
              setSavedDraft(realisticSession);
            }
            setRealisticSession(null);
          },
        },
      ]
    );
  }

  // Accurate Timer Hook
  useEffect(() => {
    if (!activeInterview || !startTime) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [activeInterview, startTime]);

  // Voice recording mock / speech transcription
  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      const transcriptAppend = ` [Spoken response]: In production environments, I emphasize defensive programming, modular interfaces, and deterministic error handling with telemetry logging.`;
      const currentAnswer = answers[step] || '';
      const updated = currentAnswer + transcriptAppend;
      const nextAnswers = [...answers];
      nextAnswers[step] = updated;
      setAnswers(nextAnswers);
      triggerCritique(updated, step);
    } else {
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    }
  };

  // Debounced live rubric critique
  function triggerCritique(answerText: string, currentStep: number) {
    if (!activeInterview || answerText.trim().length < 10) return;
    if (critiqueTimerRef.current) clearTimeout(critiqueTimerRef.current);

    critiqueTimerRef.current = setTimeout(async () => {
      setCritiqueLoading(true);
      try {
        const res = await api.post<LiveCritique>('/ai/interview/critique', {
          interviewId: activeInterview.id,
          questionIndex: currentStep,
          answer: answerText,
          scratchCode,
        });
        setCritique(res);

        if (answerText.trim().split(/\s+/).length > 20 && !currentFollowUp) {
          api.post<{ followUpQuestion: string }>('/ai/interview/follow-up', {
            interviewId: activeInterview.id,
            questionIndex: currentStep,
            answer: answerText,
          }).then((fu) => {
            if (fu?.followUpQuestion) setCurrentFollowUp(fu.followUpQuestion);
          }).catch(() => {});
        }
      } catch {
        // Safe fallback heuristic
        setCritique({
          technicalClarity: { rating: answerText.length > 50 ? 'Strong' : 'Fair', note: 'Clear technical expression.' },
          communication: { rating: 'Strong', note: 'Structured explanation.' },
          problemSolving: { rating: 'Good', note: 'Solid reasoning pattern.' },
        });
      } finally {
        setCritiqueLoading(false);
      }
    }, 900);
  }

  // Request Hint
  async function requestHint(currentStep: number) {
    if (!activeInterview) return;
    setHintLoading(true);
    const existing = activeHints[currentStep] || [];
    const nextLevel = (Math.min(existing.length + 1, 3)) as 1 | 2 | 3;

    try {
      const res = await api.post<{ hintText: string; hintLevel: number; hintsUsed: number }>('/ai/interview/hint', {
        interviewId: activeInterview.id,
        questionIndex: currentStep,
        hintLevel: nextLevel,
      });

      if (res?.hintText) {
        setActiveHints((prev) => ({
          ...prev,
          [currentStep]: [...(prev[currentStep] || []), res.hintText],
        }));
        setHintsUsedCount(res.hintsUsed || (hintsUsedCount + 1));
      }
    } catch {
      const fallbackHint = nextLevel === 1
        ? 'Think about foundational type mechanics and memory allocation.'
        : nextLevel === 2
        ? 'Consider how the runtime optimizes this operation under the hood.'
        : 'Ensure you explain time complexity, edge cases, and deterministic cleanup.';
      setActiveHints((prev) => ({
        ...prev,
        [currentStep]: [...(prev[currentStep] || []), fallbackHint],
      }));
      setHintsUsedCount((c) => c + 1);
    } finally {
      setHintLoading(false);
    }
  }

  // Start new Interview
  async function startInterview() {
    setLoading(true);
    setError('');
    setEvaluationResult(null);
    setCritique(null);
    setCurrentFollowUp(null);
    setActiveHints({});
    setHintsUsedCount(0);

    try {
      const res = await api.post<{
        id: string;
        topic: string;
        role: string;
        interviewType: string;
        difficulty: string;
        duration: number;
        interviewerStyle: string;
        interviewerGreeting?: string;
        questions: QuestionItem[];
      }>('/ai/interview/start', {
        role: selectedRole,
        interviewType: selectedType,
        difficulty: selectedDifficulty,
        duration: selectedDuration,
        programmingLanguage: selectedLanguage,
        interviewerStyle: selectedStyle,
      });

      if (res?.questions && res.questions.length > 0) {
        setActiveInterview(res);
        setAnswers(new Array(res.questions.length).fill(''));
        setStep(0);
        setStartTime(Date.now());
        setElapsedSeconds(0);
      } else {
        // Fallback guaranteed questions
        const fallbackSession = {
          id: `session-${Date.now()}`,
          topic: selectedRole,
          role: selectedRole,
          interviewType: selectedType,
          difficulty: selectedDifficulty,
          duration: selectedDuration,
          interviewerStyle: selectedStyle,
          interviewerGreeting: `Hello! I'm your simulated technical evaluator today. Let's begin the ${selectedRole} assessment.`,
          questions: DEFAULT_QUESTIONS,
        };
        setActiveInterview(fallbackSession);
        setAnswers(new Array(DEFAULT_QUESTIONS.length).fill(''));
        setStep(0);
        setStartTime(Date.now());
        setElapsedSeconds(0);
      }
    } catch (err: any) {
      // Offline fallback: launch with default questions
      const fallbackSession = {
        id: `session-${Date.now()}`,
        topic: selectedRole,
        role: selectedRole,
        interviewType: selectedType,
        difficulty: selectedDifficulty,
        duration: selectedDuration,
        interviewerStyle: selectedStyle,
        interviewerGreeting: `Welcome! Let's assess your technical and problem-solving readiness for the ${selectedRole} position.`,
        questions: DEFAULT_QUESTIONS,
      };
      setActiveInterview(fallbackSession);
      setAnswers(new Array(DEFAULT_QUESTIONS.length).fill(''));
      setStep(0);
      setStartTime(Date.now());
      setElapsedSeconds(0);
    } finally {
      setLoading(false);
    }
  }

  // Safe Exit Handler
  function confirmExitInterview() {
    Alert.alert(
      'Exit Interview Session?',
      'Are you sure you want to end this interview? Any unsaved answers will be lost.',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Exit Session',
          style: 'destructive',
          onPress: () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            setIsRecording(false);
            setActiveInterview(null);
            setEvaluationResult(null);
          },
        },
      ]
    );
  }

  function confirmExitPractice() {
    Alert.alert(
      'Exit Practice Session?',
      'You can resume topic practice anytime from the Practice Hub.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit Practice',
          style: 'destructive',
          onPress: () => {
            setPracticeSession(null);
            setPracticeResult(null);
          },
        },
      ]
    );
  }

  // Evaluate & Score Interview
  async function evaluateInterview() {
    if (!activeInterview) return;
    setEvaluating(true);
    setError('');
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    try {
      const res = await api.post<InterviewEvaluationResult>('/ai/interview/evaluate', {
        interviewId: activeInterview.id,
        answers,
        scratchCodes: [scratchCode],
        hintsUsedCount,
        durationMinutes: selectedDuration,
      });
      setEvaluationResult(res);
      setActiveInterview(null);
      loadDashboardData();
    } catch {
      // Local fallback calculation
      const answered = answers.filter((a) => a.trim().length > 10).length;
      const score = Math.min(95, Math.max(50, Math.round((answered / (answers.length || 1)) * 80 + 15)));
      setEvaluationResult({
        score,
        feedback: `Completed ${activeInterview.role} interview. Strong technical terminology with structured communication.`,
        dimensions: {
          technicalKnowledge: { rating: score >= 80 ? 'Strong' : 'Improving', score, feedback: 'Good grasp of language runtime concepts.' },
          problemSolving: { rating: 'Improving', score: Math.round(score * 0.95), feedback: 'Methodical approach to problem breakdown.' },
          communication: { rating: 'Strong', score: 88, feedback: 'Clear and concise professional articulation.' },
          coding: { rating: 'Developing', score: 68, feedback: 'Continue practicing algorithm scratchpad proofs.' },
          accuracy: { rating: 'Strong', score, feedback: 'High rubric alignment on primary questions.' },
          timeManagement: { rating: 'Strong', score: 90, feedback: 'Completed comfortably within allocated duration.' },
          requirementUnderstanding: { rating: 'Strong', score: 85, feedback: 'Addressed problem constraints directly.' },
          codeQuality: { rating: 'Improving', score: 75, feedback: 'Standard naming and design conventions.' },
          architecture: { rating: 'Improving', score: 78, feedback: 'Recognizes architectural trade-offs.' },
        },
        strengths: [
          'Direct conceptual explanations with relevant real-world examples',
          'Disciplined communication adhering to standard interview rubrics',
          'Good awareness of production resilience and performance boundaries',
        ],
        weaknesses: [
          'Spend more time articulating alternative architectural trade-offs',
          'Include explicit time and space Big-O complexity for algorithms',
        ],
        recommendations: [
          'Reinforce relational transactions and isolation levels in SQL',
          'Practise concurrent asynchronous execution patterns and race condition prevention',
        ],
        questionScores: activeInterview.questions.map((q, idx) => ({
          questionId: q.id,
          questionIndex: idx,
          score: Math.min(100, Math.max(60, score + (idx % 2 === 0 ? 5 : -5))),
          feedback: 'Addressed primary rubric points clearly.',
          rubricMatches: q.rubric.slice(0, 2),
          missedPoints: q.rubric.slice(2),
        })),
        questionReviews: activeInterview.questions.map((q, idx) => ({
          questionId: q.id,
          questionIndex: idx,
          question: q.prompt,
          candidateAnswer: answers[idx] || '(No response provided)',
          expectedConcepts: q.expectedConcepts || q.rubric,
          sampleAnswer: `A comprehensive production answer demonstrates ${q.tags.join(', ')} best practices with clear failure modes.`,
          feedback: 'Good conceptual articulation.',
          commonMistakes: ['Focusing only on happy path without edge case handling.'],
          keyConcept: q.tags[0] ? q.tags[0].toUpperCase() : 'CORE MECHANICS',
          score,
          topicToPractice: q.tags[0] || q.topic,
        })),
        weakAreas: ['SQL JOINs & Relational Queries', 'Dependency Injection'],
        xpEarned: Math.round(40 + score * 0.6),
        xpAwarded: Math.round(40 + score * 0.6),
        questionsAnswered: activeInterview.questions.length,
        questionsCorrect: Math.round(activeInterview.questions.length * 0.7),
        hintsUsed: hintsUsedCount,
        durationMinutes: selectedDuration,
      });
      setActiveInterview(null);
    } finally {
      setEvaluating(false);
    }
  }

  // Start Focused Practice
  async function startPractice(topicName: string) {
    setPracticeLoading(true);
    setError('');
    try {
      const res = await api.post<FocusedPracticeSession>('/ai/interview/practice/start', {
        topic: topicName,
        difficulty: 'medium',
      });
      if (res?.questions && res.questions.length > 0) {
        setPracticeSession(res);
        setPracticeStep('review');
        setPracticeQuestionIndex(0);
        setPracticeAnswers(new Array(res.questions.length).fill(''));
        setPracticeHintsUsed(new Array(res.questions.length).fill(0));
        setAssessmentAnswer('');
        setPracticeResult(null);
      } else {
        throw new Error('No practice questions returned');
      }
    } catch {
      // Local fallback practice session
      const fallbackPractice: FocusedPracticeSession = {
        sessionId: `practice-${Date.now()}`,
        topic: topicName,
        category: 'Interview Practice',
        difficulty: 'medium',
        quickReview: {
          concept: `Foundations, mechanics, and evaluation rubrics for ${topicName}.`,
          example: `// Core production pattern for ${topicName}\nfunction solveProblem(input) {\n  // Methodical implementation\n  return result;\n}`,
          whyItMatters: `Interviewers prioritize structural understanding, edge-case mitigation, and clean code for ${topicName}.`,
        },
        questions: [
          {
            id: 'pq-1',
            difficulty: 'easy',
            questionType: 'conceptual',
            prompt: `Explain the foundational concept of ${topicName} and why it is commonly evaluated in developer interviews.`,
            hints: ['Focus on fundamental architecture and real-world utility.'],
            expectedConcepts: [topicName.toLowerCase()],
          },
          {
            id: 'pq-2',
            difficulty: 'medium',
            questionType: 'technical',
            prompt: `What are common edge cases, performance bottlenecks, or trade-offs when implementing solutions involving ${topicName}?`,
            hints: ['Think about memory leaks, concurrency, or scale bottlenecks.'],
            expectedConcepts: [topicName.toLowerCase(), 'performance'],
          },
        ],
        miniAssessment: {
          id: 'mini-1',
          prompt: `Provide a concise, production-ready technical explanation of ${topicName} demonstrating proper architectural conventions.`,
          difficulty: 'medium',
          rubric: ['Technical accuracy', 'Clarity of explanation', 'Edge case consideration'],
          expectedConcepts: [topicName.toLowerCase()],
        },
      };
      setPracticeSession(fallbackPractice);
      setPracticeStep('review');
      setPracticeQuestionIndex(0);
      setPracticeAnswers(new Array(2).fill(''));
      setPracticeHintsUsed(new Array(2).fill(0));
      setAssessmentAnswer('');
      setPracticeResult(null);
    } finally {
      setPracticeLoading(false);
    }
  }

  // Complete Focused Practice
  async function completePractice() {
    if (!practiceSession) return;
    setPracticeLoading(true);
    try {
      const res = await api.post<PracticeCompletionResult>('/ai/interview/practice/complete', {
        sessionId: practiceSession.sessionId,
        topic: practiceSession.topic,
        answers: practiceAnswers.map((ans, idx) => ({
          questionId: practiceSession.questions[idx]?.id || `q-${idx}`,
          answer: ans,
          hintsUsed: practiceHintsUsed[idx] || 0,
        })),
      });
      setPracticeResult(res);
      setPracticeStep('complete');
      loadDashboardData();
    } catch {
      setPracticeResult({
        topic: practiceSession.topic,
        questionsCompleted: practiceAnswers.length,
        totalQuestions: practiceAnswers.length,
        previousStatus: 'Needs Practice',
        currentStatus: 'Improving',
        whatYouLearned: [
          `Foundational principles of ${practiceSession.topic}`,
          'Handling boundary conditions and error cases',
          'Structuring solutions for interview evaluation',
        ],
        stillNeedsPractice: ['Complex nested relational aggregations'],
        nextRecommendedPractice: {
          topic: 'Big-O Complexity & Data Structures',
          reason: 'Next logical step to build comprehensive technical strength.',
        },
        xpAwarded: 45,
      });
      setPracticeStep('complete');
    } finally {
      setPracticeLoading(false);
    }
  }

  // Load Past History
  async function loadHistory() {
    setLoading(true);
    try {
      const res = await api.get<{ history: any[] }>('/ai/interview/history');
      if (res?.history?.length) {
        setHistoryList(res.history);
      } else if (homeStats?.recentInterviews) {
        setHistoryList(homeStats.recentInterviews);
      }
    } catch {
      if (homeStats?.recentInterviews) setHistoryList(homeStats.recentInterviews);
    } finally {
      setLoading(false);
    }
  }

  async function viewHistoryDetail(id: string) {
    setLoading(true);
    try {
      const detail = await api.get<any>(`/ai/interview/history/${id}`);
      setSelectedHistoryItem(detail);
    } catch {
      const found = historyList.find((h) => h.id === id);
      setSelectedHistoryItem(found || null);
    } finally {
      setLoading(false);
    }
  }

  // Filtered Topics for Topic Library
  const filteredTracks = useMemo(() => {
    return tracks.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(topicSearch.toLowerCase()) ||
        t.description.toLowerCase().includes(topicSearch.toLowerCase());
      const matchesCategory =
        selectedCategory === 'All' ||
        t.category.toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [tracks, topicSearch, selectedCategory]);

  // Remaining timer formatting
  const totalAllocatedSeconds = (activeInterview?.duration || 20) * 60;
  const remainingSeconds = Math.max(0, totalAllocatedSeconds - elapsedSeconds);
  const remMinutes = Math.floor(remainingSeconds / 60);
  const remSecs = remainingSeconds % 60;
  const isTimeLow = remainingSeconds < 120 && remainingSeconds > 0;

  const currentQ = activeInterview?.questions[step];

  return (
    <Screen
      scrollViewRef={interviewScrollRef}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      disableSwipeBack={Boolean(realisticSession || activeInterview || practiceSession)}
    >
      {/* Studio Header & Context Switcher */}
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          {(realisticSession || activeInterview || practiceSession || evaluationResult || faangScorecard) && (
            <View style={[styles.proBadge, { backgroundColor: `${primaryAccent}20` }]}>
              <Ionicons name="sparkles" size={12} color={primaryAccent} />
              <Text style={[styles.proBadgeText, { color: primaryAccent }]}>
                {realisticSession
                  ? 'FAANG SIMULATION ROUND'
                  : activeInterview
                  ? 'LIVE SIMULATION'
                  : practiceSession
                  ? 'FOCUSED PRACTICE'
                  : 'SESSION REVIEW'}
              </Text>
            </View>
          )}

          {realisticSession ? (
            <Pressable
              onPress={handleRealisticExit}
              style={[styles.exitSessionBtn, { backgroundColor: isLight ? '#FEE2E2' : '#450a0a' }]}
            >
              <Ionicons name="close-circle" size={14} color="#dc2626" />
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#dc2626' }}>Save & Exit</Text>
            </Pressable>
          ) : activeInterview ? (
            <Pressable
              onPress={confirmExitInterview}
              style={[styles.exitSessionBtn, { backgroundColor: isLight ? '#FEE2E2' : '#450a0a' }]}
            >
              <Ionicons name="close-circle" size={14} color="#dc2626" />
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#dc2626' }}>Exit Session</Text>
            </Pressable>
          ) : practiceSession ? (
            <Pressable
              onPress={confirmExitPractice}
              style={[styles.exitSessionBtn, { backgroundColor: isLight ? '#FEE2E2' : '#450a0a' }]}
            >
              <Ionicons name="close-circle" size={14} color="#dc2626" />
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#dc2626' }}>Exit Practice</Text>
            </Pressable>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.2)' }]}>
              <View style={[styles.statusDot, { backgroundColor: primaryAccent }]} />
              <Text style={[styles.statusText, { color: primaryAccent }]}>ACTIVE AI COACH</Text>
            </View>
          )}
        </View>

        <Heading subtitle="Production-ready simulated interviews, real-time AI rubric scoring, and adaptive practice.">
          Interview Coach
        </Heading>
      </View>

      {error ? <Notice tone="error">{error}</Notice> : null}

      {/* Evaluating Spinner View (Prevents Blank Screen During Assessment) */}
      {evaluating && (
        <Card>
          <View style={{ alignItems: 'center', paddingVertical: 32, gap: 14 }}>
            <ActivityIndicator size="large" color={primaryAccent} />
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' }}>
              Evaluating Your Interview...
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center', maxWidth: 320, lineHeight: 19 }}>
              AI Rubric Engine is assessing your technical depth, problem-solving structure, communication clarity, and syntax accuracy.
            </Text>
          </View>
        </Card>
      )}

      {/* Main 4-Segment Top Navigation Bar (When in Idle Hub) */}
      {!realisticSession && !faangScorecard && !activeInterview && !evaluationResult && !practiceSession && !evaluating && (
        <View style={[styles.segmentedControl, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Pressable
            onPress={() => setActiveTab('hub')}
            style={[
              styles.segmentBtn,
              activeTab === 'hub' && [styles.segmentBtnActive, { backgroundColor: colors.surface, borderColor: primaryAccent }],
            ]}
          >
            <Ionicons name="compass" size={14} color={activeTab === 'hub' ? primaryAccent : colors.muted} />
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.segmentText, { color: activeTab === 'hub' ? colors.text : colors.muted, fontWeight: activeTab === 'hub' ? '800' : '600' }]}
            >
              Hub
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('setup')}
            style={[
              styles.segmentBtn,
              activeTab === 'setup' && [styles.segmentBtnActive, { backgroundColor: colors.surface, borderColor: primaryAccent }],
            ]}
          >
            <Ionicons name="rocket" size={14} color={activeTab === 'setup' ? primaryAccent : colors.muted} />
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.segmentText, { color: activeTab === 'setup' ? colors.text : colors.muted, fontWeight: activeTab === 'setup' ? '800' : '600' }]}
            >
              Interview
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('library')}
            style={[
              styles.segmentBtn,
              activeTab === 'library' && [styles.segmentBtnActive, { backgroundColor: colors.surface, borderColor: primaryAccent }],
            ]}
          >
            <Ionicons name="library" size={14} color={activeTab === 'library' ? primaryAccent : colors.muted} />
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.segmentText, { color: activeTab === 'library' ? colors.text : colors.muted, fontWeight: activeTab === 'library' ? '800' : '600' }]}
            >
              Topics
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setActiveTab('history');
              loadHistory();
            }}
            style={[
              styles.segmentBtn,
              activeTab === 'history' && [styles.segmentBtnActive, { backgroundColor: colors.surface, borderColor: primaryAccent }],
            ]}
          >
            <Ionicons name="analytics" size={14} color={activeTab === 'history' ? primaryAccent : colors.muted} />
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.segmentText, { color: activeTab === 'history' ? colors.text : colors.muted, fontWeight: activeTab === 'history' ? '800' : '600' }]}
            >
              History
            </Text>
          </Pressable>
        </View>
      )}

      {/* ========================================================================= */}
      {/* 1. PRACTICE HUB VIEW                                                      */}
      {/* ========================================================================= */}
      {!realisticSession && !faangScorecard && !activeInterview && !evaluationResult && !practiceSession && !evaluating && activeTab === 'hub' && (
        <View style={styles.viewContainer}>
          {/* Unfinished Draft Recovery Card */}
          {savedDraft && (
            <Card>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="document-text" size={16} color={primaryAccent} />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: primaryAccent }}>
                      ACTIVE INTERVIEW DRAFT DETECTED
                    </Text>
                  </View>
                  <View style={[styles.streakBadge, { backgroundColor: `${primaryAccent}15` }]}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: primaryAccent }}>
                      Stage {savedDraft.currentStageIndex + 1}/4
                    </Text>
                  </View>
                </View>

                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>
                  {savedDraft.candidateRole} ({savedDraft.difficulty})
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 17 }}>
                  Evaluated by {INTERVIEWER_PERSONAS[savedDraft.personaId]?.name || 'Bar Raiser'}. Resuming restores your elapsed time, written architecture, and code drafts.
                </Text>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      title="Discard"
                      secondary
                      onPress={() => {
                        clearInterviewDraft();
                        setSavedDraft(null);
                      }}
                    />
                  </View>
                  <View style={{ flex: 2 }}>
                    <Button
                      title="Resume Interview Round →"
                      onPress={() => startRealisticInterview(true)}
                    />
                  </View>
                </View>
              </View>
            </Card>
          )}

          {/* Quick Actions Hero Card */}
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[styles.cardHeaderTitle, { color: colors.text, marginBottom: 0 }]}>Interview Readiness</Text>
              <View style={[styles.streakBadge, { backgroundColor: `${primaryAccent}15` }]}>
                <Ionicons name="flame" size={13} color={primaryAccent} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: primaryAccent }}>
                  {homeStats?.analytics?.currentStreak || 1}d Streak
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: primaryAccent }]}>{homeStats?.interviewsCompleted || 0}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Interviews Done</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: primaryAccent }]}>{homeStats?.questionsAnswered || 0}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Questions Answered</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: primaryAccent }]}>{homeStats?.practiceSessions || 0}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Micro-Sessions</Text>
              </View>
            </View>

            {/* Current Focus Highlight */}
            <View style={[styles.focusBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' }}>Target Area</Text>
                <Ionicons name="locate" size={14} color={primaryAccent} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>
                {homeStats?.currentFocus || 'SQL JOINs & Relational Queries'}
              </Text>
              <Text style={{ fontSize: 11, color: colors.muted }}>
                Recommended based on your recent skill gaps and curriculum tracks.
              </Text>
            </View>

            {/* Direct Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Configure Mock Interview"
                  onPress={() => setActiveTab('setup')}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Practise Target Area"
                  secondary
                  onPress={() => startPractice(homeStats?.currentFocus || 'SQL JOINs & Relational Queries')}
                />
              </View>
            </View>
          </Card>

          {/* Recommended Practice Section */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <Text style={[styles.section, { color: colors.text, marginTop: 0 }]}>Recommended Practice</Text>
            <Pressable onPress={() => setActiveTab('library')}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: primaryAccent }}>View All Topics →</Text>
            </Pressable>
          </View>

          {homeStats?.recommendedPractice && homeStats.recommendedPractice.length > 0 ? (
            homeStats.recommendedPractice.map((item) => (
              <Card key={item.id}>
                <View style={{ gap: 8 }}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={[styles.cardTitleText, { color: colors.text }]}>{item.topic}</Text>
                    <View
                      style={[
                        styles.levelBadge,
                        {
                          backgroundColor:
                            item.status === 'Strong'
                              ? `${primaryAccent}20`
                              : item.status === 'Improving'
                              ? '#3b82f620'
                              : item.status === 'Developing'
                              ? '#eab30820'
                              : '#ef444420',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.levelBadgeText,
                          {
                            color:
                              item.status === 'Strong'
                                ? primaryAccent
                                : item.status === 'Improving'
                                ? '#3b82f6'
                                : item.status === 'Developing'
                                ? '#ca8a04'
                                : '#dc2626',
                          },
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }}>{item.reason}</Text>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <Text style={{ fontSize: 11, color: colors.muted }}>Category: {item.category}</Text>
                    <Pressable
                      onPress={() => startPractice(item.topic)}
                      style={({ pressed }) => [
                        styles.practiseNowBtn,
                        { backgroundColor: primaryAccent },
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>Practise Topic</Text>
                      <Ionicons name="arrow-forward" size={13} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              </Card>
            ))
          ) : (
            <Card>
              <View style={{ alignItems: 'center', paddingVertical: 14, gap: 8 }}>
                <Ionicons name="bulb-outline" size={32} color={primaryAccent} />
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>EXPLORE TOPIC PRACTICE</Text>
                <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 19 }}>
                  Choose from 13+ technical tracks including C#, Java, Python, React, and SQL to start targeted practice.
                </Text>
                <Button title="Browse Topic Library" onPress={() => setActiveTab('library')} />
              </View>
            </Card>
          )}

          {/* Adaptive Learning Paths */}
          {homeStats?.learningPaths && homeStats.learningPaths.length > 0 && (
            <>
              <Text style={[styles.section, { color: colors.text }]}>Adaptive Learning Paths</Text>
              {homeStats.learningPaths.map((path) => (
                <Card key={path.id}>
                  <View style={{ gap: 8 }}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={[styles.cardTitleText, { color: colors.text, fontSize: 14 }]}>{path.title}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: primaryAccent, flexShrink: 0, alignSelf: 'flex-start' }}>{path.progress}%</Text>
                    </View>
                    <View style={[styles.progressTrack, { backgroundColor: colors.surfaceElevated }]}>
                      <View style={[styles.progressFill, { width: `${path.progress}%`, backgroundColor: primaryAccent }]} />
                    </View>
                    <Text style={{ fontSize: 12, color: colors.muted }}>
                      Current Milestone: <Text style={{ fontWeight: '700', color: colors.text }}>{path.currentStep}</Text>
                    </Text>
                    <Button
                      title="Continue Milestone"
                      secondary
                      onPress={() => startPractice(path.currentStep)}
                    />
                  </View>
                </Card>
              ))}
            </>
          )}
        </View>
      )}

      {/* ========================================================================= */}
      {/* 2. MOCK INTERVIEW LAUNCHER VIEW (Clean In-Screen Setup)                    */}
      {/* ========================================================================= */}
      {!activeInterview && !evaluationResult && !practiceSession && !evaluating && activeTab === 'setup' && (
        <View style={styles.viewContainer}>
          <Card>
            <View style={{ gap: 14 }}>
              <View>
                <Text style={[styles.cardHeaderTitle, { color: colors.text, marginBottom: 2 }]}>
                  Configure Simulated Interview
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>
                  Customized with authentic real-world rubrics, dynamic persona styles, and timed pressure.
                </Text>
              </View>

              {/* Target Developer Role */}
              <View>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Target Developer Role</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
                  {roles.map((r) => (
                    <Pressable
                      key={r.id}
                      onPress={() => {
                        setSelectedRole(r.label);
                        if (r.primaryTrack === 'java') setSelectedLanguage('Java');
                        else if (r.primaryTrack === 'python') setSelectedLanguage('Python');
                        else if (r.primaryTrack === 'csharp') setSelectedLanguage('C#');
                        else if (r.primaryTrack === 'sql') setSelectedLanguage('SQL');
                        else setSelectedLanguage('TypeScript');
                      }}
                      style={[
                        styles.choicePill,
                        { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                        selectedRole === r.label && { backgroundColor: `${primaryAccent}20`, borderColor: primaryAccent },
                      ]}
                    >
                      <Text style={[styles.choiceText, { color: selectedRole === r.label ? primaryAccent : colors.text }]}>
                        {r.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Interview Type */}
              <View>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Interview Format</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {interviewTypes.map((t) => (
                    <Pressable
                      key={t.id}
                      onPress={() => setSelectedType(t.label)}
                      style={[
                        styles.choicePill,
                        { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                        selectedType === t.label && { backgroundColor: `${primaryAccent}20`, borderColor: primaryAccent },
                      ]}
                    >
                      <Text style={[styles.choiceText, { color: selectedType === t.label ? primaryAccent : colors.text }]}>
                        {t.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Difficulty Level */}
              <View>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Seniority / Difficulty</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {difficulties.map((d) => (
                    <Pressable
                      key={d.id}
                      onPress={() => setSelectedDifficulty(d.id)}
                      style={[
                        styles.choicePill,
                        { flex: 1, alignItems: 'center', backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                        selectedDifficulty === d.id && { backgroundColor: `${primaryAccent}20`, borderColor: primaryAccent },
                      ]}
                    >
                      <Text style={[styles.choiceText, { color: selectedDifficulty === d.id ? primaryAccent : colors.text }]}>
                        {d.id}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Duration */}
              <View>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Time Allocation</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {([10, 20, 30, 45, 60] as const).map((dur) => (
                    <Pressable
                      key={dur}
                      onPress={() => setSelectedDuration(dur)}
                      style={[
                        styles.choicePill,
                        { flex: 1, alignItems: 'center', backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                        selectedDuration === dur && { backgroundColor: `${primaryAccent}20`, borderColor: primaryAccent },
                      ]}
                    >
                      <Text style={[styles.choiceText, { color: selectedDuration === dur ? primaryAccent : colors.text }]}>
                        {dur}m
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Language */}
              <View>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Primary Technical Language</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
                  {['TypeScript', 'JavaScript', 'Python', 'Java', 'C#', 'SQL', 'C++'].map((lang) => (
                    <Pressable
                      key={lang}
                      onPress={() => setSelectedLanguage(lang)}
                      style={[
                        styles.choicePill,
                        { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                        selectedLanguage === lang && { backgroundColor: `${primaryAccent}20`, borderColor: primaryAccent },
                      ]}
                    >
                      <Text style={[styles.choiceText, { color: selectedLanguage === lang ? primaryAccent : colors.text }]}>
                        {lang}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Interviewer Persona Selection */}
              <View>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Interviewer Persona & Rubric Focus</Text>
                <View style={{ gap: 8 }}>
                  {Object.values(INTERVIEWER_PERSONAS).map((p) => {
                    const isSelected = selectedPersonaId === p.id;
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => setSelectedPersonaId(p.id)}
                        style={[
                          styles.personaChoiceCard,
                          {
                            backgroundColor: isSelected ? `${p.accentColor}12` : colors.surfaceElevated,
                            borderColor: isSelected ? p.accentColor : colors.border,
                          },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={[styles.avatarBox, { backgroundColor: `${p.accentColor}20`, width: 36, height: 36, borderRadius: 18 }]}>
                            <Ionicons name={p.avatarIcon as any} size={18} color={p.accentColor} />
                          </View>
                          <View style={{ flex: 1, gap: 2 }}>
                            <View style={styles.cardHeaderRow}>
                              <Text style={[styles.cardTitleText, { fontSize: 13, color: colors.text }]}>{p.name}</Text>
                              <View style={[styles.badge, { backgroundColor: `${p.accentColor}20`, flexShrink: 0, alignSelf: 'flex-start' }]}>
                                <Text style={[styles.badgeText, { color: p.accentColor }]}>{p.badge}</Text>
                              </View>
                            </View>
                            <Text style={{ fontSize: 11, color: colors.muted }}>{p.toneDescription}</Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={{ marginTop: 12, gap: 8 }}>
                <Button
                  title="Launch 4-Stage FAANG Simulation (Recommended) 🚀"
                  onPress={() => startRealisticInterview(false)}
                />

                <Button
                  title={loading ? 'Preparing Session...' : 'Launch Single-Track Interview'}
                  secondary
                  onPress={startInterview}
                  disabled={loading}
                />
              </View>
            </View>
          </Card>
        </View>
      )}

      {/* ========================================================================= */}
      {/* 3. TOPIC LIBRARY VIEW (Browse & 1-Tap Practice)                           */}
      {/* ========================================================================= */}
      {!realisticSession && !faangScorecard && !activeInterview && !evaluationResult && !practiceSession && !evaluating && activeTab === 'library' && (
        <View style={styles.viewContainer}>
          {/* Search & Filter Bar */}
          <Card>
            <View style={{ gap: 10 }}>
              <View style={[styles.searchBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Ionicons name="search" size={16} color={colors.muted} />
                <TextInput
                  value={topicSearch}
                  onChangeText={setTopicSearch}
                  placeholder="Search tracks, frameworks, or concepts..."
                  placeholderTextColor={colors.muted}
                  style={[styles.searchInput, { color: colors.text }]}
                />
                {topicSearch ? (
                  <Pressable onPress={() => setTopicSearch('')}>
                    <Ionicons name="close-circle" size={16} color={colors.muted} />
                  </Pressable>
                ) : null}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {['All', 'Language', 'Framework', 'Composite', 'Specialized'].map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    style={[
                      styles.categoryChip,
                      { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                      selectedCategory === cat && { backgroundColor: `${primaryAccent}20`, borderColor: primaryAccent },
                    ]}
                  >
                    <Text style={[styles.categoryChipText, { color: selectedCategory === cat ? primaryAccent : colors.text }]}>
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Card>

          {/* Tracks List */}
          <Text style={[styles.section, { color: colors.text }]}>
            Available Curriculum Tracks ({filteredTracks.length})
          </Text>

          {filteredTracks.map((tr) => (
            <Card key={tr.id}>
              <View style={{ gap: 8 }}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, paddingRight: 6 }}>
                    <Ionicons name="code-slash" size={18} color={primaryAccent} style={{ flexShrink: 0 }} />
                    <Text style={[styles.cardTitleText, { fontSize: 16, color: colors.text }]}>{tr.name}</Text>
                  </View>
                  <View style={[styles.tagBadge, { backgroundColor: `${primaryAccent}15`, flexShrink: 0, alignSelf: 'flex-start' }]}>
                    <Text style={[styles.tagText, { color: primaryAccent }]}>{tr.category.toUpperCase()}</Text>
                  </View>
                </View>

                <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }}>{tr.description}</Text>

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      title="Practise Topic"
                      secondary
                      onPress={() => startPractice(tr.name)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      title="Interview on Track"
                      onPress={() => {
                        setSelectedRole(tr.name.includes('Developer') ? tr.name : `${tr.name} Developer`);
                        if (tr.id === 'java') setSelectedLanguage('Java');
                        else if (tr.id === 'python') setSelectedLanguage('Python');
                        else if (tr.id === 'csharp') setSelectedLanguage('C#');
                        else if (tr.id === 'sql') setSelectedLanguage('SQL');
                        else setSelectedLanguage('TypeScript');
                        setActiveTab('setup');
                      }}
                    />
                  </View>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* ========================================================================= */}
      {/* 4. HISTORY & ANALYTICS VIEW                                               */}
      {/* ========================================================================= */}
      {!realisticSession && !faangScorecard && !activeInterview && !evaluationResult && !practiceSession && !evaluating && activeTab === 'history' && (
        <View style={styles.viewContainer}>
          {/* Performance KPIs */}
          <Text style={[styles.section, { color: colors.text, marginTop: 0 }]}>Interview & Practice Analytics</Text>
          <View style={styles.kpiGrid}>
            <View style={[styles.kpiBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.kpiNumber, { color: primaryAccent }]}>{homeStats?.analytics?.interviewsCompleted || historyList.length || 0}</Text>
              <Text style={[styles.kpiDesc, { color: colors.muted }]}>Interviews Completed</Text>
            </View>
            <View style={[styles.kpiBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.kpiNumber, { color: primaryAccent }]}>{homeStats?.analytics?.practiceSessions || 0}</Text>
              <Text style={[styles.kpiDesc, { color: colors.muted }]}>Practice Sessions</Text>
            </View>
            <View style={[styles.kpiBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.kpiNumber, { color: primaryAccent }]}>{homeStats?.analytics?.topicsImproved || 3}</Text>
              <Text style={[styles.kpiDesc, { color: colors.muted }]}>Topics Improved</Text>
            </View>
            <View style={[styles.kpiBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.kpiNumber, { color: primaryAccent }]}>{homeStats?.analytics?.currentStreak || 1}d</Text>
              <Text style={[styles.kpiDesc, { color: colors.muted }]}>Practice Streak</Text>
            </View>
          </View>

          {/* Top Practiced Skills */}
          <Card>
            <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>Top Practised Skills</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {(homeStats?.analytics?.mostPractisedSkills || ['C#', 'SQL', 'TypeScript', 'System Design', 'Behavioral']).map((sk) => (
                <View key={sk} style={[styles.skillTag, { backgroundColor: `${primaryAccent}15`, borderColor: primaryAccent }]}>
                  <Ionicons name="checkmark-circle" size={13} color={primaryAccent} />
                  <Text style={[styles.skillTagText, { color: primaryAccent }]}>{sk}</Text>
                </View>
              ))}
            </View>
          </Card>

          {/* Interview History Records */}
          <Text style={[styles.section, { color: colors.text }]}>Past Interview Sessions ({historyList.length})</Text>
          {historyList.length > 0 ? (
            historyList.map((item) => (
              <Pressable key={item.id} onPress={() => viewHistoryDetail(item.id)}>
                <Card>
                  <View style={{ gap: 6 }}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={[styles.cardTitleText, { color: colors.text }]}>{item.role || item.topic}</Text>
                      <View style={[styles.scorePill, { backgroundColor: `${primaryAccent}20`, flexShrink: 0, alignSelf: 'flex-start' }]}>
                        <Text style={[styles.scorePillText, { color: primaryAccent }]}>{item.score || 0}%</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: colors.muted }}>
                      {item.interviewType || 'Technical'} · {item.difficulty || 'Medium'} · {item.duration || 20}m ·{' '}
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                    {item.feedback ? (
                      <Text style={{ fontSize: 12, color: colors.muted, fontStyle: 'italic' }} numberOfLines={2}>
                        "{item.feedback}"
                      </Text>
                    ) : null}
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: primaryAccent }}>View Detailed Breakdown →</Text>
                    </View>
                  </View>
                </Card>
              </Pressable>
            ))
          ) : (
            <Card>
              <View style={{ alignItems: 'center', paddingVertical: 14, gap: 6 }}>
                <Ionicons name="time-outline" size={28} color={colors.muted} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>No Past Interviews Yet</Text>
                <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'center' }}>
                  Complete your first mock interview to track performance records and dimensional rubrics.
                </Text>
                <Button title="Start First Interview" onPress={() => setActiveTab('setup')} />
              </View>
            </Card>
          )}
        </View>
      )}

      {/* ========================================================================= */}
      {/* 4.5. REALISTIC 4-STAGE INTERVIEW SESSION (FAANG ROUND)                    */}
      {/* ========================================================================= */}
      {realisticSession && (
        <View style={styles.viewContainer}>
          {/* Persona Header with dynamic probe speech bubble */}
          <PersonaHeader
            persona={INTERVIEWER_PERSONAS[realisticSession.personaId] || INTERVIEWER_PERSONAS.strict}
            stageTitle={realisticSession.stages[realisticSession.currentStageIndex]?.title || 'Interview Stage'}
            activeFollowUpQuestion={realisticSession.activeFollowUp?.question}
          />

          {/* Per-Stage Countdown Timer */}
          <InterviewTimer
            secondsRemaining={realisticSession.stageTimesRemaining[realisticSession.currentStageIndex] ?? 300}
            totalAllocatedSeconds={realisticSession.stages[realisticSession.currentStageIndex]?.timeLimitSeconds ?? 300}
            isPaused={isSessionPaused}
            onTogglePause={() => setIsSessionPaused((p) => !p)}
            onTimeExpired={handleRealisticNextStage}
          />

          {/* 4-Stage Step Tracker */}
          <View style={[styles.stageTrackContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            {realisticSession.stages.map((stg, sIdx) => {
              const isCurrent = sIdx === realisticSession.currentStageIndex;
              const isPast = sIdx < realisticSession.currentStageIndex;
              return (
                <View
                  key={stg.stage}
                  style={[
                    styles.stageChip,
                    isCurrent && { backgroundColor: `${primaryAccent}20`, borderColor: primaryAccent },
                    isPast && { backgroundColor: isLight ? '#f1f5f9' : '#1e293b' },
                  ]}
                >
                  <Text
                    style={[
                      styles.stageChipNum,
                      { color: isCurrent ? primaryAccent : isPast ? colors.text : colors.muted },
                    ]}
                  >
                    {isPast ? '✓' : String(sIdx + 1)}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.stageChipLabel,
                      { color: isCurrent ? primaryAccent : isPast ? colors.text : colors.muted, fontWeight: isCurrent ? '800' : '600' },
                    ]}
                  >
                    {stg.stage === 'BEHAVIORAL'
                      ? 'STAR'
                      : stg.stage === 'SYSTEM_DESIGN'
                      ? 'System'
                      : stg.stage === 'CODING'
                      ? 'Coding'
                      : 'Debrief'}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Question / Scenario Card */}
          <Card>
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={[styles.tagBadge, { backgroundColor: `${primaryAccent}15` }]}>
                  <Text style={[styles.tagText, { color: primaryAccent }]}>
                    {realisticSession.stages[realisticSession.currentStageIndex]?.category.toUpperCase()}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted }}>
                  {realisticSession.difficulty.toUpperCase()} CALIBRATION
                </Text>
              </View>

              <Text style={[styles.questionText, { color: colors.text }]}>
                {realisticSession.stages[realisticSession.currentStageIndex]?.prompt}
              </Text>

              {realisticSession.stages[realisticSession.currentStageIndex]?.scenarioContext && (
                <View
                  style={[
                    styles.scenarioBox,
                    { backgroundColor: isLight ? '#f8fafc' : '#0f172a', borderColor: colors.border },
                  ]}
                >
                  <Ionicons name="information-circle-outline" size={16} color={primaryAccent} />
                  <Text style={[styles.scenarioText, { color: colors.muted }]}>
                    {realisticSession.stages[realisticSession.currentStageIndex]?.scenarioContext}
                  </Text>
                </View>
              )}

              {/* Constraints if present */}
              {realisticSession.stages[realisticSession.currentStageIndex]?.constraints && (
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.text }}>CONSTRAINTS & REQUIREMENTS:</Text>
                  {realisticSession.stages[realisticSession.currentStageIndex]?.constraints?.map((c, i) => (
                    <Text key={i} style={{ fontSize: 12, color: colors.muted }}>
                      • {c}
                    </Text>
                  ))}
                </View>
              )}

              {/* Live Answer or Coding Input */}
              {realisticSession.stages[realisticSession.currentStageIndex]?.stage === 'CODING' ? (
                <View style={{ gap: 10 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.text }}>
                    SOLUTION IMPLEMENTATION ({realisticSession.stages[realisticSession.currentStageIndex]?.language || 'TypeScript'}):
                  </Text>
                  <MobileCodeEditor
                    value={
                      realisticSession.codeDrafts[realisticSession.currentStageIndex] ??
                      realisticSession.stages[realisticSession.currentStageIndex]?.starterCode ??
                      ''
                    }
                    onChangeText={handleRealisticCodeChange}
                    language={realisticSession.stages[realisticSession.currentStageIndex]?.language || 'TypeScript'}
                    minHeight={210}
                  />

                  {realisticSession.stages[realisticSession.currentStageIndex]?.testCases &&
                   realisticSession.stages[realisticSession.currentStageIndex].testCases!.length > 0 && (
                    <TestExecutionRunner
                      testCases={realisticSession.stages[realisticSession.currentStageIndex].testCases!}
                      onRunTests={handleRunRealisticCodeTests}
                      report={codingTestReport}
                    />
                  )}
                </View>
              ) : (
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.text }}>YOUR STRUCTURED EXPLANATION:</Text>
                  <TextInput
                    value={realisticSession.answers[realisticSession.currentStageIndex] || ''}
                    onChangeText={handleRealisticAnswerChange}
                    multiline
                    placeholder="Type your explanation, architecture breakdown, or trade-offs here..."
                    placeholderTextColor={colors.muted}
                    keyboardAppearance={theme === 'dark' ? 'dark' : 'light'}
                    style={[
                      styles.answerInput,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.border,
                        color: colors.text,
                        minHeight: 120,
                      },
                    ]}
                  />
                </View>
              )}

              {/* Speech-to-Text Voice Waveform Input */}
              <VoiceWaveformInput
                onAppendTranscription={handleRealisticVoiceAppend}
                accentColor={primaryAccent}
              />

              {/* Hints Accordion */}
              {realisticSession.stages[realisticSession.currentStageIndex]?.hints && (
                <View style={[styles.hintsContainer, { backgroundColor: `${primaryAccent}08`, borderColor: primaryAccent }]}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: primaryAccent }}>
                    INTERVIEW SCALING HINTS
                  </Text>
                  {realisticSession.stages[realisticSession.currentStageIndex]?.hints.map((h, i) => (
                    <Text key={i} style={{ fontSize: 12, color: colors.text, lineHeight: 17 }}>
                      • {h}
                    </Text>
                  ))}
                </View>
              )}

              {/* Navigation buttons */}
              <View style={styles.navRow}>
                <Button
                  title="← Previous Stage"
                  secondary
                  disabled={realisticSession.currentStageIndex === 0}
                  onPress={() => {
                    const prevIdx = realisticSession.currentStageIndex - 1;
                    if (prevIdx >= 0) {
                      const nextState: InterviewSessionState = {
                        ...realisticSession,
                        currentStageIndex: prevIdx,
                        currentStage: realisticSession.stages[prevIdx].stage,
                      };
                      setRealisticSession(nextState);
                      saveInterviewDraft(nextState);
                    }
                  }}
                />

                {realisticSession.currentStageIndex < realisticSession.stages.length - 1 ? (
                  <Button
                    title="Next Stage →"
                    onPress={handleRealisticNextStage}
                  />
                ) : (
                  <Button
                    title="Submit & Generate FAANG Scorecard ✨"
                    onPress={completeRealisticInterview}
                  />
                )}
              </View>
            </View>
          </Card>
        </View>
      )}

      {/* ========================================================================= */}
      {/* 4.6. FAANG SCORECARD VIEW                                                 */}
      {/* ========================================================================= */}
      {faangScorecard && (
        <View style={styles.viewContainer}>
          <FAANGScorecardView
            scorecard={faangScorecard}
            onRetake={() => {
              setFaangScorecard(null);
              startRealisticInterview(false);
            }}
            onExit={() => {
              setFaangScorecard(null);
              setActiveTab('hub');
            }}
          />
        </View>
      )}

      {/* ========================================================================= */}
      {/* 5. LIVE INTERVIEW SESSION                                                 */}
      {/* ========================================================================= */}
      {activeInterview && currentQ && (
        <View style={styles.viewContainer}>
          {/* Interviewer Persona Banner */}
          <View style={[styles.personaBanner, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.15)', borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="person-circle-outline" size={26} color={primaryAccent} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                  {activeInterview.role.toUpperCase()} INTERVIEWER · {activeInterview.interviewerStyle}
                </Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>
                  {step === 0 && activeInterview.interviewerGreeting
                    ? activeInterview.interviewerGreeting
                    : `Evaluating Question ${step + 1} of ${activeInterview.questions.length}`}
                </Text>
              </View>
            </View>
          </View>

          {/* Progress Header & Timer */}
          <View style={styles.timerHeader}>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>
                Question {step + 1} of {activeInterview.questions.length} ({Math.round(((step + 1) / activeInterview.questions.length) * 100)}%)
              </Text>
              <View style={[styles.miniProgressTrack, { backgroundColor: colors.surfaceElevated, marginTop: 4 }]}>
                <View
                  style={[
                    styles.miniProgressFill,
                    {
                      width: `${((step + 1) / activeInterview.questions.length) * 100}%`,
                      backgroundColor: primaryAccent,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={[styles.timerBadge, { backgroundColor: isTimeLow ? '#ef444420' : colors.surfaceElevated, borderColor: isTimeLow ? '#ef4444' : colors.border }]}>
              <Ionicons name="time-outline" size={14} color={isTimeLow ? '#ef4444' : primaryAccent} />
              <Text style={[styles.timerText, { color: isTimeLow ? '#ef4444' : colors.text }]}>
                {String(remMinutes).padStart(2, '0')}:{String(remSecs).padStart(2, '0')}
              </Text>
            </View>
          </View>

          {isTimeLow ? (
            <View style={styles.lowTimeWarning}>
              <Ionicons name="warning-outline" size={14} color="#ef4444" />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444' }}>Time is low! Under 2 minutes remaining.</Text>
            </View>
          ) : null}

          {/* Question Box */}
          <Card>
            <View style={styles.questionMeta}>
              <View style={styles.tagsRow}>
                {currentQ.tags.map((tg) => (
                  <View key={tg} style={[styles.tagBadge, { backgroundColor: `${primaryAccent}15` }]}>
                    <Text style={[styles.tagText, { color: primaryAccent }]}>{tg}</Text>
                  </View>
                ))}
              </View>
              <View style={[styles.diffBadge, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[styles.diffText, { color: primaryAccent }]}>{currentQ.difficulty.toUpperCase()}</Text>
              </View>
            </View>

            <Text style={[styles.questionText, { color: colors.text }]}>{currentQ.prompt}</Text>

            {/* Answer Input */}
            <TextInput
              value={answers[step] || ''}
              onChangeText={(txt) => {
                const nextAnswers = [...answers];
                nextAnswers[step] = txt;
                setAnswers(nextAnswers);
                triggerCritique(txt, step);
              }}
              onFocus={() => {
                setTimeout(() => {
                  interviewScrollRef.current?.scrollToEnd({ animated: true });
                }, 180);
              }}
              multiline
              keyboardAppearance={theme === 'dark' ? 'dark' : 'light'}
              placeholder="Type your structured explanation or rationale..."
              placeholderTextColor={colors.muted}
              style={[styles.answerInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
            />

            {/* Voice & Hints Controls */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Pressable
                onPress={toggleRecording}
                style={[
                  styles.voiceButton,
                  { backgroundColor: isRecording ? '#ef4444' : colors.surfaceElevated, borderColor: isRecording ? '#ef4444' : colors.border },
                ]}
              >
                <Ionicons name={isRecording ? 'stop-circle' : 'mic-outline'} size={15} color={isRecording ? '#fff' : colors.text} />
                <Text style={[styles.voiceBtnText, { color: isRecording ? '#fff' : colors.text }]}>
                  {isRecording ? `Recording (${recordingSeconds}s)...` : 'Simulate Voice'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => requestHint(step)}
                disabled={hintLoading || (activeHints[step]?.length || 0) >= 3}
                style={[
                  styles.hintButton,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                    opacity: (activeHints[step]?.length || 0) >= 3 ? 0.5 : 1,
                  },
                ]}
              >
                {hintLoading ? (
                  <ActivityIndicator size="small" color={primaryAccent} />
                ) : (
                  <>
                    <Ionicons name="bulb-outline" size={15} color={primaryAccent} />
                    <Text style={[styles.hintBtnText, { color: primaryAccent }]}>
                      Hint {(activeHints[step]?.length || 0) + 1}/3
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* Hints Accordion */}
            {activeHints[step] && activeHints[step].length > 0 && (
              <View style={[styles.hintsContainer, { backgroundColor: `${primaryAccent}10`, borderColor: primaryAccent }]}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: primaryAccent }}>INTERVIEWER HINTS</Text>
                {activeHints[step].map((h, i) => (
                  <Text key={i} style={{ fontSize: 12, color: colors.text, lineHeight: 18 }}>
                    • Level {i + 1}: {h}
                  </Text>
                ))}
              </View>
            )}

            {/* Follow-up question if triggered */}
            {currentFollowUp && (
              <View style={[styles.followUpBox, { backgroundColor: isLight ? '#FFF8E1' : '#2A2000', borderColor: '#F59E0B' }]}>
                <Ionicons name="chatbubble-ellipses" size={16} color="#F59E0B" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#D97706' }}>INTERVIEWER FOLLOW-UP:</Text>
                  <Text style={{ fontSize: 12, color: colors.text, marginTop: 2 }}>{currentFollowUp}</Text>
                </View>
              </View>
            )}

            {/* Navigation buttons */}
            <View style={styles.navRow}>
              <Button
                title="← Previous"
                secondary
                disabled={step === 0}
                onPress={() => setStep((s) => Math.max(0, s - 1))}
              />

              {step < activeInterview.questions.length - 1 ? (
                <Button
                  title="Next Question →"
                  onPress={() => setStep((s) => s + 1)}
                />
              ) : (
                <Button
                  title="Submit & Evaluate ✨"
                  onPress={evaluateInterview}
                />
              )}
            </View>
          </Card>

          {/* Real-time AI Rubric Critique Card */}
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="speedometer-outline" size={16} color={primaryAccent} />
                <Text style={[styles.cardHeaderTitle, { color: colors.text, marginBottom: 0 }]}>Live AI Rubric Critique</Text>
              </View>
              {critiqueLoading ? (
                <ActivityIndicator size="small" color={primaryAccent} />
              ) : (
                <Text style={{ fontSize: 11, color: colors.muted }}>Real-time evaluation</Text>
              )}
            </View>

            {critique ? (
              <View style={{ gap: 6 }}>
                <View style={styles.critiqueRow}>
                  <Text style={[styles.critiqueLabel, { color: colors.muted }]}>Technical Clarity:</Text>
                  <Text style={[styles.critiqueRating, { color: primaryAccent }]}>
                    {critique.technicalClarity?.rating || 'Strong'}
                  </Text>
                </View>
                <View style={styles.critiqueRow}>
                  <Text style={[styles.critiqueLabel, { color: colors.muted }]}>Communication:</Text>
                  <Text style={[styles.critiqueRating, { color: primaryAccent }]}>
                    {critique.communication?.rating || 'Clear'}
                  </Text>
                </View>
                <View style={styles.critiqueRow}>
                  <Text style={[styles.critiqueLabel, { color: colors.muted }]}>Problem Solving:</Text>
                  <Text style={[styles.critiqueRating, { color: primaryAccent }]}>
                    {critique.problemSolving?.rating || 'Good'}
                  </Text>
                </View>

                {critique.missingPoints && critique.missingPoints.length > 0 && (
                  <View style={[styles.divider, { borderTopColor: colors.border, paddingTop: 6 }]}>
                    <Text style={[styles.critiqueNoteLabel, { color: colors.text }]}>Points to mention:</Text>
                    {critique.missingPoints.map((pt, i) => (
                      <Text key={i} style={[styles.critiqueBullet, { color: colors.muted }]}>• {pt}</Text>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={{ paddingVertical: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'center' }}>
                  Begin typing your response above to receive real-time rubric critique and hints.
                </Text>
              </View>
            )}
          </Card>

          {/* Interactive Code Scratchpad */}
          <Text style={[styles.section, { color: colors.text }]}>Interactive Code Scratchpad</Text>
          <Card>
            <TextInput
              value={scratchCode}
              onChangeText={setScratchCode}
              multiline
              keyboardAppearance={theme === 'dark' ? 'dark' : 'light'}
              placeholder="// Write code or algorithm steps here..."
              placeholderTextColor={colors.muted}
              style={[
                styles.scratchInput,
                {
                  backgroundColor: isLight ? '#f4f6f8' : '#070b12',
                  borderColor: colors.border,
                  color: primaryAccent,
                },
              ]}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Card>
        </View>
      )}

      {/* Recovery Fallback if Session Has Missing Question */}
      {activeInterview && !currentQ && (
        <Card>
          <View style={{ alignItems: 'center', paddingVertical: 20, gap: 10 }}>
            <Ionicons name="alert-circle-outline" size={36} color="#ef4444" />
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Question Unavailable</Text>
            <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center' }}>
              We could not find Question {step + 1} for this session. You can restart or return to the Practice Hub.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Button title="Resume at First Question" onPress={() => setStep(0)} />
              <Button title="Exit Session" secondary onPress={() => setActiveInterview(null)} />
            </View>
          </View>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 6. MULTI-DIMENSIONAL RESULTS & QUESTION REVIEW                            */}
      {/* ========================================================================= */}
      {evaluationResult && (
        <View style={styles.viewContainer}>
          <Card>
            <Text style={[styles.completedHeader, { color: colors.text }]}>INTERVIEW COMPLETE</Text>
            <View style={styles.scoreContainer}>
              <Text style={[styles.bigScore, { color: primaryAccent }]}>{evaluationResult.score}</Text>
              <Text style={[styles.scoreOutOf, { color: colors.muted }]}>out of 100</Text>
              <View style={[styles.xpRewardBadge, { backgroundColor: `${primaryAccent}20`, borderColor: primaryAccent }]}>
                <Ionicons name="sparkles" size={14} color={primaryAccent} />
                <Text style={[styles.xpRewardText, { color: primaryAccent }]}>
                  +{evaluationResult.xpAwarded || evaluationResult.xpEarned} Contribution XP
                </Text>
              </View>
            </View>

            {/* Quick Metrics Bar */}
            <View style={[styles.metricsBar, { borderColor: colors.border }]}>
              <View style={styles.metricItem}>
                <Text style={[styles.metricVal, { color: colors.text }]}>{evaluationResult.questionsAnswered}</Text>
                <Text style={[styles.metricLbl, { color: colors.muted }]}>Answered</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricVal, { color: primaryAccent }]}>{evaluationResult.questionsCorrect}</Text>
                <Text style={[styles.metricLbl, { color: colors.muted }]}>Correct</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricVal, { color: colors.text }]}>{evaluationResult.hintsUsed}</Text>
                <Text style={[styles.metricLbl, { color: colors.muted }]}>Hints Used</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricVal, { color: colors.text }]}>{evaluationResult.durationMinutes}m</Text>
                <Text style={[styles.metricLbl, { color: colors.muted }]}>Duration</Text>
              </View>
            </View>

            <View style={[styles.feedbackBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={[styles.feedbackTitle, { color: colors.text }]}>Evaluator Feedback</Text>
              <Text style={[styles.feedbackContent, { color: colors.muted }]}>{evaluationResult.feedback}</Text>
            </View>
          </Card>

          {/* Performance Analysis by Dimension */}
          <Text style={[styles.section, { color: colors.text }]}>Performance Analysis by Dimension</Text>
          <Card>
            <View style={{ gap: 10 }}>
              {evaluationResult.dimensions && Object.entries(evaluationResult.dimensions).map(([dimKey, dimVal]) => {
                const label = dimKey.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
                return (
                  <View key={dimKey} style={styles.dimensionRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{label}</Text>
                      <Text style={{ fontSize: 11, color: colors.muted }}>{dimVal.feedback}</Text>
                    </View>
                    <View
                      style={[
                        styles.ratingBadge,
                        {
                          backgroundColor:
                            dimVal.rating === 'Strong'
                              ? `${primaryAccent}20`
                              : dimVal.rating === 'Improving'
                              ? '#3b82f620'
                              : dimVal.rating === 'Developing'
                              ? '#eab30820'
                              : '#ef444420',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.ratingBadgeText,
                          {
                            color:
                              dimVal.rating === 'Strong'
                                ? primaryAccent
                                : dimVal.rating === 'Improving'
                                ? '#3b82f6'
                                : dimVal.rating === 'Developing'
                                ? '#ca8a04'
                                : '#dc2626',
                          },
                        ]}
                      >
                        {dimVal.rating} ({dimVal.score}%)
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>

          {/* Strengths & Weaknesses */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Card>
                <Text style={{ fontSize: 13, fontWeight: '800', color: primaryAccent, marginBottom: 4 }}>Strengths</Text>
                {evaluationResult.strengths?.map((s, idx) => (
                  <Text key={idx} style={{ fontSize: 12, color: colors.muted, lineHeight: 17 }}>✓ {s}</Text>
                ))}
              </Card>
            </View>
            <View style={{ flex: 1 }}>
              <Card>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#eab308', marginBottom: 4 }}>Areas to Grow</Text>
                {evaluationResult.weaknesses?.map((w, idx) => (
                  <Text key={idx} style={{ fontSize: 12, color: colors.muted, lineHeight: 17 }}>• {w}</Text>
                ))}
              </Card>
            </View>
          </View>

          {/* Question-by-Question Detailed Review */}
          <Text style={[styles.section, { color: colors.text }]}>Detailed Question Breakdown</Text>
          {evaluationResult.questionReviews?.map((item, idx) => {
            const isExpanded = reviewExpandedIndex === idx;
            return (
              <Card key={item.questionId || idx}>
                <Pressable onPress={() => setReviewExpandedIndex(isExpanded ? null : idx)}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, flex: 1 }}>
                      Q{idx + 1}: {item.question}
                    </Text>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={primaryAccent} />
                  </View>
                </Pressable>

                {isExpanded && (
                  <View style={{ gap: 8, marginTop: 10 }}>
                    <View style={styles.reviewSub}>
                      <Text style={[styles.reviewSubLabel, { color: primaryAccent }]}>YOUR ANSWER:</Text>
                      <Text style={[styles.reviewSubText, { color: colors.text }]}>{item.candidateAnswer}</Text>
                    </View>

                    <View style={styles.reviewSub}>
                      <Text style={[styles.reviewSubLabel, { color: primaryAccent }]}>EXPECTED CONCEPTS:</Text>
                      {item.expectedConcepts?.map((c, i) => (
                        <Text key={i} style={[styles.reviewSubText, { color: colors.muted }]}>• {c}</Text>
                      ))}
                    </View>

                    <View style={styles.reviewSub}>
                      <Text style={[styles.reviewSubLabel, { color: primaryAccent }]}>FEEDBACK & EVALUATION:</Text>
                      <Text style={[styles.reviewSubText, { color: colors.text }]}>{item.feedback}</Text>
                    </View>

                    <Button
                      title={`Practise Topic: ${item.topicToPractice}`}
                      secondary
                      onPress={() => {
                        setEvaluationResult(null);
                        startPractice(item.topicToPractice);
                      }}
                    />
                  </View>
                )}
              </Card>
            );
          })}

          <Button
            title="Return to Practice Hub"
            onPress={() => {
              setEvaluationResult(null);
              setActiveInterview(null);
              setActiveTab('hub');
            }}
          />
        </View>
      )}

      {/* ========================================================================= */}
      {/* 7. FOCUSED PRACTICE SESSION                                               */}
      {/* ========================================================================= */}
      {practiceSession && (
        <View style={styles.viewContainer}>
          {/* Practice Header & Stepper */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Focused Practice: {practiceSession.topic}</Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>Micro-learning & Adaptive Skill Reinforcement</Text>
            </View>
            <Pressable
              onPress={confirmExitPractice}
              style={[styles.exitBtn, { backgroundColor: colors.surfaceElevated }]}
            >
              <Ionicons name="close" size={16} color={colors.text} />
            </Pressable>
          </View>

          {/* Step 1: Quick Review */}
          {practiceStep === 'review' && (
            <Card>
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="book-outline" size={18} color={primaryAccent} />
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>Concept Quick Review</Text>
                </View>

                <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>{practiceSession.quickReview.concept}</Text>

                <View style={[styles.codeBox, { backgroundColor: isLight ? '#f4f6f8' : '#070b12', borderColor: colors.border }]}>
                  <Text style={[styles.codeText, { color: primaryAccent }]}>{practiceSession.quickReview.example}</Text>
                </View>

                <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 18 }}>
                  <Text style={{ fontWeight: '700', color: colors.text }}>Why it matters in interviews: </Text>
                  {practiceSession.quickReview.whyItMatters}
                </Text>

                <Button
                  title="Continue to Practice Questions →"
                  onPress={() => setPracticeStep('questions')}
                />
              </View>
            </Card>
          )}

          {/* Step 2: Adaptive Practice Questions */}
          {practiceStep === 'questions' && (
            <Card>
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>
                    Question {practiceQuestionIndex + 1} of {practiceSession.questions.length}
                  </Text>
                  <View style={[styles.diffBadge, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[styles.diffText, { color: primaryAccent }]}>
                      {(practiceSession.questions[practiceQuestionIndex]?.difficulty || 'medium').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                  {practiceSession.questions[practiceQuestionIndex]?.prompt}
                </Text>

                <TextInput
                  value={practiceAnswers[practiceQuestionIndex] || ''}
                  onChangeText={(txt) => {
                    const next = [...practiceAnswers];
                    next[practiceQuestionIndex] = txt;
                    setPracticeAnswers(next);
                  }}
                  onFocus={() => {
                    setTimeout(() => {
                      interviewScrollRef.current?.scrollToEnd({ animated: true });
                    }, 180);
                  }}
                  multiline
                  keyboardAppearance={theme === 'dark' ? 'dark' : 'light'}
                  placeholder="Type your explanation or implementation..."
                  placeholderTextColor={colors.muted}
                  style={[styles.answerInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                />

                <View style={styles.navRow}>
                  <Button
                    title="Previous"
                    secondary
                    disabled={practiceQuestionIndex === 0}
                    onPress={() => setPracticeQuestionIndex((i) => Math.max(0, i - 1))}
                  />

                  {practiceQuestionIndex < practiceSession.questions.length - 1 ? (
                    <Button
                      title="Next Question →"
                      onPress={() => setPracticeQuestionIndex((i) => i + 1)}
                    />
                  ) : (
                    <Button
                      title="Final Assessment →"
                      onPress={() => setPracticeStep('assessment')}
                    />
                  )}
                </View>
              </View>
            </Card>
          )}

          {/* Step 3: Mini-Assessment */}
          {practiceStep === 'assessment' && (
            <Card>
              <View style={{ gap: 12 }}>
                <View style={[styles.assessmentBadge, { backgroundColor: `${primaryAccent}20` }]}>
                  <Ionicons name="ribbon-outline" size={16} color={primaryAccent} />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: primaryAccent }}>FINAL MINI-ASSESSMENT</Text>
                </View>

                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                  {practiceSession.miniAssessment.prompt}
                </Text>

                <TextInput
                  value={assessmentAnswer}
                  onChangeText={setAssessmentAnswer}
                  onFocus={() => {
                    setTimeout(() => {
                      interviewScrollRef.current?.scrollToEnd({ animated: true });
                    }, 180);
                  }}
                  multiline
                  keyboardAppearance={theme === 'dark' ? 'dark' : 'light'}
                  placeholder="Provide your comprehensive technical answer to complete the assessment..."
                  placeholderTextColor={colors.muted}
                  style={[styles.answerInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                />

                <Button
                  title={practiceLoading ? 'Submitting Practice...' : 'Complete Practice & Update Progress ✨'}
                  onPress={completePractice}
                  disabled={practiceLoading}
                />
              </View>
            </Card>
          )}

          {/* Step 4: Practice Complete */}
          {practiceStep === 'complete' && practiceResult && (
            <Card>
              <View style={{ gap: 12 }}>
                <View style={{ alignItems: 'center', marginVertical: 6 }}>
                  <Ionicons name="checkmark-circle" size={44} color={primaryAccent} />
                  <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, marginTop: 4 }}>PRACTICE COMPLETE</Text>
                  <Text style={{ fontSize: 13, color: colors.muted }}>Topic: {practiceResult.topic}</Text>
                </View>

                <View style={[styles.statusTransitionBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: colors.muted }}>Previous Status</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#ef4444' }}>{practiceResult.previousStatus}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color={primaryAccent} />
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: colors.muted }}>Current Status</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: primaryAccent }}>{practiceResult.currentStatus}</Text>
                  </View>
                </View>

                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>WHAT YOU LEARNED</Text>
                  {practiceResult.whatYouLearned.map((item, idx) => (
                    <Text key={idx} style={{ fontSize: 12, color: colors.muted }}>✓ {item}</Text>
                  ))}
                </View>

                {practiceResult.stillNeedsPractice && practiceResult.stillNeedsPractice.length > 0 && (
                  <View style={{ gap: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#eab308' }}>STILL NEEDS PRACTICE</Text>
                    {practiceResult.stillNeedsPractice.map((item, idx) => (
                      <Text key={idx} style={{ fontSize: 12, color: colors.muted }}>• {item}</Text>
                    ))}
                  </View>
                )}

                <View style={[styles.nextRecBox, { backgroundColor: `${primaryAccent}15`, borderColor: primaryAccent }]}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: primaryAccent }}>NEXT RECOMMENDED PRACTICE</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>
                    {practiceResult.nextRecommendedPractice.topic}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.muted }}>
                    {practiceResult.nextRecommendedPractice.reason}
                  </Text>
                  <Button
                    title="Practise Next Topic"
                    onPress={() => startPractice(practiceResult.nextRecommendedPractice.topic)}
                  />
                </View>

                <Button
                  title="Back to Practice Hub"
                  secondary
                  onPress={() => setPracticeSession(null)}
                />
              </View>
            </Card>
          )}
        </View>
      )}

      {/* History Inspection Modal */}
      {selectedHistoryItem && (
        <Modal visible={true} transparent animationType="slide" onRequestClose={() => setSelectedHistoryItem(null)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedHistoryItem.role || selectedHistoryItem.topic}</Text>
                <Pressable onPress={() => setSelectedHistoryItem(null)} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={colors.text} />
                </Pressable>
              </View>

              <View style={{ gap: 10, paddingBottom: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: colors.muted }}>
                    {selectedHistoryItem.interviewType} · {selectedHistoryItem.difficulty} · {selectedHistoryItem.duration}m
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: primaryAccent }}>{selectedHistoryItem.score}%</Text>
                </View>

                <Text style={{ fontSize: 13, color: colors.text, fontStyle: 'italic' }}>
                  "{selectedHistoryItem.feedback}"
                </Text>

                {selectedHistoryItem.weakAreas && selectedHistoryItem.weakAreas.length > 0 && (
                  <View style={{ gap: 4, marginTop: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>Identified Weak Areas:</Text>
                    {selectedHistoryItem.weakAreas.map((w: string, i: number) => (
                      <Text key={i} style={{ fontSize: 12, color: colors.muted }}>• {w}</Text>
                    ))}
                  </View>
                )}

                <Button
                  title="Practise Weak Area"
                  onPress={() => {
                    const top = selectedHistoryItem.weakAreas?.[0] || selectedHistoryItem.topic;
                    setSelectedHistoryItem(null);
                    startPractice(top);
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 8 },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingRight: 48,
  },
  proBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  proBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '800' },
  exitSessionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },

  // 4-Tab Segmented Control
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 9,
    overflow: 'hidden',
  },
  segmentBtnActive: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '700',
  },

  viewContainer: {
    gap: 12,
    paddingBottom: 20,
  },

  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitleText: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    paddingRight: 6,
  },
  section: { fontSize: 16, fontWeight: '800', marginTop: 8, marginBottom: 2 },
  cardHeaderTitle: { fontSize: 15, fontWeight: '800', marginBottom: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 24, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  focusBox: { padding: 10, borderRadius: 8, borderWidth: 1, gap: 4, marginVertical: 6 },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, flexShrink: 0, alignSelf: 'flex-start' },
  levelBadgeText: { fontSize: 11, fontWeight: '800' },
  practiseNowBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  scorePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, flexShrink: 0, alignSelf: 'flex-start' },
  scorePillText: { fontSize: 13, fontWeight: '800' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpiBox: { flexBasis: '48%', flexGrow: 1, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4, alignItems: 'center' },
  kpiNumber: { fontSize: 26, fontWeight: '900' },
  kpiDesc: { fontSize: 11, fontWeight: '600' },
  skillTag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  skillTagText: { fontSize: 12, fontWeight: '700' },

  // Search & Chips
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  categoryChipText: { fontSize: 12, fontWeight: '700' },

  // Setup Form
  fieldLabel: { fontSize: 11, fontWeight: '800', marginTop: 6, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  choicePill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  choiceText: { fontSize: 12, fontWeight: '700' },

  // Live Interview
  personaBanner: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 6 },
  timerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  miniProgressTrack: { height: 5, width: 140, borderRadius: 3, overflow: 'hidden' },
  miniProgressFill: { height: '100%', borderRadius: 3 },
  timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  timerText: { fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  lowTimeWarning: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  questionMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tagsRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  tagBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexShrink: 0, alignSelf: 'flex-start' },
  tagText: { fontSize: 10, fontWeight: '700' },
  diffBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexShrink: 0, alignSelf: 'flex-start' },
  diffText: { fontSize: 11, fontWeight: '800' },
  questionText: { fontSize: 15, fontWeight: '700', lineHeight: 22, marginBottom: 12 },
  answerInput: { minHeight: 110, textAlignVertical: 'top', padding: 12, borderRadius: 10, borderWidth: 1, fontSize: 14, lineHeight: 20, marginBottom: 10 },
  voiceButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  voiceBtnText: { fontSize: 12, fontWeight: '700' },
  hintButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  hintBtnText: { fontSize: 12, fontWeight: '700' },
  hintsContainer: { padding: 10, borderRadius: 8, borderWidth: 1, gap: 6, marginBottom: 10 },
  followUpBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 10 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 4 },
  critiqueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  divider: { borderTopWidth: 1, marginTop: 4, paddingTop: 4 },
  critiqueLabel: { fontSize: 13, fontWeight: '600' },
  critiqueRating: { fontSize: 11, fontWeight: '800' },
  critiqueNoteLabel: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  critiqueBullet: { fontSize: 12, lineHeight: 18 },
  scratchInput: { height: 110, padding: 10, borderRadius: 8, borderWidth: 1, fontFamily: 'monospace', fontSize: 12, lineHeight: 18, textAlignVertical: 'top' },

  // Results
  completedHeader: { fontSize: 16, fontWeight: '900', textAlign: 'center', letterSpacing: 1 },
  scoreContainer: { alignItems: 'center', marginVertical: 8 },
  bigScore: { fontSize: 52, fontWeight: '900' },
  scoreOutOf: { fontSize: 13, fontWeight: '600' },
  xpRewardBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, marginTop: 8 },
  xpRewardText: { fontSize: 12, fontWeight: '800' },
  metricsBar: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10, paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1 },
  metricItem: { alignItems: 'center' },
  metricVal: { fontSize: 15, fontWeight: '800' },
  metricLbl: { fontSize: 10, fontWeight: '600' },
  feedbackBox: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 4, marginTop: 6 },
  feedbackTitle: { fontSize: 14, fontWeight: '800' },
  feedbackContent: { fontSize: 13, lineHeight: 19 },
  dimensionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  ratingBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  ratingBadgeText: { fontSize: 11, fontWeight: '800' },
  reviewSub: { gap: 2 },
  reviewSubLabel: { fontSize: 11, fontWeight: '800' },
  reviewSubText: { fontSize: 12, lineHeight: 17 },

  // Practice
  exitBtn: { padding: 6, borderRadius: 20 },
  codeBox: { padding: 10, borderRadius: 8, borderWidth: 1 },
  codeText: { fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },
  assessmentBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start' },
  statusTransitionBox: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1 },
  nextRecBox: { padding: 12, borderRadius: 8, borderWidth: 1, gap: 4 },

  // Phase 1: Realistic Interview Layout
  stageTrackContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  stageChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  stageChipNum: {
    fontSize: 11,
    fontWeight: '800',
  },
  stageChipLabel: {
    fontSize: 11,
  },
  scenarioBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  scenarioText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  personaChoiceCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  avatarBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: 16, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '800' },
  closeBtn: { padding: 4 },
});
