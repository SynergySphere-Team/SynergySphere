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
  profilePicture?: string;
  xp: number;
  level: number;
}

export function clearAuth() {
  localStorage.removeItem('user');
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
  localStorage.setItem('user', JSON.stringify(user));
}

export async function api<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let res: Response;
  try {
    res = await fetch(buildApiUrl(endpoint), {
      ...options,
      credentials: 'include',
      headers,
    });
  } catch {
    const apiTarget = API_URL.startsWith('/') ? 'the local /api dev proxy' : API_URL;
    throw new Error(
      `Cannot reach the API server through ${apiTarget}. Start the app with npm run dev and make sure the backend is running on port 4001.`
    );
  }

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
