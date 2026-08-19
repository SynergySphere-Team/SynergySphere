import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export function Card({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View>;
}

export function Button({ title, onPress, disabled = false, secondary = false }: { title: string; onPress(): void; disabled?: boolean; secondary?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.primary },
        secondary && [styles.secondary, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          { color: colors.primaryText },
          secondary && [styles.secondaryText, { color: colors.text }],
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.placeholderText}
        style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
        {...props}
      />
    </View>
  );
}

export function Heading({ children, subtitle }: { children: ReactNode; subtitle?: string }) {
  const { colors } = useTheme();
  return (
    <View>
      <Text style={[styles.heading, { color: colors.text }]}>{children}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>}
    </View>
  );
}

export function Stat({ label, value }: { label: string; value: string | number }) {
  const { colors, theme } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color: theme === 'light' ? '#2e7d32' : colors.primary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  buttonText: {
    fontWeight: '800',
    fontSize: 14,
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
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '500',
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
