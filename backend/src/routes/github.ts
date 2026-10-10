import { Router, type Request } from 'express';
import { z } from 'zod';
import { newId, query, queryOne } from '../lib/db.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { awardXp } from '../services/gamification.js';
import { accessTokenForUser, beginDeviceAuthorization, githubConnection, githubRequest, GithubError, isValidWebhookSignature, pollDeviceAuthorization, revokeGithubConnection, saveGithubToken } from '../services/github.js';
import { decryptSecret, encryptSecret } from '../services/crypto.js';
import { generateCommunityProject, type WizardInput } from '../services/projectGeneration.js';

const router = Router();
const bodyRouter = Router();

type ProjectRow = { id: string; creatorId: string; title: string; category: string; githubOwner: string; githubRepo: string; githubFullName: string; xpReward: number };

async function addActivity(projectId: string, event: { id?: string; type: string; actor?: string; avatar?: string; title: string; summary?: string; url?: string; occurredAt?: string | Date; metadata?: unknown }) {
  await queryOne(
    `INSERT INTO "ActivityEvent" ("id", "projectId", "githubEventId", "type", "actorLogin", "actorAvatarUrl", "title", "summary", "url", "metadata", "occurredAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT ("githubEventId") WHERE "githubEventId" IS NOT NULL DO NOTHING
     RETURNING "id"`,
    [newId(), projectId, event.id || null, event.type, event.actor || null, event.avatar || null, event.title, event.summary || null, event.url || null, event.metadata ? JSON.stringify(event.metadata) : null, event.occurredAt || new Date()],
  );
  await queryOne(
    `UPDATE "Project" SET "lastActivityAt" = $1, "lastActivityMessage" = $2, "lastActivityActor" = $3, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $4 RETURNING "id"`,
    [event.occurredAt || new Date(), event.title, event.actor || null, projectId],
  );
}

async function notifyUsers(userIds: string[], title: string, message: string, type: string) {
  const ids = [...new Set(userIds)];
  await Promise.all(ids.map((userId) => queryOne(
    `INSERT INTO "Notification" ("id", "userId", "title", "message", "type") VALUES ($1, $2, $3, $4, $5) RETURNING "id"`,
    [newId(), userId, title, message, type],
  )));
  const tokens = await query<{ token: string }>(`SELECT "token" FROM "PushToken" WHERE "userId" = ANY($1::text[])`, [ids]);
  if (tokens.length) {
    void fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(tokens.map(({ token }) => ({ to: token, sound: 'default', title, body: message }))),
    }).catch((error) => console.error('Expo push delivery failed:', error));
  }
}

async function projectForRepo(owner: string, repo: string) {
  return queryOne<ProjectRow>(
    `SELECT "id", "creatorId", "title", "category", "githubOwner", "githubRepo", "githubFullName", "xpReward" FROM "Project" WHERE "githubFullName" = $1`,
    [`${owner}/${repo}`],
  );
}

async function creatorToken(project: ProjectRow) { return accessTokenForUser(project.creatorId); }

async function recordAcceptedInvitations(project: ProjectRow) {
  let auth: { token: string };
  try { auth = await creatorToken(project); } catch { return; }
  const candidates = await query<{ id: string; userId: string; githubUsername: string; xpAwarded: boolean }>(
    `SELECT "id", "userId", "githubUsername", "xpAwarded" FROM "ProjectApplication" WHERE "projectId" = $1 AND "status" = 'INVITATION_SENT'`, [project.id],
  );
  for (const candidate of candidates) {
    if (!candidate.githubUsername) continue;
    try {
      await githubRequest<void>(`/repos/${project.githubOwner}/${project.githubRepo}/collaborators/${encodeURIComponent(candidate.githubUsername)}`, auth.token, { method: 'GET' });
      const accepted = await queryOne<{ id: string }>(
        `UPDATE "ProjectApplication" SET "status" = 'APPROVED', "acceptedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1 AND "status" = 'INVITATION_SENT' RETURNING "id"`, [candidate.id],
      );
      if (accepted && !candidate.xpAwarded) {
        await queryOne(`UPDATE "ProjectApplication" SET "xpAwarded" = TRUE WHERE "id" = $1 RETURNING "id"`, [candidate.id]);
        await Promise.all([awardXp(candidate.userId, Math.min(project.xpReward, 300), `Joined GitHub project: ${project.title}`), awardXp(project.creatorId, 75, `Welcomed a contributor to ${project.title}`)]);
        await notifyUsers([candidate.userId], 'GitHub invitation accepted', `You now have access to ${project.githubFullName}.`, 'community');
      }
    } catch (error) {
      if (!(error instanceof GithubError) || error.status !== 404) console.error('GitHub invitation sync failed:', error);
    }
  }
}

