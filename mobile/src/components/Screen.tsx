import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import { usePathname, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAccessibility } from '@/context/AccessibilityContext';
import { BackButton } from '@/components/BackButton';
import { getOfflineStatus, subscribeOfflineStatus } from '@/services/api';

export { BackButton };

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
  swipeBack?: boolean;
  disableSwipeBack?: boolean;
  onSwipeBack?: () => void;
  swipeBackEdgeWidth?: number;
  allowBothEdges?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  headerRight?: ReactNode;
  keyboardAvoiding?: boolean;
  keyboardOffset?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollViewRef?: React.RefObject<ScrollView | null>;
  alwaysBounceVertical?: boolean;
  overScrollMode?: 'auto' | 'always' | 'never';
}

export function Screen({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  swipeBack = true,
  disableSwipeBack = false,
  onSwipeBack,
  swipeBackEdgeWidth = 28,
  allowBothEdges = true,
  showBackButton,
  onBack,
  headerRight,
  keyboardAvoiding = true,
  keyboardOffset = 0,
  style,
  contentStyle,
  contentContainerStyle,
  scrollViewRef,
  alwaysBounceVertical = true,
  overScrollMode = 'always',
}: ScreenProps) {
  const { colors, theme } = useTheme();
  const { largerText } = useAccessibility();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const internalScrollRef = useRef<ScrollView>(null);
  const activeScrollRef = scrollViewRef || internalScrollRef;

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isOffline, setIsOffline] = useState(() => getOfflineStatus());
  const [queuedOfflineOps, setQueuedOfflineOps] = useState(0);

  const screenWidth = Dimensions.get('window').width;
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    return subscribeOfflineStatus((offline, queuedCount) => {
      setIsOffline(offline);
      setQueuedOfflineOps(queuedCount);
    });
  }, []);

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

  const handleBack = useCallback(() => {
    if (onSwipeBack) {
      onSwipeBack();
      return;
    }

    if (router.canGoBack()) {
      router.back();
    } else {
      if (pathname === '/my-work') {
        router.replace('/(tabs)/tasks' as never);
      } else if (
        pathname.startsWith('/project-') ||
        pathname === '/github-connect' ||
        pathname.startsWith('/community')
      ) {
        router.replace('/(tabs)/community' as never);
      } else if (pathname === '/(auth)/register' || pathname === '/(auth)/forgot-password') {
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
  }, [onSwipeBack, router, pathname]);

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
    pathname === '/login' ||
    pathname === '/(auth)/login' ||
    pathname === '/onboarding' ||
    pathname === '/(auth)/onboarding';

  const shouldShowBack = showBackButton !== undefined ? showBackButton : !isMainTabRoot;
  const canPerformBack = !disableSwipeBack && swipeBack && (!isMainTabRoot || router.canGoBack());

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onHardwareBack = () => {
      if (disableSwipeBack) {
        return true;
      }
      if (canPerformBack) {
        handleBack();
        return true;
      }
      return false;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => backSub.remove();
  }, [disableSwipeBack, canPerformBack, handleBack]);

  const finishGestureBack = useCallback(() => {
    handleBack();
    const timer = setTimeout(() => {
      translateX.value = 0;
      opacity.value = 1;
    }, 450);
    return () => clearTimeout(timer);
  }, [handleBack, translateX, opacity]);

  const edgeWidth = Math.max(20, Math.min(swipeBackEdgeWidth, 50));

  const leftEdgeGesture = Gesture.Pan()
    .enabled(canPerformBack)
    .hitSlop({ left: 0, width: edgeWidth })
    .activeOffsetX(10)
    .failOffsetY([-20, 20])
    .cancelsTouchesInView(false)
    .onUpdate((event) => {
      if (!canPerformBack) return;
      if (event.translationX > 0) {
        translateX.value = event.translationX;
        opacity.value = interpolate(
          event.translationX,
          [0, screenWidth],
          [1, 0.9],
          Extrapolation.CLAMP
        );
      }
    })
    .onEnd((event) => {
      if (!canPerformBack) return;
      if (event.translationX > 75 || (event.translationX > 25 && event.velocityX > 300)) {
        translateX.value = withTiming(
          screenWidth,
          {
            duration: 220,
            easing: Easing.out(Easing.cubic),
          },
          () => {
            runOnJS(finishGestureBack)();
          }
        );
        opacity.value = withTiming(0.85, {
          duration: 220,
          easing: Easing.out(Easing.cubic),
        });
      } else {
        translateX.value = withSpring(0, {
          damping: 26,
          stiffness: 260,
          mass: 0.8,
        });
        opacity.value = withTiming(1, {
          duration: 180,
          easing: Easing.out(Easing.quad),
        });
      }
    });

  const rightEdgeGesture = Gesture.Pan()
    .enabled(canPerformBack && allowBothEdges)
    .hitSlop({ right: 0, width: edgeWidth })
    .activeOffsetX(-10)
    .failOffsetY([-20, 20])
    .cancelsTouchesInView(false)
    .onUpdate((event) => {
      if (!canPerformBack) return;
      if (event.translationX < 0) {
        translateX.value = event.translationX;
        opacity.value = interpolate(
          Math.abs(event.translationX),
          [0, screenWidth],
          [1, 0.9],
          Extrapolation.CLAMP
        );
      }
    })
    .onEnd((event) => {
      if (!canPerformBack) return;
      if (event.translationX < -75 || (event.translationX < -25 && event.velocityX < -300)) {
        translateX.value = withTiming(
          -screenWidth,
          {
            duration: 220,
            easing: Easing.out(Easing.cubic),
          },
          () => {
            runOnJS(finishGestureBack)();
          }
        );
        opacity.value = withTiming(0.85, {
          duration: 220,
          easing: Easing.out(Easing.cubic),
        });
      } else {
        translateX.value = withSpring(0, {
          damping: 26,
          stiffness: 260,
          mass: 0.8,
        });
        opacity.value = withTiming(1, {
          duration: 180,
          easing: Easing.out(Easing.quad),
        });
      }
    });

  const composedSwipeGesture = allowBothEdges
    ? Gesture.Race(leftEdgeGesture, rightEdgeGesture)
    : leftEdgeGesture;

  const animatedScreenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  // and sits at Math.max(insets.bottom, 12).
  // (~80px to 96px / pb-24 on standard viewports, or insets.bottom + 76px on notched viewports)
  // plus safe area insets without leaving an excessive blank void.
  const hasBottomNav = !pathname.includes('/(auth)');
  const bottomInsetPadding = hasBottomNav
    ? insets.bottom > 0
      ? insets.bottom + (largerText ? 84 : 76)
      : (largerText ? 96 : 88)
    : Math.max(insets.bottom + 16, 24);

  const renderTopNav = (shouldShowBack || headerRight) ? (
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
  ) : null;

  const renderOfflineBanner = isOffline ? (
    <View style={[styles.offlineBanner, { backgroundColor: theme === 'light' ? '#FEF3C7' : '#3F2D0C', borderColor: '#F59E0B' }]}>
      <Text style={[styles.offlineBannerText, { color: theme === 'light' ? '#92400E' : '#FCD34D' }]}>
        ⚡ Offline Mode — Showing cached content{queuedOfflineOps > 0 ? ` (${queuedOfflineOps} change${queuedOfflineOps === 1 ? '' : 's'} queued to sync)` : ''}
      </Text>
    </View>
  ) : null;

  const contentForScroll = (
    <View
      style={[
        styles.scrollContent,
        contentStyle,
      ]}
    >
      {renderTopNav}
      {renderOfflineBanner}
      {children}
    </View>
  );

  const contentForNonScroll = (
    <View
      style={[
        styles.content,
        {
          paddingBottom:
            bottomInsetPadding +
            (keyboardHeight > 0 ? (Platform.OS === 'android' ? 32 : 24) : 0),
        },
        contentStyle,
      ]}
    >
      {renderTopNav}
      {renderOfflineBanner}
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
      contentContainerStyle={[
        styles.scroll,
        {
          paddingBottom: bottomInsetPadding,
        },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
      bounces={true}
      alwaysBounceVertical={alwaysBounceVertical}
      overScrollMode={overScrollMode}
      refreshControl={refreshComponent}
    >
      {contentForScroll}
    </ScrollView>
  );

  const innerContent = scroll ? (
    scrollBody
  ) : keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + keyboardOffset : keyboardOffset}
    >
      {contentForNonScroll}
    </KeyboardAvoidingView>
  ) : (
    contentForNonScroll
  );

  const body = innerContent;

  const screenView = (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safe, { backgroundColor: colors.background }, style as any]}
    >
      {body}
    </SafeAreaView>
  );

  return (
    <GestureDetector gesture={composedSwipeGesture}>
      <Animated.View style={[{ flex: 1 }, animatedScreenStyle]}>
        {screenView}
      </Animated.View>
    </GestureDetector>
  );
}

