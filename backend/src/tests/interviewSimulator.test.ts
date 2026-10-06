import test from 'node:test';
import assert from 'node:assert/strict';
import {
  startInterviewSession,
  getQuestionHint,
  getFollowUpQuestion,
  generateLiveCritique,
  evaluateInterviewSession,
  getInterviewHomeStats,
  startPracticeSession,
  completePracticeSession,
  getInterviewHistory,
  getInterviewHistoryDetail,
} from '../services/interviewService.js';
import {
  ALL_INTERVIEW_TRACKS,
  ALL_INTERVIEW_ROLES,
  ALL_INTERVIEW_TYPES,
  ALL_DIFFICULTIES,
  ALL_INTERVIEWER_STYLES,
} from '../data/interviewBank/index.js';

test('SynergySphere Developer Interview Simulator & Practice System', async (t) => {
  const testUserId = 'test-user-dev-sim-123';

  await t.test('1. Metadata catalogs are registered and complete', () => {
    assert.ok(ALL_INTERVIEW_TRACKS.length >= 13, 'Expected at least 13 tracks');
    assert.ok(ALL_INTERVIEW_ROLES.length >= 12, 'Expected at least 12 roles');
    assert.ok(ALL_INTERVIEW_TYPES.length >= 6, 'Expected at least 6 interview types');
    assert.ok(ALL_DIFFICULTIES.length >= 5, 'Expected 5 difficulty levels');
    assert.ok(ALL_INTERVIEWER_STYLES.length >= 4, 'Expected 4 interviewer styles');

    // Verify C# / .NET Developer role exists
    const csharpRole = ALL_INTERVIEW_ROLES.find((r) => r.id === 'C#/.NET Developer');
    assert.ok(csharpRole, 'C#/.NET Developer role must exist');
    assert.equal(csharpRole.primaryTrack, 'csharp');
  });

  await t.test('2. Start Interview Session with Role, Type, Difficulty and Duration', async () => {
    const session = await startInterviewSession({
      userId: testUserId,
      role: 'C#/.NET Developer',
      interviewType: 'Technical Interview',
      difficulty: 'Medium',
      duration: 20,
      interviewerStyle: 'Professional',
      programmingLanguage: 'C#',
    });

    assert.ok(session.id, 'Session must have an ID');
    assert.equal(session.role, 'C#/.NET Developer');
    assert.equal(session.interviewType, 'Technical Interview');
    assert.equal(session.difficulty, 'Medium');
    assert.equal(session.duration, 20);
    assert.ok(session.interviewerGreeting.includes('Welcome'), 'Interviewer greeting must be generated');
    assert.ok(session.questions.length >= 5, 'Expected at least 5 questions for 20m interview');

    // Verify first question has prompt, rubric and hints
    const q0 = session.questions[0];
    assert.ok(q0.prompt, 'Question must have prompt');
    assert.ok(q0.rubric.length >= 3, 'Question must have rubric criteria');
    assert.ok(q0.hints && q0.hints.length >= 3, 'Question must have at least 3 hints');
  });

  await t.test('3. Hint System retrieves conceptual to specific hints', async () => {
    const session = await startInterviewSession({
      userId: testUserId,
      role: 'Backend Developer',
      duration: 10,
    });

    const hint1 = await getQuestionHint({
      interviewId: session.id,
      questionIndex: 0,
      hintLevel: 1,
    });
    assert.ok(hint1.hintText, 'Hint 1 must return conceptual guidance');
    assert.equal(hint1.hintLevel, 1);

    const hint2 = await getQuestionHint({
      interviewId: session.id,
      questionIndex: 0,
      hintLevel: 2,
    });
    assert.ok(hint2.hintText, 'Hint 2 must return specific guidance');
    assert.equal(hint2.hintLevel, 2);

    const hint3 = await getQuestionHint({
      interviewId: session.id,
      questionIndex: 0,
      hintLevel: 3,
    });
    assert.ok(hint3.hintText, 'Hint 3 must return strong guidance');
    assert.equal(hint3.hintLevel, 3);
  });

  await t.test('4. Live Rubric Critique and Adaptive Follow-Up', async () => {
    const session = await startInterviewSession({
      userId: testUserId,
      role: 'C#/.NET Developer',
      duration: 10,
    });

    const candidateAnswer = 'In C#, value types inherit from System.ValueType and live on the stack, while reference types inherit from Object and live on the managed heap. Passing a value type makes a copy of the value.';
    const critique = await generateLiveCritique({
      interviewId: session.id,
      questionIndex: 0,
      answer: candidateAnswer,
    });

    assert.ok(critique.technicalClarity, 'Critique must include technical clarity');
    assert.ok(critique.problemSolving, 'Critique must include problem solving');
    assert.ok(critique.topicDepth, 'Critique must include topic depth');

    const followUp = await getFollowUpQuestion({
      interviewId: session.id,
      questionIndex: 0,
      answer: candidateAnswer,
    });
    assert.ok(followUp.followUpQuestion, 'Follow-up question must be returned');
  });

  await t.test('5. Multi-dimensional Interview Evaluation and Question Review', async () => {
    const session = await startInterviewSession({
      userId: testUserId,
      role: 'C#/.NET Developer',
      duration: 20,
    });

    const testAnswers = session.questions.map((q, idx) =>
      idx % 2 === 0
        ? `Comprehensive technical answer explaining ${q.tags.join(' and ')} with memory semantics, runtime execution, and trade-offs.`
        : 'Brief conceptual answer without much detail.'
    );

    const evaluation = await evaluateInterviewSession({
      interviewId: session.id,
      userId: testUserId,
      answers: testAnswers,
      hintsUsedCount: 2,
      durationMinutes: 20,
    });

    assert.ok(evaluation.score >= 0 && evaluation.score <= 100, 'Score must be between 0 and 100');
    assert.ok(evaluation.xpEarned > 0, 'XP must be awarded');
    assert.ok(evaluation.strengths.length > 0, 'Strengths must be identified');
    assert.ok(evaluation.weaknesses.length > 0, 'Weak areas must be identified');

    // Multi-dimensional breakdown check
    assert.ok(evaluation.dimensions.technicalKnowledge, 'Technical knowledge dimension must exist');
    assert.ok(evaluation.dimensions.problemSolving, 'Problem solving dimension must exist');
    assert.ok(evaluation.dimensions.communication, 'Communication dimension must exist');
    assert.ok(evaluation.dimensions.coding, 'Coding dimension must exist');
    assert.ok(evaluation.dimensions.accuracy, 'Accuracy dimension must exist');
    assert.ok(evaluation.dimensions.timeManagement, 'Time management dimension must exist');

    // Question Review breakdown check
    assert.equal(evaluation.questionReviews.length, session.questions.length, 'Every question must have a review item');
    const rev0 = evaluation.questionReviews[0];
    assert.ok(rev0.question, 'Review item must have question');
    assert.ok(rev0.candidateAnswer, 'Review item must have candidate answer');
    assert.ok(rev0.expectedConcepts.length > 0, 'Review item must have expected concepts');
    assert.ok(rev0.commonMistakes.length > 0, 'Review item must have common mistakes');
    assert.ok(rev0.topicToPractice, 'Review item must specify topic to practice');
  });

  await t.test('6. Home Stats and Prioritized Recommended Practice', async () => {
    const stats = await getInterviewHomeStats(testUserId);
    assert.ok(typeof stats.interviewsCompleted === 'number');
    assert.ok(typeof stats.questionsAnswered === 'number');
    assert.ok(stats.currentFocus, 'Current focus topic must be present');
    assert.ok(stats.recommendedPractice.length > 0, 'Recommended practice items must be present');

    const topRec = stats.recommendedPractice[0];
    assert.ok(topRec.topic, 'Recommendation must have a topic');
    assert.ok(topRec.status, 'Recommendation must have a status level');
    assert.ok(topRec.reason, 'Recommendation must have an honest explanation reason');

    assert.ok(stats.learningPaths.length >= 2, 'Learning paths must be available');
  });

  await t.test('7. Focused Practice & Micro-learning Complete Flow', async () => {
    const practice = await startPracticeSession({
      userId: testUserId,
      topic: 'SQL JOINs & Relational Queries',
      difficulty: 'medium',
    });

    assert.ok(practice.sessionId, 'Practice session must have an ID');
    assert.equal(practice.topic, 'SQL JOINs & Relational Queries');
    assert.ok(practice.quickReview.concept, 'Quick review must have concept');
    assert.ok(practice.quickReview.example, 'Quick review must have code example');
    assert.ok(practice.quickReview.whyItMatters, 'Quick review must explain why it matters in interviews');
    assert.equal(practice.questions.length, 4, 'Expected 4 progressive practice questions');
    assert.ok(practice.miniAssessment.prompt, 'Mini-assessment question must be present');

    // Complete practice session
    const practiceAnswers = [
      { questionId: practice.questions[0].id, answer: 'INNER JOIN returns rows that have matching values in both tables based on join predicate.' },
      { questionId: practice.questions[1].id, answer: 'LEFT JOIN returns all rows from the left table and matched rows from the right table, with NULLs for unmatched.' },
      { questionId: practice.questions[2].id, answer: 'SELECT u.id, o.amount FROM Users u JOIN Orders o ON u.id = o.userId WHERE o.status = "COMPLETED"' },
      { questionId: practice.questions[3].id, answer: 'We should ensure the foreign key column is indexed to avoid full table scans during hash or nested loop joins.' },
    ];

    const result = await completePracticeSession({
      userId: testUserId,
      sessionId: practice.sessionId,
      topic: practice.topic,
      answers: practiceAnswers,
    });

    assert.equal(result.topic, practice.topic);
    assert.ok(result.whatYouLearned.length > 0, 'What you learned must be listed');
    assert.ok(result.nextRecommendedPractice.topic, 'Next recommended topic must be suggested');
    assert.ok(result.xpAwarded > 0, 'XP must be awarded for practice completion');
    assert.ok(['Developing', 'Improving', 'Strong'].includes(result.currentStatus), 'Status must transition');
  });

  await t.test('8. Interview History & Detail Retrieval', async () => {
    const history = await getInterviewHistory(testUserId);
    assert.ok(Array.isArray(history), 'History must return an array');

    if (history.length > 0) {
      const detail = await getInterviewHistoryDetail(history[0].id, testUserId);
      assert.ok(detail.id, 'History detail must have ID');
      assert.ok(detail.questions.length > 0, 'History detail must have questions');
    }
  });
});
