import { Router } from 'express';
import { query, queryOne } from '../lib/db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

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
    ]);

    const user = await queryOne<{ xp: number; level: number; firstName: string; lastName: string }>(
      `SELECT "xp", "level", "firstName", "lastName"
       FROM "User"
       WHERE "id" = $1`,
      [userId],
    );

    const levelTitles = [
      'Junior Developer',
      'Developer',
      'Advanced Developer',
      'Software Engineer',
      'Tech Leader',
    ];

    res.json({
      user,
      levelTitle: levelTitles[Math.min((user?.level || 1) - 1, 4)],
      stats: {
        tasksCompleted,
        challengesPassed,
        wellnessEntries,
        interviews,
        projectApplications: projectApps,
        unreadNotifications,
      },
      wellnessTrend: recentWellness.reverse(),
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

export default router;

async function countTable(tableSql: string, whereSql: string, params: readonly unknown[]): Promise<number> {
  const row = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int AS "count" FROM ${tableSql} ${whereSql}`,
    params,
  );
  return row?.count || 0;
}
