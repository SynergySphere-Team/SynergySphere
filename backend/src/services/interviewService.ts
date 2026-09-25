import { newId, query, queryOne } from '../lib/db.js';
import { awardXp } from './gamification.js';
import { generateAiResponse } from './ai.js';
import {
  QUESTION_MAP,
  resolveTrack,
  selectSessionQuestions,
  type InterviewQuestion,
  type LiveCritiqueResult,
  type InterviewEvaluationResult,
  type QuestionEvaluation,
} from '../data/interviewBank/index.js';
import { w3schoolsProgrammingDomain } from '../data/w3schoolsCurriculumData.js';

interface FlatLesson {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
}

function getCurriculumLessons(): FlatLesson[] {
  const lessons: FlatLesson[] = [];
  for (const subject of w3schoolsProgrammingDomain.subjects) {
    for (const mod of subject.modules) {
      for (const lesson of mod.lessons) {
        lessons.push({
          id: lesson.id,
          title: lesson.title,
          subjectId: subject.id,
          subjectName: subject.name,
        });
      }
    }
  }
  return lessons;
}

export interface StartInterviewParams {
  userId: string;
  topic: string;
  count?: number;
  mode?: 'mixed' | 'conceptual' | 'coding';
}

export async function startInterviewSession(params: StartInterviewParams) {
  const { userId, topic, count = 10, mode = 'mixed' } = params;
  const track = resolveTrack(topic);
  const resolvedTopicName = track ? track.name : topic;

  // 1. Fetch questions user has already mastered (score >= 80)
  const masteredRows = await query<{ questionId: string }>(
    `SELECT DISTINCT "questionId"
     FROM "InterviewAttempt"
     WHERE "userId" = $1 AND "score" >= 80`,
    [userId],
  ).catch(() => []);
  const excludedQuestionIds = masteredRows.map((r) => r.questionId);

  // 2. Fetch recent weak areas
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

  // 3. Select questions from bank
  const selectedQuestions = selectSessionQuestions({
    topic,
    count,
    mode,
    excludedQuestionIds,
    weakAreas,
  });

  // Client-safe questions (keep prompt, type, difficulty, rubric, id, tags, followUps, strip sampleAnswer)
  const clientSafeQuestions = selectedQuestions.map((q) => ({
    id: q.id,
    topic: q.topic,
    type: q.type,
    difficulty: q.difficulty,
    prompt: q.prompt,
    rubric: q.rubric,
    tags: q.tags,
    followUps: q.followUps,
  }));

  // Store in DB (with full data so critique and evaluator have access to rubrics/answers)
  const sessionId = newId();
  const interview = await queryOne<{ id: string; userId: string; topic: string; questions: string }>(
    `INSERT INTO "Interview" ("id", "userId", "topic", "questions")
     VALUES ($1, $2, $3, $4)
     RETURNING "id", "userId", "topic", "questions"`,
    [sessionId, userId, resolvedTopicName, JSON.stringify(selectedQuestions)],
  );

  return {
    id: interview?.id || sessionId,
    userId,
    topic: resolvedTopicName,
    ...interview,
    questions: clientSafeQuestions,
    totalQuestions: clientSafeQuestions.length,
    track: track ? { id: track.id, name: track.name, category: track.category } : null,
  };
}