const wizardSchema = z.object({
  category: z.string().trim().min(2).max(80),
  language: z.string().trim().min(1).max(80),
  license: z.enum(['MIT', 'GPL-3.0', 'Apache-2.0', 'NONE']),
  visibility: z.enum(['public', 'private']),
  starterTemplate: z.enum(['WEB_APP', 'MOBILE_APP', 'DATA_ANALYSIS', 'DOCUMENTATION', 'IOT']),
  problem: z.string().trim().min(20).max(3000),
  audience: z.string().trim().min(2).max(1000),
  goal: z.string().trim().min(20).max(3000),
});

bodyRouter.post('/device/start', authenticate, async (req: AuthRequest, res) => {
  try {
    const device = await beginDeviceAuthorization();
    const id = newId();
    const expiresAt = new Date(Date.now() + (device.expires_in || 900) * 1000);
    await queryOne(
      `INSERT INTO "GithubDeviceAuthorization" ("id", "userId", "encryptedDeviceCode", "userCode", "verificationUri", "verificationUriComplete", "intervalSeconds", "expiresAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING "id"`,
      [id, req.user!.userId, encryptSecret(device.device_code), device.user_code, device.verification_uri, device.verification_uri_complete || null, device.interval || 5, expiresAt],
    );
    res.status(201).json({ id, userCode: device.user_code, verificationUri: device.verification_uri, verificationUriComplete: device.verification_uri_complete || null, intervalSeconds: device.interval || 5, expiresIn: device.expires_in });
  } catch (error) { res.status(503).json({ error: error instanceof Error ? error.message : 'Could not start GitHub connection.' }); }
});

bodyRouter.post('/device/:id/poll', authenticate, async (req: AuthRequest, res) => {
  const authorization = await queryOne<{ encryptedDeviceCode: string; intervalSeconds: number; expiresAt: Date; isExpired: boolean }>(
    `SELECT "encryptedDeviceCode", "intervalSeconds", "expiresAt", ("expiresAt" <= CURRENT_TIMESTAMP) AS "isExpired" FROM "GithubDeviceAuthorization" WHERE "id" = $1 AND "userId" = $2`, [req.params.id, req.user!.userId],
  );
  if (!authorization || authorization.isExpired || authorization.expiresAt <= new Date()) { res.status(410).json({ error: 'This GitHub code expired. Start again.', status: 'expired' }); return; }
  try {
    const token = await pollDeviceAuthorization(decryptSecret(authorization.encryptedDeviceCode));
    const connection = await saveGithubToken(req.user!.userId, token);
    await queryOne(`DELETE FROM "GithubDeviceAuthorization" WHERE "id" = $1 RETURNING "id"`, [req.params.id]);
    // Returned once over TLS; the mobile client stores this in Keychain/Keystore.
    // The backend separately needs its encrypted copy for repository automation.
    res.json({ status: 'connected', accessToken: token, username: connection.githubUsername, avatarUrl: connection.avatarUrl });
  } catch (error) {
    if (error instanceof GithubError && ['authorization_pending', 'slow_down'].includes(error.code || '')) { res.json({ status: 'pending', intervalSeconds: error.code === 'slow_down' ? authorization.intervalSeconds + 5 : authorization.intervalSeconds }); return; }
    if (error instanceof GithubError && ['expired_token', 'access_denied'].includes(error.code || '')) { res.status(410).json({ error: error.message, status: error.code === 'access_denied' ? 'denied' : 'expired' }); return; }
    res.status(502).json({ error: error instanceof Error ? error.message : 'GitHub connection could not be completed.' });
  }
});

bodyRouter.get('/connection', authenticate, async (req: AuthRequest, res) => {
  const connection = await githubConnection(req.user!.userId);
  res.json({ connected: Boolean(connection && !connection.revokedAt), username: connection?.githubUsername || null, avatarUrl: connection?.avatarUrl || null });
});

