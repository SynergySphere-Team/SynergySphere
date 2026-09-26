import { Router } from 'express';
import { z } from 'zod';
import { newId, query, queryOne, nullable } from '../lib/db.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

// ─── Channels ────────────────────────────────────────────────────────────────

router.get('/channels', authenticate, async (_req, res) => {
  const channels = await query(
    `SELECT c.*, 
       (SELECT COUNT(*) FROM "CommunityMessage" m WHERE m."channelId" = c."id") AS "messageCount",
       (SELECT COUNT(*) FROM "CommunityPost" p WHERE p."channelId" = c."id") AS "postCount"
     FROM "CommunityChannel" c ORDER BY c."createdAt" ASC`,
  );
  res.json(channels);
});

// ─── Chat Messages ────────────────────────────────────────────────────────────

router.get('/channels/:channelId/messages', authenticate, async (req: AuthRequest, res) => {
  const { channelId } = req.params;
  const before = typeof req.query.before === 'string' ? req.query.before : undefined;

  const whereParts: string[] = ['m."channelId" = $1'];
  const values: unknown[] = [channelId];

  if (before) {
    values.push(before);
    whereParts.push(`m."createdAt" < $${values.length}`);
  }

  values.push(50);
  const messages = await query(
    `SELECT 
       m."id", m."body", m."createdAt", m."editedAt", m."replyToId",
       m."userId",
       u."firstName", u."lastName",
       reply."body" AS "replyToBody",
       ru."firstName" AS "replyToFirstName", ru."lastName" AS "replyToLastName"
     FROM "CommunityMessage" m
     JOIN "User" u ON u."id" = m."userId"
     LEFT JOIN "CommunityMessage" reply ON reply."id" = m."replyToId"
     LEFT JOIN "User" ru ON ru."id" = reply."userId"
     WHERE ${whereParts.join(' AND ')}
     ORDER BY m."createdAt" DESC
     LIMIT $${values.length}`,
    values,
  );
  res.json(messages.reverse());
});

const messageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  replyToId: z.string().optional(),
});

router.post('/channels/:channelId/messages', authenticate, validateBody(messageSchema), async (req: AuthRequest, res) => {
  const { channelId } = req.params;
  const channel = await queryOne(`SELECT "id" FROM "CommunityChannel" WHERE "id" = $1`, [channelId]);
  if (!channel) { res.status(404).json({ error: 'Channel not found' }); return; }

  const message = await queryOne(
    `WITH ins AS (
       INSERT INTO "CommunityMessage" ("id", "channelId", "userId", "body", "replyToId")
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *
     )
     SELECT
       ins."id", ins."body", ins."createdAt", ins."editedAt", ins."replyToId",
       ins."userId",
       u."firstName", u."lastName",
       reply."body" AS "replyToBody",
       ru."firstName" AS "replyToFirstName", ru."lastName" AS "replyToLastName"
     FROM ins
     JOIN "User" u ON u."id" = ins."userId"
     LEFT JOIN "CommunityMessage" reply ON reply."id" = ins."replyToId"
     LEFT JOIN "User" ru ON ru."id" = reply."userId"`,
    [newId(), channelId, req.user!.userId, req.body.body, nullable(req.body.replyToId)],
  );
  res.status(201).json(message);
});

// ─── Q&A Posts ───────────────────────────────────────────────────────────────

router.get('/channels/:channelId/posts', authenticate, async (req: AuthRequest, res) => {
  const { channelId } = req.params;
  const posts = await query(
    `SELECT
       p."id", p."title", p."body", p."tags", p."isSolved", p."createdAt", p."updatedAt",
       p."userId",
       u."firstName", u."lastName",
       (SELECT COUNT(*) FROM "CommunityReply" r WHERE r."postId" = p."id")::int AS "replyCount"
     FROM "CommunityPost" p
     JOIN "User" u ON u."id" = p."userId"
     WHERE p."channelId" = $1
     ORDER BY p."createdAt" DESC
     LIMIT 50`,
    [channelId],
  );
  res.json(posts);
});

const postSchema = z.object({
  title: z.string().trim().min(3).max(300),
  body: z.string().trim().min(1).max(8000),
  tags: z.string().max(200).optional(),
});

