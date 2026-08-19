import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { useTheme } from '@/context/ThemeContext';

/**
 * Translucent frosted-glass header overlay.
 *
 * Sits absolutely over the top of every screen covering the status-bar area.
 * As the user scrolls, the content beneath blurs through the glass.
 * Falls back to a semi-transparent View on devices/platforms that don't
 * support the Liquid Glass API (Android, old iOS, web).
 */
export function GlassHeader() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  // Height of the glass bar = status bar inset + a tiny extra so it doesn't end at an odd pixel.
  const height = Math.max(insets.top, 20);

  if (isGlassEffectAPIAvailable()) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme={theme === 'light' ? 'light' : 'dark'}
        style={[styles.header, { height }]}
        pointerEvents="none"
      />
    );
  }

  // Fallback for Android / web — semi-transparent dark bar that still looks intentional.
  const bg =
    theme === 'light' ? 'rgba(245,248,246,0.82)' : 'rgba(8,20,13,0.82)';

  return (
    <View
      style={[styles.header, { height, backgroundColor: bg }]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
});
