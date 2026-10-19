import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppErrorBoundary from '@/components/AppErrorBoundary';
import * as SplashScreen from 'expo-splash-screen';
import NotificationPopup from '@/components/NotificationPopup';
import { AuthProvider } from '@/context/AuthContext';
import {
  AccessibilityProvider,
  useAccessibility,
} from '@/context/AccessibilityContext';
import {
  ThemeProvider,
  useTheme,
} from '@/context/ThemeContext';

LogBox.ignoreLogs([
  'Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go',
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'expo-notifications:',
]);

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppErrorBoundary>
        <SafeAreaProvider>
          <AccessibilityProvider>
            <ThemeProvider>
              <AppLayout />
            </ThemeProvider>
          </AccessibilityProvider>
        </SafeAreaProvider>
      </AppErrorBoundary>
    </GestureHandlerRootView>
  );
}

function AppLayout() {
  const { colors, theme } = useTheme();
  const { reduceMotion } = useAccessibility();

  return (
    <AuthProvider>
      <StatusBar
        style={theme === 'dark' ? 'light' : 'dark'}
      />

      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          contentStyle: {
            backgroundColor: colors.background,
          },
          gestureEnabled: true,
          fullScreenGestureEnabled: false,
          gestureDirection: 'horizontal',
          animation: reduceMotion
            ? 'none'
            : Platform.OS === 'ios'
              ? 'default'
              : 'slide_from_right',
          animationDuration: 240,
        }}
      >
        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="(auth)"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />

        {/* COMMUNITY */}

        <Stack.Screen
          name="community/create"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="community/requests/[id]"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="community/manage/[id]"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="community/[id]"
          options={{ headerShown: false }}
        />

      </Stack>
        
        <NotificationPopup />
    </AuthProvider>
  );
}
