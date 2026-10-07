import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { onboardingStorage } from '@/services/api';
import { triggerLightHaptic } from '@/services/nativePolish';

interface OnboardingSlide {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  image: any;
  accentColor: string;
  highlights: { icon: keyof typeof Ionicons.glyphMap; label: string }[];
}

const SLIDES: OnboardingSlide[] = [
  {
    id: 'welcome',
    badge: 'ALL-IN-ONE PLATFORM',
    title: 'Welcome to\nSynergySphere',
    subtitle:
      'Your unified engineering cockpit connecting hands-on curriculum, intelligent AI tutoring, agile focus sprints, and real open-source collaboration.',
    image: require('../../../assets/images/synergysphere-brand-icon.png'),
    accentColor: '#1e6827',
    highlights: [
      { icon: 'code-slash', label: '11 Curriculum Tracks' },
      { icon: 'sparkles', label: 'Staff AI Code Coach' },
      { icon: 'people', label: 'GitHub Open Projects' },
      { icon: 'heart', label: 'Sustainable Wellness' },
    ],
  },
  {
    id: 'learning',
    badge: 'LEARNING HUB',
    title: 'Code, Test &\nMaster Skills',
    subtitle:
      'Master TypeScript, Python, Rust, Go, SQL, and React with real-time test validation, flashcards, and verified skill badges.',
    image: require('../../../assets/images/learning-hub-logo.png'),
    accentColor: '#2563EB',
    highlights: [
      { icon: 'terminal', label: 'In-Browser Code Runner' },
      { icon: 'checkmark-done-circle', label: 'Test-Driven Verification' },
      { icon: 'layers', label: 'Role-Based Roadmaps' },
    ],
  },
  {
    id: 'ai',
    badge: 'AI WORKSPACE',
    title: 'Intelligent AI\nEngineering Coach',
    subtitle:
      'Get instant code reviews, architectural feedback, and practice mock technical interviews with simulated interview rubrics.',
    image: require('../../../assets/images/ai-workspace-logo.png'),
    accentColor: '#7C3AED',
    highlights: [
      { icon: 'chatbox-ellipses', label: 'Live Code Analysis' },
      { icon: 'mic', label: 'Mock Technical Interviewer' },
      { icon: 'bulb', label: 'Adaptive Step-by-Step Hints' },
    ],
  },
  {
    id: 'productivity',
    badge: 'PRODUCTIVITY CENTER',
    title: 'Focus Sprints &\nAction Queue',
    subtitle:
      'Organize your Next Action Queue, track weekly sprint velocity, and launch distraction-free Pomodoro focus sessions to earn XP.',
    image: require('../../../assets/images/productivity-logo.png'),
    accentColor: '#EA580C',
    highlights: [
      { icon: 'list-circle', label: 'Next Action Queue' },
      { icon: 'timer', label: 'Distraction-Free Focus Sprints' },
      { icon: 'trophy', label: 'Gamified Momentum & XP' },
    ],
  },
  {
    id: 'community-wellness',
    badge: 'COMMUNITY & WELLNESS',
    title: 'Real Projects &\nCareer Evidence',
    subtitle:
      'Collaborate on GitHub initiatives, build verifiable portfolio signals for employers, and maintain energy with daily wellness checks.',
    image: require('../../../assets/images/community-logo.png'),
    accentColor: '#059669',
    highlights: [
      { icon: 'git-branch', label: 'GitHub PRs & Open Initiatives' },
      { icon: 'briefcase', label: 'Verified Portfolio Signals' },
      { icon: 'fitness', label: 'Burnout Guard & Daily Check-Ins' },
    ],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<OnboardingSlide>>(null);

  const windowWidth = Dimensions.get('window').width;
  const isLight = theme === 'light';
  const isLastSlide = currentIndex === SLIDES.length - 1;

  async function completeOnboarding(targetRoute?: '/(auth)/register' | '/(auth)/login' | '/(tabs)') {
    triggerLightHaptic();
    try {
      await onboardingStorage.setCompleted();
    } catch {
      // Storage fallback
    }
    if (targetRoute) {
      router.replace(targetRoute as never);
    } else if (user) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/register');
    }
  }

  function handleNext() {
    triggerLightHaptic();
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      void completeOnboarding(user ? '/(tabs)' : '/(auth)/register');
    }
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / windowWidth);
    if (index >= 0 && index < SLIDES.length && index !== currentIndex) {
      setCurrentIndex(index);
    }
  }

  function goToSlide(index: number) {
    triggerLightHaptic();
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
    });
    setCurrentIndex(index);
  }

  return (
    <Screen scroll={false} showBackButton={false}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <View style={styles.brandBadge}>
            <Image
              source={require('../../../assets/images/synergysphere-brand-icon.png')}
              style={styles.topBrandIcon}
              resizeMode="contain"
            />
            <Text style={[styles.topBrandText, { color: colors.text }]}>
              SynergySphere
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            onPress={() => completeOnboarding(user ? '/(tabs)' : '/(auth)/login')}
            hitSlop={12}
            style={({ pressed }) => [
              styles.skipButton,
              {
                backgroundColor: isLight
                  ? 'rgba(0,0,0,0.04)'
                  : 'rgba(255,255,255,0.06)',
                borderColor: colors.border,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.skipText, { color: colors.muted }]}>Skip</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.muted} />
          </Pressable>
        </View>

        {/* Carousel Slides */}
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          bounces={false}
          style={styles.flatList}
          renderItem={({ item }) => (
            <View style={[styles.slideCard, { width: windowWidth }]}>
              <View style={styles.slideContent}>
                {/* Emblem Badge Icon */}
                <View
                  style={[
                    styles.imageContainer,
                    {
                      backgroundColor: isLight
                        ? 'rgba(237, 243, 239, 0.95)'
                        : 'rgba(16, 33, 40, 0.75)',
                      borderColor: isLight
                        ? 'rgba(30, 104, 39, 0.25)'
                        : 'rgba(145, 219, 94, 0.3)',
                    },
                  ]}
                >
                  <Image
                    source={item.image}
                    style={styles.slideImage}
                    resizeMode="contain"
                    accessibilityIgnoresInvertColors
                  />
                </View>

                {/* Badge Tag */}
                <View
                  style={[
                    styles.badgePill,
                    {
                      backgroundColor: isLight
                        ? 'rgba(30, 104, 39, 0.08)'
                        : 'rgba(145, 219, 94, 0.12)',
                      borderColor: isLight
                        ? 'rgba(30, 104, 39, 0.22)'
                        : 'rgba(145, 219, 94, 0.28)',
                    },
                  ]}
                >
                  <Ionicons
                    name="sparkles"
                    size={12}
                    color={isLight ? '#1e6827' : colors.primary}
                  />
                  <Text
                    style={[
                      styles.badgeText,
                      { color: isLight ? '#1e6827' : colors.primary },
                    ]}
                  >
                    {item.badge}
                  </Text>
                </View>

                {/* Title & Subtitle */}
                <Text style={[styles.slideTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.slideSubtitle, { color: colors.muted }]}>
                  {item.subtitle}
                </Text>

                {/* Key Highlight Chips */}
                <View style={styles.highlightsWrap}>
                  {item.highlights.map((h, i) => (
                    <View
                      key={i}
                      style={[
                        styles.highlightChip,
                        {
                          backgroundColor: isLight
                            ? '#FFFFFF'
                            : colors.surfaceElevated,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={h.icon}
                        size={15}
                        color={isLight ? '#1e6827' : colors.primary}
                      />
                      <Text
                        style={[styles.highlightText, { color: colors.text }]}
                      >
                        {h.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        />

        {/* Bottom Navigation & Actions */}
        <View
          style={[
            styles.bottomControls,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {/* Pagination Dots */}
          <View style={styles.dotsRow}>
            {SLIDES.map((slide, index) => {
              const active = index === currentIndex;
              return (
                <Pressable
                  key={slide.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Go to slide ${index + 1}`}
                  onPress={() => goToSlide(index)}
                  hitSlop={8}
                  style={[
                    styles.dot,
                    active
                      ? [
                          styles.dotActive,
                          {
                            backgroundColor: isLight
                              ? '#1e6827'
                              : colors.primary,
                          },
                        ]
                      : [
                          styles.dotInactive,
                          {
                            backgroundColor: isLight
                              ? 'rgba(0,0,0,0.15)'
                              : 'rgba(255,255,255,0.2)',
                          },
                        ],
                  ]}
                />
              );
            })}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonsWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isLastSlide
                  ? user
                    ? 'Enter SynergySphere'
                    : 'Get Started'
                  : 'Next slide'
              }
              onPress={handleNext}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: isLight ? '#1e6827' : colors.primary,
                  shadowColor: isLight ? '#1e6827' : colors.primary,
                },
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.primaryBtnText,
                  { color: isLight ? '#FFFFFF' : '#0B1E13' },
                ]}
              >
                {isLastSlide
                  ? user
                    ? 'Enter SynergySphere'
                    : 'Get Started'
                  : 'Next'}
              </Text>
              <Ionicons
                name={isLastSlide ? 'rocket' : 'arrow-forward'}
                size={18}
                color={isLight ? '#FFFFFF' : '#0B1E13'}
              />
            </Pressable>

            {user ? (
              <View style={styles.signInRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Skip to dashboard"
                  onPress={() => completeOnboarding('/(tabs)')}
                  hitSlop={8}
                >
                  <Text
                    style={[
                      styles.signInLink,
                      { color: isLight ? '#1e6827' : colors.primary },
                    ]}
                  >
                    Skip directly to workspace →
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.signInRow}>
                <Text style={[styles.signInPrompt, { color: colors.muted }]}>
                  Already have an account?
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Sign in"
                  onPress={() => completeOnboarding('/(auth)/login')}
                  hitSlop={8}
                >
                  <Text
                    style={[
                      styles.signInLink,
                      { color: isLight ? '#1e6827' : colors.primary },
                    ]}
                  >
                    Sign In
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBrandIcon: {
    width: 26,
    height: 26,
  },
  topBrandText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  flatList: {
    flex: 1,
  },
  slideCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  slideContent: {
    alignItems: 'center',
    maxWidth: 420,
    width: '100%',
  },
  imageContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  slideImage: {
    width: 60,
    height: 60,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  slideTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  slideSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  highlightsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  highlightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  highlightText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  bottomControls: {
    paddingHorizontal: 24,
    paddingTop: 10,
    gap: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
  },
  dotInactive: {
    width: 8,
  },
  buttonsWrap: {
    gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  signInPrompt: {
    fontSize: 13,
  },
  signInLink: {
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
