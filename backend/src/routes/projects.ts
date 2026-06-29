import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { paramId } from '../lib/params.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.get('/', authenticate, async (_req, res) => {
  const projects = await prisma.project.findMany({
    where: { isActive: true },
    include: { _count: { select: { applications: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(projects);
});

router.get('/:id', authenticate, async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: paramId(req) },
    include: { applications: { select: { id: true, status: true, userId: true } } },
  });
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(project);
});

const applySchema = z.object({
  deliverable: z.string().optional(),
});

router.post('/:id/apply', authenticate, validateBody(applySchema), async (req: AuthRequest, res) => {
  try {
    const application = await prisma.projectApplication.create({
      data: {
        projectId: paramId(req),
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
  title: z.string().min(1),
  category: z.enum(['RECYCLING', 'ECO_TOURISM', 'GREEN_INFRASTRUCTURE', 'SUSTAINABILITY', 'OTHER']),
  location: z.string().optional(),
  organization: z.string().min(1),
  description: z.string().min(1),
  requirements: z.string().optional(),
  xpReward: z.number().optional(),
});

router.post('/', authenticate, validateBody(projectSchema), async (req: AuthRequest, res) => {
  if (req.user!.role !== 'ORGANIZATION' && req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: 'Only organizations can create projects' });
    return;
  }
  const project = await prisma.project.create({ data: req.body });
  res.status(201).json(project);
});

export default router;
