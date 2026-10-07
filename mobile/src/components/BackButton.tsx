import React from 'react';
import { Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

export interface BackButtonProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  iconColor?: string;
  size?: number;
  accessibilityLabel?: string;
}

export function BackButton({
  onPress,
  style,
  iconColor,
  size = 40,
  accessibilityLabel = 'Go back',
}: BackButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    if (router.canGoBack()) {
      router.back();
    } else {
      // Smart contextual fallback navigation
      if (pathname === '/my-work') {
        router.replace('/(tabs)/tasks' as never);
      } else if (
        pathname.startsWith('/project-') ||
        pathname === '/github-connect' ||
        pathname.startsWith('/community')
      ) {
        router.replace('/(tabs)/community' as never);
      } else if (pathname === '/(auth)/register') {
        router.replace('/(auth)/login' as never);
      } else if (
        pathname === '/coding' ||
        pathname === '/ai-assistant' ||
        pathname === '/lecture-to-life' ||
        pathname === '/interviews' ||
        pathname === '/portfolio' ||
        pathname === '/leaderboard' ||
        pathname === '/admin'
      ) {
        router.replace('/(tabs)/explore' as never);
      } else if (
        pathname === '/change-password' ||
        pathname === '/notification-settings' ||
        pathname === '/accessibility-settings'
      ) {
        router.replace('/(tabs)/settings' as never);
      } else if (
        pathname === '/settings' ||
        pathname === '/notifications' ||
        pathname === '/profile'
      ) {
        router.replace('/' as never);
      }
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isLight ? '#FFFFFF' : colors.surfaceElevated,
          borderColor: colors.border,
        },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Ionicons
        name="arrow-back"
        size={Math.round(size * 0.52)}
        color={iconColor || colors.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.94 }],
  },
});
