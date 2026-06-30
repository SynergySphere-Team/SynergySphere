import { randomUUID } from 'node:crypto';
import pg, { type PoolClient, type QueryResultRow } from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_SIZE || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
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
