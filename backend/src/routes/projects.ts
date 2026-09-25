import { Router } from 'express';
import { z } from 'zod';
import { isUniqueViolation, newId, nullable, query, queryOne } from '../lib/db.js';
import { paramId } from '../lib/params.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { awardXp } from '../services/gamification.js';
import { accessTokenForUser, githubConnection, githubRequest, GithubError } from '../services/github.js';

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
    creatorId: string | null;
    githubVisibility: string | null;
    lastActivityAt: Date | null;
    lastActivityMessage: string | null;
    lastActivityActor: string | null;
    _count: { applications: number };
  }>(
    `SELECT
       p."id",
       p."creatorId",
       p."title",
       p."category",
       p."location",
       p."organization",
       p."description",
       p."requirements",
       p."xpReward",
       p."githubOwner",
       p."githubRepo",
       p."githubFullName",
       p."githubUrl",
       p."githubVisibility",
       p."primaryLanguage",
       p."githubStars",
       p."githubForks",
       p."contributorAvatars",
       p."isGithubBacked",
       p."lastActivityAt",
       p."lastActivityMessage",
       p."lastActivityActor",
       p."isActive",
       p."techStack",
       p."teamCapacity",
       p."deliverableType",
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
    projects.map((project) => {
      const applicationStatus = appliedMap.get(project.id) || null;
      const isCreator = project.creatorId === req.user!.userId;
      const canViewActivity = project.githubVisibility !== 'private' || isCreator || applicationStatus === 'APPROVED';
      return {
        ...project,
        lastActivityAt: canViewActivity ? project.lastActivityAt : null,
        lastActivityMessage: canViewActivity ? project.lastActivityMessage : null,
        lastActivityActor: canViewActivity ? project.lastActivityActor : null,
        hasApplied: appliedMap.has(project.id),
        applicationStatus,
        isCreator,
      };
    }),
  );
});

async function canUseDiscussion(projectId: string, userId: string, role: string) {
  const project = await queryOne<{ id: string; creatorId: string | null }>(
    `SELECT "id", "creatorId" FROM "Project" WHERE "id" = $1`,
    [projectId],
  );
  if (!project) return { project: null, allowed: false };
  if (role === 'ADMIN' || project.creatorId === userId) return { project, allowed: true };
  const application = await queryOne(`SELECT "id" FROM "ProjectApplication" WHERE "projectId" = $1 AND "userId" = $2 AND "status" = 'APPROVED'`, [projectId, userId]);
  return { project, allowed: Boolean(application) };
}

router.get('/:id/messages', authenticate, async (req: AuthRequest, res) => {
  const projectId = paramId(req);
  const access = await canUseDiscussion(projectId, req.user!.userId, req.user!.role);
  if (!access.project) { res.status(404).json({ error: 'Project not found' }); return; }
  if (!access.allowed) { res.status(403).json({ error: 'Join this project before using its discussion.' }); return; }
  const messages = await query(
    `SELECT m."id", m."body", m."createdAt", m."userId", u."firstName", u."lastName", u."role"
     FROM "ProjectMessage" m JOIN "User" u ON u."id" = m."userId"
     WHERE m."projectId" = $1 ORDER BY m."createdAt" ASC LIMIT 200`,
    [projectId],
  );
  res.json(messages);
});

const messageSchema = z.object({ body: z.string().trim().min(1).max(2000) });
router.post('/:id/messages', authenticate, validateBody(messageSchema), async (req: AuthRequest, res) => {
  const projectId = paramId(req);
  const access = await canUseDiscussion(projectId, req.user!.userId, req.user!.role);
  if (!access.project) { res.status(404).json({ error: 'Project not found' }); return; }
  if (!access.allowed) { res.status(403).json({ error: 'Join this project before using its discussion.' }); return; }
  const message = await queryOne(
    `WITH inserted AS (
       INSERT INTO "ProjectMessage" ("id", "projectId", "userId", "body") VALUES ($1, $2, $3, $4) RETURNING *
     ) SELECT inserted."id", inserted."body", inserted."createdAt", inserted."userId", u."firstName", u."lastName", u."role"
     FROM inserted JOIN "User" u ON u."id" = inserted."userId"`,
    [newId(), projectId, req.user!.userId, req.body.body],
  );
  res.status(201).json(message);
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

router.get('/:id/applications', authenticate, async (req: AuthRequest, res) => {
  const projectId = paramId(req);
  const project = await queryOne<{ creatorId: string | null }>(`SELECT "creatorId" FROM "Project" WHERE "id" = $1`, [projectId]);
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
  if (req.user!.role !== 'ADMIN' && project.creatorId !== req.user!.userId) { res.status(403).json({ error: 'Only the project owner can review join requests.' }); return; }
  const applications = await query(
    `SELECT pa."id", pa."status", pa."createdAt", pa."message", pa."githubUsername", pa."invitationSentAt", pa."acceptedAt", u."id" AS "userId", u."firstName", u."lastName", u."email", u."profilePicture"
     FROM "ProjectApplication" pa JOIN "User" u ON u."id" = pa."userId"
     WHERE pa."projectId" = $1 ORDER BY CASE pa."status" WHEN 'PENDING' THEN 0 ELSE 1 END, pa."createdAt" DESC`,
    [projectId],
  );
  res.json(applications);
});

const reviewApplicationSchema = z.object({ status: z.enum(['APPROVED', 'DECLINED']) });
router.patch('/:id/applications/:applicationId', authenticate, validateBody(reviewApplicationSchema), async (req: AuthRequest, res) => {
  const projectId = paramId(req);
  const project = await queryOne<{ creatorId: string | null; title: string; xpReward: number; isGithubBacked: boolean; githubOwner: string | null; githubRepo: string | null }>(`SELECT "creatorId", "title", "xpReward", "isGithubBacked", "githubOwner", "githubRepo" FROM "Project" WHERE "id" = $1`, [projectId]);
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
  if (req.user!.role !== 'ADMIN' && project.creatorId !== req.user!.userId) { res.status(403).json({ error: 'Only the project owner can review join requests.' }); return; }
  if (project.isGithubBacked && req.body.status === 'APPROVED') {
    if (!project.githubOwner || !project.githubRepo || !project.creatorId) { res.status(409).json({ error: 'This GitHub repository is not configured correctly.' }); return; }
    const application = await queryOne<{ id: string; userId: string; githubUsername: string | null }>(
      `SELECT "id", "userId", "githubUsername" FROM "ProjectApplication" WHERE "id" = $1 AND "projectId" = $2 AND "status" = 'PENDING'`, [req.params.applicationId, projectId],
    );
    if (!application) { res.status(409).json({ error: 'This request has already been reviewed or does not exist.' }); return; }
    if (!application.githubUsername) { res.status(422).json({ error: 'The requester has not connected GitHub.' }); return; }
    try {
      const { token } = await accessTokenForUser(project.creatorId);
      const invitation = await githubRequest<{ id?: number }>(`/repos/${project.githubOwner}/${project.githubRepo}/collaborators/${encodeURIComponent(application.githubUsername)}`, token, { method: 'PUT', body: JSON.stringify({ permission: 'push' }) });
      const updated = await queryOne(
        `UPDATE "ProjectApplication" SET "status" = 'INVITATION_SENT', "invitationId" = $1, "invitationSentAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $2 RETURNING *`, [invitation?.id || null, application.id],
      );
      await queryOne(`INSERT INTO "Notification" ("id", "userId", "title", "message", "type") VALUES ($1, $2, $3, $4, 'community') RETURNING "id"`, [newId(), application.userId, 'GitHub invitation sent', `Accept the GitHub invitation to contribute to ${project.title}.`]);
      res.json(updated);
    } catch (error) {
      const message = error instanceof GithubError && error.status === 403
        ? 'GitHub does not permit direct collaborator invites for this repository. Use the fork-and-pull-request workflow.'
        : error instanceof Error ? error.message : 'Could not send the GitHub invitation.';
      res.status(502).json({ error: message });
    }
    return;
  }
  const application = await queryOne<{ id: string; userId: string; status: string }>(
    `UPDATE "ProjectApplication" SET "status" = $1, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = $2 AND "projectId" = $3 AND "status" = 'PENDING' RETURNING "id", "userId", "status"`,
    [req.body.status, req.params.applicationId, projectId],
  );
  if (!application) { res.status(409).json({ error: 'This request has already been reviewed or does not exist.' }); return; }
  if (application.status === 'APPROVED') await awardXp(application.userId, Math.min(project.xpReward, 50), 'Joined community project: ' + project.title);
  res.json(application);
});

