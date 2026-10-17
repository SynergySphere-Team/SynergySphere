import { randomUUID } from 'node:crypto';
import pg, { type PoolClient, type QueryResultRow, type PoolConfig } from 'pg';

const { Pool } = pg;
const DEFAULT_DEV_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/synergysphere';

function normalizeDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Prisma-style params are not valid PostgreSQL connection options for node-pg.
    parsed.searchParams.delete('schema');
    parsed.searchParams.delete('connection_limit');
    parsed.searchParams.delete('pool_timeout');
    if (parsed.hostname === 'localhost') {
      parsed.hostname = '127.0.0.1';
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl && !databaseUrl.startsWith('file:')) {
    return normalizeDatabaseUrl(databaseUrl);
  }

  if (databaseUrl?.startsWith('file:')) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL must point to PostgreSQL in production');
    }

    console.warn(
      'DATABASE_URL uses a file: URL, but this backend uses PostgreSQL. Falling back to local Docker PostgreSQL.'
    );
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL must be set in production');
  }

  return DEFAULT_DEV_DATABASE_URL;
}

const databaseUrl = getDatabaseUrl();
const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');

export const pool = new Pool({
  connectionString: databaseUrl,
  max: Number(process.env.DB_POOL_SIZE || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
  ...(isLocalhost ? {} : { ssl: { rejectUnauthorized: false } }),
} as PoolConfig & { keepAlive?: boolean; keepAliveInitialDelayMillis?: number });

(pool as { on?: (event: string, listener: (err: Error) => void) => void }).on?.('error', (err: Error) => {
  console.warn('PostgreSQL idle client notice:', err.message);
});

function isTransientDbError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const err = error as { code?: string; message?: string; errno?: number };
  return (
    err.code === 'ECONNRESET' ||
    err.code === 'EPIPE' ||
    err.code === 'ETIMEDOUT' ||
    err.code === '57P01' ||
    err.code === '08006' ||
    err.code === '08001' ||
    err.errno === -54 ||
    (typeof err.message === 'string' &&
      (err.message.includes('Connection terminated') ||
        err.message.includes('ECONNRESET') ||
        err.message.includes('server closed the connection')))
  );
}

export type DbClient = Pick<PoolClient, 'query'>;

export function newId(): string {
  return randomUUID();
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
  client: DbClient = pool,
): Promise<T[]> {
  try {
    const result = await client.query<T>(text, [...params]);
    return result.rows;
  } catch (error) {
    if (client === pool && isTransientDbError(error)) {
      // Retry once on transient socket drop with a fresh connection
      const result = await pool.query<T>(text, [...params]);
      return result.rows;
    }
    throw error;
  }
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
  client: DbClient = pool,
): Promise<T | null> {
  const rows = await query<T>(text, params, client);
  return rows[0] || null;
}

export async function execute(
  text: string,
  params: readonly unknown[] = [],
  client: DbClient = pool,
): Promise<number> {
  try {
    const result = await client.query(text, [...params]);
    return result.rowCount || 0;
  } catch (error) {
    if (client === pool && isTransientDbError(error)) {
      const result = await pool.query(text, [...params]);
      return result.rowCount || 0;
    }
    throw error;
  }
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  let broken = false;
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    broken = isTransientDbError(error);
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    (client.release as (destroy?: boolean) => void)(broken);
  }
}

export function nullable<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}
