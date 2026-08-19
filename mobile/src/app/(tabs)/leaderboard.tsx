import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Card, Heading } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import type { Leader } from '@/types/api';

const rankLabels = ['1st', '2nd', '3rd'];

export default function LeaderboardScreen() {
  const { colors, theme } = useTheme();
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      setLeaders(await api.get<Leader[]>('/leaderboard'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load leaderboard.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!loaded) return <Loading />;

  const isLight = theme === 'light';
  const rankColor = isLight ? '#1e6827' : colors.primary;

  return (
    <Screen>
      <Heading subtitle="See how the community is growing its impact.">Leaderboard</Heading>
      {error ? <Notice>{error}</Notice> : null}
      {leaders.map((leader, index) => (
        <Card key={leader.id}>
          <Text style={[styles.rank, { color: rankColor }]}>{rankLabels[index] || `#${index + 1}`}</Text>
          <Text style={[styles.name, { color: colors.text }]}>{leader.firstName} {leader.lastName}</Text>
          <Text style={[styles.copy, { color: colors.muted }]}>
            Level {leader.level} · {leader.xp} XP · {leader._count.challengeAttempts} challenges passed
          </Text>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rank: { fontSize: 20, fontWeight: '800' },
  name: { fontSize: 17, fontWeight: '800' },
  copy: { fontSize: 13, lineHeight: 18 },
});
