import type { ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const statusBarHeight = Math.max(insets.top, 20);
  const content = (
    <View
      style={[
        styles.content,
        {
          paddingBottom: Math.max(insets.bottom + 90, 120),
          paddingTop: statusBarHeight + 8,
        },
      ]}
    >
      {children}
    </View>
  );
  return (
    <SafeAreaView
      edges={['left', 'right']}
      style={[styles.safe, { backgroundColor: colors.background }]}
    >
      {scroll ? (
        <ScrollView
          style={styles.scroller}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
export function Loading() {
  const { colors, theme } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={theme === 'light' ? '#2e7d32' : colors.primary} size="large" />
    </View>
  );
}

export function Notice({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'success' }) {
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';
  const isError = tone === 'error';
  const bgColor = isError ? (isLight ? '#FDE8E8' : '#421d24') : isLight ? '#E2F5DA' : colors.primaryDark;
  const textColor = isError ? (isLight ? '#C5221F' : colors.danger) : isLight ? '#1b5e20' : colors.primary;

  return <Text style={[styles.notice, { backgroundColor: bgColor, color: textColor }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroller: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, gap: 12, maxWidth: 720, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notice: { borderRadius: 10, padding: 12, fontSize: 14, fontWeight: '600' },
});
