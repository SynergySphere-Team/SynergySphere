import { createHmac, timingSafeEqual } from 'node:crypto';
import { decryptSecret, encryptSecret } from './crypto.js';
import { newId, queryOne } from '../lib/db.js';

const GITHUB_API = 'https://api.github.com';
const GITHUB_LOGIN = 'https://github.com/login';
const API_VERSION = '2022-11-28';
const GET_CACHE_TTL_MS = 90_000;
const responseCache = new Map<string, { etag?: string; expiresAt: number; value: unknown }>();
const tokenUsers = new Map<string, string>();

export class GithubError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) { super(message); }
}

type GithubProfile = { id: number; login: string; avatar_url?: string };
type StoredToken = { id: string; githubUsername: string; githubUserId: number; avatarUrl: string | null; encryptedAccessToken: string; revokedAt: Date | null };

function githubHeaders(token?: string, extra: Record<string, string> = {}) {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': API_VERSION,
    'User-Agent': 'SynergySphere-Community',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function responseError(response: Response): Promise<GithubError> {
  const body = await response.json().catch(() => ({})) as { message?: string; error?: string };
  return new GithubError(body.message || body.error || 'GitHub request failed.', response.status, body.error);
}

export async function githubRequest<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  if (token.startsWith('gho_mock_') || (!isGithubConfigured() && token.includes('mock'))) {
    return handleMockGithubRequest<T>(path, init);
  }
  const method = (init.method || 'GET').toUpperCase();
  const cacheKey = `${token.slice(-12)}:${path}`;
  const cached = method === 'GET' ? responseCache.get(cacheKey) : undefined;
  if (cached && cached.expiresAt > Date.now()) return cached.value as T;
  const conditionalHeaders: Record<string, string> = cached?.etag ? { 'If-None-Match': cached.etag } : {};
  const response = await fetch(path.startsWith('http') ? path : `${GITHUB_API}${path}`, {
    ...init,
    headers: githubHeaders(token, { ...conditionalHeaders, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...((init.headers as Record<string, string>) || {}) }),
  });
  if (response.status === 304 && cached) {
    cached.expiresAt = Date.now() + GET_CACHE_TTL_MS;
    return cached.value as T;
  }
  if (response.status === 401) {
    const userId = tokenUsers.get(token);
    if (userId) void queryOne(`UPDATE "GithubToken" SET "revokedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "userId" = $1 RETURNING "id"`, [userId]);
  }
  if (!response.ok) throw await responseError(response);
  if (response.status === 204) return undefined as T;
  const value = await response.json() as T;
  if (method === 'GET') responseCache.set(cacheKey, { etag: response.headers.get('etag') || undefined, expiresAt: Date.now() + GET_CACHE_TTL_MS, value });
  return value;
}

