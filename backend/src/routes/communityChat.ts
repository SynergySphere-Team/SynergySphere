import { Router } from 'express';
import { z } from 'zod';
import { newId, query, queryOne, nullable } from '../lib/db.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();


router.get('/channels', authenticate, async (_req, res) => {
  const channels = await query(
    `SELECT c.*, 
       (SELECT COUNT(*) FROM "CommunityMessage" m WHERE m."channelId" = c."id") AS "messageCount",
       (SELECT COUNT(*) FROM "CommunityPost" p WHERE p."channelId" = c."id") AS "postCount"
     FROM "CommunityChannel" c ORDER BY c."createdAt" ASC`,
  );
  res.json(channels);
});


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
  const channel = await queryOne<{ id: string; name: string }>(
    `SELECT "id", "name" FROM "CommunityChannel" WHERE "id" = $1`,
    [channelId],
  );
  if (!channel) { res.status(404).json({ error: 'Channel not found'}); return; }

  const repliedTo = req.body.replyToId
    ? await queryOne<{ userId: string }>(
        `SELECT "userId" FROM "CommunityMessage" WHERE "id" = $1 AND "channelId" = $2`,
        [req.body.replyToId, channelId],
      )
    : null;

  const message = await queryOne(
    `WITH ins AS (
       INSERT INTO "CommunityMessage" ("id", "channelId", "userId","body", "replyToId")
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

  if (repliedTo && repliedTo.userId !== req.user!.userId) {
    const actor = await queryOne<{ firstName: string; lastName: string }>(
      `SELECT "firstName", "lastName" FROM "User" WHERE "id" = $1`,
      [req.user!.userId],
    );

    const actorName =
      [actor?.firstName, actor?.lastName].filter(Boolean).join(' ') ||
      'Someone';

    await queryOne(
      `INSERT INTO "Notification" (
         "id",
         "userId",
         "title",
         "message",
         "type",
         "link"
       )
       VALUES ($1, $2, $3, $4, 'reply', '/community')
       RETURNING "id"`,
      [
        newId(),
        repliedTo.userId,
        'New Community reply',
        `${actorName} replied to your message in #${channel.name}.`,
      ],
    );
  }

  res.status(201).json(message);
});

// â”€â”€â”€ Q&A Posts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  if (!channel) { res.status(404).json({ error: 'Channel not found'}); return; }

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

// â”€â”€â”€ Post Detail + Replies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.get('/posts/:postId', authenticate, async (req: AuthRequest,res) => {
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

// ─── Mobile Community Feed ────────────────────────────────────────────────

const feedPostSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  linkUrl: z
    .string()
    .trim()
    .url()
    .refine(
      (value) => value.startsWith('http://') || value.startsWith('https://'),
      'Link must use http or https.',
    )
    .optional(),
  projectId: z.string().trim().min(1).optional(),
  postType: z.enum(['POST', 'QUESTION', 'PROJECT']).optional().default('POST'),
});

const feedCommentSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

router.get('/feed', authenticate, async (req: AuthRequest, res) => {
  const take = Math.min(Math.max(Number(req.query.take) || 40, 1), 75);

  const posts = await query(
    `SELECT
       fp."id",
       fp."userId",
       fp."body",
       fp."linkUrl",
       fp."projectId",
       fp."postType",
       fp."createdAt",
       fp."updatedAt",
       u."firstName",
       u."lastName",
       u."role",
       u."profilePicture",
       (SELECT COUNT(*)::int
          FROM "CommunityFeedLike" fl
         WHERE fl."postId" = fp."id") AS "likeCount",
       (SELECT COUNT(*)::int
          FROM "CommunityFeedComment" fc
         WHERE fc."postId" = fp."id") AS "commentCount",
       EXISTS (
         SELECT 1
           FROM "CommunityFeedLike" mine
          WHERE mine."postId" = fp."id"
            AND mine."userId" = $1
       ) AS "likedByMe",
       CASE
         WHEN p."id" IS NULL THEN NULL
         ELSE json_build_object(
           'id', p."id",
           'title', p."title",
           'organization', p."organization",
           'category', p."category",
           'description', p."description",
           'techStack', p."techStack",
           'xpReward', p."xpReward",
           'imageUrl', p."imageUrl",
           'projectUrl', p."projectUrl",
           'githubUrl', p."githubUrl"
         )
       END AS "project"
     FROM "CommunityFeedPost" fp
     JOIN "User" u ON u."id" = fp."userId"
     LEFT JOIN "Project" p ON p."id" = fp."projectId"
     ORDER BY fp."createdAt" DESC
     LIMIT $2`,
    [req.user!.userId, take],
  );

  res.json(posts);
});

