import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Loading } from '@/components/Screen';
import { useAuth } from '@/context/AuthContext';

export default function Index() {
  const { user, loading } = useAuth();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  if (loading) return <Loading />;
  if (user) {
    return <Redirect href="/(tabs)" />;
  }
  return <Redirect href="/(auth)/login" />;
}
