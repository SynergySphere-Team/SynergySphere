import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const backendDir = path.resolve(rootDir, 'backend');
const distEntry = path.resolve(backendDir, 'dist', 'index.js');

async function isPort4000Healthy() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch('http://127.0.0.1:4000/api/health', {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return data?.status === 'ok';
  } catch {
    return false;
  }
}

let child = null;
let shuttingDown = false;

async function startBackendLoop() {
  while (!shuttingDown) {
    if (await isPort4000Healthy()) {
      await new Promise((r) => setTimeout(r, 4000));
      continue;
    }

    const useCompiled = process.env.USE_COMPILED_BACKEND === 'true' && existsSync(distEntry);
    const args = useCompiled
      ? ['--env-file=.env', 'dist/index.js']
      : ['--env-file=.env', '--import', 'tsx', 'src/index.ts'];

    console.log(`[Backend Supervisor] Starting SynergySphere API (${useCompiled ? 'dist/index.js' : 'src/index.ts'})...`);

    await new Promise((resolve) => {
      child = spawn(process.execPath, args, {
        cwd: backendDir,
        stdio: 'inherit',
        env: { ...process.env },
      });

      child.on('exit', (code, signal) => {
        child = null;
        if (!shuttingDown) {
          console.warn(`[Backend Supervisor] Backend process exited (code=${code}, signal=${signal}). Restarting in 1s...`);
        }
        resolve();
      });

      child.on('error', (err) => {
        console.error('[Backend Supervisor] Spawn error:', err.message);
        child = null;
        resolve();
      });
    });

    if (!shuttingDown) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

function handleShutdown() {
  shuttingDown = true;
  if (child) {
    try {
      child.kill('SIGTERM');
    } catch {}
  }
  process.exit(0);
}

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

void startBackendLoop();
