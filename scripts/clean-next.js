const fs = require('node:fs');
const path = require('node:path');

// OneDrive can mark files in .next as cloud reparse points. Next.js mistakes
// those for symlinks while cleaning its previous build and then fails on
// readlink. Removing this generated cache before Next.js starts avoids that
// cleanup path and is safe because .next is recreated automatically.
const distDir = path.resolve(__dirname, '..', 'frontend', '.next');

const { execSync } = require('node:child_process');

try {
  fs.rmSync(distDir, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 100,
  });
} catch {}

try {
  fs.mkdirSync(distDir, { recursive: true });
  if (process.platform === 'win32') {
    execSync(`attrib +s +h "${distDir}"`, { stdio: 'ignore' });
  }
} catch {}