const joinRequestSchema = z.object({ message: z.string().trim().max(2000).optional() });
router.post('/:id/join-requests', authenticate, validateBody(joinRequestSchema), async (req: AuthRequest, res) => {
  const project = await queryOne<{ id: string; title: string; isGithubBacked: boolean; isActive: boolean; creatorId: string | null }>(
    `SELECT "id", "title", "isGithubBacked", "isActive", "creatorId" FROM "Project" WHERE "id" = $1`, [paramId(req)],
  );
  if (!project || !project.isActive) { res.status(404).json({ error: 'Project not found.' }); return; }
  if (project.creatorId === req.user!.userId) { res.status(409).json({ error: 'You already own this project.' }); return; }
  let username: string | null = null;
  if (project.isGithubBacked) {
    const connection = await githubConnection(req.user!.userId);
    if (!connection || connection.revokedAt) { res.status(401).json({ error: 'Connect GitHub before requesting to join.', code: 'github_not_connected' }); return; }
    username = connection.githubUsername;
  }
  try {
    const application = await queryOne(
      `INSERT INTO "ProjectApplication" ("id", "projectId", "userId", "githubUsername", "message", "deliverable") VALUES ($1, $2, $3, $4, $5, $5) RETURNING *`,
      [newId(), project.id, req.user!.userId, username, nullable(req.body.message)],
    );
    res.status(201).json(application);
  } catch (error) {
    if (!isUniqueViolation(error)) console.error('Project join request error:', error);
    res.status(409).json({ error: 'You already requested to join this project.' });
  }
});

