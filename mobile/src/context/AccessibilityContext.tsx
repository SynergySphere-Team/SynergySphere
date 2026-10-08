import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type AccessibilityPreferences = {
  largerText: boolean;
  highContrast: boolean;
  eyeComfort?: boolean;
  reduceMotion: boolean;
};

type AccessibilityContextValue = AccessibilityPreferences & {
  eyeComfort: boolean;
  setLargerText(value: boolean): Promise<void>;
  setHighContrast(value: boolean): Promise<void>;
  setEyeComfort(value: boolean): Promise<void>;
  setReduceMotion(value: boolean): Promise<void>;
  fontSize(size: number): number;
};

const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  largerText: false,
  highContrast: false,
  eyeComfort: false,
  reduceMotion: false,
};

const STORAGE_KEY = 'synergysphere.accessibility';

const AccessibilityContext =
  createContext<AccessibilityContextValue | null>(null);

async function readPreferences(): Promise<AccessibilityPreferences> {
  try {
    let raw: string | null = null;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        raw = window.localStorage.getItem(STORAGE_KEY);
      }
    } else {
      raw = await SecureStore.getItemAsync(STORAGE_KEY);
    }

    if (!raw) return DEFAULT_PREFERENCES;

    const parsed = JSON.parse(raw) as Partial<AccessibilityPreferences>;
    const isComfort = Boolean(parsed.eyeComfort ?? parsed.highContrast);
    return {
      largerText: Boolean(parsed.largerText),
      highContrast: isComfort,
      eyeComfort: isComfort,
      reduceMotion: Boolean(parsed.reduceMotion),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

async function savePreferences(
  preferences: AccessibilityPreferences,
): Promise<void> {
  const raw = JSON.stringify(preferences);

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, raw);
    }
    return;
  }

  await SecureStore.setItemAsync(STORAGE_KEY, raw);
}

export function AccessibilityProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [preferences, setPreferences] =
    useState<AccessibilityPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    void readPreferences().then(setPreferences);
  }, []);

  const updatePreferences = useCallback(
    async (patch: Partial<AccessibilityPreferences>) => {
      let nextState: AccessibilityPreferences = DEFAULT_PREFERENCES;
      setPreferences((prev) => {
        nextState = {
          ...prev,
          ...patch,
        };
        return nextState;
      });

      try {
        await savePreferences(nextState);
      } catch (error) {
        console.error(
          'Unable to save accessibility preferences:',
          error,
        );
      }
    },
    [],
  );

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      ...preferences,
      eyeComfort: Boolean(preferences.eyeComfort ?? preferences.highContrast),
      highContrast: Boolean(preferences.highContrast ?? preferences.eyeComfort),
      setLargerText: (enabled) =>
        updatePreferences({ largerText: enabled }),
      setHighContrast: (enabled) =>
        updatePreferences({ highContrast: enabled, eyeComfort: enabled }),
      setEyeComfort: (enabled) =>
        updatePreferences({ eyeComfort: enabled, highContrast: enabled }),
      setReduceMotion: (enabled) =>
        updatePreferences({ reduceMotion: enabled }),

      // 30% increase keeps layouts readable without making controls overflow.
      fontSize: (size) =>
        preferences.largerText
          ? Math.round(size * 1.3)
          : size,
    }),
    [preferences, updatePreferences],
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);

  if (!context) {
    throw new Error(
      'useAccessibility must be used inside AccessibilityProvider',
    );
  }

  return context;
}
