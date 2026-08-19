import { StyleSheet, View } from 'react-native';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { useTheme } from '@/context/ThemeContext';

export function GlassHeader() {
  const { theme, colors } = useTheme();
  const isLight = theme === 'light';

  if (isGlassEffectAPIAvailable()) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme={isLight ? 'light' : 'dark'}
        tintColor="rgba(255,255,255,0)"
        style={styles.header}
        pointerEvents="none"
      />
    );
  }

  const bg = isLight ? 'rgba(245,248,246,0.88)' : 'rgba(8,20,13,0.88)';
  return <View style={[styles.header, { backgroundColor: bg }]} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  header: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
});
