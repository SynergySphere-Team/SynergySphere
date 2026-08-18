import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

export type ThemeName = 'dark' | 'light';
export type ThemeColors = {
  background: string; surface: string; surfaceElevated: string; border: string;
  text: string; muted: string; primary: string; primaryDark: string; danger: string; warning: string;
};

export const themes: Record<ThemeName, ThemeColors> = {
  dark: { background: '#030608', surface: '#0b171d', surfaceElevated: '#102128', border: 'rgba(255,255,255,0.09)', text: '#f5f9fa', muted: '#9aabb2', primary: '#91db5e', primaryDark: '#183d20', danger: '#ff7676', warning: '#f7c65a' },
  light: { background: '#f5f8f6', surface: '#ffffff', surfaceElevated: '#edf3ef', border: '#d6e0d9', text: '#102118', muted: '#5b7063', primary: '#397c37', primaryDark: '#dcefd8', danger: '#c52f35', warning: '#926900' },
};

type ThemeContextValue = { theme: ThemeName; colors: ThemeColors; setTheme(theme: ThemeName): Promise<void> };
const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'synergysphere.theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('dark');
  useEffect(() => { SecureStore.getItemAsync(STORAGE_KEY).then(value => { if (value === 'light' || value === 'dark') setThemeState(value); }).catch(() => undefined); }, []);
  const value = useMemo<ThemeContextValue>(() => ({ theme, colors: themes[theme], setTheme: async nextTheme => { setThemeState(nextTheme); await SecureStore.setItemAsync(STORAGE_KEY, nextTheme); } }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() { const context = useContext(ThemeContext); if (!context) throw new Error('useTheme must be used inside ThemeProvider'); return context; }
