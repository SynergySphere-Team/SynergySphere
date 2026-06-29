import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { paramId } from '../lib/params.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { awardXp } from '../services/gamification.js';

const router = Router();
router.use(authenticate);

const portfolioSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  projectLink: z.string().url().optional().or(z.literal('')),
  githubLink: z.string().url().optional().or(z.literal('')),
});

router.get('/', async (req: AuthRequest, res) => {
  const take = Math.min(Number(req.query.take) || 100, 200);
  const items = await prisma.portfolio.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
    take,
  });
  res.json(items);
});

router.post('/', validateBody(portfolioSchema), async (req: AuthRequest, res) => {
  const item = await prisma.portfolio.create({
    data: { userId: req.user!.userId, ...req.body },
  });
  await awardXp(req.user!.userId, 25, 'Portfolio item added');
  res.status(201).json(item);
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const result = await prisma.portfolio.deleteMany({
    where: { id: paramId(req), userId: req.user!.userId },
  });
  if (result.count === 0) {
    res.status(404).json({ error: 'Portfolio item not found' });
    return;
  }
  res.status(204).send();
});

export default router;