router.post('/channels/:channelId/posts', authenticate, validateBody(postSchema), async (req: AuthRequest, res) => {
  const { channelId } = req.params;
  const channel = await queryOne(`SELECT "id", "type" FROM "CommunityChannel" WHERE "id" = $1`, [channelId]);
  if (!channel) { res.status(404).json({ error: 'Channel not found' }); return; }

  const post = await queryOne(
    `WITH ins AS (
       INSERT INTO "CommunityPost" ("id", "channelId", "userId", "title", "body", "tags")
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *
     )
     SELECT ins.*, u."firstName", u."lastName", 0::int AS "replyCount"
     FROM ins JOIN "User" u ON u."id" = ins."userId"`,
    [newId(), channelId, req.user!.userId, req.body.title, req.body.body, nullable(req.body.tags)],
  );
  res.status(201).json(post);
});

// ─── Post Detail + Replies ────────────────────────────────────────────────────

router.get('/posts/:postId', authenticate, async (req: AuthRequest, res) => {
  const { postId } = req.params;
  const post = await queryOne(
    `SELECT p.*, u."firstName", u."lastName"
     FROM "CommunityPost" p JOIN "User" u ON u."id" = p."userId"
     WHERE p."id" = $1`,
    [postId],
  );
  if (!post) { res.status(404).json({ error: 'Post not found' }); return; }

  const replies = await query(
    `SELECT
       r."id", r."body", r."isAccepted", r."createdAt", r."replyToId",
       r."userId",
       u."firstName", u."lastName",
       pr."body" AS "replyToBody",
       pru."firstName" AS "replyToFirstName", pru."lastName" AS "replyToLastName"
     FROM "CommunityReply" r
     JOIN "User" u ON u."id" = r."userId"
     LEFT JOIN "CommunityReply" pr ON pr."id" = r."replyToId"
     LEFT JOIN "User" pru ON pru."id" = pr."userId"
     WHERE r."postId" = $1
     ORDER BY r."isAccepted" DESC, r."createdAt" ASC`,
    [postId],
  );
  res.json({ ...post, replies });
});

const replySchema = z.object({
  body: z.string().trim().min(1).max(4000),
  replyToId: z.string().optional(),
});

router.post('/posts/:postId/replies', authenticate, validateBody(replySchema), async (req: AuthRequest, res) => {
  const { postId } = req.params;
  const post = await queryOne(`SELECT "id", "userId" FROM "CommunityPost" WHERE "id" = $1`, [postId]);
  if (!post) { res.status(404).json({ error: 'Post not found' }); return; }

  const reply = await queryOne(
    `WITH ins AS (
       INSERT INTO "CommunityReply" ("id", "postId", "userId", "body", "replyToId")
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *
     )
     SELECT ins.*, u."firstName", u."lastName",
       pr."body" AS "replyToBody",
       pru."firstName" AS "replyToFirstName", pru."lastName" AS "replyToLastName"
     FROM ins
     JOIN "User" u ON u."id" = ins."userId"
     LEFT JOIN "CommunityReply" pr ON pr."id" = ins."replyToId"
     LEFT JOIN "User" pru ON pru."id" = pr."userId"`,
    [newId(), postId, req.user!.userId, req.body.body, nullable(req.body.replyToId)],
  );
  res.status(201).json(reply);
});

// Accept a reply as the accepted answer (post owner or admin only)
router.patch('/posts/:postId/replies/:replyId/accept', authenticate, async (req: AuthRequest, res) => {
  const { postId, replyId } = req.params;
  const post = await queryOne<{ id: string; userId: string }>(`SELECT "id", "userId" FROM "CommunityPost" WHERE "id" = $1`, [postId]);
  if (!post) { res.status(404).json({ error: 'Post not found' }); return; }
  if (req.user!.role !== 'ADMIN' && post.userId !== req.user!.userId) {
    res.status(403).json({ error: 'Only the post author can accept an answer.' }); return;
  }
  // Unaccept all, then accept this one
  await queryOne(`UPDATE "CommunityReply" SET "isAccepted" = FALSE WHERE "postId" = $1`, [postId]);
  const updated = await queryOne(
    `UPDATE "CommunityReply" SET "isAccepted" = TRUE WHERE "id" = $1 AND "postId" = $2 RETURNING *`,
    [replyId, postId],
  );
  if (!updated) { res.status(404).json({ error: 'Reply not found' }); return; }
  await queryOne(`UPDATE "CommunityPost" SET "isSolved" = TRUE, "updatedAt" = NOW() WHERE "id" = $1`, [postId]);
  res.json(updated);
});

export default router;
