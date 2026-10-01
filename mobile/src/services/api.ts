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

function apiUrlFromMetroHost(hostUri: unknown): string | null {
  if (typeof hostUri !== 'string' || !hostUri.trim()) return null;

  try {
    // Expo reports the Metro address as "host:port". URL parsing also keeps
    // IPv6 hosts intact instead of splitting them at their first colon.
    const host = new URL(`http://${hostUri}`).hostname;
    return host ? `http://${host}:4000/api` : null;
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

export function getApiUrl(): string {
  const envUrl = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      const hostname = window.location.hostname;
      // When accessed from localhost/loopback in the browser, always use localhost:4000
      // so stale LAN IPs from .env files don't prevent local connections.
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:4000/api';
      }
      // If accessing via custom hostname or LAN IP in the browser and envUrl is not a remote production host,
      // route to the same host on port 4000.
      if (!envUrl || isPrivateOrLocalIp(envUrl)) {
        return `http://${hostname}:4000/api`;
      }
    }
    return envUrl || 'http://localhost:4000/api';
  }

  // Infer host from Expo Go / development client Metro connection
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any).manifest?.debuggerHost;

  const metroUrl = apiUrlFromMetroHost(hostUri);

  // If envUrl is an explicit remote URL (e.g. https://... ngrok or deployed backend), respect it
  if (envUrl && !isPrivateOrLocalIp(envUrl)) {
    return envUrl;
  }

  // In development, the active Metro host matches the dev server network
  if (metroUrl) return metroUrl;

  // Fallback to configured envUrl if available
  if (envUrl) return envUrl;

  // Final fallback by platform
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000/api';
  }

  return 'http://localhost:4000/api';
}

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number, public readonly details?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getToken(): Promise<string | null> {
  return Platform.OS === 'web' ? webToken : SecureStore.getItemAsync(TOKEN_KEY);
}

const REQUEST_TIMEOUT_MS = 10_000;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiUrl();
  if (!baseUrl) {
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  const fullUrl = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  try {
    response = await fetch(fullUrl, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new ApiError(
        `Unable to connect to the SynergySphere server (connection timed out after 10s at ${baseUrl}). Check that the backend is running and that your device is connected to the same network.`
      );
    }
    throw new ApiError(
      `Unable to connect to the SynergySphere server at ${baseUrl}. Check that the backend is running and that your device is connected to the same network.`
    );
  } finally {
    clearTimeout(timer);
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

export const authStorage = {
  getToken,
  setToken: (token: string) => Platform.OS === 'web' ? Promise.resolve(webToken = token) : SecureStore.setItemAsync(TOKEN_KEY, token),
  clearToken: () => Platform.OS === 'web' ? Promise.resolve(webToken = null) : SecureStore.deleteItemAsync(TOKEN_KEY),
};
