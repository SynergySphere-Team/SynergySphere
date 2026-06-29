import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { paramId } from '../lib/params.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const projectSelect = {
  id: true,
  title: true,
  category: true,
  location: true,
  organization: true,
  description: true,
  requirements: true,
  xpReward: true,
  isActive: true,
  createdAt: true,
  _count: { select: { applications: true } },
} as const;

router.get('/', authenticate, async (req, res) => {
  const take = Math.min(Number(req.query.take) || 50, 100);
  const projects = await prisma.project.findMany({
    where: { isActive: true },
    select: projectSelect,
    orderBy: { createdAt: 'desc' },
    take,
  });
  res.json(projects);
});

router.get('/:id', authenticate, async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: paramId(req) },
    include: {
      applications: {
        select: { id: true, status: true, userId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      },
    },
  });
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(project);
});

const applySchema = z.object({
  deliverable: z.string().max(4000).optional(),
});

router.post('/:id/apply', authenticate, validateBody(applySchema), async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findFirst({ where: { id: paramId(req), isActive: true }, select: { id: true } });
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    const application = await prisma.projectApplication.create({
      data: {
        projectId: project.id,
        userId: req.user!.userId,
        deliverable: req.body.deliverable,
      },
    });
    res.status(201).json(application);
  } catch {
    res.status(409).json({ error: 'Already applied to this project' });
  }
});

const projectSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.enum(['RECYCLING', 'ECO_TOURISM', 'GREEN_INFRASTRUCTURE', 'SUSTAINABILITY', 'OTHER']),
  location: z.string().max(200).optional(),
  organization: z.string().min(1).max(200),
  description: z.string().min(1).max(4000),
  requirements: z.string().max(2000).optional(),
  xpReward: z.number().int().min(0).max(10000).optional(),
});

router.post('/', authenticate, validateBody(projectSchema), async (req: AuthRequest, res) => {
  if (req.user!.role !== 'ORGANIZATION' && req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: 'Only organizations can create projects' });
    return;
  }
  try {
    const project = await prisma.project.create({ data: req.body });
    res.status(201).json(project);
  } catch {
    res.status(409).json({ error: 'A project with this title already exists' });
  }
});

export default router;