function extractJsonObject<T = unknown>(text: string): T | null {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace === -1) return null;

  // Try direct parse from firstBrace to lastBrace
  const lastBrace = cleaned.lastIndexOf('}');
  if (lastBrace > firstBrace) {
    try {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as T;
    } catch {}
  }

  // Bracket-matching parser to isolate first valid top-level JSON object
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

  const interview = await queryOne<{ questions: string | InterviewQuestion[] }>(
    `SELECT "questions" FROM "Interview" WHERE "id" = $1`,
    [interviewId],
  );

  if (!interview) {
    throw new Error('Interview session not found');
  }

  const rawQuestions: InterviewQuestion[] = Array.isArray(interview.questions)
    ? interview.questions
    : typeof interview.questions === 'string'
      ? JSON.parse(interview.questions)
      : [];
  const currentQ = rawQuestions[questionIndex];
  const question: InterviewQuestion | undefined = currentQ
    ? (QUESTION_MAP.get(currentQ.id) || currentQ)
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

  // Construct Gemini Prompt grounded strictly in this question's rubric
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

  // Heuristic Fallback grounded in the rubric
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
  const hasCode = scratchCode.trim().length > 10 || /```|function|class|def|import|select|from/i.test(answer);

  // Match words from rubric items against candidate text
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
        ? 'Clear narrative flow. Consider highlighting the practical why before the how.'
        : 'Structure your explanation with a high-level summary followed by technical proof.',
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
}

export async function evaluateInterviewSession(params: EvaluateInterviewParams): Promise<InterviewEvaluationResult> {
  const { interviewId, userId, answers, scratchCodes = [] } = params;

  const interview = await queryOne<{ id: string; topic: string; questions: string | InterviewQuestion[]; score: number | null }>(
    `SELECT * FROM "Interview" WHERE "id" = $1 AND "userId" = $2`,
    [interviewId, userId],
  );

  if (!interview) {
    throw new Error('Interview not found');
  }

  const rawQuestions: InterviewQuestion[] =
    typeof interview.questions === 'string' ? JSON.parse(interview.questions) : interview.questions;

  const questionEvaluations: QuestionEvaluation[] = [];
  const missedRubricPoints: string[] = [];
  const weakTopicTags: string[] = [];

  for (let i = 0; i < rawQuestions.length; i++) {
    const q = rawQuestions[i];
    const answer = answers[i] || '';
    const code = scratchCodes[i] || '';
    const combined = `${answer} ${code}`.toLowerCase();
    const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;

    // Check rubric matches
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

    // Base score calculation from rubric coverage + length + code
    let score = Math.round(coverage * 85);
    if (wordCount >= 40) score += 10;
    if (code.trim().length > 20) score += 5;
    if (wordCount < 10 && code.trim().length === 0) score = Math.min(score, 15);
    score = Math.min(Math.max(score, 0), 100);

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

    if (score < 80) {
      missedRubricPoints.push(...missedBullets);
      weakTopicTags.push(...q.tags);
    }

    // Record InterviewAttempt in DB
    await query(
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
    ).catch((err) => console.error('Error saving InterviewAttempt:', err));
  }

  // Calculate overall score
  const totalScore = questionEvaluations.reduce((sum, qe) => sum + qe.score, 0);
  const overallScore = Math.round(totalScore / Math.max(questionEvaluations.length, 1));

  // Map weak areas to Learning Hub curriculum lessons
  const curriculumLessons = getCurriculumLessons();
  const weakAreas: string[] = [];

  for (const tag of [...new Set(weakTopicTags)]) {
    const matchedLesson = curriculumLessons.find(
      (l) =>
        l.title.toLowerCase().includes(tag.toLowerCase()) ||
        l.subjectId.toLowerCase().includes(tag.toLowerCase()),
    );
    if (matchedLesson && !weakAreas.includes(matchedLesson.title)) {
      weakAreas.push(matchedLesson.title);
    }
  }

  // Add top missed rubric topics if we need more concrete advice
  if (weakAreas.length < 3 && missedRubricPoints.length > 0) {
    for (const point of missedRubricPoints) {
      const trimmed = point.length > 45 ? `${point.slice(0, 42)}...` : point;
      if (!weakAreas.includes(trimmed)) {
        weakAreas.push(trimmed);
      }
      if (weakAreas.length >= 4) break;
    }
  }

  if (weakAreas.length === 0) {
    weakAreas.push('Advanced optimization and system scaling');
  }

  const overallFeedback = overallScore >= 80
    ? `Outstanding performance in ${interview.topic}! You demonstrated deep technical fluency and systematic problem solving.`
    : overallScore >= 60
    ? `Solid baseline in ${interview.topic}. You communicate concepts clearly, but should deepen your mastery in the highlighted weak areas.`
    : `Foundational work needed in ${interview.topic}. Review the recommended Learning Hub modules and practice articulating key trade-offs.`;

  // Dynamic XP formula: Math.round(40 + score * 0.6)
  const xpEarned = Math.round(40 + overallScore * 0.6);

  // Update Interview in DB
  await query(
    `UPDATE "Interview"
     SET "score" = $1, "feedback" = $2, "weakAreas" = $3
     WHERE "id" = $4`,
    [overallScore, overallFeedback, JSON.stringify(weakAreas), interviewId],
  );

  const alreadyScored = interview.score !== null;
  if (!alreadyScored) {
    await awardXp(userId, xpEarned, `Completed ${interview.topic} interview (Score: ${overallScore}%)`);
  }

  return {
    score: overallScore,
    feedback: overallFeedback,
    weakAreas,
    questionScores: questionEvaluations,
    xpEarned: alreadyScored ? 0 : xpEarned,
    xpAwarded: alreadyScored ? 0 : xpEarned,
  };
}
