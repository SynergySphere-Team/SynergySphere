import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { Loading } from '@/components/Screen';
import { useAuth } from '@/context/AuthContext';
import { onboardingStorage } from '@/services/api';

export default function Index() {
  const { user, loading } = useAuth();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const done = await onboardingStorage.isCompleted();
        if (mounted) setOnboardingDone(done);
      } catch {
        if (mounted) setOnboardingDone(false);
      } finally {
        if (mounted) setCheckingOnboarding(false);
      }
    }
    void check();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading || checkingOnboarding) return <Loading />;
  if (user) {
    if (!onboardingDone) return <Redirect href="/(auth)/onboarding" />;
    return <Redirect href="/(tabs)" />;
  }
  if (!onboardingDone) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(auth)/login" />;
}
