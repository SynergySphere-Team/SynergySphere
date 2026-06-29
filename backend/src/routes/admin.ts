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
    dailyLogins,
    challengesCompleted,
    projectApplications,
    avgInterviewScore,
    wellnessStats,
    wellnessTrend,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { updatedAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { updatedAt: { gte: dayAgo } } }),
    prisma.challengeAttempt.count({ where: { passed: true } }),
    prisma.projectApplication.count(),
    prisma.interview.aggregate({ _avg: { score: true }, where: { score: { not: null } } }),
    prisma.wellness.aggregate({
      _avg: { stressLevel: true, mood: true, energyLevel: true },
      where: { date: { gte: weekAgo } },
    }),
    prisma.wellness.findMany({
      where: { date: { gte: weekAgo } },
      select: { stressLevel: true, mood: true, energyLevel: true, date: true },
      orderBy: { date: 'desc' },
      take: 100,
    }),
    prisma.user.findMany({
      select: { firstName: true, lastName: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  res.json({
    totalUsers,
    activeUsers,
    dailyLogins,
    challengesCompleted,
    projectApplications,
    avgInterviewScore: avgInterviewScore._avg.score || 0,
    avgStressLevel: wellnessStats._avg.stressLevel || 0,
    avgMood: wellnessStats._avg.mood || 0,
    avgEnergy: wellnessStats._avg.energyLevel || 0,
    wellnessTrend: wellnessTrend.reverse(),
    recentUsers,
  });
});

export default router;