router.post('/:id/fork', authenticate, async (req: AuthRequest, res) => {
  try {
    const project = await githubProjectForRequest(paramId(req), req.user!.userId);
    const fork = await githubRequest<{ full_name: string; html_url: string }>(
      `/repos/${project.githubOwner}/${project.githubRepo}/forks`, project.token, { method: 'POST', body: JSON.stringify({ default_branch_only: true }) },
    );
    res.status(201).json({ fullName: fork.full_name, url: fork.html_url });
  } catch (error) {
    res.status(error instanceof GithubError ? error.status : 502).json({ error: error instanceof Error ? error.message : 'Could not fork this repository.' });
  }
});

async function githubProjectForRequest(projectId: string, userId: string) {
  const project = await queryOne<{ id: string; githubOwner: string | null; githubRepo: string | null; isGithubBacked: boolean }>(`SELECT "id", "githubOwner", "githubRepo", "isGithubBacked" FROM "Project" WHERE "id" = $1`, [projectId]);
  if (!project?.isGithubBacked || !project.githubOwner || !project.githubRepo) throw new GithubError('This is not a GitHub-backed project.', 404);
  const { token } = await accessTokenForUser(userId);
  return { ...project, token };
}

router.get('/:id/repository/:section(commits|issues|pulls|contributors|code)', authenticate, async (req: AuthRequest, res) => {
  try {
    const project = await githubProjectForRequest(paramId(req), req.user!.userId);
    const base = `/repos/${project.githubOwner}/${project.githubRepo}`;
    const section = req.params.section;
    const path = section === 'pulls' ? `${base}/pulls?state=open&per_page=50` : section === 'code' ? `${base}/contents` : `${base}/${section}?per_page=50`;
    res.json(await githubRequest(path, project.token));
  } catch (error) { res.status(error instanceof GithubError ? error.status : 502).json({ error: error instanceof Error ? error.message : 'Could not load repository data.' }); }
});

router.get('/:id/commits/:sha', authenticate, async (req: AuthRequest, res) => {
  try {
    const project = await githubProjectForRequest(paramId(req), req.user!.userId);
    res.json(await githubRequest(`/repos/${project.githubOwner}/${project.githubRepo}/commits/${encodeURIComponent(String(req.params.sha))}`, project.token));
  } catch (error) { res.status(error instanceof GithubError ? error.status : 502).json({ error: error instanceof Error ? error.message : 'Could not load commit.' }); }
});

