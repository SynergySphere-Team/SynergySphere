import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '@/constants/theme';

export function Card({ children }: { children: ReactNode }) { return <View style={styles.card}>{children}</View>; }
export function Button({ title, onPress, disabled = false, secondary = false }: { title: string; onPress(): void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.secondary, disabled && styles.disabled]}><Text style={[styles.buttonText, secondary && styles.secondaryText]}>{title}</Text></Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} /></View>; }
export function Heading({ children, subtitle }: { children: ReactNode; subtitle?: string }) { return <View><Text style={styles.heading}>{children}</Text>{subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}</View>; }
export function Stat({ label, value }: { label: string; value: string | number }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
const styles = StyleSheet.create({
  card: { padding: 14, gap: 10, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12 },
  button: { minHeight: 44, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 8 }, buttonText: { color: '#09220e', fontWeight: '800', fontSize: 14 }, secondary: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border }, secondaryText: { color: colors.text }, disabled: { opacity: 0.55 },
  field: { gap: 6 }, label: { color: colors.text, fontSize: 13, fontWeight: '700' }, input: { minHeight: 44, color: colors.text, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, fontSize: 16 },
  heading: { color: colors.text, fontSize: 25, fontWeight: '800', letterSpacing: -0.3 }, subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 4 },
  stat: { flex: 1, padding: 12, minWidth: '45%', backgroundColor: colors.surfaceElevated, borderRadius: 12 }, statValue: { color: colors.primary, fontSize: 22, fontWeight: '800' }, statLabel: { color: colors.muted, marginTop: 3, fontSize: 12 },
});
