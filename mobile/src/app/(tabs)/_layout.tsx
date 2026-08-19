import { useEffect, useState } from 'react';
import { Tabs, usePathname, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Loading } from '@/components/Screen';
import { FloatingNavigation, NAV_TAB_ITEMS } from '@/components/FloatingNavigation';
import { WorkspaceMenu } from '@/components/WorkspaceMenu';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/(auth)/login');
  }, [loading, router, user]);

  const activeIndex = NAV_TAB_ITEMS.findIndex((item) =>
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
  );

  const handleSwipe = (direction: 'left' | 'right') => {
    if (activeIndex === -1) return;
    if (direction === 'left' && activeIndex < NAV_TAB_ITEMS.length - 1) {
      router.push(NAV_TAB_ITEMS[activeIndex + 1].href as never);
    } else if (direction === 'right' && activeIndex > 0) {
      router.push(NAV_TAB_ITEMS[activeIndex - 1].href as never);
    }
  };

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-35, 35])
    .failOffsetY([-25, 25])
    .onEnd((event) => {
      if (event.translationX < -60 || event.velocityX < -400) {
        handleSwipe('left');
      } else if (event.translationX > 60 || event.velocityX > 400) {
        handleSwipe('right');
      }
    });

  if (loading || !user) return <Loading />;

  return (
    <GestureDetector gesture={panGesture}>
      <View style={{ flex: 1 }}>
        <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
          <Tabs.Screen name="index" options={{ title: 'Home' }} />
          <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
          <Tabs.Screen name="wellness" options={{ title: 'Wellness' }} />
          <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
          <Tabs.Screen name="more" options={{ href: null }} />
          <Tabs.Screen name="profile" options={{ title: 'Profile', href: null }} />
          <Tabs.Screen name="settings" options={{ title: 'Settings', href: null }} />
          <Tabs.Screen name="notifications" options={{ href: null }} />
          <Tabs.Screen name="coding" options={{ href: null }} />
          <Tabs.Screen name="ai-assistant" options={{ href: null }} />
          <Tabs.Screen name="lecture-to-life" options={{ href: null }} />
          <Tabs.Screen name="community" options={{ href: null }} />
          <Tabs.Screen name="portfolio" options={{ href: null }} />
          <Tabs.Screen name="interviews" options={{ href: null }} />
          <Tabs.Screen name="leaderboard" options={{ href: null }} />
          <Tabs.Screen name="admin" options={{ href: null }} />
          <Tabs.Screen name="project-chat" options={{ title: 'Project discussion', href: null }} />
        </Tabs>
        {pathname !== '/' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open workspace menu"
            hitSlop={12}
            onPress={() => setMenuOpen(true)}
            style={{
              position: 'absolute',
              top: insets.top + 6,
              right: 16,
              zIndex: 10,
              width: 34,
              height: 34,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 17,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="menu" size={19} color={colors.text} />
          </Pressable>
        ) : null}
        <FloatingNavigation />
        <WorkspaceMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
      </View>
    </GestureDetector>
  );
}
