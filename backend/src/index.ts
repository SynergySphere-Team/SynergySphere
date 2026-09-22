import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import taskRoutes from './routes/tasks.js';
import wellnessRoutes from './routes/wellness.js';
import challengeRoutes from './routes/challenges.js';
import projectRoutes from './routes/projects.js';
import portfolioRoutes from './routes/portfolio.js';
import aiRoutes from './routes/ai.js';
import notificationRoutes from './routes/notifications.js';
import leaderboardRoutes from './routes/leaderboard.js';
import adminRoutes from './routes/admin.js';
import learningRoutes from './routes/learning.js';
import curriculumRoutes from './routes/curriculum.js';
import githubRoutes, { githubWebhookRoutes, pollGithubActivity } from './routes/github.js';
import { pool } from './lib/db.js';

const app = express();
const PORT = process.env.PORT || 4001;

// Trust one proxy hop (ngrok / load-balancer) so that express-rate-limit
// can read the real client IP from X-Forwarded-For without throwing a
// ValidationError (ERR_ERL_UNEXPECTED_X_FORWARDED_FOR).
app.set('trust proxy', 1);

const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

function configuredOrigins(): string[] {
  return [process.env.FRONTEND_URL, process.env.FRONTEND_URLS]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(','))
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = new Set([
  ...configuredOrigins(),
  ...(process.env.NODE_ENV === 'production' ? [] : DEFAULT_DEV_ORIGINS),
]);

function isDevLoopbackOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === 'production') return false;

  try {
    const url = new URL(origin);
    const host = url.hostname;
    return ['http:', 'https:', 'exp:'].includes(url.protocol) && (
      ['localhost', '127.0.0.1', '10.0.2.2', '::1', '[::1]'].includes(host) ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
    );
  } catch {
    return false;
  }
}

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin) || isDevLoopbackOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json({
  limit: '10mb',
  verify(req, _res, buffer) {
    if ((req as express.Request).originalUrl === '/api/github/webhooks') {
      (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
    }
  },
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use('/api/github', githubWebhookRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'SynergySphere API', version: '1.0.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/wellness', wellnessRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/curriculum', curriculumRoutes);
app.use('/api/github', githubRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`SynergySphere API running on http://localhost:${PORT}`);
  pool.query('SELECT 1')
    .then(() => console.log('Database connection OK'))
    .catch((error: NodeJS.ErrnoException) => {
      console.error('Database connection failed:', error.message);
      if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
        console.error('Start PostgreSQL with: npm run db:up (or docker compose up -d)');
        console.error('Then initialize data with: npm run db:migrate && npm run db:seed');
      }
    });
});

const githubPollInterval = Math.max(Number(process.env.GITHUB_ACTIVITY_POLL_INTERVAL_MS) || 10 * 60 * 1000, 60_000);
if (process.env.GITHUB_ACTIVITY_POLLING !== 'false') {
  setTimeout(() => void pollGithubActivity().catch((error) => console.error('Initial GitHub activity sync failed:', error)), 10_000);
  setInterval(() => void pollGithubActivity().catch((error) => console.error('GitHub activity sync failed:', error)), githubPollInterval);
}

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${PORT} is already in use. Stop the existing service on that port, or set PORT to another value in backend/.env.`,
    );
    return;
  }

  console.error('Unable to start the SynergySphere API:', error.message);
});
