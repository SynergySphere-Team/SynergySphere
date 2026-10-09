import { newId, query, queryOne } from '../lib/db.js';
import { awardXp } from './gamification.js';
import { generateAiResponse } from './ai.js';
import {
  QUESTION_MAP,
  resolveTrack,
  selectSessionQuestions,
  ALL_INTERVIEW_TRACKS,
  normalizeQuestion,
  ALL_QUESTIONS,
  type InterviewQuestion,
  type LiveCritiqueResult,
  type InterviewEvaluationResult,
  type QuestionEvaluation,
  type QuestionReviewItem,
  type MultiDimensionalEvaluation,
  type RecommendedPracticeItem,
  type FocusedPracticeSession,
  type PracticeCompletionResult,
  type TopicLevel,
  type UserTopicProgressData,
} from '../data/interviewBank/index.js';
// In-memory fallback cache for sessions and progress (ensures resilience during offline / transient DB drops)
const inMemoryInterviews = new Map<string, any>();
const inMemoryTopicProgress = new Map<string, Map<string, UserTopicProgressData>>();

export interface StartInterviewParams {
  userId: string;
  topic?: string;
  role?: string;
  interviewType?: string;
  difficulty?: 'Beginner' | 'Easy' | 'Medium' | 'Hard' | 'Expert' | string;
  duration?: number; // 10, 20, 30, 45, 60
  interviewerStyle?: 'Professional' | 'Friendly' | 'Technical' | 'Challenging' | string;
  programmingLanguage?: string;
  count?: number;
  mode?: 'mixed' | 'conceptual' | 'coding';
}

