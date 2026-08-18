import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Loading } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function TabsLayout() {
  const { user, loading } = useAuth(); const router = useRouter();
  useEffect(() => { if (!loading && !user) router.replace('/(auth)/login'); }, [loading, router, user]);
  if (loading || !user) return <Loading />;
  return <Tabs screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerShadowVisible: false, headerTintColor: colors.text, headerTitleStyle: { fontSize: 16, fontWeight: '700' }, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 58, paddingTop: 5 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '700' }, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: () => null }} />
    <Tabs.Screen name="tasks" options={{ title: 'Tasks', tabBarIcon: () => null }} />
    <Tabs.Screen name="wellness" options={{ title: 'Wellness', tabBarIcon: () => null }} />
    <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: () => null }} />
    <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: () => null }} />
    <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: () => null }} />
    <Tabs.Screen name="notifications" options={{ href: null }} />
    <Tabs.Screen name="coding" options={{ href: null }} />
    <Tabs.Screen name="ai-assistant" options={{ href: null }} />
    <Tabs.Screen name="lecture-to-life" options={{ href: null }} />
    <Tabs.Screen name="community" options={{ href: null }} />
    <Tabs.Screen name="portfolio" options={{ href: null }} />
    <Tabs.Screen name="interviews" options={{ href: null }} />
    <Tabs.Screen name="leaderboard" options={{ href: null }} />
    <Tabs.Screen name="admin" options={{ href: null }} />
  </Tabs>;
}
