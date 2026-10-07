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

export type ThemeName = 'dark' | 'light';

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  text: string;
  muted: string;
  primary: string;
  primaryDark: string;
  primaryText: string;
  danger: string;
  warning: string;
  inputBg: string;
  inputBorder: string;
  placeholderText: string;
  completedTitle: string;
  completedDesc: string;
  navSurface: string;
  navBorder: string;
  navActive: string;
  navActiveText: string;
  navInactive: string;
};

export const themes: Record<ThemeName, ThemeColors> = {
  dark: {
    background: '#030608',
    surface: '#0b171d',
    surfaceElevated: '#102128',
    border: 'rgba(255,255,255,0.12)',
    text: '#f5f9fa',
    muted: '#9aabb2',
    primary: '#91db5e',
    primaryDark: '#183d20',
    primaryText: '#07180d',
    danger: '#ff7676',
    warning: '#f7c65a',
    inputBg: '#102128',
    inputBorder: 'rgba(255,255,255,0.15)',
    placeholderText: '#7f929a',
    completedTitle: '#7f929a',
    completedDesc: '#6a7c84',
    navSurface: '#0f1710',
    navBorder: 'rgba(255,255,255,0.12)',
    navActive: '#91db5e',
    navActiveText: '#07180d',
    navInactive: '#7a8e84',
  },
  light: {
    background: '#F5F8F6',
    surface: '#FFFFFF',
    surfaceElevated: '#EDF3EF',
    border: '#D5E0DA',
    text: '#10231D',
    muted: '#50685F',
    primary: '#91db5e',
    primaryDark: '#E2F5DA',
    primaryText: '#07180d',
    danger: '#D32F2F',
    warning: '#E65100',
    inputBg: '#EDF3EF',
    inputBorder: '#C8D6CE',
    placeholderText: '#687D75',
    completedTitle: '#50685F',
    completedDesc: '#687D75',
    navSurface: '#FFFFFF',
    navBorder: '#D5E0DA',
    navActive: '#91db5e',
    navActiveText: '#07180d',
    navInactive: '#50685F',
  },
};

const highContrastThemes: Record<ThemeName, ThemeColors> = {
  dark: {
    ...themes.dark,
    background: '#000000',
    surface: '#050A0C',
    surfaceElevated: '#0A1418',
    border: '#FFFFFF',
    text: '#FFFFFF',
    muted: '#E1E8EA',
    inputBg: '#050A0C',
    inputBorder: '#FFFFFF',
    placeholderText: '#D3DCDF',
    completedTitle: '#E1E8EA',
    completedDesc: '#D3DCDF',
    navSurface: '#000000',
    navBorder: '#FFFFFF',
    navInactive: '#E1E8EA',
  },
  light: {
    ...themes.light,
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceElevated: '#F4F7F5',
    border: '#10231D',
    text: '#000000',
    muted: '#263D34',
    inputBg: '#FFFFFF',
    inputBorder: '#10231D',
    placeholderText: '#334A41',
    completedTitle: '#263D34',
    completedDesc: '#334A41',
    navSurface: '#FFFFFF',
    navBorder: '#10231D',
    navInactive: '#263D34',
  },
};

type ThemeContextValue = {
  theme: ThemeName;
  colors: ThemeColors;
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
  const { highContrast } = useAccessibility();

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
      colors: highContrast
        ? highContrastThemes[theme]
        : themes[theme],
      setTheme: async (nextTheme) => {
        setThemeState(nextTheme);
        try {
          await saveStoredTheme(nextTheme);
        } catch {
          // ignore storage error
        }
      },
    }),
    [theme, highContrast],
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
