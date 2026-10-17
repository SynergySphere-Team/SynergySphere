import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const TOKEN_KEY = 'synergysphere.auth-token';
let webToken: string | null = null;

function normalizeApiUrl(value: string | undefined): string | null {
  const url = value?.trim();
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function getPortFromApiUrl(url: string | null): string {
  if (!url) return '4000';
  try {
    const parsed = new URL(url);
    return parsed.port || (parsed.protocol === 'https:' ? '443' : '4000');
  } catch {
    return '4000';
  }
}

function apiUrlFromMetroHost(hostUri: unknown, targetPort: string = '4000'): string | null {
  if (typeof hostUri !== 'string' || !hostUri.trim()) return null;

  try {
    // Expo reports the Metro address as "host:port". URL parsing also keeps
    // IPv6 hosts intact instead of splitting them at their first colon.
    const host = new URL(`http://${hostUri}`).hostname;
    return host ? `http://${host}:${targetPort}/api` : null;
  } catch {
    return null;
  }
}

function isPrivateOrLocalIp(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '10.0.2.2' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    );
  } catch {
    return false;
  }
}

let cachedWorkingBaseUrl: string | null = null;
let activeProbePromise: Promise<string | null> | null = null;

export function getCandidateApiUrls(): string[] {
  const envUrl = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);
  const targetPort = getPortFromApiUrl(envUrl);
  const candidates: string[] = [];

  if (cachedWorkingBaseUrl) {
    candidates.push(cachedWorkingBaseUrl);
  }

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        candidates.push(`http://127.0.0.1:${targetPort}/api`);
        candidates.push(`http://localhost:${targetPort}/api`);
      } else {
        candidates.push(`http://${hostname}:${targetPort}/api`);
      }
    }
    candidates.push(`http://127.0.0.1:${targetPort}/api`);
    candidates.push(`http://localhost:${targetPort}/api`);
    if (envUrl) candidates.push(envUrl);
    candidates.push(`http://192.168.0.198:${targetPort}/api`);
    return [...new Set(candidates.filter(Boolean))];
  }

  // Infer host from Expo Go / development client Metro connection
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any).manifest?.debuggerHost;

  const metroUrl = apiUrlFromMetroHost(hostUri, targetPort);

  // If envUrl is an explicit remote URL (e.g. cloud deployed), prioritize it
  if (envUrl && !isPrivateOrLocalIp(envUrl)) {
    candidates.push(envUrl);
    return candidates;
  }

  if (metroUrl) candidates.push(metroUrl);
  if (envUrl) candidates.push(envUrl);
  candidates.push(`http://192.168.0.198:${targetPort}/api`);
  // Always include loopback fallbacks for PC / simulator / dev tools
  candidates.push(`http://127.0.0.1:${targetPort}/api`);
  candidates.push(`http://localhost:${targetPort}/api`);
  if (Platform.OS === 'android') {
    candidates.push(`http://10.0.2.2:${targetPort}/api`);
  }

  return [...new Set(candidates.filter(Boolean))];
}

