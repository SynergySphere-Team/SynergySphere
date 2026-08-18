import type { ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const content = <View style={styles.content}>{children}</View>;
  return <SafeAreaView style={styles.safe}>{scroll ? <ScrollView style={styles.scroller} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" nestedScrollEnabled showsVerticalScrollIndicator>{content}</ScrollView> : content}</SafeAreaView>;
}
export function Loading() { return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>; }
export function Notice({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'success' }) { return <Text style={[styles.notice, tone === 'error' ? styles.error : styles.success]}>{children}</Text>; }
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, scroller: { flex: 1 }, scroll: { flexGrow: 1 }, content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 148, gap: 12, maxWidth: 720, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  notice: { borderRadius: 10, padding: 12, fontSize: 14 }, error: { color: '#ffb7b7', backgroundColor: '#421d24' }, success: { color: colors.primary, backgroundColor: colors.primaryDark },
});
