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

export const eyeComfortThemes: Record<ThemeName, ThemeColors> = {
  dark: {
    ...themes.dark,
    background: '#121614',
    surface: '#18201c',
    surfaceElevated: '#202924',
    border: '#2e3d36',
    text: '#f2f7f4',
    muted: '#b2c8c0',
    primary: '#9fe571',
    primaryDark: '#1a3320',
    primaryText: '#06170d',
    danger: '#ff7e79',
    warning: '#f6c358',
    inputBg: '#18201c',
    inputBorder: '#2e3d36',
    placeholderText: '#78958a',
    completedTitle: '#b2c8c0',
    completedDesc: '#78958a',
    navSurface: '#121614',
    navBorder: '#2e3d36',
    navActive: '#9fe571',
    navActiveText: '#06170d',
    navInactive: '#78958a',
  },
  light: {
    ...themes.light,
    background: '#fcfaf5',
    surface: '#f6f3eb',
    surfaceElevated: '#ede8dc',
    border: '#dcd5c7',
    text: '#24211a',
    muted: '#615b50',
    primary: '#1e6827',
    primaryDark: '#e5eedf',
    primaryText: '#ffffff',
    danger: '#c62828',
    warning: '#d84315',
    inputBg: '#ffffff',
    inputBorder: '#dcd5c7',
    placeholderText: '#8f887b',
    completedTitle: '#615b50',
    completedDesc: '#8f887b',
    navSurface: '#f6f3eb',
    navBorder: '#dcd5c7',
    navActive: '#1e6827',
    navActiveText: '#ffffff',
    navInactive: '#615b50',
  },
};

export const highContrastThemes: Record<ThemeName, ThemeColors> = eyeComfortThemes;
