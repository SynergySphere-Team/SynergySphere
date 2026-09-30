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

  for (const file of files) {
    const sql = await readFile(resolve(migrationsDir, file), 'utf8');
    await pool.query(sql);
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
