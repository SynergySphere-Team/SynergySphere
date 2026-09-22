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

export function assertGithubConfigured(): string {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID?.trim();
  if (!clientId) throw new Error('GitHub OAuth is not configured. Set GITHUB_OAUTH_CLIENT_ID on the backend.');
  return clientId;
}

export async function beginDeviceAuthorization() {
  const clientId = assertGithubConfigured();
  const response = await fetch(`${GITHUB_LOGIN}/device/code`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, scope: 'repo read:org' }),
  });
  if (!response.ok) throw await responseError(response);
  return response.json() as Promise<{ device_code: string; user_code: string; verification_uri: string; verification_uri_complete?: string; expires_in: number; interval?: number }>;
}

export async function pollDeviceAuthorization(deviceCode: string) {
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

export async function githubProfile(token: string) { return githubRequest<GithubProfile>('/user', token); }

export async function saveGithubToken(userId: string, token: string) {
  const profile = await githubProfile(token);
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
