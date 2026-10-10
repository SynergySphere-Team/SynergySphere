import { Redirect } from 'expo-router';
import { Loading } from '@/components/Screen';
import { useAuth } from '@/context/AuthContext';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;
  if (user) {
    return <Redirect href="/(tabs)" />;
  }
  return <Redirect href="/(auth)/login" />;
}
