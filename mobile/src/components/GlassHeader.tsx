import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { useTheme } from '@/context/ThemeContext';

/**
 * Translucent frosted-glass header overlay with a soft gradient fade at the
 * bottom edge so you can't tell exactly where the blur starts.
 *
 * Two-part composition:
 *   1. GlassView — covers the status-bar area + FADE_EXTRA px below it
 *      so the blur extends past the safe-area boundary.
 *   2. Gradient mask — a stack of progressively-transparent Views layered
 *      over the bottom portion of the glass, creating a smooth dissolve
 *      from full-blur at the top to invisible at the very bottom.
 *
 * The green tint is removed by passing tintColor="rgba(255,255,255,0)"
 * so the native OS vibrancy renders with neutral grey frost, not the app's
 * green palette.
 */

// How many extra px below the status bar the blur extends before fading out.
const FADE_EXTRA = 44;

// Gradient bands from most-opaque (bottom) to transparent (top of the fade zone).
// Each entry is [fractionFromTop, opacity] where fraction=0 is the start of the
// fade zone and fraction=1 is the bottom of the whole header.
const BANDS = [0.30, 0.50, 0.65, 0.78, 0.87, 0.93, 0.97, 1.0] as const;

export function GlassHeader() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();

  const statusBarH = Math.max(insets.top, 20);
  // Total height of the entire header layer (status bar + fade zone).
  const totalH = statusBarH + FADE_EXTRA;
  // The fade zone sits at the bottom of the header.
  const fadeZoneTop = statusBarH - 4; // overlap 4px into the solid area for continuity

  const isLight = theme === 'light';

  // Neutral background color used for the "dissolve" overlay bands.
  // Matches the screen background so the bands visually disappear into it.
  const bgColor = colors.background; // e.g. '#F5F8F6' light / '#0a1f10' dark

  if (isGlassEffectAPIAvailable()) {
    return (
      <View style={[styles.header, { height: totalH }]} pointerEvents="none">
        {/* 1. The actual frosted glass — no tint so it stays neutral grey/white */}
        <GlassView
          glassEffectStyle="regular"
          colorScheme={isLight ? 'light' : 'dark'}
          tintColor="rgba(255,255,255,0)"
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        {/* 2. Gradient dissolve bands layered over the bottom of the glass */}
        {BANDS.map((frac, i) => {
          const opacity = (i + 1) / BANDS.length;
          const top = fadeZoneTop + frac * (totalH - fadeZoneTop);
          const nextFrac = BANDS[i + 1] ?? 1;
          const bottom = totalH - (fadeZoneTop + nextFrac * (totalH - fadeZoneTop));
          return (
            <View
              key={i}
              style={[
                styles.band,
                {
                  top,
                  bottom: Math.max(bottom, 0),
                  backgroundColor: bgColor,
                  opacity,
                },
              ]}
            />
          );
        })}
      </View>
    );
  }

  // ─── Fallback for Android / web ──────────────────────────────────────────────
  // Semi-transparent bar with matching pseudo-gradient overlay bands.
  const solidBg = isLight ? 'rgba(245,248,246,0.88)' : 'rgba(8,20,13,0.88)';

  return (
    <View style={[styles.header, { height: totalH }]} pointerEvents="none">
      <View
        style={[StyleSheet.absoluteFillObject, { backgroundColor: solidBg }]}
      />
      {BANDS.map((frac, i) => {
        const opacity = (i + 1) / BANDS.length;
        const top = fadeZoneTop + frac * (totalH - fadeZoneTop);
        const nextFrac = BANDS[i + 1] ?? 1;
        const bottom = totalH - (fadeZoneTop + nextFrac * (totalH - fadeZoneTop));
        return (
          <View
            key={i}
            style={[
              styles.band,
              {
                top,
                bottom: Math.max(bottom, 0),
                backgroundColor: bgColor,
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    overflow: 'hidden',
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
