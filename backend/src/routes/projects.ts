import { Router } from 'express';
import { z } from 'zod';
import { isUniqueViolation, newId, nullable, query, queryOne } from '../lib/db.js';
import { paramId } from '../lib/params.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { awardXp } from '../services/gamification.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  const take = Math.min(Number(req.query.take) || 50, 100);
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  const where: string[] = ['p."isActive" = true'];
  const values: unknown[] = [];

  if (category && category !== 'ALL') {
    values.push(category);
    where.push(`p."category" = $${values.length}`);
  }

  if (search) {
    values.push('%' + search + '%');
    where.push(
      `(p."title" ILIKE $${values.length} OR p."description" ILIKE $${values.length} OR p."organization" ILIKE $${values.length})`,
    );
  }

  values.push(take);
  const projects = await query<{
    id: string;
    _count: { applications: number };
  }>(
    `SELECT
       p."id",
       p."title",
       p."category",
       p."location",
       p."organization",
       p."description",
       p."requirements",
       p."xpReward",
       p."isActive",
       p."createdAt",
       json_build_object('applications', COUNT(pa."id")::int) AS "_count"
     FROM "Project" p
     LEFT JOIN "ProjectApplication" pa ON pa."projectId" = p."id"
     WHERE ${where.join(' AND ')}
     GROUP BY p."id"
     ORDER BY p."createdAt" DESC
     LIMIT $${values.length}`,
    values,
  );

  const userApplications = await query<{ projectId: string; status: string }>(
    `SELECT "projectId", "status"
     FROM "ProjectApplication"
     WHERE "userId" = $1`,
    [req.user!.userId],
  );
  const appliedMap = new Map(userApplications.map((a) => [a.projectId, a.status]));

  res.json(
    projects.map((project) => ({
      ...project,
      hasApplied: appliedMap.has(project.id),
      applicationStatus: appliedMap.get(project.id) || null,
    })),
  );
});

router.get('/my-applications', authenticate, async (req: AuthRequest, res) => {
  const applications = await query<{
    status: string;
    project: { xpReward: number } | null;
  }>(
    `SELECT
       pa.*,
       CASE
         WHEN p."id" IS NULL THEN NULL
         ELSE json_build_object(
           'id', p."id",
           'title', p."title",
           'xpReward', p."xpReward",
           'category', p."category",
           'organization', p."organization"
         )
       END AS "project"
     FROM "ProjectApplication" pa
     LEFT JOIN "Project" p ON p."id" = pa."projectId"
     WHERE pa."userId" = $1
     ORDER BY pa."createdAt" DESC`,
    [req.user!.userId],
  );

  const totalXpEarned = applications
    .filter((a) => a.status === 'COMPLETED')
    .reduce((sum, a) => sum + (a.project?.xpReward || 0), 0);

  res.json({
    applications,
    stats: {
      projectsJoined: applications.length,
      hoursContributed: applications.length * 4,
      xpEarned: totalXpEarned,
    },
  });
});

router.get('/:id', authenticate, async (req, res) => {
  const project = await queryOne(
    `SELECT *
     FROM "Project"
     WHERE "id" = $1`,
    [paramId(req)],
  );
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  const applications = await query(
    `SELECT "id", "status", "userId", "createdAt"
     FROM "ProjectApplication"
     WHERE "projectId" = $1
     ORDER BY "createdAt" DESC
     LIMIT 100`,
    [paramId(req)],
  );
  res.json({ ...project, applications });
});

const applySchema = z.object({
  deliverable: z.string().max(4000).optional(),
});

router.post('/:id/apply', authenticate, validateBody(applySchema), async (req: AuthRequest, res) => {
  try {
    const project = await queryOne<{ id: string; title: string; xpReward: number }>(
      `SELECT "id", "title", "xpReward"
       FROM "Project"
       WHERE "id" = $1 AND "isActive" = true`,
      [paramId(req)],
    );
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const existing = await queryOne(
      `SELECT *
       FROM "ProjectApplication"
       WHERE "projectId" = $1 AND "userId" = $2`,
      [project.id, req.user!.userId],
    );
    if (existing) {
      res.status(409).json({ error: 'Already applied to this project', application: existing });
      return;
    }

    const application = await queryOne(
      `INSERT INTO "ProjectApplication" ("id", "projectId", "userId", "deliverable")
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [newId(), project.id, req.user!.userId, nullable(req.body.deliverable)],
    );

    await awardXp(req.user!.userId, Math.min(project.xpReward, 50), 'Joined community project: ' + project.title);

    res.status(201).json(application);
  } catch (error) {
    if (!isUniqueViolation(error)) console.error('Project application error:', error);
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
    const project = await queryOne(
      `INSERT INTO "Project" (
         "id", "title", "category", "location", "organization", "description", "requirements", "xpReward"
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        newId(),
        req.body.title,
        req.body.category,
        nullable(req.body.location),
        req.body.organization,
        req.body.description,
        nullable(req.body.requirements),
        req.body.xpReward ?? 200,
      ],
    );
    res.status(201).json(project);
  } catch (error) {
    if (!isUniqueViolation(error)) console.error('Project create error:', error);
    res.status(409).json({ error: 'A project with this title already exists' });
  }
});

export default router;
