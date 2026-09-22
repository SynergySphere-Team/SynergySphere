import { randomUUID } from 'node:crypto';
import pg, { type PoolClient, type QueryResultRow } from 'pg';

const { Pool } = pg;
const DEFAULT_DEV_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/synergysphere';

function normalizeDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Prisma-style params are not valid PostgreSQL connection options for node-pg.
    parsed.searchParams.delete('schema');
    parsed.searchParams.delete('connection_limit');
    parsed.searchParams.delete('pool_timeout');
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
  ...(isLocalhost ? {} : { ssl: { rejectUnauthorized: false } }),
});

(pool as { on?: (event: string, listener: (err: Error) => void) => void }).on?.('error', (err: Error) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

export type DbClient = Pick<PoolClient, 'query'>;

export function newId(): string {
  return randomUUID();
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
  client: DbClient = pool,
): Promise<T[]> {
  const result = await client.query<T>(text, [...params]);
  return result.rows;
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
  const result = await client.query(text, [...params]);
  return result.rowCount || 0;
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export function nullable<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}
