import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Card, Heading, Stat } from '@/components/ui';
import { api } from '@/services/api';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import type { DashboardStats } from '@/types/api';

export default function HomeScreen() {
  const { user } = useAuth(); const [data, setData] = useState<DashboardStats | null>(null); const [error, setError] = useState(''); const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => { try { setError(''); setData(await api.get<DashboardStats>('/dashboard/stats')); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load dashboard.'); } }, []);
  useEffect(() => { load(); }, [load]);
  if (!data && !error) return <Loading />;
  return <Screen><View style={styles.head}><Heading subtitle={data?.levelTitle}>Hello, {user?.firstName} 👋</Heading></View>{error ? <Notice>{error}</Notice> : null}<Card><Text style={styles.xp}>{data?.user?.xp ?? user?.xp ?? 0} XP</Text><Text style={styles.muted}>Level {data?.user?.level ?? user?.level ?? 1} · Your learning momentum</Text></Card><Text style={styles.section}>Your progress</Text><View style={styles.grid}><Stat label="Tasks done" value={data?.stats.tasksCompleted ?? 0} /><Stat label="Challenges" value={data?.stats.challengesPassed ?? 0} /><Stat label="Wellness logs" value={data?.stats.wellnessEntries ?? 0} /><Stat label="Unread" value={data?.stats.unreadNotifications ?? 0} /></View></Screen>;
}
const styles = StyleSheet.create({ head: { marginTop: 6 }, xp: { color: colors.primary, fontSize: 32, fontWeight: '800' }, muted: { color: colors.muted, fontSize: 14 }, section: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 4 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 } });