async function probeFastestBaseUrl(candidates: string[]): Promise<string | null> {
  if (cachedWorkingBaseUrl) return cachedWorkingBaseUrl;
  if (candidates.length <= 1) return candidates[0] || null;
  if (activeProbePromise) return activeProbePromise;

  activeProbePromise = new Promise<string | null>((resolve) => {
    let settled = false;
    let remaining = candidates.length;
    const controllers = candidates.map(() => new AbortController());
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        controllers.forEach((c) => c.abort());
        resolve(null);
      }
    }, 2500);

    candidates.forEach((base, idx) => {
      fetch(`${base}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controllers[idx].signal,
      })
        .then((res) => {
          if (res.ok && !settled) {
            settled = true;
            clearTimeout(timer);
            cachedWorkingBaseUrl = base;
            controllers.forEach((c, i) => {
              if (i !== idx) c.abort();
            });
            resolve(base);
          } else {
            remaining -= 1;
            if (remaining <= 0 && !settled) {
              settled = true;
              clearTimeout(timer);
              resolve(null);
            }
          }
        })
        .catch(() => {
          remaining -= 1;
          if (remaining <= 0 && !settled) {
            settled = true;
            clearTimeout(timer);
            resolve(null);
          }
        });
    });
  }).finally(() => {
    activeProbePromise = null;
  });

  return activeProbePromise;
}

import {
  enqueueOfflineMutation,
  flushOfflineQueue,
  getOfflineQueue,
  getOfflineStatus,
  isCacheableGetPath,
  loadCachedResponse,
  saveCachedResponse,
  setOfflineStatus,
  subscribeOfflineStatus,
} from './offlineCache';

export { getOfflineStatus, subscribeOfflineStatus, getOfflineQueue };

export function getApiUrl(): string {
  const candidates = getCandidateApiUrls();
  return candidates[0] || 'http://127.0.0.1:4000/api';
}

export function getWsUrl(): string {
  const apiUrl = getApiUrl();
  return apiUrl.replace(/^http/i, 'ws').replace(/\/api\/?$/, '/ws');
}

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number, public readonly details?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(TOKEN_KEY) || webToken;
    }
    return webToken;
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

const REQUEST_TIMEOUT_MS = 6_000;
const FALLBACK_TIMEOUT_MS = 3_500;
let isFlushingQueue = false;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let candidateUrls = getCandidateApiUrls();
  if (candidateUrls.length === 0) {
    throw new ApiError('API URL is not configured. Set EXPO_PUBLIC_API_URL in mobile/.env.');
  }

  if (!cachedWorkingBaseUrl && candidateUrls.length > 1) {
    const fastest = await probeFastestBaseUrl(candidateUrls);
    if (fastest) {
      candidateUrls = [fastest, ...candidateUrls.filter((u) => u !== fastest)];
    }
  }

  const method = (options.method || 'GET').toUpperCase();
  const token = await getToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-SynergySphere-Client': 'mobile',
    'X-Tz-Offset': String(new Date().getTimezoneOffset()),
    ...(options.headers as Record<string, string> | undefined),
  };
  if (options.body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let lastError: any = null;
  let response: Response | null = null;
  let successfulBaseUrl: string | null = null;

  for (let i = 0; i < candidateUrls.length; i++) {
    const baseUrl = candidateUrls[i];
    const fullUrl = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const isAiRoute = path.startsWith('/ai/') || path === '/ai';
    // Dedicated timeout: 25s for AI routes on verified URL, 15s for verified working URL, 6s for first candidate, 3.5s for fallbacks
    const timeoutMs = isAiRoute
      ? (baseUrl === cachedWorkingBaseUrl || i === 0 ? 25_000 : 10_000)
      : (baseUrl === cachedWorkingBaseUrl ? 15_000 : (i === 0 ? REQUEST_TIMEOUT_MS : FALLBACK_TIMEOUT_MS));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(fullUrl, {
        ...options,
        headers,
        signal: controller.signal,
      });
      response = res;
      successfulBaseUrl = baseUrl;
      cachedWorkingBaseUrl = baseUrl;
      clearTimeout(timer);
      break;
    } catch (err: any) {
      clearTimeout(timer);
      if (cachedWorkingBaseUrl === baseUrl) {
        cachedWorkingBaseUrl = null;
      }
      lastError = err;
      // If there are more candidates, try the next fallback (e.g. 127.0.0.1 / localhost / LAN IP)
      if (i < candidateUrls.length - 1) {
        continue;
      }
    }
  }

  if (!response) {
    // Offline fallback for cacheable GET routes
    if (method === 'GET' && isCacheableGetPath(path)) {
      const cached = await loadCachedResponse<T>(path);
      if (cached !== null) {
        const q = await getOfflineQueue();
        setOfflineStatus(true, q.length);
        return cached;
      }
    }

    // Offline queue for task status updates and focus sessions
    if (
      (method === 'PATCH' && path.startsWith('/tasks/')) ||
      (method === 'POST' && path === '/tasks/focus-session')
    ) {
      let parsedBody: unknown;
      try {
        parsedBody = typeof options.body === 'string' ? JSON.parse(options.body) : undefined;
      } catch {
        parsedBody = undefined;
      }
      await enqueueOfflineMutation(method as 'PATCH' | 'POST', path, parsedBody);
      const q = await getOfflineQueue();
      setOfflineStatus(true, q.length);
      return ({ ...(typeof parsedBody === 'object' && parsedBody ? parsedBody : {}), offlineQueued: true } as unknown) as T;
    }

    const triedUrl = successfulBaseUrl || candidateUrls[0];
    if (lastError?.name === 'AbortError') {
      throw new ApiError(
        `Unable to connect to the SynergySphere server (connection timed out after 10s at ${triedUrl}). Check that the backend is running and that your device is connected to the same network.`
      );
    }
    throw new ApiError(
      `Unable to connect to the SynergySphere server at ${triedUrl}. Check that the backend is running and that your device is connected to the same network.`
    );
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const defaultMessages: Record<number, string> = {
      400: 'Invalid request. Please check your inputs.',
      401: 'Invalid credentials or session expired. Please sign in again.',
      403: 'You do not have permission to perform this action.',
      404: 'The requested resource was not found.',
      409: 'A record with these details already exists.',
      422: 'Validation error. Please verify your data.',
      500: 'The SynergySphere server encountered an error. Please try again later.',
      503: 'SynergySphere database or backend service is temporarily unavailable.',
    };

    const message = body.error || defaultMessages[response.status] || 'Request failed.';
    throw new ApiError(message, response.status, body.details);
  }

  // Connection succeeded — mark online, cache GET responses, and flush any queued offline mutations
  setOfflineStatus(false, 0);
  if (method === 'GET' && isCacheableGetPath(path)) {
    void saveCachedResponse(path, body);
  }
  if (!isFlushingQueue) {
    isFlushingQueue = true;
    void flushOfflineQueue((qPath, qOpts) => request(qPath, qOpts)).finally(() => {
      isFlushingQueue = false;
    });
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  health: () => request<{ status: string; service: string }>('/health'),
};

const ONBOARDING_KEY = 'synergysphere.onboarding-completed';
let webOnboardingCompleted = false;

const USER_KEY = 'synergysphere.auth-user';
let webUserRaw: string | null = null;

export const authStorage = {
  getToken,
  setToken: (token: string) => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(TOKEN_KEY, token);
      webToken = token;
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(TOKEN_KEY, token);
  },
  clearToken: () => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
      webToken = null;
      webUserRaw = null;
      return Promise.resolve();
    }
    return Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY).catch(() => {}),
    ]).then(() => {});
  },
  getUser: async <T = unknown>(): Promise<T | null> => {
    try {
      let raw: string | null = null;
      if (Platform.OS === 'web') {
        raw = typeof localStorage !== 'undefined' ? localStorage.getItem(USER_KEY) || webUserRaw : webUserRaw;
      } else {
        raw = await SecureStore.getItemAsync(USER_KEY);
      }
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  setUser: async (user: unknown): Promise<void> => {
    try {
      const raw = JSON.stringify(user);
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.setItem(USER_KEY, raw);
        webUserRaw = raw;
        return;
      }
      await SecureStore.setItemAsync(USER_KEY, raw);
    } catch {
      // ignore storage errors
    }
  },
};

export const onboardingStorage = {
  isCompleted: async (userId?: string): Promise<boolean> => {
    const userKey = userId ? `${ONBOARDING_KEY}.${userId}` : ONBOARDING_KEY;
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem(userKey);
        if (val !== null) return val === 'true';
        if (!userId) return localStorage.getItem(ONBOARDING_KEY) === 'true';
        return false;
      }
      return webOnboardingCompleted;
    }
    const val = await SecureStore.getItemAsync(userKey);
    if (val !== null) return val === 'true';
    if (!userId) {
      const fallback = await SecureStore.getItemAsync(ONBOARDING_KEY);
      return fallback === 'true';
    }
    return false;
  },
  setCompleted: async (userId?: string): Promise<void> => {
    const userKey = userId ? `${ONBOARDING_KEY}.${userId}` : ONBOARDING_KEY;
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(userKey, 'true');
        localStorage.setItem(ONBOARDING_KEY, 'true');
      }
      webOnboardingCompleted = true;
      return;
    }
    const ops = [SecureStore.setItemAsync(userKey, 'true')];
    if (userId) ops.push(SecureStore.setItemAsync(ONBOARDING_KEY, 'true'));
    await Promise.all(ops);
  },
  setPending: async (userId?: string): Promise<void> => {
    const userKey = userId ? `${ONBOARDING_KEY}.${userId}` : ONBOARDING_KEY;
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(userKey, 'false');
      }
      webOnboardingCompleted = false;
      return;
    }
    await SecureStore.setItemAsync(userKey, 'false');
  },
  reset: async (userId?: string): Promise<void> => {
    const userKey = userId ? `${ONBOARDING_KEY}.${userId}` : ONBOARDING_KEY;
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(userKey);
        if (!userId) localStorage.removeItem(ONBOARDING_KEY);
      }
      webOnboardingCompleted = false;
      return;
    }
    await SecureStore.deleteItemAsync(userKey);
    if (!userId) {
      await SecureStore.deleteItemAsync(ONBOARDING_KEY);
    }
  },
};
