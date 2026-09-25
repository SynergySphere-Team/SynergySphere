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
    return host ? `http://${host}:4001/api` : null;
  } catch {
    return null;
  }
}

export function getApiUrl(): string {
  const envUrl = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);
  if (envUrl) return envUrl;

  // Infer host from Expo Go / development client Metro connection
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any).manifest?.debuggerHost;

  const metroUrl = apiUrlFromMetroHost(hostUri);
  if (metroUrl) return metroUrl;

  return '';
}

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number, public readonly details?: Record<string, string[]>) {
    super(message);
  }
}

async function getToken(): Promise<string | null> {
  return Platform.OS === 'web' ? webToken : SecureStore.getItemAsync(TOKEN_KEY);
}

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

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`, { ...options, headers });
  } catch {
    throw new ApiError(`Unable to reach SynergySphere at ${baseUrl}. Make sure the backend is running and this API URL is reachable from your device.`);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.error || 'Request failed.', response.status, body.details);
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export const authStorage = {
  getToken,
  setToken: (token: string) => Platform.OS === 'web' ? Promise.resolve(webToken = token) : SecureStore.setItemAsync(TOKEN_KEY, token),
  clearToken: () => Platform.OS === 'web' ? Promise.resolve(webToken = null) : SecureStore.deleteItemAsync(TOKEN_KEY),
};
