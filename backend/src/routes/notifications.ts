import { Router } from 'express';
import { execute, query } from '../lib/db.js';
import { paramId } from '../lib/params.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res) => {
  const notifications = await query(
    `SELECT *
     FROM "Notification"
     WHERE "userId" = $1
     ORDER BY "createdAt" DESC
     LIMIT 50`,
    [req.user!.userId],
  );
  res.json(notifications);
});

router.patch('/:id/read', async (req: AuthRequest, res) => {
  await execute(
    `UPDATE "Notification"
     SET "read" = true
     WHERE "id" = $1 AND "userId" = $2`,
    [paramId(req), req.user!.userId],
  );
  res.json({ success: true });
});

router.patch('/read-all', async (req: AuthRequest, res) => {
  await execute(
    `UPDATE "Notification"
     SET "read" = true
     WHERE "userId" = $1 AND "read" = false`,
    [req.user!.userId],
  );
  res.json({ success: true });
});

export default router;
