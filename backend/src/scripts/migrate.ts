import 'dotenv/config';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../lib/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(__dirname, '../../../supabase/migrations');

async function main() {
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    console.log('No SQL migrations found.');
    return;
  }

  for (const file of files) {
    const sql = await readFile(resolve(migrationsDir, file), 'utf8');
    console.log('Applying ' + file + '...');
    await pool.query(sql);
  }

  console.log('Database migrations applied.');
}

main()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
