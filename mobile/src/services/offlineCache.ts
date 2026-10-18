import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const CACHE_PREFIX = 'synergysphere.cache.';
const QUEUE_KEY = 'synergysphere.offline.queue';

const memoryCache = new Map<string, string>();
let isCurrentlyOffline = false;
const offlineListeners = new Set<(offline: boolean, queuedCount: number) => void>();

export interface QueuedMutation {
  id: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  createdAt: string;
}

function sanitizeKey(path: string): string {
  return CACHE_PREFIX + path.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 90);
}

export function isCacheableGetPath(path: string): boolean {
  const clean = path.split('?')[0];
  return (
    clean.startsWith('/dashboard/stats') ||
    clean.startsWith('/tasks') ||
    clean.startsWith('/challenges') ||
    clean.startsWith('/curriculum') ||
    clean.startsWith('/ai/lecture-to-life') ||
    clean.startsWith('/ai/srs/due') ||
    clean.startsWith('/ai/threads') ||
    clean.startsWith('/wellness') ||
    clean.startsWith('/notifications')
  );
}

export async function saveCachedResponse(path: string, data: unknown): Promise<void> {
  if (!isCacheableGetPath(path)) return;
  const key = sanitizeKey(path);
  try {
    const serialized = JSON.stringify({ savedAt: Date.now(), data });
    memoryCache.set(key, serialized);
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, serialized);
      }
    } else if (serialized.length < 1900) {
      await SecureStore.setItemAsync(key, serialized);
    }
  } catch {
  }
}

export async function loadCachedResponse<T>(path: string): Promise<T | null> {
  const key = sanitizeKey(path);
  try {
    let raw = memoryCache.get(key) || null;
    if (!raw) {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          raw = localStorage.getItem(key);
        }
      } else {
        raw = await SecureStore.getItemAsync(key);
      }
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return (parsed?.data ?? null) as T | null;
  } catch {
    return null;
  }
}

export async function getOfflineQueue(): Promise<QueuedMutation[]> {
  try {
    let raw: string | null = memoryCache.get(QUEUE_KEY) || null;
    if (!raw) {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        raw = localStorage.getItem(QUEUE_KEY);
      } else if (Platform.OS !== 'web') {
        raw = await SecureStore.getItemAsync(QUEUE_KEY);
      }
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveOfflineQueue(queue: QueuedMutation[]): Promise<void> {
  const serialized = JSON.stringify(queue.slice(-30));
  memoryCache.set(QUEUE_KEY, serialized);
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(QUEUE_KEY, serialized);
    } else if (Platform.OS !== 'web' && serialized.length < 1900) {
      await SecureStore.setItemAsync(QUEUE_KEY, serialized);
    }
  } catch {
  }
  notifyOfflineListeners(isCurrentlyOffline, queue.length);
}

export async function enqueueOfflineMutation(
  method: QueuedMutation['method'],
  path: string,
  body?: unknown,
): Promise<QueuedMutation> {
  const queue = await getOfflineQueue();
  const item: QueuedMutation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    method,
    path,
    body,
    createdAt: new Date().toISOString(),
  };
  queue.push(item);
  await saveOfflineQueue(queue);
  return item;
}

export async function flushOfflineQueue(
  executeRequest: (path: string, options: RequestInit) => Promise<unknown>,
): Promise<number> {
  const queue = await getOfflineQueue();
  if (queue.length === 0) return 0;

  const remaining: QueuedMutation[] = [];
  let flushed = 0;

  for (const item of queue) {
    try {
      await executeRequest(item.path, {
        method: item.method,
        body: item.body === undefined ? undefined : JSON.stringify(item.body),
      });
      flushed++;
    } catch {
      remaining.push(item);
    }
  }

  await saveOfflineQueue(remaining);
  return flushed;
}

export function setOfflineStatus(offline: boolean, queuedCount = 0): void {
  if (isCurrentlyOffline !== offline) {
    isCurrentlyOffline = offline;
    notifyOfflineListeners(offline, queuedCount);
  }
}

export function getOfflineStatus(): boolean {
  return isCurrentlyOffline;
}

function notifyOfflineListeners(offline: boolean, queuedCount: number): void {
  for (const cb of offlineListeners) {
    try {
      cb(offline, queuedCount);
    } catch {
    }
  }
}

export function subscribeOfflineStatus(cb: (offline: boolean, queuedCount: number) => void): () => void {
  offlineListeners.add(cb);
  return () => {
    offlineListeners.delete(cb);
  };
}
