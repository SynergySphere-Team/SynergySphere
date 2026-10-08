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
  try {
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

    const normalizedSearch = search.replace(/_/g, ' ');

    values.push('%' + normalizedSearch + '%');

    where.push(
      `(
        p."title" ILIKE $${values.length}
        OR p."description" ILIKE $${values.length}
        OR p."organization" ILIKE $${values.length}
        OR COALESCE(p."location", '') ILIKE $${values.length}
        OR COALESCE(p."requirements", '') ILIKE $${values.length}
        OR COALESCE(p."techStack", '') ILIKE $${values.length}
        OR COALESCE(p."skillsNeeded", '') ILIKE $${values.length}
        OR COALESCE(p."deliverableType", '') ILIKE $${values.length}
        OR COALESCE(p."githubFullName", '') ILIKE $${values.length}
        OR REPLACE(p."category"::text, '_', ' ') ILIKE $${values.length}
      )`,
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

       p."skillsNeeded",

       p."durationWeeks",

       p."applicationDeadline",

       p."imageUrl",

       p."projectUrl",

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
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }

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

      await queryOne(
        `INSERT INTO "Notification" ("id", "userId", "title", "message", "type", "link")
         VALUES ($1, $2, $3, $4, 'community', $5)
         RETURNING "id"`,
        [
          newId(),
          application.userId,
          'GitHub invitation sent',
          `Accept the GitHub invitation to contribute to ${project.title}.`,
          `/community/${projectId}`,
        ],
      );

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

  if (application.status === 'APPROVED') {
    await awardXp(
      application.userId,
      Math.min(project.xpReward, 50),
      'Joined community project: ' + project.title,
    );
  }

  await queryOne(
    `INSERT INTO "Notification" (
       "id",
       "userId",
       "title",
       "message",
       "type",
       "link"
     )
     VALUES ($1, $2, $3, $4, 'community', $5)
     RETURNING "id"`,
    [
      newId(),
      application.userId,
      application.status === 'APPROVED'
        ? 'Project application approved'
        : 'Project application update',
      application.status === 'APPROVED'
        ? `Your application to ${project.title} was approved.`
        : `Your application to ${project.title} was declined.`,
      `/community/${projectId}`,
    ],
  );

  res.json(application);

});

const joinRequestSchema = z.object({ message: z.string().trim().max(2000).optional() });

router.post('/:id/join-requests', authenticate, validateBody(joinRequestSchema), async (req: AuthRequest, res) => {

  const project = await queryOne<{ id: string; title: string; isGithubBacked: boolean; isActive: boolean; creatorId: string | null; applicationDeadline: Date | string | null }>(

    `SELECT "id", "title", "isGithubBacked", "isActive", "creatorId", "applicationDeadline" FROM "Project" WHERE "id" = $1`, [paramId(req)],

  );

  if (!project || !project.isActive) { res.status(404).json({ error: 'Project not found.' }); return; }

  if (req.user!.role !== 'STUDENT') { res.status(403).json({ error: 'Only students can request to join community projects.' }); return; }

  if (project.creatorId === req.user!.userId) { res.status(409).json({ error: 'You already own this project.' }); return; }

  if (project.applicationDeadline && new Date(project.applicationDeadline).getTime() < Date.now()) {
    res.status(409).json({ error: 'Applications for this project have closed.' });
    return;
  }

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

    if (project.creatorId) {
      await queryOne(
        `INSERT INTO "Notification" (
           "id",
           "userId",
           "title",
           "message",
           "type",
           "link"
         )
         VALUES ($1, $2, $3, $4, 'community', $5)
         RETURNING "id"`,
        [
          newId(),
          project.creatorId,
          'New project application',
          `A student requested to join ${project.title}.`,
          `/community/requests/${project.id}`,
        ],
      );
    }

    res.status(201).json(application);

  } catch (error) {

    if (!isUniqueViolation(error)) console.error('Project join request error:', error);

    res.status(409).json({ error: 'You already requested to join this project.' });

  }

});


const linkGithubRepositorySchema = z.object({
  repositoryUrl: z.string().trim().url().max(2000),
});

type GithubRepositoryDetails = {
  name: string;
  full_name: string;
  node_id: string;
  html_url: string;
  private: boolean;
  visibility?: string;
  language?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  owner: {
    login: string;
  };
  license?: {
    spdx_id?: string | null;
    name?: string | null;
  } | null;
};

function parseGithubRepositoryUrl(value: string) {
  try {
    const url = new URL(value.trim());

    if (
      url.protocol !== 'https:' ||
      url.hostname.toLowerCase() !== 'github.com'
    ) {
      return null;
    }

    const parts = url.pathname
      .split('/')
      .filter(Boolean);

    if (parts.length !== 2) {
      return null;
    }

    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/i, '');

    if (!owner || !repo) {
      return null;
    }

    return { owner, repo };
  } catch {
    return null;
  }
}