bodyRouter.delete('/connection', authenticate, async (req: AuthRequest, res) => {
  await revokeGithubConnection(req.user!.userId);
  res.status(204).send();
});

const pushTokenSchema = z.object({ token: z.string().min(10).max(500), platform: z.enum(['ios', 'android']) });
bodyRouter.put('/push-token', authenticate, validateBody(pushTokenSchema), async (req: AuthRequest, res) => {
  await queryOne(
    `INSERT INTO "PushToken" ("id", "userId", "token", "platform") VALUES ($1, $2, $3, $4)
     ON CONFLICT ("token") DO UPDATE SET "userId" = EXCLUDED."userId", "platform" = EXCLUDED."platform", "updatedAt" = CURRENT_TIMESTAMP RETURNING "id"`,
    [newId(), req.user!.userId, req.body.token, req.body.platform],
  );
  res.status(204).send();
});

bodyRouter.post('/projects', authenticate, validateBody(wizardSchema), async (req: AuthRequest, res) => {
  let auth: { token: string; username: string };
  try { auth = await accessTokenForUser(req.user!.userId); } catch (error) { res.status(401).json({ error: error instanceof Error ? error.message : 'Connect GitHub first.', code: 'github_not_connected' }); return; }
  try {
    const input = req.body as WizardInput;
    const generated = await generateCommunityProject(input);
    const repo = await githubRequest<{ name: string; full_name: string; default_branch?: string; node_id: string; html_url: string; owner: { login: string; avatar_url?: string }; private: boolean; stargazers_count: number; forks_count: number }>(
      '/user/repos', auth.token, { method: 'POST', body: JSON.stringify({ name: generated.repoName, description: generated.description, private: input.visibility === 'private', auto_init: true, has_issues: true, has_projects: true }) },
    );
    const defaultBranch = repo.default_branch || 'main';

    const files = [
      { path: 'README.md', content: generated.readme },
      { path: 'CONTRIBUTING.md', content: generated.contributing },
      ...(generated.licenseText ? [{ path: 'LICENSE', content: generated.licenseText }] : []),
      ...generated.files,
    ].filter((file, index, all) => all.findIndex((item) => item.path === file.path) === index);

    try {
      // Small pause to allow GitHub to register default branch ref after auto_init
      await new Promise((resolve) => setTimeout(resolve, 500));

      const branchRef = await githubRequest<{ object: { sha: string } }>(
        `/repos/${repo.full_name}/git/ref/heads/${defaultBranch}`,
        auth.token
      );
      const blobs = await Promise.all(files.map(async (file) => {
        const blob = await githubRequest<{ sha: string }>(`/repos/${repo.full_name}/git/blobs`, auth.token, { method: 'POST', body: JSON.stringify({ content: file.content, encoding: 'utf-8' }) });
        return { path: file.path, mode: '100644', type: 'blob', sha: blob.sha };
      }));
      const tree = await githubRequest<{ sha: string }>(`/repos/${repo.full_name}/git/trees`, auth.token, {
        method: 'POST',
        body: JSON.stringify({ base_tree: branchRef.object.sha, tree: blobs }),
      });
      const commit = await githubRequest<{ sha: string }>(`/repos/${repo.full_name}/git/commits`, auth.token, {
        method: 'POST',
        body: JSON.stringify({ message: 'Initial SynergySphere project scaffold', tree: tree.sha, parents: [branchRef.object.sha] }),
      });
      await githubRequest(`/repos/${repo.full_name}/git/refs/heads/${defaultBranch}`, auth.token, {
        method: 'PATCH',
        body: JSON.stringify({ sha: commit.sha, force: true }),
      });
    } catch (commitErr) {
      console.warn('Git Data API batch commit fallback to Contents API:', commitErr);
      // Fallback: write README and files via Contents API
      for (const file of files) {
        try {
          await githubRequest(`/repos/${repo.full_name}/contents/${file.path}`, auth.token, {
            method: 'PUT',
            body: JSON.stringify({
              message: `Add ${file.path}`,
              content: Buffer.from(file.content).toString('base64'),
            }),
          });
        } catch {
          // ignore secondary file errors
        }
      }
    }

    await Promise.all(generated.issues.map((issue) => githubRequest(`/repos/${repo.full_name}/issues`, auth.token, { method: 'POST', body: JSON.stringify({ ...issue, labels: ['good first issue'] }) }).catch(() => null)));
    const project = await queryOne<{ id: string }>(
      `INSERT INTO "Project" (
        "id", "creatorId", "title", "category", "organization",
        "description", "requirements", "problem", "audience",
        "xpReward", "githubOwner", "githubRepo", "githubFullName",
        "githubNodeId", "githubUrl", "githubVisibility",
        "primaryLanguage", "license", "starterTemplate",
        "githubStars", "githubForks", "contributorAvatars",
        "isGithubBacked"
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        250, $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18,
        $19, $20, $21,
        TRUE
      )
      RETURNING "id"`,
      [
        newId(),
        req.user!.userId,
        repo.name,
        input.category,
        repo.owner.login,
        generated.description,
        input.goal,
        input.problem,
        input.audience,
        repo.owner.login,
        repo.name,
        repo.full_name,
        repo.node_id,
        repo.html_url,
        repo.private ? 'private' : 'public',
        input.language,
        input.license,
        input.starterTemplate,
        repo.stargazers_count || 0,
        repo.forks_count || 0,
        JSON.stringify(repo.owner.avatar_url ? [repo.owner.avatar_url] : []),
      ],
    );
    let webhookWarning: string | null = null;
    if (process.env.GITHUB_WEBHOOK_URL && process.env.GITHUB_WEBHOOK_SECRET) {
      try { await githubRequest(`/repos/${repo.full_name}/hooks`, auth.token, { method: 'POST', body: JSON.stringify({ name: 'web', active: true, events: ['push', 'pull_request', 'issues', 'member'], config: { url: process.env.GITHUB_WEBHOOK_URL, content_type: 'json', secret: process.env.GITHUB_WEBHOOK_SECRET, insecure_ssl: '0' } }) }); }
      catch (error) { webhookWarning = error instanceof Error ? error.message : 'Webhook could not be registered.'; }
    } else webhookWarning = 'Webhook is not configured; activity will be synced when the project is opened.';
    await addActivity(project!.id, { type: 'REPOSITORY', actor: auth.username, title: 'Created the repository', summary: 'Initial SynergySphere scaffold committed', url: repo.html_url });
    await awardXp(req.user!.userId, 250, `Created GitHub community project: ${repo.name}`);
    res.status(201).json({ project, repositoryUrl: repo.html_url, webhookWarning });
  } catch (error) { console.error('GitHub project creation failed:', error); res.status(error instanceof GithubError ? 502 : 500).json({ error: error instanceof Error ? error.message : 'Could not create the GitHub project.' }); }
});

