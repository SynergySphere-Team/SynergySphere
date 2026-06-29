import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (_req, res) => {
  const leaders = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      xp: true,
      level: true,
      profilePicture: true,
      _count: {
        select: {
          challengeAttempts: { where: { passed: true } },
          userBadges: true,
        },
      },
    },
    orderBy: { xp: 'desc' },
    take: 20,
  });
  res.json(leaders);
});

export default router;
