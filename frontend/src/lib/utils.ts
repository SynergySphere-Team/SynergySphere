import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

function buildApiUrl(endpoint: string): string {
  const base = API_URL.replace(/\/$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status?: string;
  studentId?: string;
  profilePicture?: string;
  xp: number;
  level: number;
}

export function isSuperAdmin(user?: User | null): boolean {
  const r = user?.role?.toUpperCase();
  return r === 'SUPERADMIN' || r === 'ADMIN';
}

export function isAdmin(user?: User | null): boolean {
  const r = user?.role?.toUpperCase();
  return r === 'ADMIN' || r === 'SUPERADMIN' || r === 'MODERATOR';
}

export function isModerator(user?: User | null): boolean {
  const r = user?.role?.toUpperCase();
  return r === 'MODERATOR' || r === 'ADMIN' || r === 'SUPERADMIN';
}

export function clearAuth() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function setStoredToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    clearAuth();
    return null;
  }
}

export function setStoredUser(user: User) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
}

let cachedWorkingApiBase: string | null = null;

function getFrontendCandidateApiBases(): string[] {
  const configured = API_URL.replace(/\/$/, '');
  const bases: string[] = [];

  if (cachedWorkingApiBase) {
    bases.push(cachedWorkingApiBase);
  }

  bases.push(configured);

  if (typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    if (host !== 'localhost' && host !== '127.0.0.1') {
      bases.push(`http://${host}:4000/api`);
    }
    bases.push('http://127.0.0.1:4000/api');
    bases.push('http://localhost:4000/api');
  }

  return [...new Set(bases.filter(Boolean))];
}

export async function fetchApiResponse(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'X-Tz-Offset': String(new Date().getTimezoneOffset()),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const candidateBases = getFrontendCandidateApiBases();
  let lastRes: Response | null = null;

  for (let i = 0; i < candidateBases.length; i++) {
    const base = candidateBases[i];
    const url = `${base}${path}`;
    try {
      const res = await fetch(url, {
        ...options,
        credentials: 'include',
        headers,
      });

      const contentType = res.headers.get('content-type') || '';
      const isProxyGatewayFailure =
        base.startsWith('/') &&
        (res.status === 502 ||
          res.status === 503 ||
          res.status === 504 ||
          (res.status === 500 && !contentType.includes('application/json')));

      if (isProxyGatewayFailure && i < candidateBases.length - 1) {
        if (cachedWorkingApiBase === base) cachedWorkingApiBase = null;
        lastRes = res;
        continue;
      }

      cachedWorkingApiBase = base;
      return res;
    } catch {
      if (cachedWorkingApiBase === base) {
        cachedWorkingApiBase = null;
      }
      if (i < candidateBases.length - 1) {
        continue;
      }
    }
  }

  if (lastRes) {
    return lastRes;
  }

  const apiTarget = API_URL.startsWith('/') ? 'the local /api dev proxy or port 4000' : API_URL;
  throw new Error(
    `Cannot reach the API server through ${apiTarget}. Make sure the backend is running on port 4000.`
  );
}

export async function api<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetchApiResponse(endpoint, options);

  if (res.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
    clearAuth();
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

export const LEVEL_TITLES = [
  'Junior Developer',
  'Developer',
  'Advanced Developer',
  'Software Engineer',
  'Tech Leader',
];

export function getLevelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(level - 1, 4)];
}

export function getXpProgress(xp: number): number {
  const XP_PER_LEVEL = 500;
  return ((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;
}
