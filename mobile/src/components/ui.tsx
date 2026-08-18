import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export function Card({ children }: { children: ReactNode }) { const { colors } = useTheme(); return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View>; }
export function Button({ title, onPress, disabled = false, secondary = false }: { title: string; onPress(): void; disabled?: boolean; secondary?: boolean }) {
  const { colors, theme } = useTheme(); return <Pressable disabled={disabled} onPress={onPress} style={[styles.button, { backgroundColor: colors.primary }, secondary && [styles.secondary, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }], disabled && styles.disabled]}><Text style={[styles.buttonText, { color: theme === 'dark' ? '#09220e' : '#ffffff' }, secondary && [styles.secondaryText, { color: colors.text }]]}>{title}</Text></Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) { const { colors } = useTheme(); return <View style={styles.field}><Text style={[styles.label, { color: colors.text }]}>{label}</Text><TextInput placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceElevated, borderColor: colors.border }]} {...props} /></View>; }
export function Heading({ children, subtitle }: { children: ReactNode; subtitle?: string }) { const { colors } = useTheme(); return <View><Text style={[styles.heading, { color: colors.text }]}>{children}</Text>{subtitle && <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>}</View>; }
export function Stat({ label, value }: { label: string; value: string | number }) { const { colors } = useTheme(); return <View style={[styles.stat, { backgroundColor: colors.surfaceElevated }]}><Text style={[styles.statValue, { color: colors.primary }]}>{value}</Text><Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text></View>; }
const styles = StyleSheet.create({
  card: { padding: 14, gap: 10, borderWidth: 1, borderRadius: 12 },
  button: { minHeight: 44, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 8 }, buttonText: { fontWeight: '800', fontSize: 14 }, secondary: { borderWidth: 1 }, secondaryText: {}, disabled: { opacity: 0.55 },
  field: { gap: 6 }, label: { fontSize: 13, fontWeight: '700' }, input: { minHeight: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 16 },
  heading: { fontSize: 25, fontWeight: '800', letterSpacing: -0.3 }, subtitle: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  stat: { flex: 1, padding: 12, minWidth: '45%', borderRadius: 12 }, statValue: { fontSize: 22, fontWeight: '800' }, statLabel: { marginTop: 3, fontSize: 12 },
});