export async function startInterviewSession(params: StartInterviewParams) {
  const {
    userId,
    topic,
    role = 'Software Developer',
    interviewType = 'Technical Interview',
    difficulty = 'Medium',
    duration = 20,
    interviewerStyle = 'Professional',
    programmingLanguage = 'C#',
    count,
    mode = 'mixed',
  } = params;

  const track = resolveTrack(topic || role);
  const resolvedTopicName = track ? track.name : (topic || role);

  // 1. Fetch questions user has already mastered (score >= 80)
  const masteredRows = await query<{ questionId: string }>(
    `SELECT DISTINCT "questionId"
     FROM "InterviewAttempt"
     WHERE "userId" = $1 AND "score" >= 80`,
    [userId],
  ).catch(() => []);
  const excludedQuestionIds = masteredRows.map((r) => r.questionId);

  // 2. Fetch recent weak areas from past interviews or topic progress
  const pastInterviews = await query<{ weakAreas: string | string[] | null }>(
    `SELECT "weakAreas"
     FROM "Interview"
     WHERE "userId" = $1 AND "weakAreas" IS NOT NULL
     ORDER BY "createdAt" DESC
     LIMIT 5`,
    [userId],
  ).catch(() => []);

  const weakAreas: string[] = [];
  for (const row of pastInterviews) {
    if (row.weakAreas) {
      try {
        const parsed = typeof row.weakAreas === 'string' ? JSON.parse(row.weakAreas) : row.weakAreas;
        if (Array.isArray(parsed)) {
          weakAreas.push(...parsed);
        }
      } catch {}
    }
  }

  // Also query weak areas from UserTopicProgress
  const weakTopicRows = await query<{ topic: string }>(
    `SELECT "topic"
     FROM "UserTopicProgress"
     WHERE "userId" = $1 AND "currentLevel" IN ('Needs Practice', 'Developing')
     LIMIT 5`,
    [userId],
  ).catch(() => []);
  for (const row of weakTopicRows) {
    if (!weakAreas.includes(row.topic)) weakAreas.push(row.topic);
  }

  // 3. Select questions from bank tailored to role, type, difficulty, duration & weak areas
  const selectedQuestions = selectSessionQuestions({
    topic,
    role,
    interviewType,
    difficulty,
    duration,
    programmingLanguage,
    interviewerStyle,
    count,
    mode,
    excludedQuestionIds,
    weakAreas,
  });

  // Client-safe questions with hints available
  const clientSafeQuestions = selectedQuestions.map((q) => ({
    id: q.id,
    topic: q.topic,
    category: q.category || 'Programming',
    type: q.type,
    difficulty: q.difficulty,
    prompt: q.prompt,
    question: q.prompt,
    rubric: q.rubric,
    tags: q.tags,
    followUps: q.followUps,
    followUpQuestions: q.followUps,
    hints: q.hints || [
      `Focus on core concepts related to ${q.topic.toUpperCase()} and ${q.tags[0] || 'logic'}.`,
      `Explain the practical mechanism and trade-offs.`,
      `Consider edge cases, performance, or memory constraints.`,
    ],
    estimatedTime: q.estimatedTime || 3,
  }));

  // Construct styled interviewer greeting based on interviewerStyle
  let interviewerGreeting = '';
  switch (interviewerStyle) {
    case 'Friendly':
      interviewerGreeting = `Hello! Welcome to your ${role} interview. Take your time, relax, and walk me through your thoughts as we go. Whenever you're ready, let's look at question 1.`;
      break;
    case 'Technical':
      interviewerGreeting = `Welcome. In this technical interview for ${role}, I'm looking for rigorous terminology, clear complexity analysis, and understanding of runtime internals. Let's begin.`;
      break;
    case 'Challenging':
      interviewerGreeting = `Welcome. For the ${role} position, we expect exceptional problem-solving and architectural depth under pressure. Defend your design decisions and be prepared for edge cases. Let's start.`;
      break;
    case 'Professional':
    default:
      interviewerGreeting = `Welcome to your ${role} ${interviewType}. Today we'll cover key technical concepts, problem-solving, and communication. Please structure your answers clearly.`;
      break;
  }

  const sessionId = newId();
  const sessionData = {
    id: sessionId,
    userId,
    topic: resolvedTopicName,
    role,
    interviewType,
    difficulty,
    duration,
    interviewerStyle,
    programmingLanguage,
    questions: selectedQuestions,
    clientSafeQuestions,
    startedAt: new Date().toISOString(),
    hintsUsedTotal: 0,
    status: 'IN_PROGRESS',
  };

  // Cache in-memory
  inMemoryInterviews.set(sessionId, sessionData);

  // Store in DB
  await query(
    `INSERT INTO "Interview" (
       "id", "userId", "topic", "role", "interviewType", "difficulty",
       "duration", "interviewerStyle", "programmingLanguage", "questions", "status"
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      sessionId,
      userId,
      resolvedTopicName,
      role,
      interviewType,
      difficulty,
      duration,
      interviewerStyle,
      programmingLanguage,
      JSON.stringify(selectedQuestions),
      'IN_PROGRESS',
    ],
  ).catch((err) => console.warn('Could not save Interview to DB (using in-memory):', err.message));

  return {
    id: sessionId,
    userId,
    topic: resolvedTopicName,
    role,
    interviewType,
    difficulty,
    duration,
    interviewerStyle,
    interviewerGreeting,
    programmingLanguage,
    questions: clientSafeQuestions,
    totalQuestions: clientSafeQuestions.length,
    track: track ? { id: track.id, name: track.name, category: track.category } : null,
  };
}

export interface HintParams {
  interviewId: string;
  questionIndex: number;
  hintLevel?: 1 | 2 | 3;
}

export async function getQuestionHint(params: HintParams) {
  const { interviewId, questionIndex, hintLevel = 1 } = params;

  let session = inMemoryInterviews.get(interviewId);
  if (!session) {
    const row = await queryOne<{ questions: string | InterviewQuestion[]; hintsUsed: number }>(
      `SELECT "questions", "hintsUsed" FROM "Interview" WHERE "id" = $1`,
      [interviewId],
    ).catch(() => null);
    if (row) {
      session = {
        questions: typeof row.questions === 'string' ? JSON.parse(row.questions) : row.questions,
        hintsUsedTotal: row.hintsUsed || 0,
      };
      inMemoryInterviews.set(interviewId, session);
    }
  }

  if (!session || !session.questions || !session.questions[questionIndex]) {
    return {
      hintText: 'Break down the problem into smaller parts and define the primary data types involved.',
      hintsUsed: 1,
      hintLevel,
      availableHints: 3,
    };
  }

  const rawQ = session.questions[questionIndex];
  const q: InterviewQuestion = QUESTION_MAP.get(rawQ.id) || normalizeQuestion(rawQ);
  const hints = q.hints && q.hints.length >= 3 ? q.hints : normalizeQuestion(q).hints!;

  const levelIdx = Math.min(Math.max(hintLevel - 1, 0), 2);
  const hintText = hints[levelIdx];

  session.hintsUsedTotal = (session.hintsUsedTotal || 0) + 1;

  // Persist hint counter in DB if available
  query(
    `UPDATE "Interview" SET "hintsUsed" = COALESCE("hintsUsed", 0) + 1 WHERE "id" = $1`,
    [interviewId],
  ).catch(() => {});

  return {
    hintText,
    hintLevel,
    hintsUsed: session.hintsUsedTotal,
    availableHints: 3,
  };
}

export interface FollowUpParams {
  interviewId: string;
  questionIndex: number;
  answer: string;
}

export async function getFollowUpQuestion(params: FollowUpParams) {
  const { interviewId, questionIndex } = params;
  let session = inMemoryInterviews.get(interviewId);
  if (!session) {
    const row = await queryOne<{ questions: string | InterviewQuestion[]; interviewerStyle: string }>(
      `SELECT "questions", "interviewerStyle" FROM "Interview" WHERE "id" = $1`,
      [interviewId],
    ).catch(() => null);
    if (row) {
      session = {
        questions: typeof row.questions === 'string' ? JSON.parse(row.questions) : row.questions,
        interviewerStyle: row.interviewerStyle || 'Professional',
      };
      inMemoryInterviews.set(interviewId, session);
    }
  }

  const rawQ = session?.questions?.[questionIndex];
  const q: InterviewQuestion | undefined = rawQ ? (QUESTION_MAP.get(rawQ.id) || normalizeQuestion(rawQ)) : undefined;

  if (q && q.followUps && q.followUps.length > 0) {
    const followUp = q.followUps[0];
    const prefix = session?.interviewerStyle === 'Challenging'
      ? 'Interesting point. Let me probe deeper: '
      : session?.interviewerStyle === 'Friendly'
      ? 'Great start! Can you tell me a bit more about: '
      : 'Follow-up question: ';
    return {
      followUpQuestion: `${prefix}${followUp}`,
      sourceQuestionId: q.id,
    };
  }

  return {
    followUpQuestion: 'How would this design or implementation behave under high concurrency or memory pressure?',
    sourceQuestionId: q?.id || 'general',
  };
}

function extractJsonObject<T = unknown>(text: string): T | null {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace === -1) return null;

  const lastBrace = cleaned.lastIndexOf('}');
  if (lastBrace > firstBrace) {
    try {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as T;
    } catch {}
  }

  let depth = 0;
  let inString = false;
  let escape = false;
  let startIdx = -1;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === '{') {
        if (depth === 0) startIdx = i;
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0 && startIdx !== -1) {
          try {
            return JSON.parse(cleaned.slice(startIdx, i + 1)) as T;
          } catch {}
        }
      }
    }
  }

  return null;
}

export interface CritiqueParams {
  interviewId: string;
  questionIndex: number;
  answer: string;
  scratchCode?: string;
}

export async function generateLiveCritique(params: CritiqueParams): Promise<LiveCritiqueResult> {
  const { interviewId, questionIndex, answer, scratchCode = '' } = params;

  let session = inMemoryInterviews.get(interviewId);
  if (!session) {
    const row = await queryOne<{ questions: string | InterviewQuestion[] }>(
      `SELECT "questions" FROM "Interview" WHERE "id" = $1`,
      [interviewId],
    ).catch(() => null);
    if (row) {
      session = {
        questions: typeof row.questions === 'string' ? JSON.parse(row.questions) : row.questions,
      };
      inMemoryInterviews.set(interviewId, session);
    }
  }

  const rawQuestions = session?.questions || [];
  const currentQ = rawQuestions[questionIndex];
  const question: InterviewQuestion | undefined = currentQ
    ? (QUESTION_MAP.get(currentQ.id) || normalizeQuestion(currentQ))
    : undefined;

  if (!question) {
    return buildHeuristicCritique('General', answer, scratchCode, ['Provide complete technical details']);
  }

  const combinedCandidateText = [
    answer.trim() ? `Verbal/Explanation:\n${answer.trim()}` : '',
    scratchCode.trim() ? `Code/Scratchpad:\n\`\`\`\n${scratchCode.trim()}\n\`\`\`` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  if (!combinedCandidateText.trim()) {
    return {
      technicalClarity: { rating: 'Weak', note: 'No response submitted yet. Begin by outlining your core approach.' },
      communication: { rating: 'Weak', note: 'Start with a clear summary sentence before diving into details.' },
      problemSolving: { rating: 'Weak', note: 'Break down the problem into logical constraints and steps.' },
      topicDepth: { rating: 'Weak', note: `Address the foundational requirements of this ${question.topic.toUpperCase()} question.` },
      missingPoints: question.rubric.slice(0, 3),
      suggestedNextSentence: `A good starting point is: "${question.rubric[0] || 'Let us break down how this works...'}".`,
      heuristicMode: false,
    };
  }

  const systemPrompt = [
    'You are a senior technical interviewer and staff engineer conducting a live technical interview.',
    'Evaluate the candidate\'s draft answer against the official rubric for this question.',
    'You must respond ONLY with a valid JSON object matching this schema:',
    '{',
    '  "technicalClarity": { "rating": "Weak" | "Fair" | "Good" | "Strong", "note": "1-2 sentences constructive feedback" },',
    '  "communication": { "rating": "Weak" | "Fair" | "Good" | "Strong", "note": "1-2 sentences on structure and terminology" },',
    '  "problemSolving": { "rating": "Weak" | "Fair" | "Good" | "Strong", "note": "1-2 sentences on trade-offs or methodology" },',
    '  "topicDepth": { "rating": "Weak" | "Fair" | "Good" | "Strong", "note": "1-2 sentences specifically addressing the topic depth" },',
    '  "missingPoints": ["1 to 3 specific points from the rubric the candidate has not yet addressed"],',
    '  "suggestedNextSentence": "A natural, professional sentence the candidate could say or write next to strengthen their answer"',
    '}',
  ].join('\n');

  const userPrompt = [
    `Question Prompt: ${question.prompt}`,
    `Topic: ${question.topic}`,
    `Difficulty: ${question.difficulty}`,
    `Question Type: ${question.type}`,
    '',
    'Official Scoring Rubric Criteria:',
    ...question.rubric.map((r, i) => `  ${i + 1}. ${r}`),
    '',
    'Candidate Current Draft:',
    combinedCandidateText,
  ].join('\n');

  try {
    const raw = await generateAiResponse(systemPrompt, userPrompt);
    const parsed = extractJsonObject<LiveCritiqueResult>(raw);
    if (parsed && parsed.technicalClarity && parsed.communication && parsed.problemSolving && parsed.topicDepth) {
      return {
        ...parsed,
        heuristicMode: false,
      };
    }
  } catch (err) {
    console.warn('Gemini critique fallback to heuristic:', err);
  }

  return buildHeuristicCritique(question.topic, answer, scratchCode, question.rubric);
}

function buildHeuristicCritique(
  topic: string,
  answer: string,
  scratchCode: string,
  rubric: string[],
): LiveCritiqueResult {
  const combined = `${answer} ${scratchCode}`.toLowerCase();
  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
  const hasCode = scratchCode.trim().length > 10 || /```|function|class|def|import|select|from|public|private/i.test(answer);

  const matchedRubricIndices: number[] = [];
  const missingPoints: string[] = [];

  rubric.forEach((item, index) => {
    const keywords = item
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !['explains', 'states', 'describes', 'mentions', 'identifies', 'uses'].includes(w));

    const matches = keywords.filter((k) => combined.includes(k));
    const coverageRatio = keywords.length > 0 ? matches.length / keywords.length : 0;

    if (coverageRatio >= 0.4 || matches.length >= 2) {
      matchedRubricIndices.push(index);
    } else {
      missingPoints.push(item);
    }
  });

  const matchRatio = rubric.length > 0 ? matchedRubricIndices.length / rubric.length : 0.5;

  let clarityRating: 'Weak' | 'Fair' | 'Good' | 'Strong' = 'Weak';
  let commRating: 'Weak' | 'Fair' | 'Good' | 'Strong' = 'Weak';
  let psRating: 'Weak' | 'Fair' | 'Good' | 'Strong' = 'Weak';
  let depthRating: 'Weak' | 'Fair' | 'Good' | 'Strong' = 'Weak';

  if (wordCount > 60 && matchRatio >= 0.6) {
    clarityRating = 'Strong';
    commRating = 'Strong';
    depthRating = 'Strong';
    psRating = hasCode ? 'Strong' : 'Good';
  } else if (wordCount > 30 && matchRatio >= 0.4) {
    clarityRating = 'Good';
    commRating = 'Good';
    depthRating = 'Good';
    psRating = 'Good';
  } else if (wordCount > 10 || matchRatio > 0.2) {
    clarityRating = 'Fair';
    commRating = 'Fair';
    depthRating = 'Fair';
    psRating = 'Fair';
  }

  const topicCapitalized = topic.charAt(0).toUpperCase() + topic.slice(1);
  const nextMissing = missingPoints[0] || 'Consider discussing time/space trade-offs';

  return {
    technicalClarity: {
      rating: clarityRating,
      note: clarityRating === 'Strong'
        ? `Thorough terminology and clear technical explanation of ${topicCapitalized} concepts.`
        : clarityRating === 'Good'
        ? `Covers core concepts well. Expand with precise ${topicCapitalized} specifications.`
        : `Answer is brief. Clearly define the mechanism and edge conditions.`,
    },
    communication: {
      rating: commRating,
      note: commRating === 'Strong'
        ? 'Well-structured response with high signal-to-noise ratio.'
        : commRating === 'Good'
        ? 'Clear narrative flow. Highlight practical context before diving into implementation.'
        : 'Structure your explanation with a high-level summary followed by technical detail.',
    },
    problemSolving: {
      rating: psRating,
      note: hasCode
        ? 'Demonstrates concrete practical implementation alongside conceptual logic.'
        : 'Add code examples or algorithmic step traces to substantiate your answer.',
    },
    topicDepth: {
      rating: depthRating,
      note: depthRating === 'Strong'
        ? `Excellent mastery of ${topicCapitalized} internal mechanics and performance implications.`
        : depthRating === 'Good'
        ? `Addresses main ${topicCapitalized} behavior. Deepen discussion on memory or concurrency.`
        : `Missing in-depth explanation of how ${topicCapitalized} runtime handles this under the hood.`,
    },
    missingPoints: missingPoints.slice(0, 3),
    suggestedNextSentence: `Next, address: "${nextMissing}".`,
    heuristicMode: true,
  };
}

export interface EvaluateInterviewParams {
  interviewId: string;
  userId: string;
  answers: string[];
  scratchCodes?: string[];
  hintsUsedCount?: number;
  durationMinutes?: number;
}

export async function evaluateInterviewSession(params: EvaluateInterviewParams): Promise<InterviewEvaluationResult> {
  const { interviewId, userId, answers, scratchCodes = [], hintsUsedCount = 0, durationMinutes = 20 } = params;

  let session = inMemoryInterviews.get(interviewId);
  if (!session) {
    const row = await queryOne<{
      id: string;
      topic: string;
      role: string;
      interviewType: string;
      difficulty: string;
      duration: number;
      questions: string | InterviewQuestion[];
      score: number | null;
      hintsUsed: number;
    }>(
      `SELECT * FROM "Interview" WHERE "id" = $1 AND "userId" = $2`,
      [interviewId, userId],
    ).catch(() => null);

    if (row) {
      session = {
        ...row,
        questions: typeof row.questions === 'string' ? JSON.parse(row.questions) : row.questions,
      };
      inMemoryInterviews.set(interviewId, session);
    }
  }

  if (!session) {
    throw new Error('Interview not found');
  }

  const rawQuestions: InterviewQuestion[] = session.questions || [];
  const questionEvaluations: QuestionEvaluation[] = [];
  const questionReviews: QuestionReviewItem[] = [];
  const missedRubricPoints: string[] = [];
  const weakTopicTags: string[] = [];
  let totalHintsUsed = hintsUsedCount || session.hintsUsedTotal || 0;
  let questionsCorrectCount = 0;

  for (let i = 0; i < rawQuestions.length; i++) {
    const rawQ = rawQuestions[i];
    const q: InterviewQuestion = QUESTION_MAP.get(rawQ.id) || normalizeQuestion(rawQ);
    const answer = answers[i] || '';
    const code = scratchCodes[i] || '';
    const combined = `${answer} ${code}`.toLowerCase();
    const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;

    const matchedBullets: string[] = [];
    const missedBullets: string[] = [];

    for (const bullet of q.rubric) {
      const keywords = bullet
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !['explains', 'states', 'describes', 'mentions', 'identifies', 'uses'].includes(w));

      const matches = keywords.filter((k) => combined.includes(k));
      if (matches.length >= 2 || (keywords.length > 0 && matches.length / keywords.length >= 0.35)) {
        matchedBullets.push(bullet);
      } else {
        missedBullets.push(bullet);
      }
    }

    const coverage = q.rubric.length > 0 ? matchedBullets.length / q.rubric.length : 0.5;

    let score = Math.round(coverage * 85);
    if (wordCount >= 40) score += 10;
    if (code.trim().length > 20) score += 5;
    if (wordCount < 10 && code.trim().length === 0) score = Math.min(score, 15);
    score = Math.min(Math.max(score, 0), 100);

    if (score >= 70) {
      questionsCorrectCount++;
    }

    const feedback = score >= 80
      ? `Strong answer! Covered ${matchedBullets.length} of ${q.rubric.length} rubric criteria with great precision.`
      : score >= 60
      ? `Good effort. Covered ${matchedBullets.length} rubric criteria, but missed key details: ${missedBullets.slice(0, 2).join('; ')}`
      : `Needs improvement. Missing critical concepts: ${missedBullets.slice(0, 2).join('; ')}`;

    questionEvaluations.push({
      questionId: q.id,
      questionIndex: i,
      score,
      feedback,
      rubricMatches: matchedBullets,
      missedPoints: missedBullets,
    });

    const normalizedQ = normalizeQuestion(q);
    questionReviews.push({
      questionId: q.id,
      questionIndex: i,
      question: q.prompt,
      candidateAnswer: answer || '(No answer provided)',
      expectedConcepts: normalizedQ.expectedConcepts || q.rubric.slice(0, 4),
      sampleAnswer: q.sampleAnswer,
      feedback,
      commonMistakes: normalizedQ.commonMistakes || [
        'Providing high level explanations without concrete runtime details.',
        'Not addressing memory allocation or edge case handling.',
      ],
      keyConcept: q.tags[0] ? q.tags[0].toUpperCase() : q.topic.toUpperCase(),
      score,
      topicToPractice: q.tags[0] || q.topic,
    });

    if (score < 80) {
      missedRubricPoints.push(...missedBullets);
      weakTopicTags.push(...q.tags);
    }

    // Save individual attempt
    query(
      `INSERT INTO "InterviewAttempt" (
         "id", "userId", "interviewId", "questionId", "questionIndex",
         "answer", "scratchCode", "score", "feedback", "rubricCoverage"
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        newId(),
        userId,
        interviewId,
        q.id,
        i,
        answer,
        code,
        score,
        feedback,
        JSON.stringify({ matched: matchedBullets, missed: missedBullets }),
      ],
    ).catch(() => {});
  }

  // Calculate overall score
  const totalScore = questionEvaluations.reduce((sum, qe) => sum + qe.score, 0);
  const overallScore = Math.round(totalScore / Math.max(questionEvaluations.length, 1));

  // Build Multi-Dimensional Evaluation (Prompt 31)
  const calcRating = (sc: number): 'Strong' | 'Improving' | 'Developing' | 'Needs Practice' => {
    if (sc >= 82) return 'Strong';
    if (sc >= 68) return 'Improving';
    if (sc >= 50) return 'Developing';
    return 'Needs Practice';
  };

  const codingQuestions = rawQuestions.filter((q) => q.type === 'coding');
  const codingScore = codingQuestions.length > 0
    ? Math.round(
        codingQuestions.reduce((sum, q) => {
          const ev = questionEvaluations.find((qe) => qe.questionId === q.id);
          return sum + (ev?.score || 50);
        }, 0) / codingQuestions.length,
      )
    : Math.min(overallScore + 5, 95);

  const dimensions: MultiDimensionalEvaluation = {
    technicalKnowledge: {
      rating: calcRating(overallScore),
      score: overallScore,
      feedback: overallScore >= 80 ? 'Mastery of runtime concepts and framework internals.' : 'Solid foundation; review edge cases.',
    },
    problemSolving: {
      rating: calcRating(Math.round(overallScore * 0.95 + 4)),
      score: Math.min(100, Math.round(overallScore * 0.95 + 4)),
      feedback: 'Demonstrated methodical approach to analyzing constraints.',
    },
    communication: {
      rating: calcRating(Math.round(overallScore * 0.92 + 7)),
      score: Math.min(100, Math.round(overallScore * 0.92 + 7)),
      feedback: 'Clear articulation with good technical terminology.',
    },
    coding: {
      rating: calcRating(codingScore),
      score: codingScore,
      feedback: codingScore >= 75 ? 'Clean code and algorithm implementation.' : 'Practice syntax and scratchpad proofs.',
    },
    accuracy: {
      rating: calcRating(Math.round(overallScore * 0.98)),
      score: Math.round(overallScore * 0.98),
      feedback: 'High conceptual precision with rubric alignment.',
    },
    timeManagement: {
      rating: 'Strong',
      score: 88,
      feedback: 'Paced effectively throughout the allocated duration.',
    },
    requirementUnderstanding: {
      rating: calcRating(Math.round(overallScore * 0.94 + 5)),
      score: Math.min(100, Math.round(overallScore * 0.94 + 5)),
      feedback: 'Addressed primary problem constraints directly.',
    },
    codeQuality: {
      rating: calcRating(Math.round(overallScore * 0.91 + 8)),
      score: Math.min(100, Math.round(overallScore * 0.91 + 8)),
      feedback: 'Adheres to standard conventions and separation of concerns.',
    },
    architecture: {
      rating: calcRating(Math.round(overallScore * 0.89 + 10)),
      score: Math.min(100, Math.round(overallScore * 0.89 + 10)),
      feedback: 'Good recognition of architectural trade-offs.',
    },
  };

  // Strengths and Weaknesses
  const strengths: string[] = [];
  if (overallScore >= 75) strengths.push('Strong conceptual grasp of core language features');
  if (codingScore >= 75) strengths.push('Proficient algorithmic problem-solving in scratchpad');
  strengths.push('Effective technical articulation under timed conditions');
  strengths.push('Good adherence to structured rubric criteria');

  const weaknesses: string[] = [];
  const uniqueWeakTags = [...new Set(weakTopicTags)];
  for (const tag of uniqueWeakTags.slice(0, 3)) {
    weaknesses.push(`Struggled with ${tag} mechanics and edge cases`);
  }
  if (weaknesses.length === 0) {
    weaknesses.push('High-throughput distributed concurrency and memory optimization');
  }

  // Map weak areas to specific topics
  const weakAreas: string[] = [];
  for (const tag of uniqueWeakTags.slice(0, 4)) {
    const formatted = tag.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    weakAreas.push(formatted);
  }
  if (weakAreas.length === 0) {
    weakAreas.push('Performance Optimization and System Scaling');
  }

  const recommendations = [
    `Complete focused practice on ${weakAreas[0] || 'core concepts'} to solidify understanding.`,
    'Practice explaining technical trade-offs before diving into code.',
    'Review the recommended Learning Hub modules for deeper runtime mechanics.',
  ];

  const overallFeedback = overallScore >= 80
    ? `Outstanding performance in your ${session.role || session.topic} interview! You demonstrated deep technical fluency and systematic problem solving.`
    : overallScore >= 60
    ? `Solid baseline in ${session.role || session.topic}. You communicate concepts clearly, but should deepen your mastery in ${weakAreas.slice(0, 2).join(' and ')}.`
    : `Foundational work needed in ${session.role || session.topic}. Complete the recommended focused practice modules and practice articulating key trade-offs.`;

  // Dynamic XP formula: Math.round(40 + overallScore * 0.6) + bonus for questions correct
  const xpEarned = Math.round(40 + overallScore * 0.6 + questionsCorrectCount * 3);

  // Update UserTopicProgress for each question topic (Prompt 40, 41)
  for (const q of rawQuestions) {
    const qe = questionEvaluations.find((e) => e.questionId === q.id);
    const qScore = qe ? qe.score : 50;
    const isCorrect = qScore >= 75;
    const isPartial = qScore >= 50 && qScore < 75;

    let targetLevel: TopicLevel = 'Needs Practice';
    if (qScore >= 85) targetLevel = 'Strong';
    else if (qScore >= 70) targetLevel = 'Improving';
    else if (qScore >= 50) targetLevel = 'Developing';

    await updateUserTopicProgress(userId, q.topic, q.category || 'Programming', {
      score: qScore,
      isCorrect,
      isPartial,
      hintsUsed: 0,
      newLevel: targetLevel,
    });
  }

  // Connect interview topics to SynergySphere Skills (Prompt 50)
  const primaryTopic = session.topic || 'Software Engineering';
  const calculatedSkillLevel = Math.max(1, Math.min(5, Math.floor(overallScore / 20) + 1));
  await updateSkillProgress(userId, primaryTopic, calculatedSkillLevel);

  // Update Interview in DB
  const evaluationPayload = {
    dimensions,
    strengths,
    weaknesses,
    recommendations,
    questionReviews,
  };

  await query(
    `UPDATE "Interview"
     SET "score" = $1, "feedback" = $2, "weakAreas" = $3, "status" = $4,
         "evaluation" = $5, "hintsUsed" = $6, "completedAt" = CURRENT_TIMESTAMP
     WHERE "id" = $7`,
    [
      overallScore,
      overallFeedback,
      JSON.stringify(weakAreas),
      'COMPLETED',
      JSON.stringify(evaluationPayload),
      totalHintsUsed,
      interviewId,
    ],
  ).catch((err) => console.warn('Could not update Interview in DB:', err.message));

  // Award XP to user via existing gamification system (Prompt 49)
  const alreadyScored = session.score !== null && session.score !== undefined;
  if (!alreadyScored) {
    await awardXp(userId, xpEarned, `Completed ${session.role || session.topic} interview (Score: ${overallScore}%)`)
      .catch((err) => console.warn('Could not award XP in DB:', err.message));
  }

  return {
    score: overallScore,
    feedback: overallFeedback,
    dimensions,
    strengths,
    weaknesses,
    recommendations,
    questionScores: questionEvaluations,
    questionReviews,
    weakAreas,
    xpEarned: alreadyScored ? 0 : xpEarned,
    xpAwarded: alreadyScored ? 0 : xpEarned,
    questionsAnswered: rawQuestions.length,
    questionsCorrect: questionsCorrectCount,
    hintsUsed: totalHintsUsed,
    durationMinutes,
  };
}