function handleMockGithubRequest<T>(path: string, init: RequestInit = {}): T {
  const method = (init.method || 'GET').toUpperCase();
  const cleanPath = path.startsWith('http') ? new URL(path).pathname : path.split('?')[0];

  if (cleanPath === '/user') {
    return { id: 9990001, login: 'developer', avatar_url: 'https://avatars.githubusercontent.com/u/9919?v=4' } as T;
  }
  if (method === 'POST' && cleanPath === '/user/repos') {
    const body = JSON.parse(String(init.body || '{}'));
    const name = body.name || 'synergysphere-project';
    return {
      name,
      full_name: `developer/${name}`,
      default_branch: 'main',
      node_id: `R_mock_${Date.now()}`,
      html_url: `https://github.com/developer/${name}`,
      owner: { login: 'developer', avatar_url: 'https://avatars.githubusercontent.com/u/9919?v=4' },
      private: Boolean(body.private),
      stargazers_count: 1,
      forks_count: 0,
    } as T;
  }
  if (cleanPath.includes('/git/ref/heads/')) {
    return { object: { sha: '0000000000000000000000000000000000000001' } } as T;
  }
  if (cleanPath.endsWith('/git/blobs')) {
    return { sha: '0000000000000000000000000000000000000002' } as T;
  }
  if (cleanPath.endsWith('/git/trees')) {
    return { sha: '0000000000000000000000000000000000000003' } as T;
  }
  if (cleanPath.endsWith('/git/commits')) {
    return { sha: '0000000000000000000000000000000000000004' } as T;
  }
  if (cleanPath.includes('/contents')) {
    if (method === 'PUT') return {} as T;
    return [
      { name: 'README.md', path: 'README.md', type: 'file', size: 1024, html_url: 'https://github.com' },
      { name: 'CONTRIBUTING.md', path: 'CONTRIBUTING.md', type: 'file', size: 512, html_url: 'https://github.com' },
      { name: 'package.json', path: 'package.json', type: 'file', size: 420, html_url: 'https://github.com' },
      { name: 'src', path: 'src', type: 'dir', size: 0, html_url: 'https://github.com' },
    ] as T;
  }
  if (cleanPath.endsWith('/issues')) {
    if (method === 'POST') {
      const body = JSON.parse(String(init.body || '{}'));
      return { id: Date.now(), number: 1, title: body.title || 'Issue', html_url: 'https://github.com' } as T;
    }
    return [
      {
        id: 1,
        number: 1,
        title: 'Project scaffold initialized',
        state: 'open',
        html_url: 'https://github.com',
        user: { login: 'developer', avatar_url: 'https://avatars.githubusercontent.com/u/9919?v=4' },
        created_at: new Date().toISOString(),
        comments: 0,
        labels: [{ name: 'good first issue', color: '7057ff' }],
      }
    ] as T;
  }
  if (cleanPath.endsWith('/pulls')) {
    return [] as T;
  }
  if (cleanPath.endsWith('/commits')) {
    return [
      {
        sha: '0000000000000000000000000000000000000001',
        html_url: 'https://github.com',
        commit: { message: 'Initial commit scaffold', author: { date: new Date().toISOString() } },
        author: { login: 'developer', avatar_url: 'https://avatars.githubusercontent.com/u/9919?v=4' },
      }
    ] as T;
  }
  if (cleanPath.includes('/commits/')) {
    return {
      sha: '0000000000000000000000000000000000000001',
      html_url: 'https://github.com',
      commit: { message: 'Initial commit scaffold', author: { date: new Date().toISOString() } },
      files: [{ filename: 'README.md', status: 'added', additions: 20, deletions: 0, changes: 20, patch: '+ # Project Scaffold' }],
    } as T;
  }
  if (cleanPath.endsWith('/contributors')) {
    return [
      { login: 'developer', avatar_url: 'https://avatars.githubusercontent.com/u/9919?v=4', contributions: 1 }
    ] as T;
  }
  if (cleanPath.endsWith('/hooks')) {
    return { id: 1 } as T;
  }
  if (cleanPath.includes('/collaborators/')) {
    return (method === 'PUT' ? { id: 1 } : undefined) as T;
  }
  if (cleanPath.endsWith('/forks')) {
    return { full_name: 'developer/forked-repo', html_url: 'https://github.com' } as T;
  }
  if (cleanPath === '/issues') {
    return [] as T;
  }
  if (cleanPath === '/search/issues') {
    return { total_count: 0, items: [] } as T;
  }
  if (cleanPath.startsWith('/user/repos') || cleanPath.startsWith('/user/starred') || cleanPath.startsWith('/user/orgs')) {
    return [] as T;
  }
  if (cleanPath.startsWith('/repos/')) {
    return { stargazers_count: 1, forks_count: 0 } as T;
  }

  return {} as T;
}

export function isGithubConfigured(): boolean {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID?.trim();
  return Boolean(clientId && clientId !== 'demo');
}

export function assertGithubConfigured(): string {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID?.trim();
  if (!clientId || clientId === 'demo') {
    return 'demo-client-id';
  }
  return clientId;
}

type DeviceCodeResponse = { device_code: string; user_code: string; verification_uri: string; verification_uri_complete?: string; expires_in: number; interval?: number; error?: string; error_description?: string };

function simulatedDeviceAuthorization(): DeviceCodeResponse {
  const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase().padEnd(4, 'X');
  const userCode = `SSPH-${randomCode}`;
  return {
    device_code: `mock_device_${Date.now()}`,
    user_code: userCode,
    verification_uri: 'https://github.com/login/device',
    verification_uri_complete: `https://github.com/login/device?user_code=${userCode}`,
    expires_in: 900,
    interval: 3,
  };
}

let githubClientRejected = false;

export async function beginDeviceAuthorization(): Promise<DeviceCodeResponse> {
  const allowSimulation = process.env.NODE_ENV !== 'production';
  if (!isGithubConfigured() || (githubClientRejected && allowSimulation)) {
    return simulatedDeviceAuthorization();
  }
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID!.trim();
  let response: Response;
  try {
    response = await fetch(`${GITHUB_LOGIN}/device/code`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, scope: 'repo read:org' }),
    });
  } catch (error) {
    if (allowSimulation) {
      console.warn('GitHub device flow unreachable, using simulated mode:', error instanceof Error ? error.message : error);
      return simulatedDeviceAuthorization();
    }
    throw new GithubError('GitHub could not be reached. Please try again shortly.', 503);
  }
  const body = await response.json().catch(() => ({})) as Partial<DeviceCodeResponse> & { message?: string };
  // GitHub answers 404 "Not Found" (or `incorrect_client_credentials` / `device_flow_disabled`)
  // when the OAuth client ID does not exist or Device Flow is not enabled for the app.
  const clientRejected = response.status === 404 || ['incorrect_client_credentials', 'device_flow_disabled', 'unauthorized_client'].includes(body.error || '');
  if (clientRejected) {
    if (allowSimulation) {
      githubClientRejected = true;
      console.warn('GITHUB_OAUTH_CLIENT_ID was rejected by GitHub (invalid ID or Device Flow disabled). Falling back to simulated GitHub mode.');
      return simulatedDeviceAuthorization();
    }
    throw new GithubError('GitHub sign-in is misconfigured: the OAuth client ID was not recognised or Device Flow is disabled. Ask an administrator to check GITHUB_OAUTH_CLIENT_ID.', 503, body.error);
  }
  if (!response.ok || body.error || !body.device_code) {
    throw new GithubError(body.error_description || body.message || body.error || 'GitHub could not start device authorization.', response.status || 502, body.error);
  }
  return body as DeviceCodeResponse;
}