router.patch(
  '/:id/github',
  authenticate,
  validateBody(linkGithubRepositorySchema),
  async (req: AuthRequest, res) => {
    const projectId = paramId(req);

    const project = await queryOne<{
      id: string;
      creatorId: string | null;
    }>(
      `SELECT "id", "creatorId"
       FROM "Project"
       WHERE "id" = $1`,
      [projectId],
    );

    if (!project) {
      res.status(404).json({
        error: 'Project not found',
      });
      return;
    }

    /*
     * GitHub linking is deliberately owner-only.
     *
     * Existing collaborator invitations use the project creator's
     * GitHub access token. Allowing a different admin account to link
     * a repository would make that later invitation flow inconsistent.
     */
    if (
      !project.creatorId ||
      project.creatorId !== req.user!.userId
    ) {
      res.status(403).json({
        error:
          'Only the project owner can link a GitHub repository.',
      });
      return;
    }

    const parsed =
      parseGithubRepositoryUrl(
        req.body.repositoryUrl,
      );

    if (!parsed) {
      res.status(400).json({
        error:
          'Enter a GitHub repository URL such as https://github.com/owner/repository.',
      });
      return;
    }

    try {
      const connection =
        await githubConnection(
          req.user!.userId,
        );

      if (
        !connection ||
        connection.revokedAt
      ) {
        res.status(401).json({
          error:
            'Connect GitHub before linking a repository.',
          code: 'github_not_connected',
        });
        return;
      }

      const { token } =
        await accessTokenForUser(
          req.user!.userId,
        );

      const repo =
        await githubRequest<GithubRepositoryDetails>(
          `/repos/${encodeURIComponent(
            parsed.owner,
          )}/${encodeURIComponent(
            parsed.repo,
          )}`,
          token,
        );

      const duplicate =
        await queryOne<{
          id: string;
        }>(
          `SELECT "id"
           FROM "Project"
           WHERE "githubFullName" = $1
             AND "id" <> $2
           LIMIT 1`,
          [
            repo.full_name,
            projectId,
          ],
        );

      if (duplicate) {
        res.status(409).json({
          error:
            'This GitHub repository is already linked to another Community project.',
        });
        return;
      }

      const updated =
        await queryOne(
          `UPDATE "Project"
           SET
             "githubOwner" = $1,
             "githubRepo" = $2,
             "githubFullName" = $3,
             "githubNodeId" = $4,
             "githubUrl" = $5,
             "githubVisibility" = $6,
             "primaryLanguage" = $7,
             "license" = $8,
             "githubStars" = $9,
             "githubForks" = $10,
             "isGithubBacked" = TRUE
           WHERE "id" = $11
           RETURNING *`,
          [
            repo.owner.login,
            repo.name,
            repo.full_name,
            repo.node_id,
            repo.html_url,
            repo.visibility ??
              (repo.private
                ? 'private'
                : 'public'),
            repo.language ?? null,
            repo.license?.spdx_id ??
              repo.license?.name ??
              null,
            repo.stargazers_count ?? 0,
            repo.forks_count ?? 0,
            projectId,
          ],
        );

      res.json(updated);
    } catch (error) {
      if (error instanceof GithubError) {
        const message =
          error.status === 404
            ? 'GitHub could not find this repository, or your connected account cannot access it.'
            : error.message;

        res.status(
          error.status || 502,
        ).json({
          error: message,
        });
        return;
      }

      console.error(
        'GitHub project link error:',
        error,
      );

      res.status(502).json({
        error:
          'Could not link the GitHub repository.',
      });
    }
  },
);

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
    if (req.user!.role !== 'STUDENT') {
      res.status(403).json({ error: 'Only students can apply to community projects' });
      return;
    }

    const project = await queryOne<{
      id: string;
      title: string;
      xpReward: number;
      creatorId: string | null;
      applicationDeadline: Date | string | null;
    }>(
      `SELECT "id", "title", "xpReward", "creatorId", "applicationDeadline"
       FROM "Project"
       WHERE "id" = $1 AND "isActive" = true`,
      [paramId(req)],
    );

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (project.creatorId === req.user!.userId) {
      res.status(409).json({ error: 'You cannot apply to your own project' });
      return;
    }

    if (project.applicationDeadline && new Date(project.applicationDeadline).getTime() < Date.now()) {
      res.status(409).json({ error: 'Applications for this project have closed.' });
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

    if (project.creatorId) {
      await queryOne(
        `INSERT INTO "Notification" (
           "id",
           "userId",
           "title",
           "message",
           "type",
           "link"
         )
         VALUES ($1, $2, $3, $4, 'community', $5)
         RETURNING "id"`,
        [
          newId(),
          project.creatorId,
          'New project application',
          `A student applied to ${project.title}.`,
          `/community/requests/${project.id}`,
        ],
      );
    }

    res.status(201).json(application);
  } catch (error) {
    if (!isUniqueViolation(error)) console.error('Project application error:', error);
    res.status(409).json({ error: 'Already applied to this project' });
  }
});