bodyRouter.get('/my-work', authenticate, async (req: AuthRequest, res) => {
  try {
    const { token, username } = await accessTokenForUser(req.user!.userId);
    const encoded = encodeURIComponent(username);
    const [issues, pullRequests, repositories, starred, organizations] = await Promise.all([
      githubRequest(`/issues?filter=assigned&state=open&per_page=30`, token),
      githubRequest(`/search/issues?q=author%3A${encoded}%20type%3Apr%20state%3Aopen&per_page=30`, token),
      githubRequest(`/user/repos?affiliation=owner,collaborator,organization_member&sort=updated&per_page=50`, token),
      githubRequest('/user/starred?sort=updated&per_page=30', token),
      githubRequest('/user/orgs?per_page=30', token),
    ]);
    res.json({ issues, pullRequests, repositories, starred, organizations });
  } catch (error) { res.status(401).json({ error: error instanceof Error ? error.message : 'Connect GitHub first.', code: 'github_not_connected' }); }
});

bodyRouter.get('/feed', authenticate, async (req: AuthRequest, res) => {
  const events = await query(
    `SELECT ae.* FROM "ActivityEvent" ae
     JOIN "Project" p ON p."id" = ae."projectId"
     LEFT JOIN "ProjectApplication" pa ON pa."projectId" = p."id" AND pa."userId" = $1 AND pa."status" = 'APPROVED'
     WHERE p."creatorId" = $1 OR pa."id" IS NOT NULL
     ORDER BY ae."occurredAt" DESC LIMIT 60`, [req.user!.userId],
  );
  res.json(events);
});