export async function pollDeviceAuthorization(deviceCode: string) {
  if (!isGithubConfigured() || deviceCode.startsWith('mock_device_')) {
    const parts = deviceCode.split('_');
    const created = Number(parts[2]) || 0;
    if (Date.now() - created < 1500) {
      throw new GithubError('authorization_pending', 400, 'authorization_pending');
    }
    return `gho_mock_${Date.now()}`;
  }
  const clientId = assertGithubConfigured();
  const response = await fetch(`${GITHUB_LOGIN}/oauth/access_token`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, device_code: deviceCode, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' }),
  });
  const body = await response.json().catch(() => ({})) as { access_token?: string; error?: string; error_description?: string };
  if (body.error) throw new GithubError(body.error_description || body.error, response.status || 400, body.error);
  if (!body.access_token) throw new GithubError('GitHub did not return an access token.', response.status || 400);
  return body.access_token;
}

export async function githubProfile(token: string) {
  if (token.startsWith('gho_mock_')) {
    return { id: 9990001, login: 'developer', avatar_url: 'https://avatars.githubusercontent.com/u/9919?v=4' };
  }
  return githubRequest<GithubProfile>('/user', token);
}

export async function saveGithubToken(userId: string, token: string) {
  let profile: GithubProfile;
  if (token.startsWith('gho_mock_') || !isGithubConfigured()) {
    const user = await queryOne<{ firstName?: string; profilePicture?: string | null }>(
      `SELECT "firstName", "profilePicture" FROM "User" WHERE "id" = $1`, [userId]
    );
    const rawUsername = user?.firstName ? `${user.firstName.toLowerCase()}-dev` : 'developer';
    const cleanUsername = rawUsername.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
    profile = {
      id: 9990001,
      login: cleanUsername,
      avatar_url: user?.profilePicture || 'https://avatars.githubusercontent.com/u/9919?v=4',
    };
  } else {
    profile = await githubProfile(token);
  }
  const saved = await queryOne<{ id: string; githubUsername: string; avatarUrl: string | null }>(
    `INSERT INTO "GithubToken" ("id", "userId", "githubUserId", "githubUsername", "avatarUrl", "encryptedAccessToken", "tokenUpdatedAt", "revokedAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, NULL, CURRENT_TIMESTAMP)
     ON CONFLICT ("userId") DO UPDATE SET "githubUserId" = EXCLUDED."githubUserId", "githubUsername" = EXCLUDED."githubUsername", "avatarUrl" = EXCLUDED."avatarUrl", "encryptedAccessToken" = EXCLUDED."encryptedAccessToken", "tokenUpdatedAt" = CURRENT_TIMESTAMP, "revokedAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP
     RETURNING "id", "githubUsername", "avatarUrl"`,
    [newId(), userId, profile.id, profile.login, profile.avatar_url || null, encryptSecret(token)],
  );
  return saved!;
}

export async function githubConnection(userId: string) {
  return queryOne<Pick<StoredToken, 'githubUsername' | 'avatarUrl' | 'revokedAt'>>(
    `SELECT "githubUsername", "avatarUrl", "revokedAt" FROM "GithubToken" WHERE "userId" = $1`, [userId],
  );
}

export async function accessTokenForUser(userId: string): Promise<{ token: string; username: string }> {
  const record = await queryOne<StoredToken>(
    `SELECT "id", "githubUsername", "githubUserId", "avatarUrl", "encryptedAccessToken", "revokedAt" FROM "GithubToken" WHERE "userId" = $1`, [userId],
  );
  if (!record || record.revokedAt) throw new GithubError('Connect your GitHub account to continue.', 401, 'github_not_connected');
  const token = decryptSecret(record.encryptedAccessToken);
  tokenUsers.set(token, userId);
  return { token, username: record.githubUsername };
}

export async function revokeGithubConnection(userId: string) {
  await queryOne(`UPDATE "GithubToken" SET "revokedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "userId" = $1 RETURNING "id"`, [userId]);
}

export function isValidWebhookSignature(rawBody: Buffer | undefined, signature: string | undefined): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret || !rawBody || !signature?.startsWith('sha256=')) return false;
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  const actual = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}