export function SkeletonCard({ height = 96 }: { height?: number }) {
  const { colors, theme } = useTheme();
  const baseBg = theme === 'light' ? '#E2E8F0' : colors.surfaceElevated;
  const lineBg = theme === 'light' ? '#CBD5E1' : colors.border;

  return (
    <View
      style={[
        styles.skeletonCard,
        {
          height,
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.skeletonLine, { width: '42%', height: 12, backgroundColor: baseBg }]} />
      <View style={[styles.skeletonLine, { width: '78%', height: 16, marginTop: 10, backgroundColor: lineBg }]} />
      <View style={[styles.skeletonLine, { width: '60%', height: 10, marginTop: 10, backgroundColor: baseBg }]} />
    </View>
  );
}

export function Loading() {
  const { colors, theme } = useTheme();

  return (
    <View style={[styles.center, { backgroundColor: colors.background, paddingHorizontal: 18 }]}>
      <ActivityIndicator
        color={theme === 'light' ? '#00875A' : colors.primary}
        size="large"
      />
      <View style={styles.skeletonStack}>
        <SkeletonCard height={92} />
        <SkeletonCard height={110} />
        <SkeletonCard height={92} />
      </View>
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
      ? '#1e6827'
      : colors.primary;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={[
        styles.notice,
        {
          backgroundColor: bgColor,
          borderColor: isError ? colors.danger : colors.primary,
        },
      ]}
    >
      <Text
        style={[
          styles.noticeText,
          {
            color: textColor,
            fontSize: fontSize(13),
          },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroller: {
    flex: 1,
    ...Platform.select({
      web: {
        overscrollBehavior: 'contain',
      } as any,
    }),
  },
  scroll: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
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
  offlineBanner: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  offlineBannerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonStack: {
    width: '100%',
    maxWidth: 520,
    marginTop: 20,
    gap: 12,
    opacity: 0.72,
  },
  skeletonCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'center',
  },
  skeletonLine: {
    borderRadius: 6,
  },
  notice: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  noticeText: {
    fontWeight: '600',
  },
});