// GitHub calls this without a SynergySphere session. The raw body is captured
// in index.ts before JSON parsing so webhook requests can be authenticated.
router.post('/webhooks', async (req: Request & { rawBody?: Buffer }, res) => {
  if (!isValidWebhookSignature(req.rawBody, req.get('X-Hub-Signature-256'))) { res.status(401).json({ error: 'Invalid webhook signature' }); return; }
  const event = req.get('X-GitHub-Event');
  const payload = req.body as Record<string, any>;
  const repo = payload.repository;
  if (!repo?.owner?.login || !repo?.name) { res.status(202).send(); return; }
  const project = await projectForRepo(repo.owner.login, repo.name);
  if (!project) { res.status(202).send(); return; }
  const sender = payload.sender;
  if (event === 'push') {
    const commit = payload.head_commit;
    if (commit) await addActivity(project.id, { id: `push:${payload.after}`, type: 'COMMIT', actor: sender?.login, avatar: sender?.avatar_url, title: commit.message || 'Pushed commits', summary: `${payload.commits?.length || 1} commit(s) to ${payload.ref?.replace('refs/heads/', '') || 'main'}`, url: commit.url, occurredAt: commit.timestamp });
  } else if (event === 'pull_request') {
    const pr = payload.pull_request;
    await addActivity(project.id, { id: `pr:${pr?.id}:${payload.action}`, type: 'PULL_REQUEST', actor: sender?.login, avatar: sender?.avatar_url, title: `${payload.action}: ${pr?.title || 'Pull request'}`, url: pr?.html_url, occurredAt: pr?.updated_at });
  } else if (event === 'issues') {
    const issue = payload.issue;
    await addActivity(project.id, { id: `issue:${issue?.id}:${payload.action}`, type: 'ISSUE', actor: sender?.login, avatar: sender?.avatar_url, title: `${payload.action}: ${issue?.title || 'Issue'}`, url: issue?.html_url, occurredAt: issue?.updated_at });
  } else if (event === 'member' && payload.action === 'added') {
    await recordAcceptedInvitations(project);
  }
  const recipients = await query<{ userId: string }>(`SELECT "userId" FROM "ProjectApplication" WHERE "projectId" = $1 AND "status" = 'APPROVED'`, [project.id]);
  if (event && ['push', 'pull_request', 'issues'].includes(event)) await notifyUsers(recipients.map((row) => row.userId), `${project.title} activity`, event === 'push' ? 'New commits were pushed.' : `A ${event.replace('_', ' ')} was updated.`, 'community');
  res.status(202).send();
});

export async function pollGithubActivity(): Promise<void> {
  const projects = await query<ProjectRow>(
    `SELECT "id", "creatorId", "title", "category", "githubOwner", "githubRepo", "githubFullName", "xpReward" FROM "Project" WHERE "isGithubBacked" = TRUE AND "isActive" = TRUE LIMIT 150`,
  );
  for (const project of projects) {
    try {
      const { token } = await creatorToken(project);
      const [commits, repository, contributors] = await Promise.all([
        githubRequest<Array<{ sha: string; html_url: string; commit: { message: string; author?: { date?: string } }; author?: { login?: string; avatar_url?: string } }>>(`/repos/${project.githubOwner}/${project.githubRepo}/commits?per_page=5`, token),
        githubRequest<{ stargazers_count: number; forks_count: number }>(`/repos/${project.githubOwner}/${project.githubRepo}`, token),
        githubRequest<Array<{ avatar_url?: string }>>(`/repos/${project.githubOwner}/${project.githubRepo}/contributors?per_page=8`, token),
      ]);
      await queryOne(
        `UPDATE "Project" SET "githubStars" = $1, "githubForks" = $2, "contributorAvatars" = $3, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $4 RETURNING "id"`,
        [repository.stargazers_count || 0, repository.forks_count || 0, JSON.stringify(contributors.map((contributor) => contributor.avatar_url).filter(Boolean)), project.id],
      );
      for (const commit of commits.reverse()) {
        await addActivity(project.id, { id: `commit:${commit.sha}`, type: 'COMMIT', actor: commit.author?.login, avatar: commit.author?.avatar_url, title: commit.commit.message, url: commit.html_url, occurredAt: commit.commit.author?.date });
      }
      await recordAcceptedInvitations(project);
    } catch (error) {
      if (!(error instanceof GithubError && error.status === 404)) console.error(`GitHub fallback sync failed for ${project.githubFullName}:`, error instanceof Error ? error.message : error);
    }
  }
}

export { router as githubWebhookRoutes };
export default bodyRouter;
