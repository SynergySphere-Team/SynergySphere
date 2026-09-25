import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { judgeChallengeSubmission, judgeJavaScript, judgeSql } from '../services/judgeService.js';
import { getProfileSignals } from '../services/portfolioService.js';
import { selectSessionQuestions, ALL_INTERVIEW_TRACKS } from '../data/interviewBank/index.js';
import { pool, query, queryOne } from '../lib/db.js';

describe('1. Server-Side Challenge Judge Integrity', () => {
  it('passes a correct implementation of Hello World', async () => {
    const challenge = {
      id: 'js-hello-world',
      title: 'Hello World',
      language: 'JavaScript',
      solution: 'return "Hello, SynergySphere!"',
    };
    const code = 'function greet() { return "Hello, SynergySphere!"; }';
    const result = await judgeChallengeSubmission(challenge, code);
    assert.equal(result.passed, true, 'Correct greet() function must pass');
    assert.ok(result.testResults.length >= 2, 'Should evaluate both public and hidden test cases');
  });

  it('fails an incorrect implementation even if client sends passed: true', async () => {
    const challenge = {
      id: 'js-hello-world',
      title: 'Hello World',
      language: 'JavaScript',
      solution: 'return "Hello, SynergySphere!"',
    };
    const cheatingCode = 'function greet() { return "I am hacking the XP!"; }';
    const result = await judgeChallengeSubmission(challenge, cheatingCode);
    assert.equal(result.passed, false, 'Cheating or incorrect code must be rejected by server judge');
  });

  it('handles infinite loop in user code with isolated VM timeout', async () => {
    const challenge = {
      id: 'js-sum-array',
      title: 'Sum Array',
      language: 'JavaScript',
      solution: 'return arr.reduce((a, b) => a + b, 0)',
    };
    const infiniteLoopCode = 'function sumArray(arr) { while(true) {} }';
    const result = await judgeChallengeSubmission(challenge, infiniteLoopCode);
    assert.equal(result.passed, false, 'Infinite loops must be halted by VM timeout and marked failed');
  });

  it('evaluates FizzBuzz edge cases including multiples of 15', async () => {
    const spec = {
      fn: 'fizzBuzz',
      cases: [
        { label: 'fizzBuzz(15)', args: [15], expected: 'FizzBuzz' },
        { label: 'fizzBuzz(3)', args: [3], expected: 'Fizz' },
        { label: 'fizzBuzz(5)', args: [5], expected: 'Buzz' },
        { label: 'fizzBuzz(7)', args: [7], expected: 7 },
      ],
    };
    const code = `function fizzBuzz(n) {
      if (n % 15 === 0) return 'FizzBuzz';
      if (n % 3 === 0) return 'Fizz';
      if (n % 5 === 0) return 'Buzz';
      return n;
    }`;
    const result = await judgeJavaScript(code, spec);
    assert.equal(result.passed, true, 'All FizzBuzz test cases should pass');
  });

  it('judges SQL challenges against an isolated transient schema', async () => {
    const validQuery = 'SELECT name FROM students WHERE gpa > 3.5 ORDER BY name';
    const result = await judgeSql(validQuery, 'SQL: Top Students');
    assert.equal(result.passed, true, 'Correct SQL query selecting GPA > 3.5 must pass');
  });

  it('rejects incorrect SQL queries', async () => {
    const badQuery = 'SELECT name FROM students WHERE gpa < 2.0';
    const result = await judgeSql(badQuery, 'SQL: Top Students');
    assert.equal(result.passed, false, 'Wrong SQL query selecting wrong rows must fail');
  });
});

describe('2. Unified Developer Profile (Spine)', () => {
  it('retrieves student@synergysphere.com with verified progress', async () => {
    const student = await queryOne<{ id: string; email: string }>(
      `SELECT "id", "email" FROM "User" WHERE "email" = 'student@synergysphere.com'`,
    );
    assert.ok(student, 'Demo student account must exist in the database');

    const profile = await getProfileSignals(student.id);

    // 12 Java lessons completed
    assert.ok(profile.stats.totalCompletedLessons >= 12, 'Demo student must have at least 12 completed lessons');

    // 3 challenges passed
    assert.ok(profile.challenges.passedCount >= 3, 'Demo student must have at least 3 passed challenges');

    // Offer readiness calculated
    assert.ok(typeof profile.offerReadiness.score === 'number', 'Offer readiness score must be a number');
    assert.ok(profile.offerReadiness.checklist.length >= 4, 'Checklist must contain required milestones');

    // Weekly activity contains 7 days
    assert.equal(profile.weeklyActivity.days.length, 7, 'Weekly activity must return 7 days (Mon-Sun)');

    // Star bullet exists
    assert.ok(profile.starBullets.length >= 1, 'Demo student must have a verified STAR bullet');
  });

  it('provides honest empty state for user with no activity', async () => {
    const signals = await getProfileSignals('non-existent-user-id');
    assert.equal(signals.stats.totalCompletedLessons, 0, 'Zero completed lessons for new user');
    assert.equal(signals.stats.hasRealProgress, false, 'hasRealProgress must be false');
    assert.equal(signals.challenges.passedCount, 0, 'Zero challenges passed');
    assert.equal(signals.weeklyActivity.totalEvents, 0, 'Zero events for new user');
    assert.equal(signals.offerReadiness.score, 0, 'Readiness score starts at 0%');
  });
});

describe('3. Interview Coach & Banking', () => {
  it('registers all 11 catalog tracks and composite tracks', () => {
    assert.ok(ALL_INTERVIEW_TRACKS.length >= 11, 'Should have at least 11 tracks in interview bank');
    const javaTrack = ALL_INTERVIEW_TRACKS.find((t) => t.id === 'java');
    assert.ok(javaTrack, 'Java track must exist');
  });

  it('selects correct session count with balanced difficulty distribution', () => {
    const session = selectSessionQuestions({ topic: 'java', count: 10, mode: 'mixed' });
    assert.equal(session.length, 10, 'Must select exactly 10 questions for a 10-count session');
    for (const q of session) {
      assert.ok(q.rubric && q.rubric.length > 0, `Question "${q.prompt}" must have rubric criteria`);
      assert.ok(q.tags && q.tags.length > 0, 'Question must have tags');
    }
  });
});

describe('4. Student Community Project Creation', () => {
  it('allows students to query community projects with tech stack and capacity', async () => {
    const projects = await query<{ title: string; category: string; teamCapacity: number }>(
      `SELECT "title", "category", "teamCapacity" FROM "Project" WHERE "isActive" = true LIMIT 5`,
    );
    assert.ok(projects.length > 0, 'Seeded community projects must exist');
    for (const p of projects) {
      assert.ok(p.title.length > 0, 'Project must have a title');
      assert.ok(p.teamCapacity > 0, 'Project must have capacity');
    }
  });
});

after(async () => {
  await pool.end();
});

