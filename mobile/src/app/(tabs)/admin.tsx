import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Card, Heading, Stat } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import type { AdminOverview } from '@/types/api';

/** Coerce possibly-missing API values into a finite number. */
function num(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Format a possibly-missing value with one decimal place. */
function fixed(value: unknown, digits = 1): string {
  return num(value).toFixed(digits);
}

export default function AdminScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.get<AdminOverview>('/admin/overview'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load analytics.');
    } finally {
      setLoaded(true);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    if (user?.role === 'ADMIN') load();
    else setLoaded(true);
  }, [load, user?.role]);

  if (!loaded) return <Loading />;
  if (user?.role !== 'ADMIN') {
    return (
      <Screen>
        <Heading>Analytics</Heading>
        <Notice>Analytics are available to administrators only.</Notice>
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      <Heading subtitle="A live view of the SynergySphere platform.">Analytics</Heading>
      {error ? <Notice>{error}</Notice> : null}
      {data ? (
        <>
          <View style={styles.grid}>
            <Stat label="Total users" value={num(data.totalUsers ?? data.kpis?.totalUsers)} />
            <Stat label="Active this week" value={num(data.activeUsers ?? data.kpis?.totalActiveUsers)} />
            <Stat label="Daily logins" value={num(data.dailyLogins)} />
            <Stat label="Challenges passed" value={num(data.challengesCompleted)} />
            <Stat label="Applications" value={num(data.projectApplications)} />
            <Stat label="Interview average" value={`${Math.round(num(data.avgInterviewScore))}%`} />
          </View>
          {data.kpis ? (
            <View style={styles.grid}>
              <Stat label="Pending approvals" value={num(data.kpis.pendingApprovals)} />
              <Stat label="Open tickets" value={num(data.kpis.openTickets)} />
              <Stat label="Unreviewed complaints" value={num(data.kpis.unreviewedComplaints)} />
              <Stat label="Suspended users" value={num(data.kpis.suspendedUsers)} />
            </View>
          ) : null}
          <Card>
            <Text style={[styles.title, { color: colors.text }]}>Wellness averages</Text>
            <Text style={[styles.copy, { color: colors.muted }]}>
              Stress {fixed(data.avgStressLevel)} · Mood {fixed(data.avgMood)} · Energy {fixed(data.avgEnergy)}
            </Text>
          </Card>
          <Card>
            <Text style={[styles.title, { color: colors.text }]}>Recent users</Text>
            {(data.recentUsers ?? []).length === 0 ? (
              <Text style={[styles.copy, { color: colors.muted }]}>No users yet.</Text>
            ) : (
              (data.recentUsers ?? []).map((item) => (
                <Text key={item.email} style={[styles.copy, { color: colors.muted }]}>
                  • {item.firstName} {item.lastName} · {item.role}
                </Text>
              ))
            )}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  title: { fontSize: 17, fontWeight: '800' },
  copy: { lineHeight: 21, fontSize: 13 },
});
