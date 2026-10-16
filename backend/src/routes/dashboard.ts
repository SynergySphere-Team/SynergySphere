import { Router } from 'express';
import { query, queryOne } from '../lib/db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { getProfileSignals, computeConsecutiveStreak } from '../services/portfolioService.js';
import { w3schoolsProgrammingDomain } from '../data/w3schoolsCurriculumData.js';
import { getInterviewHomeStats } from '../services/interviewService.js';

const router = Router();

router.use(authenticate);

router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    const [
      tasksCompleted,
      challengesPassed,
      wellnessEntries,
      interviews,
      projectApps,
      unreadNotifications,
      recentWellness,
      developerProfile,
    ] = await Promise.all([
      countTable('"Task"', 'WHERE "userId" = $1 AND "status" = $2', [userId, 'DONE']),
      countTable('"ChallengeAttempt"', 'WHERE "userId" = $1 AND "passed" = true', [userId]),
      countTable('"Wellness"', 'WHERE "userId" = $1', [userId]),
      countTable('"Interview"', 'WHERE "userId" = $1', [userId]),
      countTable('"ProjectApplication"', 'WHERE "userId" = $1', [userId]),
      countTable('"Notification"', 'WHERE "userId" = $1 AND "read" = false', [userId]),
      query(
        `SELECT *
         FROM "Wellness"
         WHERE "userId" = $1
         ORDER BY "date" DESC
         LIMIT 7`,
        [userId],
      ),
      getProfileSignals(userId),
    ]);

    const user = await queryOne<{ xp: number; level: number; firstName: string; lastName: string }>(
      `SELECT "xp", "level", "firstName", "lastName"
       FROM "User"
       WHERE "id" = $1`,
      [userId],
    );

    const streak = await calculateUserStreak(userId);

    const levelTitles = [
      'Junior Developer',
      'Developer',
      'Advanced Developer',
      'Software Engineer',
      'Tech Leader',
    ];

    const interviewPrep = await getInterviewHomeStats(userId).catch(() => ({
      interviewsCompleted: interviews || 0,
      questionsAnswered: (interviews || 0) * 6,
      practiceSessions: 0,
      currentFocus: 'SQL JOINs & Relational Queries',
      recommendedPractice: [
        {
          id: 'rec-sql-joins',
          topic: 'SQL JOINs & Relational Queries',
          status: 'Needs Practice',
          reason: 'Reinforce INNER, LEFT, and self-joins for complex data queries.',
        },
      ],
    }));

    res.json({
      user,
      levelTitle: levelTitles[Math.min((user?.level || 1) - 1, 4)],
      streak,
      stats: {
        tasksCompleted,
        challengesPassed,
        wellnessEntries,
        interviews,
        projectApplications: projectApps,
        unreadNotifications,
      },
      wellnessTrend: recentWellness.reverse(),
      developerProfile,
      interviewPrep,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

router.get('/search', async (req: AuthRequest, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      res.json({ challenges: [], projects: [], tasks: [], lessons: [] });
      return;
    }
    const term = `%${q}%`;
    const qLower = q.toLowerCase();

    // Search curriculum lessons
    const lessons: Array<{ id: string; title: string; subjectId: string; subjectName: string }> = [];
    for (const subject of w3schoolsProgrammingDomain.subjects) {
      for (const mod of subject.modules) {
        for (const lesson of mod.lessons) {
          if (lesson.title.toLowerCase().includes(qLower) || subject.name.toLowerCase().includes(qLower)) {
            lessons.push({
              id: lesson.id,
              title: lesson.title,
              subjectId: subject.id,
              subjectName: subject.name,
            });
            if (lessons.length >= 6) break;
          }
        }
        if (lessons.length >= 6) break;
      }
      if (lessons.length >= 6) break;
    }

    const [challenges, projects, tasks] = await Promise.all([
      query<{ id: string; title: string; difficulty: string }>(
        `SELECT "id", "title", "difficulty" FROM "Challenge" WHERE "title" ILIKE $1 OR "description" ILIKE $1 LIMIT 5`,
        [term],
      ),
      query<{ id: string; title: string; category: string }>(
        `SELECT "id", "title", "category" FROM "Project" WHERE "title" ILIKE $1 OR "description" ILIKE $1 LIMIT 5`,
        [term],
      ),
      query<{ id: string; title: string; status: string }>(
        `SELECT "id", "title", "status" FROM "Task" WHERE "userId" = $1 AND ("title" ILIKE $2 OR "description" ILIKE $2 OR "learnedNote" ILIKE $2) LIMIT 5`,
        [req.user!.userId, term],
      ),
    ]);
    res.json({ challenges, projects, tasks, lessons });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;

async function calculateUserStreak(userId: string, timeZone = 'UTC'): Promise<number> {
  try {
    const rows = await query<{ occurredAt: string | Date }>(
      `SELECT "occurredAt"
       FROM (
         SELECT "createdAt" AS "occurredAt" FROM "Task" WHERE "userId" = $1 AND "status" = 'DONE'
         UNION ALL
         SELECT "createdAt" AS "occurredAt" FROM "ChallengeAttempt" WHERE "userId" = $1
         UNION ALL
         SELECT "date" AS "occurredAt" FROM "Wellness" WHERE "userId" = $1
         UNION ALL
         SELECT "completedAt" AS "occurredAt" FROM "FocusSession" WHERE "userId" = $1
       ) activity
       ORDER BY "occurredAt" DESC
       LIMIT 365`,
      [userId],
    );

    if (rows.length === 0) return 1;
    const computed = computeConsecutiveStreak(rows.map((r) => r.occurredAt), timeZone);
    return Math.max(computed, 1);
  } catch {
    return 1;
  }
}

async function countTable(tableSql: string, whereSql: string, params: readonly unknown[]): Promise<number> {
  const row = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int AS "count" FROM ${tableSql} ${whereSql}`,
    params,
  );
  return row?.count || 0;
}
