import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

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

type ThemeContextValue = { theme: ThemeName; colors: ThemeColors; setTheme(theme: ThemeName): Promise<void> };
const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'synergysphere.theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('dark');
  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((value) => {
        if (value === 'light' || value === 'dark') setThemeState(value);
      })
      .catch(() => undefined);
  }, []);
  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      colors: themes[theme],
      setTheme: async (nextTheme) => {
        setThemeState(nextTheme);
        await SecureStore.setItemAsync(STORAGE_KEY, nextTheme);
      },
    }),
    [theme]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
