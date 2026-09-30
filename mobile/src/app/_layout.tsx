import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

LogBox.ignoreLogs([
  'Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go',
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'expo-notifications:',
]);

import { AuthProvider } from '@/context/AuthContext';
import {
  ThemeProvider,
  useTheme,
} from '@/context/ThemeContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppLayout />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppLayout() {
  const { colors, theme } = useTheme();

  return (
    <AuthProvider>
      <StatusBar
        style={
          theme === 'dark'
            ? 'light'
            : 'dark'
        }
      />

      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor:
              colors.background,
          },
          headerTintColor:
            colors.text,
          contentStyle: {
            backgroundColor:
              colors.background,
          },
          gestureEnabled: true,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />

        {/* COMMUNITY */}

        <Stack.Screen
          name="community/create"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="community/requests/[id]"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="community/manage/[id]"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="community/[id]"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </AuthProvider>
  );
}