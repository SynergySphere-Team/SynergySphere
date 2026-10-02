import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { useAccessibility } from '@/context/AccessibilityContext';
import { useTheme } from '@/context/ThemeContext';

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
  danger = false,
}: {
  title: string;
  onPress(): void;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  const { fontSize } = useAccessibility();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: danger
            ? colors.danger
            : colors.primary,
        },
        secondary && [
          styles.secondary,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
          },
        ],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          {
            color: colors.primaryText,
            fontSize: fontSize(14),
          },
          secondary && [
            styles.secondaryText,
            { color: colors.text },
          ],
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  rightElement,
  style,
  ...props
}: TextInputProps & {
  label: string;
  rightElement?: ReactNode;
}) {
  const { colors, theme } = useTheme();
  const { fontSize } = useAccessibility();

  return (
    <View style={styles.field}>
      <Text
        style={[
          styles.label,
          {
            color: colors.text,
            fontSize: fontSize(13),
          },
        ]}
      >
        {label}
      </Text>

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.inputBorder,
          },
        ]}
      >
        <TextInput
          keyboardAppearance={
            theme === 'dark' ? 'dark' : 'light'
          }
          placeholderTextColor={colors.placeholderText}
          allowFontScaling
          style={[
            styles.input,
            {
              color: colors.text,
              fontSize: fontSize(16),
            },
            style,
          ]}
          {...props}
        />

        {rightElement}
      </View>
    </View>
  );
}

export function Heading({
  children,
  subtitle,
}: {
  children: ReactNode;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  const { fontSize } = useAccessibility();

  return (
    <View>
      <Text
        style={[
          styles.heading,
          {
            color: colors.text,
            fontSize: fontSize(25),
          },
        ]}
      >
        {children}
      </Text>

      {subtitle ? (
        <Text
          style={[
            styles.subtitle,
            {
              color: colors.muted,
              fontSize: fontSize(14),
              lineHeight: fontSize(20),
            },
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  const { colors, theme } = useTheme();
  const { fontSize } = useAccessibility();

  return (
    <View
      style={[
        styles.stat,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.statValue,
          {
            color:
              theme === 'light'
                ? '#2e7d32'
                : colors.primary,
            fontSize: fontSize(22),
          },
        ]}
      >
        {value}
      </Text>

      <Text
        style={[
          styles.statLabel,
          {
            color: colors.muted,
            fontSize: fontSize(12),
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  button: {
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  buttonText: {
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'center',
  },
  secondary: {
    borderWidth: 1,
  },
  secondaryText: {
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.7,
  },
  pressed: {
    opacity: 0.8,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputContainer: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    minHeight: 46,
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 8,
  },
  heading: {
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    fontWeight: '500',
  },
  stat: {
    flex: 1,
    padding: 14,
    minWidth: '45%',
    borderRadius: 16,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '600',
  },
});
