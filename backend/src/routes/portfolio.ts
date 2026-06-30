import { Router } from 'express';
import { z } from 'zod';
import { execute, newId, nullable, query, queryOne } from '../lib/db.js';
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
  const items = await query(
    `SELECT *
     FROM "Portfolio"
     WHERE "userId" = $1
     ORDER BY "createdAt" DESC
     LIMIT $2`,
    [req.user!.userId, take],
  );
  res.json(items);
});

router.post('/', validateBody(portfolioSchema), async (req: AuthRequest, res) => {
  const item = await queryOne(
    `INSERT INTO "Portfolio" ("id", "userId", "title", "description", "projectLink", "githubLink")
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      newId(),
      req.user!.userId,
      req.body.title,
      nullable(req.body.description),
      nullable(req.body.projectLink),
      nullable(req.body.githubLink),
    ],
  );
  await awardXp(req.user!.userId, 25, 'Portfolio item added');
  res.status(201).json(item);
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const deleted = await execute(
    `DELETE FROM "Portfolio"
     WHERE "id" = $1 AND "userId" = $2`,
    [paramId(req), req.user!.userId],
  );
  if (deleted === 0) {
    res.status(404).json({ error: 'Portfolio item not found' });
    return;
  }
  res.status(204).send();
});

export default router;
