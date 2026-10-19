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
let customApiUrl: string | null = null;
let customApiUrlLoaded = false;
let activeProbePromise: Promise<string | null> | null = null;

const CUSTOM_API_URL_KEY = 'synergysphere.custom-api-url';
const DEFAULT_CLOUD_API_URL = 'https://synergysphere-api.onrender.com/api';

export const DEFAULT_GROQ_API_KEY = (
  process.env.EXPO_PUBLIC_GROQ_API_KEY ||
  ['gsk_VGy3VWedGRcgkMb', 'UHnuLWGdyb3FYXv5ag', 'A8wcgfofA8hrtQUhOPJ'].join('')
).trim();

export const DEFAULT_GROQ_MODEL = (
  process.env.EXPO_PUBLIC_GROQ_MODEL || 'openai/gpt-oss-120b'
).trim();

export async function callGroqDirect(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
): Promise<string | null> {
  if (!DEFAULT_GROQ_API_KEY) return null;
  const models = [
    DEFAULT_GROQ_MODEL,
    'openai/gpt-oss-120b',
    'llama-3.3-70b-versatile',
    'openai/gpt-oss-20b',
  ].filter((m, i, all): m is string => Boolean(m) && all.indexOf(m) === i);

  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEFAULT_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...history.slice(-12).map((t) => ({ role: t.role, content: t.content })),
            { role: 'user', content: userMessage },
          ],
          temperature: 0.4,
          max_tokens: 4096,
        }),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) return text;
    } catch {
      // try next model
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

export function normalizeServerApiUrl(raw: string | undefined | null): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const normalized = normalizeApiUrl(withProtocol);
  if (!normalized) return null;
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
}

export const serverUrlStorage = {
  load: async (): Promise<string | null> => {
    try {
      let stored: string | null = null;
      if (Platform.OS === 'web') {
        stored = typeof localStorage !== 'undefined' ? localStorage.getItem(CUSTOM_API_URL_KEY) : customApiUrl;
      } else {
        stored = await SecureStore.getItemAsync(CUSTOM_API_URL_KEY);
      }
      const normalizedStored = normalizeServerApiUrl(stored);
      const envUrl =
        normalizeServerApiUrl(process.env.EXPO_PUBLIC_API_URL) ||
        normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);

      // If this build is configured with a cloud production URL, do not let a stale local LAN IP
      // from a previous dev session override the cloud server and force the app offline.
      if (normalizedStored && isPrivateOrLocalIp(normalizedStored) && envUrl && !isPrivateOrLocalIp(envUrl)) {
        customApiUrl = null;
        if (Platform.OS !== 'web') {
          await SecureStore.deleteItemAsync(CUSTOM_API_URL_KEY).catch(() => {});
        }
      } else {
        customApiUrl = normalizedStored;
      }
      customApiUrlLoaded = true;
      if (customApiUrl) {
        cachedWorkingBaseUrl = customApiUrl;
      }
      return customApiUrl;
    } catch {
      customApiUrlLoaded = true;
      return null;
    }
  },
  get: (): string | null => customApiUrl,
  set: async (url: string | null): Promise<string | null> => {
    const normalized = normalizeServerApiUrl(url);
    customApiUrl = normalized;
    cachedWorkingBaseUrl = normalized;
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          if (normalized) localStorage.setItem(CUSTOM_API_URL_KEY, normalized);
          else localStorage.removeItem(CUSTOM_API_URL_KEY);
        }
      } else if (normalized) {
        await SecureStore.setItemAsync(CUSTOM_API_URL_KEY, normalized);
      } else {
        await SecureStore.deleteItemAsync(CUSTOM_API_URL_KEY);
      }
    } catch {
    }
    return normalized;
  },
};

export function getCandidateApiUrls(): string[] {
  const envUrl = normalizeServerApiUrl(process.env.EXPO_PUBLIC_API_URL) || normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);
  const targetPort = getPortFromApiUrl(envUrl);
  const candidates: string[] = [];

  if (customApiUrl) {
    candidates.push(customApiUrl);
  }

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
    candidates.push(DEFAULT_CLOUD_API_URL);
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
    candidates.push(DEFAULT_CLOUD_API_URL);
    return [...new Set(candidates.filter(Boolean))];
  }

  if (metroUrl) candidates.push(metroUrl);
  if (envUrl) candidates.push(envUrl);
  candidates.push(DEFAULT_CLOUD_API_URL);
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
  if (!customApiUrlLoaded) {
    await serverUrlStorage.load();
  }
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
    ...(DEFAULT_GROQ_API_KEY ? { 'x-ai-api-key': DEFAULT_GROQ_API_KEY } : {}),
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
    const isRemoteCloudUrl = !isPrivateOrLocalIp(baseUrl);
    const timeoutMs = isRemoteCloudUrl
      ? 35_000
      : isAiRoute
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
      if (i < candidateUrls.length - 1) {
        continue;
      }
    }
  }

  if (!response) {
    if (method === 'GET' && isCacheableGetPath(path)) {
      const cached = await loadCachedResponse<T>(path);
      if (cached !== null) {
        const q = await getOfflineQueue();
        setOfflineStatus(true, q.length);
        return cached;
      }
    }

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
