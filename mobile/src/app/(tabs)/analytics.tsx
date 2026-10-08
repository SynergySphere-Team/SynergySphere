import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Loading } from '@/components/Screen';

export default function AnalyticsRoute() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(tabs)/admin?tab=analytics' as never);
  }, [router]);

  return <Loading />;
}
