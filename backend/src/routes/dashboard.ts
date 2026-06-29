import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
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
      prisma.task.count({ where: { userId, status: 'DONE' } }),
      prisma.challengeAttempt.count({ where: { userId, passed: true } }),
      prisma.wellness.count({ where: { userId } }),
      prisma.interview.count({ where: { userId } }),
      prisma.projectApplication.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, read: false } }),
      prisma.wellness.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 7,
      }),
    ]);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true, firstName: true, lastName: true },
    });

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
