import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Card, Heading } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import type { Challenge, Project } from '@/types/api';

export default function ExploreScreen() {
  const { colors, theme } = useTheme();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [challengeData, projectData] = await Promise.all([
        api.get<Challenge[]>('/challenges'),
        api.get<Project[]>('/projects'),
      ]);
      setChallenges(challengeData);
      setProjects(projectData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load learning opportunities.');
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
    load();
  }, [load]);

  if (!loaded) return <Loading />;

  const isLight = theme === 'light';
  const tagColor = isLight ? '#1e6827' : colors.primary;

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      <Heading subtitle="Discover current coding challenges and community projects.">Explore</Heading>
      {error ? <Notice>{error}</Notice> : null}
      <Text style={[styles.section, { color: colors.text }]}>Coding challenges</Text>
      {challenges.slice(0, 4).map((item) => (
        <Card key={item.id}>
          <Text style={[styles.tag, { color: tagColor }]}>{item.difficulty} · {item.xpReward} XP</Text>
          <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.copy, { color: colors.muted }]}>{item.description}</Text>
        </Card>
      ))}
      <Text style={[styles.section, { color: colors.text }]}>Community impact</Text>
      {projects.slice(0, 4).map((item) => (
        <Card key={item.id}>
          <Text style={[styles.tag, { color: tagColor }]}>{item.category} · {item.xpReward} XP</Text>
          <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.copy, { color: colors.muted }]}>{item.organization}{item.location ? ` · ${item.location}` : ''}</Text>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 18, fontWeight: '800', marginTop: 5 },
  tag: { fontSize: 11, fontWeight: '800' },
  title: { fontSize: 16, fontWeight: '700' },
  copy: { fontSize: 13, lineHeight: 19 },
});
