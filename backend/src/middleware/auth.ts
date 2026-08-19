import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction, CookieOptions } from 'express';

const DEFAULT_DEV_SECRET = 'synergysphere-dev-secret-change-in-production';
export const AUTH_COOKIE_NAME = 'synergysphere_token';
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    return DEFAULT_DEV_SECRET;
  }

  if (process.env.NODE_ENV === 'production' && (secret === DEFAULT_DEV_SECRET || secret.includes('change-this'))) {
    throw new Error('JWT_SECRET must be a strong production value');
  }

  return secret;
}

function sameSitePolicy(): CookieOptions['sameSite'] {
  return process.env.NODE_ENV === 'production' ? 'none' : 'lax';
}

export function authCookieOptions(): CookieOptions {
  const sameSite = sameSitePolicy();
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || sameSite === 'none',
    sameSite,
    path: '/',
    maxAge: TOKEN_MAX_AGE_MS,
  };
}

export function clearAuthCookieOptions(): CookieOptions {
  const sameSite = sameSitePolicy();
  return {
    secure: process.env.NODE_ENV === 'production' || sameSite === 'none',
    sameSite,
    path: '/',
  };
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return header.split(';').reduce<Record<string, string>>((cookies, part) => {
    const index = part.indexOf('=');
    if (index === -1) return cookies;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function getRequestToken(req: Request): string | null {
  const cookieToken = parseCookies(req.headers.cookie)[AUTH_COOKIE_NAME];
  if (cookieToken) return cookieToken;

  const authorization = req.headers.authorization;
  if (!authorization) return null;

  const [scheme, token] = authorization.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, getJwtSecret()) as AuthPayload;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = getRequestToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
