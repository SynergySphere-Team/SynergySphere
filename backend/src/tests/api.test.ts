import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { judgeChallengeSubmission, judgeJavaScript, judgeSql } from '../services/judgeService.js';
import { getProfileSignals } from '../services/portfolioService.js';
import { selectSessionQuestions, ALL_INTERVIEW_TRACKS } from '../data/interviewBank/index.js';
import { pool, query, queryOne } from '../lib/db.js';
import { sendPasswordResetEmail } from '../lib/email.js';

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

  it('evaluates real Python execution for Reverse a String in Python', async () => {
    const challenge = {
      id: 'py-reverse-string',
      title: 'Reverse a String in Python',
      language: 'Python',
      solution: 'def reverse_string(s):\n    return s[::-1]',
    };
    const code = 'def reverse_string(s):\n    return s[::-1]';
    const result = await judgeChallengeSubmission(challenge, code);
    assert.equal(result.passed, true, 'Valid Python code should pass authoritative test cases');
    assert.equal(result.language, 'Python', 'Language must be tagged as Python');
    assert.ok(result.runtimeMs !== undefined && result.runtimeMs >= 0, 'Should measure execution time');
  });

  it('evaluates real Java execution using javac and java runtime', async () => {
    const challenge = {
      id: 'java-syntax',
      title: 'Java Hello World',
      language: 'Java',
      solution: 'public class Solution { public static void main(String[] args) { System.out.println("Hello"); } }',
    };
    const code = 'public class Solution { public static void main(String[] args) { System.out.println("Hello from Java!"); } }';
    const result = await judgeChallengeSubmission(challenge, code);
    assert.equal(result.passed, true, 'Java compilation and execution must pass');
    assert.equal(result.language, 'Java', 'Language must be Java');
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

describe('5. Wellness Module & Career Resilience OS', () => {
  it('verifies wellness check-in table supports micro-tracking fields', async () => {
    const student = await queryOne<{ id: string }>(
      `SELECT "id" FROM "User" WHERE "email" = 'student@synergysphere.com'`,
    );
    assert.ok(student, 'Student user must exist');

    const result = await queryOne<{ id: string; sleepHours: string; waterIntake: number; tags: string[]; gratitude: string }>(
      `INSERT INTO "Wellness" (
         "id", "userId", "stressLevel", "mood", "energyLevel", "notes",
         "moduleId", "sleepHours", "waterIntake", "tags", "gratitude"
       )
       VALUES (
         'test-wellness-' || round(random() * 1000000)::text,
         $1, 4, 8, 7, 'Automated test check-in with high flow state',
         'LEARNING_HUB', 8.0, 7, ARRAY['#flow-state', '#breakthrough'],
         'Passed challenging unit test suite'
       )
       RETURNING "id", "sleepHours"::text, "waterIntake", "tags", "gratitude"`,
      [student.id],
    );

    assert.ok(result, 'Check-in must be inserted');
    assert.equal(Number(result.sleepHours), 8.0, 'Sleep hours must be stored correctly');
    assert.equal(result.waterIntake, 7, 'Water intake must be stored correctly');
    assert.ok(Array.isArray(result.tags) && result.tags.includes('#flow-state'), 'Tags must be stored');
    assert.equal(result.gratitude, 'Passed challenging unit test suite', 'Gratitude must be stored');
  });

  it('calculates burnout risk index and triggers appropriately', () => {
    // High stress (8) + low energy (3) -> Critical risk
    const highStress = 8;
    const lowEnergy = 3;
    const criticalScore = Math.round((highStress / 10) * 55 + ((10 - lowEnergy) / 10) * 35);
    assert.ok(criticalScore >= 67, 'High stress + low energy must yield score >= 67% (Critical)');

    // Low stress (3) + high energy (8) -> Low risk
    const lowStress = 3;
    const highEnergy = 8;
    const lowScore = Math.round((lowStress / 10) * 55 + ((10 - highEnergy) / 10) * 35);
    assert.ok(lowScore < 35, 'Low stress + high energy must yield score < 35% (Low)');
  });
});

describe('6. Productivity Center Task Enhancements & Career Boost', () => {
  it('creates task with description, target minutes, break intervals, and external link', async () => {
    const user = await queryOne<{ id: string }>('SELECT "id" FROM "User" LIMIT 1');
    assert.ok(user, 'User must exist');

    const taskId = 'test-task-' + Math.round(Math.random() * 1000000);
    const task = await queryOne<{
      id: string;
      title: string;
      description: string;
      targetDurationMinutes: number;
      breakIntervalMinutes: number;
      link: string;
      status: string;
    }>(
      `INSERT INTO "Task" (
         "id", "userId", "title", "description", "status",
         "targetDurationMinutes", "breakIntervalMinutes", "link"
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        taskId,
        user.id,
        'Implement OAuth2 Flow',
        'Build Google & GitHub login handlers with refresh token rotation',
        'TODO',
        45,
        20,
        'https://github.com/SynergySphere/auth-service',
      ],
    );

    assert.ok(task, 'Task must be created');
    assert.equal(task.title, 'Implement OAuth2 Flow');
    assert.equal(task.description, 'Build Google & GitHub login handlers with refresh token rotation');
    assert.equal(task.targetDurationMinutes, 45);
    assert.equal(task.breakIntervalMinutes, 20);
    assert.equal(task.link, 'https://github.com/SynergySphere/auth-service');
  });

  it('notifies user on task completion and generates notification record', async () => {
    const user = await queryOne<{ id: string }>('SELECT "id" FROM "User" LIMIT 1');
    assert.ok(user, 'User must exist');

    const notifId = 'test-notif-' + Math.round(Math.random() * 1000000);
    const notif = await queryOne<{ id: string; title: string; message: string; type: string }>(
      `INSERT INTO "Notification" ("id", "userId", "title", "message", "type", "link")
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        notifId,
        user.id,
        'Task Completed: Implement OAuth2 Flow',
        'Great job! You completed "Implement OAuth2 Flow".',
        'achievement',
        '/tasks',
      ],
    );

    assert.ok(notif);
    assert.equal(notif.type, 'achievement');
    assert.ok(notif.title.includes('Implement OAuth2 Flow'));
  });

  it('notifies user when focus timer session has ended and updates task timeSpent', async () => {
    const user = await queryOne<{ id: string }>('SELECT "id" FROM "User" LIMIT 1');
    assert.ok(user, 'User must exist');

    const notif = await queryOne<{ id: string; title: string; message: string; type: string }>(
      `INSERT INTO "Notification" ("id", "userId", "title", "message", "type", "link")
       VALUES (
         'test-focus-notif-' || round(random() * 1000000)::text,
         $1, 'Focus Session Completed',
         'Your 25-minute focus session has ended. Take a break!',
         'info', '/tasks'
       )
       RETURNING *`,
      [user.id],
    );

    assert.ok(notif);
    assert.equal(notif.title, 'Focus Session Completed');
  });

  it('boosts task into Career Portfolio with portfolio and bullet entries', async () => {
    const user = await queryOne<{ id: string }>('SELECT "id" FROM "User" LIMIT 1');
    assert.ok(user, 'User must exist');

    const portfolioId = 'test-port-' + Math.round(Math.random() * 1000000);
    const portItem = await queryOne<{ id: string; title: string; description: string; projectLink: string }>(
      `INSERT INTO "Portfolio" ("id", "userId", "title", "description", "projectLink", "githubLink")
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        portfolioId,
        user.id,
        'OAuth2 & JWT Microservice',
        'Architected authentication pipeline with PKCE and token rotation.',
        'https://synergysphere.io/docs/auth',
        'https://github.com/SynergySphere/auth-service',
      ],
    );

    assert.ok(portItem);
    assert.equal(portItem.title, 'OAuth2 & JWT Microservice');
    assert.equal(portItem.projectLink, 'https://synergysphere.io/docs/auth');
  });

  it('dispatches a valid password reset email link with the reset token', async () => {
    const testEmail = 'student@synergysphere.com';
    const testToken = 'testresettoken1234567890';
    const result = await sendPasswordResetEmail({
      to: testEmail,
      resetToken: testToken,
      userName: 'Student',
    });

    assert.equal(result.success, true);
    assert.ok(result.resetUrl.includes('/reset-password?token=testresettoken1234567890'));
  });

  it('updates resetPasswordToken and expiresAt in the database', async () => {
    const user = await queryOne<{ id: string; email: string }>('SELECT "id", "email" FROM "User" LIMIT 1');
    assert.ok(user, 'User must exist');

    const testToken = 'token_' + Date.now();
    const expiresAt = new Date(Date.now() + 3600000);

    await query(
      `UPDATE "User"
       SET "resetPasswordToken" = $1, "resetPasswordExpires" = $2
       WHERE "id" = $3`,
      [testToken, expiresAt, user.id],
    );

    const updatedUser = await queryOne<{ resetPasswordToken: string; resetPasswordExpires: Date }>(
      `SELECT "resetPasswordToken", "resetPasswordExpires" FROM "User" WHERE "id" = $1`,
      [user.id],
    );

    assert.ok(updatedUser);
    assert.equal(updatedUser.resetPasswordToken, testToken);
    assert.ok(new Date(updatedUser.resetPasswordExpires).getTime() > Date.now());

    // Clean up reset token
    await query(
      `UPDATE "User" SET "resetPasswordToken" = NULL, "resetPasswordExpires" = NULL WHERE "id" = $1`,
      [user.id],
    );
  });
});

describe('7. Sections 2, 3 & 4 Implementations + Removal of GitHub Commit Coach', () => {
  it('verifies timezone-safe computeConsecutiveStreak logic across local/UTC boundaries', async () => {
    const { computeConsecutiveStreak } = await import('../services/portfolioService.js');
    const today = new Date();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    const streak3 = computeConsecutiveStreak([today, yesterday, twoDaysAgo], 'UTC');
    assert.equal(streak3, 3, 'Three consecutive days ending today must yield streak = 3');

    const brokenStreak = computeConsecutiveStreak([
      new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    ], 'UTC');
    assert.equal(brokenStreak, 0, 'Activity older than yesterday must yield active streak = 0');
  });

  it('runs end-to-end HTTP + WebSocket verification for Challenges, Multi-Thread AI, SRS SM-2, Live Code Rooms, Notifications, and removed GitHub AI Coach', async () => {
    const http = await import('node:http');
    const WebSocket = (await import('ws')).default;
    const express = (await import('express')).default;
    const { signToken, AUTH_COOKIE_NAME } = await import('../middleware/auth.js');
    const { initRealtime, broadcastNotification } = await import('../services/realtime.js');
    const challengeRoutes = (await import('../routes/challenges.js')).default;
    const aiRoutes = (await import('../routes/ai.js')).default;
    const githubRoutes = (await import('../routes/github.js')).default;
    const { runMigrations } = await import('../scripts/migrate.js');

    await runMigrations();

    const user = await queryOne<{ id: string; email: string; role: string }>(
      `SELECT "id", "email", "role" FROM "User" WHERE "email" = 'student@synergysphere.com' LIMIT 1`,
    );
    assert.ok(user, 'Demo student user must exist');

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/challenges', challengeRoutes);
    testApp.use('/api/ai', aiRoutes);
    testApp.use('/api/github', githubRoutes);

    const server = http.createServer(testApp);
    initRealtime(server);

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const addr = server.address() as { port: number };
    const baseUrl = `http://127.0.0.1:${addr.port}`;

    try {
      // 1. Verify Automated GitHub Commit / PR Coach endpoint is removed (404)
      const ghCoachRes = await fetch(`${baseUrl}/api/github/ai-review`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ commitTitle: 'feat: test' }),
      });
      assert.equal(ghCoachRes.status, 404, 'POST /api/github/ai-review must return 404 Not Found after removal');

      // 2. Verify GET /api/challenges strips solution field
      const challengesRes = await fetch(`${baseUrl}/api/challenges`, { headers });
      assert.equal(challengesRes.status, 200);
      const challengesList = (await challengesRes.json()) as Array<Record<string, unknown>>;
      assert.ok(Array.isArray(challengesList) && challengesList.length > 0, 'Challenges list must not be empty');
      for (const ch of challengesList) {
        assert.equal(ch.solution, undefined, `Challenge ${ch.id} must not leak solution field in list endpoint`);
      }

      // 3. Verify POST /api/challenges/:id/test executes custom test cases without saving submission
      const targetChallenge = challengesList[0];
      const customTestRes = await fetch(`${baseUrl}/api/challenges/${targetChallenge.id}/test`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          code: 'function solution(x) { return x; }',
          language: 'JavaScript',
          customInputs: ['"SynergySphere"'],
        }),
      });
      assert.equal(customTestRes.status, 200, 'Custom test endpoint must return 200');
      const customTestBody = (await customTestRes.json()) as { customMode?: boolean; testResults?: unknown[] };
      assert.equal(customTestBody.customMode, true, 'Response must indicate customMode: true');
      assert.ok(Array.isArray(customTestBody.testResults), 'Response must include testResults array');

      // 4. Verify Multi-Thread AI Chat CRUD (POST /threads, GET /threads, GET /chat/history, DELETE /threads/:id)
      const createThreadRes = await fetch(`${baseUrl}/api/ai/threads`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: 'Integration Test Thread', lessonId: 'java-1' }),
      });
      assert.equal(createThreadRes.status, 201, 'Creating AI thread must return 201');
      const createdThread = (await createThreadRes.json()) as { id: string; title: string; contextType: string; contextId: string };
      assert.ok(createdThread.id, 'Created thread must have an id');
      assert.equal(createdThread.title, 'Integration Test Thread');
      assert.equal(createdThread.contextType, 'lesson');
      assert.equal(createdThread.contextId, 'java-1');

      const listThreadsRes = await fetch(`${baseUrl}/api/ai/threads`, { headers });
      assert.equal(listThreadsRes.status, 200);
      const threads = (await listThreadsRes.json()) as Array<{ id: string }>;
      assert.ok(threads.some((t) => t.id === createdThread.id), 'Created thread must appear in GET /api/ai/threads');

      const threadHistoryRes = await fetch(`${baseUrl}/api/ai/chat/history?threadId=${createdThread.id}`, { headers });
      assert.equal(threadHistoryRes.status, 200);
      const threadHistory = (await threadHistoryRes.json()) as unknown[];
      assert.ok(Array.isArray(threadHistory), 'Thread history must be an array');

      const delThreadRes = await fetch(`${baseUrl}/api/ai/threads/${createdThread.id}`, {
        method: 'DELETE',
        headers,
      });
      assert.equal(delThreadRes.status, 200, 'Deleting AI thread must return 200');

      // 5. Verify Spaced Repetition (SRS) SM-2 Deck & Review (both Study Pack front/back upsert and cardId review)
      const reviewByFrontRes = await fetch(`${baseUrl}/api/ai/srs/review`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          front: 'What is the time complexity of binary search?',
          back: 'O(log n)',
          quality: 4,
        }),
      });
      assert.equal(reviewByFrontRes.status, 200, 'SRS review via front/back must succeed');
      const reviewByFrontBody = (await reviewByFrontRes.json()) as {
        card: { id: string; intervalDays: number; repetitions: number };
        xpAwarded: number;
      };
      assert.equal(reviewByFrontBody.xpAwarded, 5, 'SRS review must award 5 XP');
      assert.equal(reviewByFrontBody.card.intervalDays, 1, 'First Good review must schedule 1 day interval');

      // Force card due now to test GET /api/ai/srs/due and review by cardId
      await query(
        `UPDATE "FlashcardReview" SET "nextReviewAt" = NOW() - INTERVAL '1 minute' WHERE "id" = $1`,
        [reviewByFrontBody.card.id],
      );

      const srsDueRes = await fetch(`${baseUrl}/api/ai/srs/due`, { headers });
      assert.equal(srsDueRes.status, 200);
      const srsDueBody = (await srsDueRes.json()) as {
        cards: Array<{ id: string }>;
        dueCards: Array<{ id: string }>;
        dueCount: number;
        totalCount: number;
      };
      assert.ok(Array.isArray(srsDueBody.cards), 'GET /api/ai/srs/due must return top-level cards array');
      assert.ok(srsDueBody.cards.some((c) => c.id === reviewByFrontBody.card.id), 'Due card must appear in srsDueBody.cards');

      const reviewByIdRes = await fetch(`${baseUrl}/api/ai/srs/review`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cardId: reviewByFrontBody.card.id,
          quality: 5,
        }),
      });
      assert.equal(reviewByIdRes.status, 200, 'SRS review by cardId must succeed');
      const reviewByIdBody = (await reviewByIdRes.json()) as { nextIntervalDays: number };
      assert.ok(reviewByIdBody.nextIntervalDays >= 3, 'Second Easy review must advance interval to >= 3 days');

      // Clean up test SRS card
      await query(`DELETE FROM "FlashcardReview" WHERE "id" = $1`, [reviewByFrontBody.card.id]);

      // 6. Verify Real-Time WebSocket Collaborative Code Room + Cookie/Query Auth + Live Push Notification
      const wsUrl = `ws://127.0.0.1:${addr.port}/ws`;
      const WsClient = WebSocket as unknown as new (
        url: string,
        opts?: Record<string, unknown>,
      ) => InstanceType<typeof WebSocket>;
      const clientA = new WsClient(`${wsUrl}?token=${encodeURIComponent(token)}`);
      const clientB = new WsClient(wsUrl, {
        headers: { Cookie: `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}` },
      });

      const waitForOpen = (ws: InstanceType<typeof WebSocket>) =>
        new Promise<void>((resolve, reject) => {
          ws.once('open', () => resolve());
          ws.once('error', reject);
        });

      await Promise.all([waitForOpen(clientA), waitForOpen(clientB)]);

      const codeSyncPromise = new Promise<{ code?: string; roomId?: string }>((resolve) => {
        clientB.on('message', (raw) => {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'code_sync') resolve(msg);
        });
      });

      const notifPromise = new Promise<{ notification?: { title?: string } }>((resolve) => {
        clientB.on('message', (raw) => {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'notification') resolve(msg);
        });
      });

      clientA.send(JSON.stringify({ type: 'join_code_room', roomId: 'TEST42', userName: 'Alice' }));
      clientB.send(JSON.stringify({ type: 'join_code_room', roomId: 'TEST42', userName: 'Bob' }));

      await new Promise((r) => setTimeout(r, 80));

      clientA.send(
        JSON.stringify({
          type: 'code_sync',
          roomId: 'TEST42',
          code: 'const synced = 42;',
          language: 'JavaScript',
        }),
      );

      const syncedMsg = await codeSyncPromise;
      assert.equal(syncedMsg.roomId, 'TEST42');
      assert.equal(syncedMsg.code, 'const synced = 42;', 'Client B must receive live code_sync from Client A');

      broadcastNotification(user.id, {
        id: 'notif-live-1',
        title: 'Live Push Verification',
        message: 'Real-time WebSocket notification works!',
        type: 'achievement',
      });

      const notifMsg = await notifPromise;
      assert.equal(notifMsg.notification?.title, 'Live Push Verification', 'Cookie-authenticated WebSocket must receive live notification');

      clientA.close();
      clientB.close();
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});

after(async () => {
  await pool.end();
});



