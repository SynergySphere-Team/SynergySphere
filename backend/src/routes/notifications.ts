import { Router } from 'express';
import { execute, query } from '../lib/db.js';
import { paramId } from '../lib/params.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

type NotificationRow = {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  type: string | null;
  link: string | null;
  createdAt: string;
};

router.get('/', async (req: AuthRequest, res) => {
  const take = Math.min(
    Math.max(Number(req.query.take) || 50, 1),
    100,
  );

  const notifications = await query<NotificationRow>(
    `SELECT
       "id",
       "userId",
       "title",
       "message",
       COALESCE("read", FALSE) AS "read",
       "type",
       "link",
       "createdAt"
     FROM "Notification"
     WHERE "userId" = $1
     ORDER BY "createdAt" DESC
     LIMIT $2`,
    [req.user!.userId, take],
  );

  res.json(notifications);
});

router.get('/unread-count', async (req: AuthRequest, res) => {
  const rows = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS "count"
     FROM "Notification"
     WHERE "userId" = $1
       AND COALESCE("read", FALSE) = FALSE`,
    [req.user!.userId],
  );

  res.json({
    count: rows[0]?.count ?? 0,
  });
});

router.patch('/read-all', async (req: AuthRequest, res) => {
  await execute(
    `UPDATE "Notification"
     SET "read" = TRUE
     WHERE "userId" = $1
       AND COALESCE("read", FALSE) = FALSE`,
    [req.user!.userId],
  );

  res.json({ success: true });
});

router.patch('/:id/read', async (req: AuthRequest, res) => {
  await execute(
    `UPDATE "Notification"
     SET "read" = TRUE
     WHERE "id" = $1
       AND "userId" = $2`,
    [paramId(req), req.user!.userId],
  );

  res.json({ success: true });
});

export default router;
