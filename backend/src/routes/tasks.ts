import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { paramId } from '../lib/params.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { awardXp } from '../services/gamification.js';

const router = Router();
router.use(authenticate);

const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  learnedNote: z.string().max(2000).optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

const focusSchema = z.object({
  durationMinutes: z.number().int().min(1).max(180),
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

router.get('/productivity-stats', async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    tasksCompletedToday,
    totalTasksCompleted,
    focusSessionsToday,
    focusMinutesToday,
    learnedTasks,
    latestWellness,
    tasksByStatus,
  ] = await Promise.all([
    prisma.task.count({
      where: { userId, status: 'DONE', updatedAt: { gte: startOfDay } },
    }),
    prisma.task.count({ where: { userId, status: 'DONE' } }),
    prisma.focusSession.count({ where: { userId, completedAt: { gte: startOfDay } } }),
    prisma.focusSession.aggregate({
      where: { userId, completedAt: { gte: startOfDay } },
      _sum: { durationMinutes: true },
    }),
    prisma.task.findMany({
      where: { userId, status: 'DONE' },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: { id: true, title: true, learnedNote: true, updatedAt: true },
    }),
    prisma.wellness.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
    }),
    prisma.task.groupBy({
      by: ['status'],
      where: { userId },
      _count: { status: true },
    }),
  ]);

  const statusCounts = Object.fromEntries(
    tasksByStatus.map((row) => [row.status, row._count.status]),
  );

  const wellnessScore = latestWellness
    ? Math.round(((10 - latestWellness.stressLevel) + latestWellness.mood + latestWellness.energyLevel) / 3 * 10)
    : null;

  res.json({
    tasksCompletedToday,
    totalTasksCompleted,
    focusSessionsToday,
    focusMinutesToday: focusMinutesToday._sum.durationMinutes || 0,
    focusHoursToday: ((focusMinutesToday._sum.durationMinutes || 0) / 60).toFixed(1),
    learnedTasks,
    wellnessScore,
    statusCounts,
  });
});

router.post('/focus-session', validateBody(focusSchema), async (req: AuthRequest, res) => {
  const session = await prisma.focusSession.create({
    data: {
      userId: req.user!.userId,
      durationMinutes: req.body.durationMinutes,
    },
  });

  if (req.body.durationMinutes >= 25) {
    await awardXp(req.user!.userId, 15, 'Completed a focus session');
  }

  res.status(201).json(session);
});

router.post('/', validateBody(taskSchema), async (req: AuthRequest, res) => {
  const { title, description, learnedNote, status, dueDate } = req.body;
  const task = await prisma.task.create({
    data: {
      userId: req.user!.userId,
      title,
      description,
      learnedNote,
      status: status || 'TODO',
      dueDate: dueDate ? new Date(dueDate) : undefined,
    },
  });
  res.status(201).json(task);
});

router.patch('/:id', validateBody(taskSchema.partial()), async (req: AuthRequest, res) => {
  const existing = await prisma.task.findFirst({
    where: { id: paramId(req), userId: req.user!.userId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const task = await prisma.task.update({
    where: { id: existing.id },
    data: {
      ...req.body,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : req.body.dueDate,
    },
  });

  if (existing.status !== 'DONE' && task.status === 'DONE') {
    await awardXp(req.user!.userId, 10, 'Completed task: ' + task.title);
  }

  res.json(task);
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
