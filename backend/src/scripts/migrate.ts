import 'dotenv/config';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../lib/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(__dirname, '../../../supabase/migrations');

export async function runMigrations() {
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "schema_migrations" (
      "id" SERIAL PRIMARY KEY,
      "filename" TEXT NOT NULL UNIQUE,
      "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const appliedRows = await pool.query<{ filename: string }>(
    'SELECT "filename" FROM "schema_migrations"',
  );
  const appliedSet = new Set(appliedRows.rows.map((r) => r.filename));

  let appliedCount = 0;
  for (const file of files) {
    if (appliedSet.has(file)) {
      continue;
    }

    const sql = await readFile(resolve(migrationsDir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO "schema_migrations" ("filename") VALUES ($1) ON CONFLICT DO NOTHING',
        [file],
      );
      await client.query('COMMIT');
      appliedCount++;
      console.log(`[Migration] Applied ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`[Migration] Failed applying ${file}:`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  if (appliedCount > 0) {
    console.log(`[Migration] Successfully applied ${appliedCount} new migration(s).`);
  }
}

async function main() {
  console.log('Applying database migrations...');
  await runMigrations();
  console.log('Database migrations applied.');
}

const scriptPath = process.argv[1]?.replace(/\\/g, '/') || '';
const currentPath = fileURLToPath(import.meta.url).replace(/\\/g, '/');

if (scriptPath && (currentPath.endsWith(scriptPath) || scriptPath.endsWith('migrate.ts') || scriptPath.endsWith('migrate.js'))) {
  main()
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