router.get('/:id/activity', authenticate, async (req: AuthRequest, res) => {
  const project = await queryOne<{ creatorId: string | null; githubVisibility: string | null }>(`SELECT "creatorId", "githubVisibility" FROM "Project" WHERE "id" = $1`, [paramId(req)]);
  if (!project) { res.status(404).json({ error: 'Project not found.' }); return; }
  if (project.githubVisibility === 'private' && project.creatorId !== req.user!.userId) {
    const membership = await queryOne(`SELECT "id" FROM "ProjectApplication" WHERE "projectId" = $1 AND "userId" = $2 AND "status" = 'APPROVED'`, [paramId(req), req.user!.userId]);
    if (!membership) { res.status(403).json({ error: 'Join this private project before viewing its activity.' }); return; }
  }
  const events = await query(`SELECT * FROM "ActivityEvent" WHERE "projectId" = $1 ORDER BY "occurredAt" DESC LIMIT 100`, [paramId(req)]);
  res.json(events);
});

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  const project = await queryOne<{ creatorId: string | null; [key: string]: unknown }>(
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
  const currentApplication = await queryOne<{ status: string }>(
    `SELECT "status" FROM "ProjectApplication" WHERE "projectId" = $1 AND "userId" = $2`,
    [paramId(req), req.user!.userId],
  );
  res.json({ ...project, applications, isCreator: project.creatorId === req.user!.userId, hasApplied: Boolean(currentApplication), applicationStatus: currentApplication?.status || null });
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

    res.status(201).json(application);
  } catch (error) {
    if (!isUniqueViolation(error)) console.error('Project application error:', error);
    res.status(409).json({ error: 'Already applied to this project' });
  }
});

const projectSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.enum([
    'RECYCLING',
    'ECO_TOURISM',
    'GREEN_INFRASTRUCTURE',
    'SUSTAINABILITY',
    'OPEN_SOURCE',
    'GREEN_SOFTWARE',
    'CIVIC_TECH',
    'EDTECH',
    'OTHER',
  ]),
  location: z.string().max(200).optional(),
  organization: z.string().min(1).max(200),
  description: z.string().min(1).max(4000),
  requirements: z.string().max(2000).optional(),
  xpReward: z.number().int().min(0).max(10000).optional(),
  techStack: z.string().max(500).optional(),
  teamCapacity: z.number().int().min(1).max(100).optional().default(10),
  deliverableType: z.string().max(200).optional().default('Software Solution'),
});

router.post('/', authenticate, validateBody(projectSchema), async (req: AuthRequest, res) => {
  if (req.user!.role !== 'ORGANIZATION' && req.user!.role !== 'ADMIN' && req.user!.role !== 'STUDENT') {
    res.status(403).json({ error: 'You do not have permission to create projects' });
    return;
  }
  try {
    const isStudent = req.user!.role === 'STUDENT';
    const xpReward = isStudent
      ? (req.body.xpReward ? Math.min(Math.max(req.body.xpReward, 150), 300) : 200)
      : (req.body.xpReward ?? 200);

    const project = await queryOne(
      `INSERT INTO "Project" (
         "id", "creatorId", "title", "category", "location", "organization", "description",
         "requirements", "xpReward", "techStack", "teamCapacity", "deliverableType"
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        newId(),
        req.user!.userId,
        req.body.title,
        req.body.category,
        nullable(req.body.location),
        req.body.organization,
        req.body.description,
        nullable(req.body.requirements),
        xpReward,
        nullable(req.body.techStack),
        req.body.teamCapacity ?? 10,
        req.body.deliverableType || 'Software Solution',
      ],
    );

    if (isStudent) {
      await awardXp(req.user!.userId, 50, 'Created a community impact project');
    }

    res.status(201).json(project);
  } catch (error) {
    if (!isUniqueViolation(error)) console.error('Project create error:', error);
    res.status(409).json({ error: 'A project with this title already exists' });
  }
});

export default router;
