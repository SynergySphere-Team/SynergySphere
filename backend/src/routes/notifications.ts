import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { paramId } from '../lib/params.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(notifications);
});

router.patch('/:id/read', async (req: AuthRequest, res) => {
  await prisma.notification.updateMany({
    where: { id: paramId(req), userId: req.user!.userId },
    data: { read: true },
  });
  res.json({ success: true });
});

router.patch('/read-all', async (req: AuthRequest, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId, read: false },
    data: { read: true },
  });
  res.json({ success: true });
});

export default router;
