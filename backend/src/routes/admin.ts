import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
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
    challengesCompleted,
    projectApplications,
    avgInterviewScore,
    wellnessEntries,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { updatedAt: { gte: weekAgo } } }),
    prisma.challengeAttempt.count({ where: { passed: true } }),
    prisma.projectApplication.count(),
    prisma.interview.aggregate({ _avg: { score: true }, where: { score: { not: null } } }),
    prisma.wellness.findMany({
      where: { date: { gte: weekAgo } },
      select: { stressLevel: true, mood: true, energyLevel: true, date: true },
    }),
    prisma.user.findMany({
      select: { firstName: true, lastName: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const avgStress =
    wellnessEntries.length > 0
      ? wellnessEntries.reduce((s, e) => s + e.stressLevel, 0) / wellnessEntries.length
      : 0;

  res.json({
    totalUsers,
    activeUsers,
    dailyLogins: await prisma.user.count({ where: { updatedAt: { gte: dayAgo } } }),
    challengesCompleted,
    projectApplications,
    avgInterviewScore: avgInterviewScore._avg.score || 0,
    avgStressLevel: avgStress,
    wellnessTrend: wellnessEntries,
    recentUsers,
  });
});

export default router;
