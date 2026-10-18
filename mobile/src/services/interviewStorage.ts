import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { InterviewSessionState } from '@/types/interview';

const STORAGE_KEY = 'synergysphere_interview_session_draft';
const IN_MEMORY_FALLBACK = new Map<string, string>();

/**
 * Storage adapter handling seamless serialization and restoration
 * of active candidate interview drafts across app kills and backgrounding.
 */
export async function saveInterviewDraft(state: InterviewSessionState): Promise<void> {
  const serialized = JSON.stringify({
    ...state,
    lastSavedAt: Date.now(),
  });

  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, serialized);
        return;
      }
    }

    await SecureStore.setItemAsync(STORAGE_KEY, serialized);
  } catch (error) {
    IN_MEMORY_FALLBACK.set(STORAGE_KEY, serialized);
  }
}

export async function loadInterviewDraft(): Promise<InterviewSessionState | null> {
  try {
    let raw: string | null = null;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        raw = window.localStorage.getItem(STORAGE_KEY);
      }
    } else {
      raw = await SecureStore.getItemAsync(STORAGE_KEY);
    }

    if (!raw && IN_MEMORY_FALLBACK.has(STORAGE_KEY)) {
      raw = IN_MEMORY_FALLBACK.get(STORAGE_KEY) || null;
    }

    if (!raw) return null;

    const parsed = JSON.parse(raw) as InterviewSessionState;

    if (!parsed.sessionId || !parsed.stages || !Array.isArray(parsed.stages)) {
      return null;
    }

    return parsed;
  } catch (err) {
    console.warn('[interviewStorage] Failed to restore draft:', err);
    return null;
  }
}

export async function clearInterviewDraft(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    }
  } catch (err) {
  }
  IN_MEMORY_FALLBACK.delete(STORAGE_KEY);
}

export async function hasActiveDraft(): Promise<boolean> {
  const draft = await loadInterviewDraft();
  return draft !== null && draft.currentStage !== 'COMPLETED';
}
