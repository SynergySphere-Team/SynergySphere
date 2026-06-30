import { Router } from 'express';
import { query, queryOne } from '../lib/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/overview', async (_req, res) => {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers,
    dailyLogins,
    challengesCompleted,
    projectApplications,
    avgInterviewScore,
    wellnessStats,
    wellnessTrend,
    recentUsers,
  ] = await Promise.all([
    countTable('"User"', '', []),
    countTable('"User"', 'WHERE "updatedAt" >= $1', [weekAgo]),
    countTable('"User"', 'WHERE "updatedAt" >= $1', [dayAgo]),
    countTable('"ChallengeAttempt"', 'WHERE "passed" = true', []),
    countTable('"ProjectApplication"', '', []),
    queryOne<{ avgScore: number | null }>(
      `SELECT AVG("score")::float AS "avgScore"
       FROM "Interview"
       WHERE "score" IS NOT NULL`,
    ),
    queryOne<{ avgStressLevel: number | null; avgMood: number | null; avgEnergyLevel: number | null }>(
      `SELECT
         AVG("stressLevel")::float AS "avgStressLevel",
         AVG("mood")::float AS "avgMood",
         AVG("energyLevel")::float AS "avgEnergyLevel"
       FROM "Wellness"
       WHERE "date" >= $1`,
      [weekAgo],
    ),
    query(
      `SELECT "stressLevel", "mood", "energyLevel", "date"
       FROM "Wellness"
       WHERE "date" >= $1
       ORDER BY "date" DESC
       LIMIT 100`,
      [weekAgo],
    ),
    query(
      `SELECT "firstName", "lastName", "email", "role", "createdAt"
       FROM "User"
       ORDER BY "createdAt" DESC
       LIMIT 10`,
    ),
  ]);

  res.json({
    totalUsers,
    activeUsers,
    dailyLogins,
    challengesCompleted,
    projectApplications,
    avgInterviewScore: avgInterviewScore?.avgScore || 0,
    avgStressLevel: wellnessStats?.avgStressLevel || 0,
    avgMood: wellnessStats?.avgMood || 0,
    avgEnergy: wellnessStats?.avgEnergyLevel || 0,
    wellnessTrend: wellnessTrend.reverse(),
    recentUsers,
  });
});

export default router;

async function countTable(tableSql: string, whereSql: string, params: readonly unknown[]): Promise<number> {
  const row = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int AS "count" FROM ${tableSql} ${whereSql}`,
    params,
  );
  return row?.count || 0;
}
