import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Loading } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function TabsLayout() {
  const { user, loading } = useAuth(); const router = useRouter();
  useEffect(() => { if (!loading && !user) router.replace('/(auth)/login'); }, [loading, router, user]);
  if (loading || !user) return <Loading />;
  return <Tabs screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border }, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: () => null }} />
    <Tabs.Screen name="tasks" options={{ title: 'Tasks', tabBarIcon: () => null }} />
    <Tabs.Screen name="wellness" options={{ title: 'Wellness', tabBarIcon: () => null }} />
    <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: () => null }} />
    <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: () => null }} />
    <Tabs.Screen name="notifications" options={{ href: null }} />
  </Tabs>;
}
