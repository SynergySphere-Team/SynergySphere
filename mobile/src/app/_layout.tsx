import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AccessibilityProvider>
          <ThemeProvider>
            <AppLayout />
          </ThemeProvider>
        </AccessibilityProvider>
      </SafeAreaProvider>
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
            : 'slide_from_right',
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
    </AuthProvider>
  );
}
