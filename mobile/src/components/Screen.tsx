import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Keyboard,
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
import { useAccessibility } from '@/context/AccessibilityContext';
import { BackButton } from '@/components/BackButton';

export { BackButton };

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
  swipeBack?: boolean;
  onSwipeBack?: () => void;
  showBackButton?: boolean;
  onBack?: () => void;
  headerRight?: ReactNode;
  keyboardAvoiding?: boolean;
  keyboardOffset?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollViewRef?: React.RefObject<ScrollView | null>;
}

export function Screen({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  swipeBack = true,
  onSwipeBack,
  showBackButton,
  onBack,
  headerRight,
  keyboardAvoiding = true,
  keyboardOffset = 0,
  style,
  contentStyle,
  contentContainerStyle,
  scrollViewRef,
}: ScreenProps) {
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const internalScrollRef = useRef<ScrollView>(null);
  const activeScrollRef = scrollViewRef || internalScrollRef;

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
        pathname === '/change-password' ||
        pathname === '/notification-settings' ||
        pathname === '/accessibility-settings'
      ) {
        router.replace('/(tabs)/settings' as never);
      } else if (
        pathname === '/settings' ||
        pathname === '/notifications' ||
        pathname === '/profile'
      ) {
        router.replace('/' as never);
      }
    }
  };

  const isMainTabRoot =
    pathname === '/' ||
    pathname === '/(tabs)' ||
    pathname === '/(tabs)/index' ||
    pathname === '/tasks' ||
    pathname === '/(tabs)/tasks' ||
    pathname === '/wellness' ||
    pathname === '/(tabs)/wellness' ||
    pathname === '/explore' ||
    pathname === '/(tabs)/explore' ||
    pathname === '/coding' ||
    pathname === '/(tabs)/coding' ||
    pathname === '/ai-assistant' ||
    pathname === '/(tabs)/ai-assistant' ||
    pathname === '/lecture-to-life' ||
    pathname === '/(tabs)/lecture-to-life' ||
    pathname === '/interviews' ||
    pathname === '/(tabs)/interviews' ||
    pathname === '/leaderboard' ||
    pathname === '/(tabs)/leaderboard' ||
    pathname === '/portfolio' ||
    pathname === '/(tabs)/portfolio' ||
    pathname === '/community' ||
    pathname === '/(tabs)/community' ||
    pathname === '/settings' ||
    pathname === '/(tabs)/settings' ||
    pathname === '/more' ||
    pathname === '/(tabs)/more' ||
    pathname === '/notifications' ||
    pathname === '/(tabs)/notifications' ||
    pathname === '/profile' ||
    pathname === '/(tabs)/profile' ||
    pathname === '/login' ||
    pathname === '/(auth)/login';

  const shouldShowBack = showBackButton !== undefined ? showBackButton : !isMainTabRoot;
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
        {
          paddingBottom:
            Math.max(insets.bottom + 90, 120) +
            (keyboardHeight > 0 ? (Platform.OS === 'android' ? 32 : 24) : 0),
        },
        contentStyle,
      ]}
    >
      {(shouldShowBack || headerRight) && (
        <View style={styles.topNavRow}>
          {shouldShowBack ? (
            <BackButton onPress={onBack || handleBack} />
          ) : (
            <View style={{ width: 38 }} />
          )}
          {headerRight ? (
            <View style={styles.topNavRight}>
              {headerRight}
            </View>
          ) : null}
        </View>
      )}
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
      ref={activeScrollRef}
      style={styles.scroller}
      contentContainerStyle={[styles.scroll, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets={!keyboardAvoiding}
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + keyboardOffset : keyboardOffset}
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
      <ActivityIndicator
        color={theme === 'light' ? '#00875A' : colors.primary}
        size="large"
      />
    </View>
  );
}

export function Notice({
  children,
  tone = 'error',
}: {
  children: ReactNode;
  tone?: 'error' | 'success';
}) {
  const { colors, theme } = useTheme();
  const { fontSize } = useAccessibility();

  const isLight = theme === 'light';
  const isError = tone === 'error';

  const bgColor = isError
    ? isLight
      ? '#FDE8E8'
      : '#421d24'
    : isLight
      ? '#E2F5DA'
      : colors.primaryDark;

  const textColor = isError
    ? isLight
      ? '#C5221F'
      : colors.danger
    : isLight
      ? '#00875A'
      : colors.primary;

  return (
    <Text
      style={[
        styles.notice,
        {
          backgroundColor: bgColor,
          color: textColor,
          fontSize: fontSize(14),
        },
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroller: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 38,
    marginBottom: 2,
  },
  topNavRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: {
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontWeight: '600',
  },
});
