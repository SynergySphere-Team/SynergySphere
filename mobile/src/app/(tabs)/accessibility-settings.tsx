import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/Screen';
import { Heading } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAccessibility } from '@/context/AccessibilityContext';

export default function AccessibilitySettingsScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();

  const {
    largerText,
    eyeComfort,
    highContrast,
    reduceMotion,
    setLargerText,
    setEyeComfort,
    setHighContrast,
    setReduceMotion,
    fontSize,
  } = useAccessibility();

  function goBackToSettings() {
    router.replace('/(tabs)/settings' as never);
  }

  async function openDeviceSettings() {
    try {
      // Windows web build: open Windows Accessibility settings.
      if (Platform.OS === 'web') {
        const userAgent =
          typeof navigator !== 'undefined'
            ? navigator.userAgent.toLowerCase()
            : '';

        if (userAgent.includes('windows')) {
          window.location.href = 'ms-settings:easeofaccess';
          return;
        }

        console.warn(
          'Direct system accessibility settings are only supported from the Windows web build.',
        );
        return;
      }

      // iOS does not provide a supported deep link directly to
      // Settings > Accessibility. Explain where to go, then open Settings.
      if (Platform.OS === 'ios') {
        Alert.alert(
          'Open Accessibility Settings',
          'In Settings, go to Accessibility to manage VoiceOver, text size, display, motion and other accessibility options.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                void Linking.openSettings();
              },
            },
          ],
        );
        return;
      }

      // Fallback for other native platforms.
      await Linking.openSettings();
    } catch (error) {
      console.error(
        'Unable to open system accessibility settings:',
        error,
      );
    }
  }

  const accent =
    theme === 'light'
      ? '#1e6827'
      : colors.primary;

  const activeTrack =
    theme === 'light'
      ? '#8fdf58'
      : colors.primary;

  return (
    <Screen onBack={goBackToSettings}>
      <View style={styles.page}>
        <Heading subtitle="Adjust text, eye comfort and motion preferences.">
          Accessibility
        </Heading>

        <Text
          style={[
            styles.sectionLabel,
            {
              color: highContrast
                ? colors.text
                : colors.muted,
              fontSize: fontSize(13),
            },
          ]}
        >
          VISION & COMFORT
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: highContrast
                ? colors.text
                : colors.border,
              borderWidth: highContrast ? 2 : 1,
            },
          ]}
        >
          <PreferenceRow
            icon="text-outline"
            title="Larger Text"
            description="Increase text size for improved readability."
            value={largerText}
            onValueChange={(value) =>
              void setLargerText(value)
            }
            colors={colors}
            accent={accent}
            activeTrack={activeTrack}
            fontSize={fontSize}
          />

          <Divider
            color={
              highContrast
                ? colors.text
                : colors.border
            }
          />

          <PreferenceRow
            icon="eye-outline"
            title="Eye Comfort"
            description="Warm tint and optimized contrast to reduce visual fatigue during long coding sessions."
            value={eyeComfort}
            onValueChange={(value) =>
              void setEyeComfort(value)
            }
            colors={colors}
            accent={accent}
            activeTrack={activeTrack}
            fontSize={fontSize}
          />
        </View>

        <Text
          style={[
            styles.sectionLabel,
            {
              color: highContrast
                ? colors.text
                : colors.muted,
              fontSize: fontSize(13),
            },
          ]}
        >
          MOTION
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: highContrast
                ? colors.text
                : colors.border,
              borderWidth: highContrast ? 2 : 1,
            },
          ]}
        >
          <PreferenceRow
            icon="walk-outline"
            title="Reduce Motion"
            description="Reduce non-essential animations and transitions."
            value={reduceMotion}
            onValueChange={(value) =>
              void setReduceMotion(value)
            }
            colors={colors}
            accent={accent}
            activeTrack={activeTrack}
            fontSize={fontSize}
          />
        </View>

        <Text
          style={[
            styles.sectionLabel,
            {
              color: highContrast
                ? colors.text
                : colors.muted,
              fontSize: fontSize(13),
            },
          ]}
        >
          SYSTEM ACCESSIBILITY
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: highContrast
                ? colors.text
                : colors.border,
              borderWidth: highContrast ? 2 : 1,
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open system accessibility settings"
            onPress={openDeviceSettings}
            style={({ pressed }) => [
              styles.deviceRow,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: colors.surfaceElevated,
                },
              ]}
            >
              <Ionicons
                name="accessibility-outline"
                size={22}
                color={accent}
              />
            </View>

            <View style={styles.rowText}>
              <Text
                style={[
                  styles.rowTitle,
                  {
                    color: colors.text,
                    fontSize: fontSize(16),
                  },
                ]}
              >
                System Accessibility Settings
              </Text>

              <Text
                style={[
                  styles.rowDescription,
                  {
                    color: colors.muted,
                    fontSize: fontSize(13),
                  },
                ]}
              >
                Open your system settings to manage screen reader, text size and other accessibility options.
              </Text>
            </View>

            <Ionicons
              name="open-outline"
              size={20}
              color={colors.muted}
            />
          </Pressable>
        </View>

        <View
          style={[
            styles.infoBox,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={accent}
          />

          <Text
            style={[
              styles.infoText,
              {
                color: colors.muted,
                fontSize: fontSize(12),
              },
            ]}
          >
            Your accessibility preferences are saved on this device.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

function PreferenceRow({
  icon,
  title,
  description,
  value,
  onValueChange,
  colors,
  accent,
  activeTrack,
  fontSize,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  colors: any;
  accent: string;
  activeTrack: string;
  fontSize: (size: number) => number;
}) {
  return (
    <View style={styles.preferenceRow}>
      <View
        style={[
          styles.iconBox,
          {
            backgroundColor: colors.surfaceElevated,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={accent}
        />
      </View>

      <View style={styles.rowText}>
        <Text
          style={[
            styles.rowTitle,
            {
              color: colors.text,
              fontSize: fontSize(16),
            },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.rowDescription,
            {
              color: colors.muted,
              fontSize: fontSize(13),
            },
          ]}
        >
          {description}
        </Text>
      </View>

      <Switch
        accessibilityLabel={title}
        accessibilityRole="switch"
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: colors.border,
          true: activeTrack,
        }}
        thumbColor={
          value
            ? accent
            : colors.surfaceElevated
        }
      />
    </View>
  );
}

function Divider({ color }: { color: string }) {
  return (
    <View
      style={[
        styles.divider,
        {
          backgroundColor: color,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 120,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  headerText: {
    flex: 1,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  title: {
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 4,
    lineHeight: 21,
  },
  sectionLabel: {
    marginTop: 12,
    marginLeft: 4,
    fontWeight: '800',
    letterSpacing: 1,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  preferenceRow: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  deviceRow: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontWeight: '800',
  },
  rowDescription: {
    marginTop: 3,
    lineHeight: 19,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 70,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 6,
  },
  infoText: {
    flex: 1,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.7,
  },
});