router.post(
  '/feed',
  authenticate,
  validateBody(feedPostSchema),
  async (req: AuthRequest, res) => {
    if (req.body.projectId) {
      const project = await queryOne(
        `SELECT "id"
           FROM "Project"
          WHERE "id" = $1
            AND "isActive" = TRUE`,
        [req.body.projectId],
      );

      if (!project) {
        res.status(404).json({ error: 'Project not found.' });
        return;
      }
    }

    const post = await queryOne(
      `WITH ins AS (
         INSERT INTO "CommunityFeedPost" (
           "id",
           "userId",
           "body",
           "linkUrl",
           "projectId",
           "postType"
         )
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *
       )
       SELECT
         ins."id",
         ins."userId",
         ins."body",
         ins."linkUrl",
         ins."projectId",
         ins."postType",
         ins."createdAt",
         ins."updatedAt",
         u."firstName",
         u."lastName",
         u."role",
         u."profilePicture",
         0::int AS "likeCount",
         0::int AS "commentCount",
         FALSE AS "likedByMe",
         CASE
           WHEN p."id" IS NULL THEN NULL
           ELSE json_build_object(
             'id', p."id",
             'title', p."title",
             'organization', p."organization",
             'category', p."category",
             'description', p."description",
             'techStack', p."techStack",
             'xpReward', p."xpReward",
             'imageUrl', p."imageUrl",
             'projectUrl', p."projectUrl",
             'githubUrl', p."githubUrl"
           )
         END AS "project"
       FROM ins
       JOIN "User" u ON u."id" = ins."userId"
       LEFT JOIN "Project" p ON p."id" = ins."projectId"`,
      [
        newId(),
        req.user!.userId,
        req.body.body,
        nullable(req.body.linkUrl),
        nullable(req.body.projectId),
        req.body.projectId ? 'PROJECT' : req.body.postType,
      ],
    );

    res.status(201).json(post);
  },
);

router.post('/feed/:postId/like', authenticate, async (req: AuthRequest, res) => {
  const { postId } = req.params;

  const post = await queryOne<{
    id: string;
    userId: string;
    body: string;
  }>(
    `SELECT "id", "userId", "body"
       FROM "CommunityFeedPost"
      WHERE "id" = $1`,
    [postId],
  );

  if (!post) {
    res.status(404).json({ error: 'Post not found.' });
    return;
  }

  const existing = await queryOne(
    `SELECT "postId"
       FROM "CommunityFeedLike"
      WHERE "postId" = $1
        AND "userId" = $2`,
    [postId, req.user!.userId],
  );

  let liked = false;

  if (existing) {
    await queryOne(
      `DELETE FROM "CommunityFeedLike"
        WHERE "postId" = $1
          AND "userId" = $2
        RETURNING "postId"`,
      [postId, req.user!.userId],
    );
  } else {
    await queryOne(
      `INSERT INTO "CommunityFeedLike" ("postId", "userId")
       VALUES ($1, $2)
       RETURNING "postId"`,
      [postId, req.user!.userId],
    );

    liked = true;

    if (post.userId !== req.user!.userId) {
      const actor = await queryOne<{
        firstName: string;
        lastName: string;
      }>(
        `SELECT "firstName", "lastName"
           FROM "User"
          WHERE "id" = $1`,
        [req.user!.userId],
      );

      const actorName =
        [actor?.firstName, actor?.lastName].filter(Boolean).join(' ') ||
        'Someone';

      await queryOne(
        `INSERT INTO "Notification" (
           "id",
           "userId",
           "title",
           "message",
           "type",
           "link"
         )
         VALUES ($1, $2, $3, $4, 'like', '/community')
         RETURNING "id"`,
        [
          newId(),
          post.userId,
          'Someone liked your post',
          `${actorName} liked your Community post.`,
        ],
      );
    }
  }

  const count = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int AS "count"
       FROM "CommunityFeedLike"
      WHERE "postId" = $1`,
    [postId],
  );

  res.json({
    liked,
    likeCount: count?.count ?? 0,
  });
});

router.get('/feed/:postId/comments', authenticate, async (req: AuthRequest, res) => {
  const { postId } = req.params;

  const comments = await query(
    `SELECT
       c."id",
       c."postId",
       c."userId",
       c."body",
       c."createdAt",
       u."firstName",
       u."lastName",
       u."role",
       u."profilePicture"
     FROM "CommunityFeedComment" c
     JOIN "User" u ON u."id" = c."userId"
     WHERE c."postId" = $1
     ORDER BY c."createdAt" ASC
     LIMIT 100`,
    [postId],
  );

  res.json(comments);
});

router.post(
  '/feed/:postId/comments',
  authenticate,
  validateBody(feedCommentSchema),
  async (req: AuthRequest, res) => {
    const { postId } = req.params;

    const post = await queryOne<{
      id: string;
      userId: string;
    }>(
      `SELECT "id", "userId"
         FROM "CommunityFeedPost"
        WHERE "id" = $1`,
      [postId],
    );

    if (!post) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }

    const comment = await queryOne(
      `WITH ins AS (
         INSERT INTO "CommunityFeedComment" (
           "id",
           "postId",
           "userId",
           "body"
         )
         VALUES ($1, $2, $3, $4)
         RETURNING *
       )
       SELECT
         ins."id",
         ins."postId",
         ins."userId",
         ins."body",
         ins."createdAt",
         u."firstName",
         u."lastName",
         u."role",
         u."profilePicture"
       FROM ins
       JOIN "User" u ON u."id" = ins."userId"`,
      [newId(), postId, req.user!.userId, req.body.body],
    );

    if (post.userId !== req.user!.userId) {
      const actor = await queryOne<{
        firstName: string;
        lastName: string;
      }>(
        `SELECT "firstName", "lastName"
           FROM "User"
          WHERE "id" = $1`,
        [req.user!.userId],
      );

      const actorName =
        [actor?.firstName, actor?.lastName].filter(Boolean).join(' ') ||
        'Someone';

      await queryOne(
        `INSERT INTO "Notification" (
           "id",
           "userId",
           "title",
           "message",
           "type",
           "link"
         )
         VALUES ($1, $2, $3, $4, 'comment', '/community')
         RETURNING "id"`,
        [
          newId(),
          post.userId,
          'New comment on your post',
          `${actorName} commented on your Community post.`,
        ],
      );
    }

    res.status(201).json(comment);
  },
);

export default router;