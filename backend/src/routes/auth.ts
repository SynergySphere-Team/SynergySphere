import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { newId, query, queryOne, transaction } from '../lib/db.js';
import {
  AUTH_COOKIE_NAME,
  AuthRequest,
  authCookieOptions,
  authenticate,
  clearAuthCookieOptions,
  signToken,
} from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const registerSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(['STUDENT', 'ORGANIZATION']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type SafeUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  profilePicture: string | null;
  xp: number;
  level: number;
  createdAt: Date;
};

type UserWithPassword = SafeUser & {
  password: string;
};

function setSessionCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
}

router.post('/register', validateBody(registerSchema), async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    const existing = await queryOne<{ id: string }>('SELECT "id" FROM "User" WHERE "email" = $1', [email]);
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await transaction(async (client) => {
      const created = await queryOne<SafeUser>(
        `INSERT INTO "User" ("id", "firstName", "lastName", "email", "password", "role")
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING "id", "firstName", "lastName", "email", "role", "profilePicture", "xp", "level", "createdAt"`,
        [newId(), firstName, lastName, email, hashedPassword, role || 'STUDENT'],
        client,
      );

      if (!created) throw new Error('User was not created');

      await client.query(
        `INSERT INTO "Notification" ("id", "userId", "title", "message", "type")
         VALUES ($1, $2, $3, $4, $5)`,
        [
          newId(),
          created.id,
          'Welcome to SynergySphere!',
          'Start your learning journey by exploring coding challenges and wellness tracking.',
          'welcome',
        ],
      );

      return created;
    });

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    setSessionCookie(res, token);

    res.status(201).json({ user });
  } catch (error) {
    console.error('Register error:', error);
    if (isDbUnavailable(error)) {
      res.status(503).json({
        error: 'Database unavailable. Start PostgreSQL with docker compose up -d, then run npm run db:migrate && npm run db:seed.',
      });
      return;
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

function isDbUnavailable(error: unknown): boolean {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === '57P03');
}

router.post('/login', validateBody(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await queryOne<UserWithPassword>(
      `SELECT "id", "firstName", "lastName", "email", "password", "role", "profilePicture", "xp", "level", "createdAt"
       FROM "User"
       WHERE "email" = $1`,
      [email],
    );
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    setSessionCookie(res, token);

    const { password: _password, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (error) {
    console.error('Login error:', error);
    if (isDbUnavailable(error)) {
      res.status(503).json({
        error: 'Database unavailable. Start PostgreSQL with docker compose up -d, then run npm run db:migrate && npm run db:seed.',
      });
      return;
    }
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, clearAuthCookieOptions());
  res.status(204).send();
});

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await queryOne<SafeUser>(
      `SELECT "id", "firstName", "lastName", "email", "role", "profilePicture", "xp", "level", "createdAt"
       FROM "User"
       WHERE "id" = $1`,
      [req.user!.userId],
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const [skills, userBadges] = await Promise.all([
      query(
        `SELECT "id", "userId", "skillName", "level", "createdAt", "updatedAt"
         FROM "Skill"
         WHERE "userId" = $1
         ORDER BY "skillName" ASC`,
        [user.id],
      ),
      query(
        `SELECT
           ub."id",
           ub."userId",
           ub."badgeId",
           ub."earnedAt",
           row_to_json(b) AS "badge"
         FROM "UserBadge" ub
         JOIN "Badge" b ON b."id" = ub."badgeId"
         WHERE ub."userId" = $1
         ORDER BY ub."earnedAt" DESC`,
        [user.id],
      ),
    ]);

    res.json({ ...user, skills, userBadges });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
