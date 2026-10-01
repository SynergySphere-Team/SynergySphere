import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { usePathname, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
  swipeBack?: boolean;
  onSwipeBack?: () => void;
  keyboardAvoiding?: boolean;
  keyboardOffset?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  swipeBack = true,
  onSwipeBack,
  keyboardAvoiding = true,
  keyboardOffset = 0,
  style,
  contentStyle,
  contentContainerStyle,
}: ScreenProps) {
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const handleBack = () => {
    if (onSwipeBack) {
      onSwipeBack();
      return;
    }

    if (router.canGoBack()) {
      router.back();
    } else {
      // Smart fallbacks for non-root / sub-screens
      if (pathname === '/my-work') {
        router.replace('/(tabs)/tasks' as never);
      } else if (
        pathname.startsWith('/project-') ||
        pathname === '/github-connect' ||
        pathname.startsWith('/community')
      ) {
        router.replace('/(tabs)/community' as never);
      } else if (pathname === '/(auth)/register') {
        router.replace('/(auth)/login' as never);
      } else if (
        pathname === '/coding' ||
        pathname === '/ai-assistant' ||
        pathname === '/lecture-to-life' ||
        pathname === '/interviews' ||
        pathname === '/portfolio' ||
        pathname === '/leaderboard' ||
        pathname === '/admin'
      ) {
        router.replace('/(tabs)/explore' as never);
      } else if (
        pathname === '/settings' ||
        pathname === '/change-password' ||
        pathname === '/notification-settings' ||
        pathname === '/notifications' ||
        pathname === '/profile'
      ) {
        router.replace('/' as never);
      }
    }
  };

  const isMainTabRoot =
    pathname === '/' ||
    pathname === '/tasks' ||
    pathname === '/wellness' ||
    pathname === '/explore';

  const canPerformBack = swipeBack && (!isMainTabRoot || router.canGoBack());

  const edgeSwipeGesture = Gesture.Pan()
    .hitSlop({ left: 0, width: 44 })
    .activeOffsetX(15)
    .failOffsetY([-25, 25])
    .cancelsTouchesInView(false)
    .runOnJS(true)
    .onEnd((event) => {
      if (!canPerformBack) return;
      if (event.translationX > 40 || event.velocityX > 250) {
        handleBack();
      }
    });

  const content = (
    <View
      style={[
        styles.content,
        { paddingBottom: Math.max(insets.bottom + 90, 120) },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  const isLight = theme === 'light';
  const refreshSpinnerColor = isLight ? '#00875A' : colors.primary;

  const refreshComponent = onRefresh ? (
    <RefreshControl
      refreshing={Boolean(refreshing)}
      onRefresh={onRefresh}
      tintColor={refreshSpinnerColor}
      colors={[refreshSpinnerColor]}
      progressBackgroundColor={colors.surface}
    />
  ) : undefined;

  const scrollBody = (
    <ScrollView
      style={styles.scroller}
      contentContainerStyle={[styles.scroll, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets={true}
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
      refreshControl={refreshComponent}
    >
      {content}
    </ScrollView>
  );

  const innerContent = scroll ? scrollBody : content;

  const body = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + keyboardOffset : 0}
    >
      {innerContent}
    </KeyboardAvoidingView>
  ) : (
    innerContent
  );

  const screenView = (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safe, { backgroundColor: colors.background }, style as any]}
    >
      {body}
    </SafeAreaView>
  );

  if (!canPerformBack) {
    return screenView;
  }

  return (
    <GestureDetector gesture={edgeSwipeGesture}>
      {screenView}
    </GestureDetector>
  );
}

export function Loading() {
  const { colors, theme } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={theme === 'light' ? '#00875A' : colors.primary} size="large" />
    </View>
  );
}

export function Notice({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'success' }) {
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';
  const isError = tone === 'error';
  const bgColor = isError ? (isLight ? '#FDE8E8' : '#421d24') : isLight ? '#E2F5DA' : colors.primaryDark;
  const textColor = isError ? (isLight ? '#C5221F' : colors.danger) : isLight ? '#00875A' : colors.primary;

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
