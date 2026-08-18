import { useEffect, useState } from 'react';
import { Tabs, usePathname, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';
import { Loading } from '@/components/Screen';
import { FloatingNavigation } from '@/components/FloatingNavigation';
import { WorkspaceMenu } from '@/components/WorkspaceMenu';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function TabsLayout() {
  const { user, loading } = useAuth(); const router = useRouter(); const pathname = usePathname(); const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { if (!loading && !user) router.replace('/(auth)/login'); }, [loading, router, user]);
  if (loading || !user) return <Loading />;
  return <View style={{ flex: 1 }}>
    <Tabs screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerShadowVisible: false, headerTintColor: colors.text, headerTitleStyle: { fontSize: 18, fontWeight: '800' }, headerRight: () => pathname === '/' ? null : <Pressable accessibilityRole="button" accessibilityLabel="Open workspace menu" hitSlop={12} onPress={() => setMenuOpen(true)} style={{ padding: 8 }}><Ionicons name="menu" size={24} color={colors.text} /></Pressable>, tabBarStyle: { display: 'none' } }}>
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
    <FloatingNavigation />
    <WorkspaceMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
  </View>;
}
