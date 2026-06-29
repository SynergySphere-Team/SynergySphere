import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { paramId } from '../lib/params.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

router.get('/', async (req: AuthRequest, res) => {
  const take = Math.min(Number(req.query.take) || 100, 200);
  const tasks = await prisma.task.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
    take,
  });
  res.json(tasks);
});

router.post('/', validateBody(taskSchema), async (req: AuthRequest, res) => {
  const { title, description, status, dueDate } = req.body;
  const task = await prisma.task.create({
    data: {
      userId: req.user!.userId,
      title,
      description,
      status: status || 'TODO',
      dueDate: dueDate ? new Date(dueDate) : undefined,
    },
  });
  res.status(201).json(task);
});

router.patch('/:id', validateBody(taskSchema.partial()), async (req: AuthRequest, res) => {
  const task = await prisma.task.updateMany({
    where: { id: paramId(req), userId: req.user!.userId },
    data: {
      ...req.body,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : req.body.dueDate,
    },
  });
  if (task.count === 0) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  const updated = await prisma.task.findFirst({ where: { id: paramId(req), userId: req.user!.userId } });
  res.json(updated);
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const result = await prisma.task.deleteMany({
    where: { id: paramId(req), userId: req.user!.userId },
  });
  if (result.count === 0) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.status(204).send();
});

export default router;
