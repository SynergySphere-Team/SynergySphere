import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: false,
        gestureDirection: 'horizontal',
        animation: 'slide_from_right',
      }}
    />
  );
}
