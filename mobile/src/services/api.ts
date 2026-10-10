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
        candidates.push(`http://localhost:${targetPort}/api`);
        candidates.push(`http://127.0.0.1:${targetPort}/api`);
      } else {
        candidates.push(`http://${hostname}:${targetPort}/api`);
      }
    }
    candidates.push(`http://localhost:${targetPort}/api`);
    candidates.push(`http://127.0.0.1:${targetPort}/api`);
    if (envUrl) candidates.push(envUrl);
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
  // Always include localhost and loopback fallbacks for PC / dev tools
  candidates.push(`http://localhost:${targetPort}/api`);
  candidates.push(`http://127.0.0.1:${targetPort}/api`);
  if (Platform.OS === 'android') {
    candidates.push(`http://10.0.2.2:${targetPort}/api`);
  }

  return [...new Set(candidates.filter(Boolean))];
}

export function getApiUrl(): string {
  const candidates = getCandidateApiUrls();
  return candidates[0] || 'http://localhost:4000/api';
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

const REQUEST_TIMEOUT_MS = 10_000;
const FALLBACK_TIMEOUT_MS = 3_000;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const candidateUrls = getCandidateApiUrls();
  if (candidateUrls.length === 0) {
    throw new ApiError('API URL is not configured. Set EXPO_PUBLIC_API_URL in mobile/.env.');
  }

  const token = await getToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-SynergySphere-Client': 'mobile',
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
    const timeoutMs = i === 0 ? REQUEST_TIMEOUT_MS : FALLBACK_TIMEOUT_MS;
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
      lastError = err;
      // If there are more candidates, try the next fallback (e.g. localhost/127.0.0.1)
      if (i < candidateUrls.length - 1) {
        continue;
      }
    }
  }

  if (!response) {
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
      if (typeof localStorage !== 'undefined') localStorage.removeItem(TOKEN_KEY);
      webToken = null;
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(TOKEN_KEY);
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