async function updateSkillProgress(userId: string, skillName: string, level: number) {
  try {
    await query(
      `INSERT INTO "Skill" ("id", "userId", "skillName", "level", "updatedAt")
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT ("userId", "skillName")
       DO UPDATE SET "level" = GREATEST("Skill"."level", EXCLUDED."level"), "updatedAt" = CURRENT_TIMESTAMP`,
      [newId(), userId, skillName, level],
    );
  } catch (err) {
    // Graceful fallback if offline
  }
}

async function updateUserTopicProgress(
  userId: string,
  topic: string,
  category: string,
  data: { score: number; isCorrect: boolean; isPartial: boolean; hintsUsed: number; newLevel: TopicLevel },
) {
  try {
    const existing = await queryOne<{
      id: string;
      attempts: number;
      correctAnswers: number;
      incorrectAnswers: number;
      partialAnswers: number;
      averagePerformance: number;
      hintsUsed: number;
    }>(
      `SELECT * FROM "UserTopicProgress" WHERE "userId" = $1 AND "topic" = $2`,
      [userId, topic],
    );

    if (existing) {
      const newAttempts = existing.attempts + 1;
      const newAvg = Math.round((existing.averagePerformance * existing.attempts + data.score) / newAttempts);
      const trend = data.score >= existing.averagePerformance ? 'up' : 'down';

      await query(
        `UPDATE "UserTopicProgress"
         SET "attempts" = $1,
             "correctAnswers" = "correctAnswers" + $2,
             "incorrectAnswers" = "incorrectAnswers" + $3,
             "partialAnswers" = "partialAnswers" + $4,
             "averagePerformance" = $5,
             "currentLevel" = $6,
             "lastAssessedAt" = CURRENT_TIMESTAMP,
             "improvementTrend" = $7,
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = $8`,
        [
          newAttempts,
          data.isCorrect ? 1 : 0,
          !data.isCorrect && !data.isPartial ? 1 : 0,
          data.isPartial ? 1 : 0,
          newAvg,
          data.newLevel,
          trend,
          existing.id,
        ],
      );
    } else {
      await query(
        `INSERT INTO "UserTopicProgress" (
           "id", "userId", "topic", "category", "attempts", "correctAnswers",
           "incorrectAnswers", "partialAnswers", "hintsUsed", "averagePerformance",
           "currentLevel", "lastAssessedAt", "improvementTrend"
         )
         VALUES ($1, $2, $3, $4, 1, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, 'up')`,
        [
          newId(),
          userId,
          topic,
          category,
          data.isCorrect ? 1 : 0,
          !data.isCorrect && !data.isPartial ? 1 : 0,
          data.isPartial ? 1 : 0,
          data.hintsUsed,
          data.score,
          data.newLevel,
        ],
      );
    }
  } catch {
    // In-memory fallback
    if (!inMemoryTopicProgress.has(userId)) inMemoryTopicProgress.set(userId, new Map());
    const userMap = inMemoryTopicProgress.get(userId)!;
    const existing = userMap.get(topic);
    if (existing) {
      existing.attempts += 1;
      existing.averagePerformance = Math.round((existing.averagePerformance + data.score) / 2);
      existing.currentLevel = data.newLevel;
      existing.improvementTrend = 'up';
    } else {
      userMap.set(topic, {
        id: newId(),
        userId,
        topic,
        category,
        attempts: 1,
        correctAnswers: data.isCorrect ? 1 : 0,
        incorrectAnswers: !data.isCorrect && !data.isPartial ? 1 : 0,
        partialAnswers: data.isPartial ? 1 : 0,
        hintsUsed: data.hintsUsed,
        averagePerformance: data.score,
        currentLevel: data.newLevel,
        improvementTrend: 'up',
      });
    }
  }
}

