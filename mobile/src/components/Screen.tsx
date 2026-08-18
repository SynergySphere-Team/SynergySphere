import type { ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const { colors } = useTheme();
  const content = <View style={styles.content}>{children}</View>;
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>{scroll ? <ScrollView style={styles.scroller} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" nestedScrollEnabled showsVerticalScrollIndicator>{content}</ScrollView> : content}</SafeAreaView>;
}
export function Loading() { const { colors } = useTheme(); return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} size="large" /></View>; }
export function Notice({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'success' }) { const { colors } = useTheme(); return <Text style={[styles.notice, tone === 'error' ? [styles.error, { color: colors.danger }] : [styles.success, { color: colors.primary, backgroundColor: colors.primaryDark }]]}>{children}</Text>; }
const styles = StyleSheet.create({
  safe: { flex: 1 }, scroller: { flex: 1 }, scroll: { flexGrow: 1 }, content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 148, gap: 12, maxWidth: 720, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notice: { borderRadius: 10, padding: 12, fontSize: 14 }, error: { backgroundColor: '#421d24' }, success: {},
});
