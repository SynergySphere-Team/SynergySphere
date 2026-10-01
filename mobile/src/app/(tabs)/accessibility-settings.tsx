import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/Screen';
import { useTheme } from '@/context/ThemeContext';

const STORAGE_KEY = 'synergysphere-accessibility';

type AccessibilityPreferences = {
  largerText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
};

const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  largerText: false,
  highContrast: false,
  reduceMotion: false,
};

export default function AccessibilitySettingsScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();

  const [preferences, setPreferences] =
    useState<AccessibilityPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);

      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AccessibilityPreferences>;

        setPreferences({
          largerText: Boolean(parsed.largerText),
          highContrast: Boolean(parsed.highContrast),
          reduceMotion: Boolean(parsed.reduceMotion),
        });
      }
    } catch {
      // Keep defaults if stored preferences cannot be read.
    }
  }, []);

  function updatePreference(
    key: keyof AccessibilityPreferences,
    value: boolean,
  ) {
    const next = {
      ...preferences,
      [key]: value,
    };

    setPreferences(next);

    if (Platform.OS === 'web') {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(next),
        );
      } catch {
        // Keep the in-memory preference if browser storage is unavailable.
      }
    }
  }

  function goBackToSettings() {
    router.replace('/(tabs)/settings' as never);
}

  async function openDeviceSettings() {
    try {
      await Linking.openSettings();
    } catch {
      // Some web browsers do not expose operating-system settings.
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
    <Screen>
      <View style={styles.page}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Settings"
            hitSlop={12}
            onPress={goBackToSettings}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={colors.text}
            />
          </Pressable>

          <View style={styles.headerText}>
            <Text
              style={[
                styles.title,
                {
                  color: colors.text,
                  fontSize: preferences.largerText ? 34 : 30,
                },
              ]}
            >
              Accessibility
            </Text>

            <Text
              style={[
                styles.subtitle,
                {
                  color: colors.muted,
                  fontSize: preferences.largerText ? 17 : 15,
                },
              ]}
            >
              Adjust text, contrast and motion preferences.
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.sectionLabel,
            {
              color: preferences.highContrast
                ? colors.text
                : colors.muted,
              fontSize: preferences.largerText ? 15 : 13,
            },
          ]}
        >
          VISION
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: preferences.highContrast
                ? colors.text
                : colors.border,
              borderWidth: preferences.highContrast ? 2 : 1,
            },
          ]}
        >
          <PreferenceRow
            icon="text-outline"
            title="Larger Text"
            description="Increase text size for improved readability."
            value={preferences.largerText}
            onValueChange={(value) =>
              updatePreference('largerText', value)
            }
            colors={colors}
            accent={accent}
            activeTrack={activeTrack}
            largerText={preferences.largerText}
          />

          <Divider
            color={
              preferences.highContrast
                ? colors.text
                : colors.border
            }
          />

          <PreferenceRow
            icon="contrast-outline"
            title="High Contrast"
            description="Increase visual contrast between text and interface elements."
            value={preferences.highContrast}
            onValueChange={(value) =>
              updatePreference('highContrast', value)
            }
            colors={colors}
            accent={accent}
            activeTrack={activeTrack}
            largerText={preferences.largerText}
          />
        </View>

        <Text
          style={[
            styles.sectionLabel,
            {
              color: preferences.highContrast
                ? colors.text
                : colors.muted,
              fontSize: preferences.largerText ? 15 : 13,
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
              borderColor: preferences.highContrast
                ? colors.text
                : colors.border,
              borderWidth: preferences.highContrast ? 2 : 1,
            },
          ]}
        >
          <PreferenceRow
            icon="walk-outline"
            title="Reduce Motion"
            description="Reduce non-essential animations and transitions."
            value={preferences.reduceMotion}
            onValueChange={(value) =>
              updatePreference('reduceMotion', value)
            }
            colors={colors}
            accent={accent}
            activeTrack={activeTrack}
            largerText={preferences.largerText}
          />
        </View>

        <Text
          style={[
            styles.sectionLabel,
            {
              color: preferences.highContrast
                ? colors.text
                : colors.muted,
              fontSize: preferences.largerText ? 15 : 13,
            },
          ]}
        >
          DEVICE ACCESSIBILITY
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: preferences.highContrast
                ? colors.text
                : colors.border,
              borderWidth: preferences.highContrast ? 2 : 1,
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open device accessibility settings"
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
                    fontSize: preferences.largerText ? 18 : 16,
                  },
                ]}
              >
                Device Accessibility Settings
              </Text>

              <Text
                style={[
                  styles.rowDescription,
                  {
                    color: colors.muted,
                    fontSize: preferences.largerText ? 15 : 13,
                  },
                ]}
              >
                Manage screen reader, system text size and other device accessibility options.
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
                fontSize: preferences.largerText ? 14 : 12,
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
  largerText,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  colors: any;
  accent: string;
  activeTrack: string;
  largerText: boolean;
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
              fontSize: largerText ? 18 : 16,
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
              fontSize: largerText ? 15 : 13,
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