const projectSchema = z.object({
  title: z.string().trim().min(1).max(200),
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
  location: z.string().trim().max(200).optional(),
  organization: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(4000),
  requirements: z.string().trim().max(2000).optional(),
  xpReward: z.number().int().min(0).max(10000).optional(),
  techStack: z.string().trim().max(500).optional(),
  teamCapacity: z.number().int().min(1).max(100).optional().default(10),
  deliverableType: z.string().trim().max(200).optional().default('Software Solution'),
  skillsNeeded: z.string().trim().max(1000).optional(),
  durationWeeks: z.number().int().min(1).max(104).optional(),
  applicationDeadline: z.string().datetime().optional(),
  imageUrl: z.string().url().max(2000).optional(),
  projectUrl: z.string().url().max(2000).optional(),
});

const updateProjectSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
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
  ]).optional(),
  location: z.string().trim().max(200).optional(),
  organization: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().min(1).max(4000).optional(),
  requirements: z.string().trim().max(2000).optional(),
  xpReward: z.number().int().min(0).max(10000).optional(),
  techStack: z.string().trim().max(500).optional(),
  teamCapacity: z.number().int().min(1).max(100).optional(),
  deliverableType: z.string().trim().max(200).optional(),
  skillsNeeded: z.string().trim().max(1000).optional(),
  durationWeeks: z.number().int().min(1).max(104).optional(),
  applicationDeadline: z.string().datetime().optional(),
  imageUrl: z.string().url().max(2000).optional(),
  projectUrl: z.string().url().max(2000).optional(),
  isActive: z.boolean().optional(),
});

router.patch('/:id', authenticate, validateBody(updateProjectSchema), async (req: AuthRequest, res) => {
  const projectId = paramId(req);
  const project = await queryOne<{ id: string; creatorId: string | null }>(
    `SELECT "id", "creatorId" FROM "Project" WHERE "id" = $1`,
    [projectId],
  );

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const isOwner = project.creatorId === req.user!.userId;
  const isAdmin = req.user!.role === 'ADMIN';
  if (!isOwner && !isAdmin) {
    res.status(403).json({ error: 'Only the project owner or an admin can update this project.' });
    return;
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  const addUpdate = (column: string, value: unknown) => {
    values.push(value);
    updates.push(`"${column}" = $${values.length}`);
  };
  const body = req.body;

  if (body.title !== undefined) addUpdate('title', body.title);
  if (body.category !== undefined) addUpdate('category', body.category);
  if (body.location !== undefined) addUpdate('location', nullable(body.location));
  if (body.organization !== undefined) addUpdate('organization', body.organization);
  if (body.description !== undefined) addUpdate('description', body.description);
  if (body.requirements !== undefined) addUpdate('requirements', nullable(body.requirements));
  if (body.xpReward !== undefined) addUpdate('xpReward', body.xpReward);
  if (body.techStack !== undefined) addUpdate('techStack', nullable(body.techStack));
  if (body.teamCapacity !== undefined) addUpdate('teamCapacity', body.teamCapacity);
  if (body.deliverableType !== undefined) addUpdate('deliverableType', body.deliverableType);
  if (body.skillsNeeded !== undefined) addUpdate('skillsNeeded', nullable(body.skillsNeeded));
  if (body.durationWeeks !== undefined) addUpdate('durationWeeks', body.durationWeeks);
  if (body.applicationDeadline !== undefined) addUpdate('applicationDeadline', body.applicationDeadline);
  if (body.imageUrl !== undefined) addUpdate('imageUrl', nullable(body.imageUrl));
  if (body.projectUrl !== undefined) addUpdate('projectUrl', nullable(body.projectUrl));
  if (body.isActive !== undefined) addUpdate('isActive', body.isActive);

  if (updates.length === 0) {
    res.status(400).json({ error: 'No project changes were provided.' });
    return;
  }

  values.push(projectId);
  const updatedProject = await queryOne(
    `UPDATE "Project"
     SET ${updates.join(', ')}
     WHERE "id" = $${values.length}
     RETURNING *`,
    values,
  );

  res.json(updatedProject);
});
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  const projectId = paramId(req);

  const project = await queryOne<{
    id: string;
    creatorId: string | null;
  }>(
    `SELECT "id", "creatorId"
     FROM "Project"
     WHERE "id" = $1`,
    [projectId],
  );

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const isOwner = project.creatorId === req.user!.userId;
  const isAdmin = req.user!.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    res.status(403).json({
      error: 'Only the project owner or an admin can delete this project.',
    });
    return;
  }

  await query(
    `DELETE FROM "Project"
     WHERE "id" = $1`,
    [projectId],
  );

  res.status(200).json({
    message: 'Project deleted successfully.',
  });
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
         "requirements", "xpReward", "techStack", "teamCapacity", "deliverableType",
         "skillsNeeded", "durationWeeks", "applicationDeadline", "imageUrl", "projectUrl"
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
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
        nullable(req.body.skillsNeeded),
        req.body.durationWeeks ?? null,
        req.body.applicationDeadline ?? null,
        nullable(req.body.imageUrl),
        nullable(req.body.projectUrl),
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
