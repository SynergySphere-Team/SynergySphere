import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
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

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  profilePicture: true,
  xp: true,
  level: true,
  createdAt: true,
} as const;

function setSessionCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
}

router.post('/register', validateBody(registerSchema), async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role: role || 'STUDENT',
      },
      select: userSelect,
    });

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    setSessionCookie(res, token);

    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Welcome to SynergySphere!',
        message: 'Start your learning journey by exploring coding challenges and wellness tracking.',
        type: 'welcome',
      },
    });

    res.status(201).json({ user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', validateBody(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
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
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, clearAuthCookieOptions());
  res.status(204).send();
});

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        ...userSelect,
        skills: true,
        userBadges: { include: { badge: true } },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
