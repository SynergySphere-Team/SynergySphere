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
} from 'react-native-reanimated';
import { usePathname, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAccessibility } from '@/context/AccessibilityContext';
import { triggerLightHaptic } from '@/services/nativePolish';
import { BackButton } from '@/components/BackButton';

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
}: ScreenProps) {
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const internalScrollRef = useRef<ScrollView>(null);
  const activeScrollRef = scrollViewRef || internalScrollRef;

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Animated values for smooth swipe-to-back transitions
  const screenWidth = Dimensions.get('window').width;
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

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
      // Smart fallbacks for non-root / sub-screens
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
    pathname === '/(tabs)/profile' ||
    pathname === '/login' ||
    pathname === '/(auth)/login';

  const shouldShowBack = showBackButton !== undefined ? showBackButton : !isMainTabRoot;
  const canPerformBack = !disableSwipeBack && swipeBack && (!isMainTabRoot || router.canGoBack());

  // Handle Android hardware back press
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onHardwareBack = () => {
      if (disableSwipeBack) {
        // Block hardware back if screen explicitly locked (e.g. active timed session)
        return true;
      }
      if (canPerformBack) {
        triggerLightHaptic();
        handleBack();
        return true;
      }
      return false;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => backSub.remove();
  }, [disableSwipeBack, canPerformBack, handleBack]);

  const finishGestureBack = useCallback(() => {
    triggerLightHaptic();
    handleBack();
    // Reset shared values after navigation transition completes
    setTimeout(() => {
      translateX.value = 0;
      opacity.value = 1;
    }, 200);
  }, [handleBack, translateX, opacity]);

  const edgeWidth = Math.max(20, Math.min(swipeBackEdgeWidth, 50));

  // 1. Left Edge: Swiping left-to-right (→) within outer edge bounds
  const leftEdgeGesture = Gesture.Pan()
    .enabled(canPerformBack)
    .hitSlop({ left: 0, width: edgeWidth })
    .activeOffsetX(12)
    .failOffsetY([-22, 22])
    .cancelsTouchesInView(false)
    .onUpdate((event) => {
      if (!canPerformBack) return;
      if (event.translationX > 0) {
        translateX.value = event.translationX;
        opacity.value = interpolate(
          event.translationX,
          [0, screenWidth],
          [1, 0.72],
          Extrapolation.CLAMP
        );
      }
    })
    .onEnd((event) => {
      if (!canPerformBack) return;
      if (event.translationX > 70 || event.velocityX > 350) {
        translateX.value = withTiming(screenWidth, { duration: 160 }, () => {
          runOnJS(finishGestureBack)();
        });
        opacity.value = withTiming(0.4, { duration: 160 });
      } else {
        translateX.value = withSpring(0, { damping: 22, stiffness: 240 });
        opacity.value = withTiming(1, { duration: 140 });
      }
    });

  // 2. Right Edge: Swiping right-to-left (←) within outer edge bounds
  const rightEdgeGesture = Gesture.Pan()
    .enabled(canPerformBack && allowBothEdges)
    .hitSlop({ right: 0, width: edgeWidth })
    .activeOffsetX(-12)
    .failOffsetY([-22, 22])
    .cancelsTouchesInView(false)
    .onUpdate((event) => {
      if (!canPerformBack) return;
      if (event.translationX < 0) {
        translateX.value = event.translationX;
        opacity.value = interpolate(
          Math.abs(event.translationX),
          [0, screenWidth],
          [1, 0.72],
          Extrapolation.CLAMP
        );
      }
    })
    .onEnd((event) => {
      if (!canPerformBack) return;
      if (event.translationX < -70 || event.velocityX < -350) {
        translateX.value = withTiming(-screenWidth, { duration: 160 }, () => {
          runOnJS(finishGestureBack)();
        });
        opacity.value = withTiming(0.4, { duration: 160 });
      } else {
        translateX.value = withSpring(0, { damping: 22, stiffness: 240 });
        opacity.value = withTiming(1, { duration: 140 });
      }
    });

  const composedSwipeGesture = allowBothEdges
    ? Gesture.Race(leftEdgeGesture, rightEdgeGesture)
    : leftEdgeGesture;

  const animatedScreenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

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
    <GestureDetector gesture={composedSwipeGesture}>
      <Animated.View style={[{ flex: 1 }, animatedScreenStyle]}>
        {screenView}
      </Animated.View>
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
  },
  scroll: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
