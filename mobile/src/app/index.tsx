import { Redirect } from 'expo-router';
import { Loading } from '@/components/Screen';
import { useAuth } from '@/context/AuthContext';

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return <Redirect href={user ? '/(tabs)' : '/(auth)/login'} />;
}