export async function getInterviewHomeStats(userId: string) {
  // 1. Fetch counts
  const [interviewCountRow, attemptCountRow, practiceCountRow] = await Promise.all([
    queryOne<{ count: number }>(`SELECT COUNT(*)::int as count FROM "Interview" WHERE "userId" = $1`, [userId]).catch(() => null),
    queryOne<{ count: number }>(`SELECT COUNT(*)::int as count FROM "InterviewAttempt" WHERE "userId" = $1`, [userId]).catch(() => null),
    queryOne<{ count: number }>(`SELECT COUNT(*)::int as count FROM "PracticeSession" WHERE "userId" = $1 AND "status" = 'COMPLETED'`, [userId]).catch(() => null),
  ]);

  const interviewsCompleted = interviewCountRow?.count || inMemoryInterviews.size || 0;
  const questionsAnswered = attemptCountRow?.count || (interviewsCompleted * 6) || 0;
  const practiceSessions = practiceCountRow?.count || 0;

  // 2. Fetch past interviews
  const recentInterviewRows = await query<{
    id: string;
    topic: string;
    role: string | null;
    interviewType: string | null;
    difficulty: string | null;
    duration: number | null;
    score: number | null;
    createdAt: string;
    feedback: string | null;
  }>(
    `SELECT "id", "topic", "role", "interviewType", "difficulty", "duration", "score", "createdAt", "feedback"
     FROM "Interview"
     WHERE "userId" = $1
     ORDER BY "createdAt" DESC
     LIMIT 5`,
    [userId],
  ).catch(() => []);

  // 3. Fetch topic progress & compute recommended practice
  const topicProgressRows: UserTopicProgressData[] = await query<UserTopicProgressData>(
    `SELECT * FROM "UserTopicProgress" WHERE "userId" = $1 ORDER BY "updatedAt" DESC`,
    [userId],
  ).catch((): UserTopicProgressData[] => []);

  // Combine with in-memory if needed
  const memProgress = inMemoryTopicProgress.get(userId);
  if (memProgress) {
    for (const [top, val] of memProgress.entries()) {
      if (!topicProgressRows.some((r) => r.topic === top)) {
        topicProgressRows.push(val);
      }
    }
  }

  // Calculate prioritized recommendations (Prompt 34, 35)
  const defaultRecommendations: RecommendedPracticeItem[] = [
    {
      id: 'rec-sql-joins',
      topic: 'SQL JOINs & Relational Queries',
      category: 'Databases',
      status: 'Needs Practice',
      reason: 'Reinforce INNER, LEFT, and self-joins for complex data queries.',
      priorityScore: 92,
      attempts: 2,
      hintsUsed: 1,
    },
    {
      id: 'rec-csharp-di',
      topic: 'Dependency Injection & Inversion of Control',
      category: 'Software Engineering',
      status: 'Developing',
      reason: 'Master service lifetimes (Transient, Scoped, Singleton) in .NET.',
      priorityScore: 85,
      attempts: 3,
      hintsUsed: 2,
    },
    {
      id: 'rec-algo-bigo',
      topic: 'Big-O Complexity & Data Structures',
      category: 'Algorithms',
      status: 'Improving',
      reason: 'Strengthen asymptotic runtime analysis and space trade-offs.',
      priorityScore: 78,
      attempts: 4,
      hintsUsed: 0,
    },
  ];

  let recommendedPractice: RecommendedPracticeItem[] = [];

  if (topicProgressRows.length > 0) {
    recommendedPractice = topicProgressRows
      .filter((tp) => tp.currentLevel !== 'Strong')
      .map((tp) => {
        let reason = '';
        if (tp.currentLevel === 'Needs Practice') {
          reason = `You struggled with ${tp.topic} questions in your recent interviews.`;
        } else if (tp.currentLevel === 'Developing') {
          reason = `Improve your understanding of ${tp.topic} architecture and trade-offs.`;
        } else {
          reason = `Continue strengthening your mastery of ${tp.topic}.`;
        }
        const priorityScore = (100 - tp.averagePerformance) + (tp.hintsUsed * 4);
        return {
          id: `rec-${tp.topic.toLowerCase().replace(/\s+/g, '-')}`,
          topic: tp.topic,
          category: tp.category,
          status: tp.currentLevel,
          reason,
          priorityScore,
          attempts: tp.attempts,
          hintsUsed: tp.hintsUsed,
          lastPractisedAt: tp.lastPractisedAt,
        };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }

  if (recommendedPractice.length === 0) {
    recommendedPractice = defaultRecommendations;
  }

  const currentFocus = recommendedPractice[0]?.topic || 'C# / .NET Fundamentals';

  // Learning Paths (Prompt 47)
  const learningPaths = [
    {
      id: 'path-csharp',
      title: 'C# / .NET Enterprise Practice Path',
      progress: Math.min(100, (interviewsCompleted * 20) + (practiceSessions * 15)),
      steps: ['Value Types vs Reference Types', 'IDisposable & GC', 'Async/Await', 'Dependency Injection', 'Entity Framework Core', 'REST Web APIs'],
      currentStep: 'Dependency Injection',
    },
    {
      id: 'path-algorithms',
      title: 'Algorithms & Problem Solving Path',
      progress: Math.min(100, Math.max(10, practiceSessions * 25)),
      steps: ['Arrays & Hash Maps', 'Linked Lists', 'Two Pointers', 'Binary Search', 'Sorting', 'Big-O Complexity'],
      currentStep: 'Binary Search',
    },
    {
      id: 'path-databases',
      title: 'Relational Database & SQL Path',
      progress: Math.min(100, Math.max(20, interviewsCompleted * 15)),
      steps: ['SELECT & Filtering', 'INNER & LEFT JOINs', 'GROUP BY & Aggregations', 'Indexes & Performance', 'ACID Transactions'],
      currentStep: 'INNER & LEFT JOINs',
    },
  ];

  // Calculate practiced skills dynamically
  const skillOccurrences = new Map<string, number>();
  for (const row of recentInterviewRows) {
    if (row.topic) {
      skillOccurrences.set(row.topic, (skillOccurrences.get(row.topic) || 0) + 3);
    }
  }
  for (const tp of topicProgressRows) {
    if (tp.topic) {
      skillOccurrences.set(tp.topic, (skillOccurrences.get(tp.topic) || 0) + (tp.attempts || 1));
    }
  }
  const sortedSkills = Array.from(skillOccurrences.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([skill]) => skill);

  const mostPractisedSkills = sortedSkills.length > 0
    ? sortedSkills.slice(0, 4)
    : ['TypeScript', 'React', 'Node.js', 'System Design'];

  // Calculate actual recent improvement trajectory
  let recentImprovement = 'Begin your first mock interview to track trajectory';
  const scoredInterviews = recentInterviewRows.filter((r) => typeof r.score === 'number' && !isNaN(r.score!));
  if (scoredInterviews.length >= 2) {
    const latestScore = scoredInterviews[0].score!;
    const previousScore = scoredInterviews[scoredInterviews.length - 1].score!;
    const diff = latestScore - previousScore;
    if (diff > 0) {
      recentImprovement = `+${diff}% accuracy increase across recent sessions`;
    } else if (diff === 0) {
      recentImprovement = `Consistent ${latestScore}% benchmark maintained`;
    } else {
      recentImprovement = `${diff}% score delta across recent sessions`;
    }
  } else if (scoredInterviews.length === 1) {
    recentImprovement = `Baseline established: ${scoredInterviews[0].score}% initial score`;
  }

  // Calculate daily streak
  const activeDates = new Set<string>();
  for (const r of recentInterviewRows) {
    if (r.createdAt) activeDates.add(new Date(r.createdAt).toISOString().slice(0, 10));
  }
  for (const t of topicProgressRows) {
    if (t.lastPractisedAt) activeDates.add(new Date(t.lastPractisedAt).toISOString().slice(0, 10));
  }
  let calculatedStreak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    if (activeDates.has(dateStr)) {
      calculatedStreak++;
    } else if (i === 0) {
      // today might not have a session yet
      continue;
    } else {
      break;
    }
  }
  const currentStreak = Math.max(calculatedStreak, scoredInterviews.length > 0 ? 1 : 0);

  return {
    interviewsCompleted,
    questionsAnswered,
    practiceSessions,
    currentFocus,
    recommendedPractice: recommendedPractice.slice(0, 4),
    recentInterviews: recentInterviewRows.map((r) => ({
      id: r.id,
      topic: r.topic,
      role: r.role || 'Software Developer',
      interviewType: r.interviewType || 'Technical Interview',
      difficulty: r.difficulty || 'Medium',
      duration: r.duration || 20,
      score: r.score ?? 75,
      createdAt: r.createdAt,
      feedback: r.feedback,
    })),
    learningPaths,
    analytics: {
      interviewsCompleted,
      practiceSessions,
      topicsImproved: Math.max(0, topicProgressRows.filter((t) => t.currentLevel === 'Improving' || t.currentLevel === 'Strong').length),
      currentStreak,
      mostPractisedSkills,
      recentImprovement,
    },
  };
}

export async function getInterviewHistory(userId: string) {
  const rows = await query<{
    id: string;
    topic: string;
    role: string | null;
    interviewType: string | null;
    difficulty: string | null;
    duration: number | null;
    score: number | null;
    createdAt: string;
    feedback: string | null;
    weakAreas: string | string[] | null;
  }>(
    `SELECT "id", "topic", "role", "interviewType", "difficulty", "duration", "score", "createdAt", "feedback", "weakAreas"
     FROM "Interview"
     WHERE "userId" = $1
     ORDER BY "createdAt" DESC
     LIMIT 30`,
    [userId],
  ).catch(() => []);

  return rows.map((r) => {
    let parsedWeak: string[] = [];
    if (r.weakAreas) {
      try {
        parsedWeak = typeof r.weakAreas === 'string' ? JSON.parse(r.weakAreas) : r.weakAreas;
      } catch {}
    }
    return {
      id: r.id,
      topic: r.topic,
      role: r.role || 'Software Developer',
      interviewType: r.interviewType || 'Technical Interview',
      difficulty: r.difficulty || 'Medium',
      duration: r.duration || 20,
      score: r.score ?? 70,
      createdAt: r.createdAt,
      feedback: r.feedback,
      weakAreas: parsedWeak,
    };
  });
}

export async function getInterviewHistoryDetail(interviewId: string, userId: string) {
  const row = await queryOne<{
    id: string;
    userId: string;
    topic: string;
    role: string | null;
    interviewType: string | null;
    difficulty: string | null;
    duration: number | null;
    score: number | null;
    feedback: string | null;
    weakAreas: string | string[] | null;
    questions: string | InterviewQuestion[];
    evaluation: string | any;
    createdAt: string;
    hintsUsed: number | null;
  }>(
    `SELECT * FROM "Interview" WHERE "id" = $1 AND "userId" = $2`,
    [interviewId, userId],
  ).catch(() => null);

  if (!row) {
    const mem = inMemoryInterviews.get(interviewId);
    if (mem && mem.userId === userId) return mem;
    throw new Error('Interview not found');
  }

  let questions: InterviewQuestion[] = [];
  if (typeof row.questions === 'string') {
    try { questions = JSON.parse(row.questions); } catch {}
  } else if (Array.isArray(row.questions)) {
    questions = row.questions;
  }

  let evaluation: any = null;
  if (row.evaluation) {
    try { evaluation = typeof row.evaluation === 'string' ? JSON.parse(row.evaluation) : row.evaluation; } catch {}
  }

  let weakAreas: string[] = [];
  if (row.weakAreas) {
    try { weakAreas = typeof row.weakAreas === 'string' ? JSON.parse(row.weakAreas) : row.weakAreas; } catch {}
  }

  return {
    id: row.id,
    topic: row.topic,
    role: row.role || 'Software Developer',
    interviewType: row.interviewType || 'Technical Interview',
    difficulty: row.difficulty || 'Medium',
    duration: row.duration || 20,
    score: row.score ?? 0,
    feedback: row.feedback,
    weakAreas,
    questions,
    evaluation,
    hintsUsed: row.hintsUsed || 0,
    createdAt: row.createdAt,
  };
}

export async function startPracticeSession(params: { userId: string; topic: string; difficulty?: string }): Promise<FocusedPracticeSession> {
  const { userId, topic, difficulty = 'medium' } = params;
  const sessionId = newId();

  // Find candidate questions matching the topic
  const matchingTrack = resolveTrack(topic) || ALL_INTERVIEW_TRACKS.find((t) => t.id === 'csharp')!;
  let pool = ALL_QUESTIONS.filter((q: InterviewQuestion) =>
    q.topic.toLowerCase().includes(topic.toLowerCase()) ||
    q.tags.some((t: string) => t.toLowerCase().includes(topic.toLowerCase())) ||
    matchingTrack.componentTopics.includes(q.topic)
  );

  if (pool.length === 0) pool = ALL_QUESTIONS.slice(0, 10);

  const easyQ = pool.find((q: InterviewQuestion) => q.difficulty === 'easy') || pool[0];
  const medQ1 = pool.find((q: InterviewQuestion) => q.difficulty === 'medium' && q.id !== easyQ.id) || pool[1] || pool[0];
  const medQ2 = pool.find((q: InterviewQuestion) => q.difficulty === 'medium' && q.id !== easyQ.id && q.id !== medQ1.id) || pool[2] || pool[0];
  const hardQ = pool.find((q: InterviewQuestion) => q.difficulty === 'hard') || pool[3] || pool[0];
  const miniQ = pool.find((q: InterviewQuestion) => q.id !== easyQ.id && q.id !== medQ1.id && q.id !== medQ2.id && q.id !== hardQ.id) || pool[4] || pool[0];

  const quickReview = {
    concept: `${topic} is a core competency in modern software development. Understanding its lifecycle, internal mechanics, and error boundaries is crucial for writing production-grade code.`,
    example: `// Core pattern in ${topic}\npublic void ProcessSafely() {\n    // Ensure proper resource allocation and constraint validation\n}`,
    whyItMatters: `Interviewers evaluate whether you understand real-world runtime trade-offs or merely memorize syntax.`,
    deepDive: `Always consider memory overhead, garbage collection or allocation pressure, and thread-safety under concurrent load.`,
  };

  const practiceQuestions = [easyQ, medQ1, medQ2, hardQ].map((q) => ({
    id: q.id,
    prompt: q.prompt,
    difficulty: q.difficulty,
    questionType: q.type,
    hints: q.hints || [
      'Focus on the fundamental rules of this operation.',
      'Check for null or boundary conditions.',
      'Consider the expected return type and side effects.',
    ],
    expectedConcepts: q.expectedConcepts || q.rubric.slice(0, 3),
  }));

  const miniAssessment = {
    id: miniQ.id,
    prompt: miniQ.prompt,
    difficulty: miniQ.difficulty,
    rubric: miniQ.rubric,
    expectedConcepts: miniQ.expectedConcepts || miniQ.rubric.slice(0, 3),
  };

  // Record PracticeSession in DB
  await query(
    `INSERT INTO "PracticeSession" (
       "id", "userId", "topic", "category", "difficulty", "status"
     )
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [sessionId, userId, topic, matchingTrack.category || 'Programming', difficulty, 'IN_PROGRESS'],
  ).catch(() => {});

  return {
    sessionId,
    topic,
    category: matchingTrack.category || 'Programming',
    difficulty,
    quickReview,
    questions: practiceQuestions,
    miniAssessment,
  };
}

export async function completePracticeSession(params: {
  userId: string;
  sessionId: string;
  topic: string;
  answers: Array<{ questionId: string; answer: string; hintsUsed?: number }>;
}): Promise<PracticeCompletionResult> {
  const { userId, sessionId, topic, answers } = params;

  let correctCount = 0;
  let totalHints = 0;

  for (const a of answers) {
    const words = a.answer.trim().split(/\s+/).filter(Boolean).length;
    if (words >= 15) correctCount++;
    totalHints += a.hintsUsed || 0;
  }

  const performanceScore = Math.min(100, Math.round((correctCount / Math.max(answers.length, 1)) * 85 + 15));
  const newStatus: TopicLevel = performanceScore >= 80 ? 'Strong' : performanceScore >= 60 ? 'Improving' : 'Developing';
  const previousStatus: TopicLevel = 'Needs Practice';

  // Update PracticeSession in DB
  await query(
    `UPDATE "PracticeSession"
     SET "completedAt" = CURRENT_TIMESTAMP,
         "questionsCompleted" = $1,
         "correctAnswers" = $2,
         "hintsUsed" = $3,
         "performance" = $4,
         "status" = 'COMPLETED',
         "previousLevel" = $5,
         "newLevel" = $6
     WHERE "id" = $7`,
    [answers.length, correctCount, totalHints, performanceScore, previousStatus, newStatus, sessionId],
  ).catch(() => {});

  // Update UserTopicProgress in DB
  await updateUserTopicProgress(userId, topic, 'Programming', {
    score: performanceScore,
    isCorrect: correctCount >= 3,
    isPartial: correctCount === 2,
    hintsUsed: totalHints,
    newLevel: newStatus,
  });

  // Award XP via gamification (+35 to +55 XP)
  const xpAwarded = Math.round(35 + performanceScore * 0.2);
  await awardXp(userId, xpAwarded, `Completed focused practice on ${topic}`).catch(() => {});

  // Update Skill
  await updateSkillProgress(userId, topic, newStatus === 'Strong' ? 3 : 2);

  return {
    topic,
    questionsCompleted: answers.length,
    totalQuestions: answers.length,
    previousStatus,
    currentStatus: newStatus,
    whatYouLearned: [
      `Core syntax and structural patterns in ${topic}`,
      'Handling edge conditions and runtime validation',
      'Practical problem-solving under interview constraints',
    ],
    stillNeedsPractice: performanceScore >= 80 ? [] : ['Complex nested multi-condition scenarios'],
    nextRecommendedPractice: {
      topic: topic.includes('SQL') ? 'SQL Aggregations and Window Functions' : 'Async / Await and Concurrency',
      reason: 'Continue building on your recent progress with the next logical topic.',
    },
    xpAwarded,
  };
}

export async function getUserTopicProgress(userId: string): Promise<UserTopicProgressData[]> {
  const rows: UserTopicProgressData[] = await query<UserTopicProgressData>(
    `SELECT * FROM "UserTopicProgress" WHERE "userId" = $1 ORDER BY "updatedAt" DESC`,
    [userId],
  ).catch((): UserTopicProgressData[] => []);

  const mem = inMemoryTopicProgress.get(userId);
  if (mem) {
    for (const [top, val] of mem.entries()) {
      if (!rows.some((r) => r.topic === top)) rows.push(val);
    }
  }

  return rows;
}
