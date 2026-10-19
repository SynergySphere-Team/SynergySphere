const DEFAULT_DEV_SECRET = 'synergysphere-dev-secret-change-in-production';

/**
 * Validates required configuration when running in production so that a
 * misconfigured deployment fails fast at boot instead of failing on the first
 * authenticated request. Returns a list of human-readable problems.
 */
export function collectProductionConfigIssues(env: NodeJS.ProcessEnv = process.env): string[] {
  const issues: string[] = [];

  const jwtSecret = env.JWT_SECRET?.trim();
  if (!jwtSecret) {
    issues.push('JWT_SECRET must be set.');
  } else if (jwtSecret === DEFAULT_DEV_SECRET || jwtSecret.includes('change-this') || jwtSecret.includes('change-in-production')) {
    issues.push('JWT_SECRET must not be the default/placeholder value.');
  } else if (jwtSecret.length < 32) {
    issues.push('JWT_SECRET should be at least 32 characters long.');
  }

  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    issues.push('DATABASE_URL must be set.');
  } else if (databaseUrl.startsWith('file:')) {
    issues.push('DATABASE_URL must point to PostgreSQL.');
  }

  if (!env.FRONTEND_URL?.trim() && !env.FRONTEND_URLS?.trim()) {
    issues.push('FRONTEND_URL (or FRONTEND_URLS) must be set so CORS allows your web client.');
  }

  return issues;
}

export function assertProductionConfig(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== 'production') return;
  const issues = collectProductionConfigIssues(env);
  if (issues.length > 0) {
    throw new Error(`Invalid production configuration:\n - ${issues.join('\n - ')}`);
  }
}
