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
  reduceMotion: boolean;
};

type AccessibilityContextValue = AccessibilityPreferences & {
  setLargerText(value: boolean): Promise<void>;
  setHighContrast(value: boolean): Promise<void>;
  setReduceMotion(value: boolean): Promise<void>;
  fontSize(size: number): number;
};

const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  largerText: false,
  highContrast: false,
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

    return {
      largerText: Boolean(parsed.largerText),
      highContrast: Boolean(parsed.highContrast),
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

  const updatePreference = useCallback(
    async (
      key: keyof AccessibilityPreferences,
      enabled: boolean,
    ) => {
      const next = {
        ...preferences,
        [key]: enabled,
      };

      setPreferences(next);

      try {
        await savePreferences(next);
      } catch (error) {
        console.error(
          'Unable to save accessibility preferences:',
          error,
        );
      }
    },
    [preferences],
  );

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      ...preferences,
      setLargerText: (enabled) =>
        updatePreference('largerText', enabled),
      setHighContrast: (enabled) =>
        updatePreference('highContrast', enabled),
      setReduceMotion: (enabled) =>
        updatePreference('reduceMotion', enabled),

      // 30% increase keeps layouts readable without making controls overflow.
      fontSize: (size) =>
        preferences.largerText
          ? Math.round(size * 1.3)
          : size,
    }),
    [preferences, updatePreference],
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
