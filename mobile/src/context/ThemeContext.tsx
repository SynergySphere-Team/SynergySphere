import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { useAccessibility } from '@/context/AccessibilityContext';
import {
  eyeComfortThemes,
  highContrastThemes,
  themes,
  type ThemeColors,
  type ThemeName,
} from './themeTokens';

export {
  eyeComfortThemes,
  highContrastThemes,
  themes,
  type ThemeColors,
  type ThemeName,
};

export type ThemeContextValue = {
  theme: ThemeName;
  colors: ThemeColors;
  isEyeComfort: boolean;
  setTheme(theme: ThemeName): Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'synergysphere.theme';
const LEGACY_STORAGE_KEY = 'synergysphere-theme';

async function readStoredTheme(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return null;
    return (
      window.localStorage.getItem(STORAGE_KEY) ||
      window.localStorage.getItem(LEGACY_STORAGE_KEY)
    );
  }

  return SecureStore.getItemAsync(STORAGE_KEY);
}

async function saveStoredTheme(theme: ThemeName): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, theme);
      window.localStorage.setItem(LEGACY_STORAGE_KEY, theme);
    }
    return;
  }

  await SecureStore.setItemAsync(STORAGE_KEY, theme);
}

function getInitialTheme(): ThemeName {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const stored =
        window.localStorage.getItem(STORAGE_KEY) ||
        window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {
      // fallback
    }
  }
  return 'dark';
}

export function ThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState<ThemeName>(getInitialTheme);
  const { eyeComfort, highContrast } = useAccessibility();
  const isEyeComfort = Boolean(eyeComfort ?? highContrast);

  useEffect(() => {
    let mounted = true;
    readStoredTheme()
      .then((value) => {
        if (mounted && (value === 'light' || value === 'dark')) {
          setThemeState(value);
        }
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isEyeComfort,
      colors: isEyeComfort
        ? eyeComfortThemes[theme]
        : themes[theme],
      setTheme: async (nextTheme) => {
        setThemeState(nextTheme);
        try {
          await saveStoredTheme(nextTheme);
        } catch {
        }
      },
    }),
    [theme, isEyeComfort],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useTheme must be used inside ThemeProvider',
    );
  }

  return context;
}
