import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Card, Heading } from '@/components/ui';
import { api } from '@/services/api';
import { colors } from '@/constants/theme';
import type { Challenge, Project } from '@/types/api';

export default function ExploreScreen() {
  const [challenges, setChallenges] = useState<Challenge[]>([]); const [projects, setProjects] = useState<Project[]>([]); const [error, setError] = useState(''); const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => { try { const [challengeData, projectData] = await Promise.all([api.get<Challenge[]>('/challenges'), api.get<Project[]>('/projects')]); setChallenges(challengeData); setProjects(projectData); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load learning opportunities.'); } finally { setLoaded(true); } }, []);
  useEffect(() => { load(); }, [load]); if (!loaded) return <Loading />;
  return <Screen><Heading subtitle="Discover current coding challenges and community projects.">Explore</Heading>{error ? <Notice>{error}</Notice> : null}<Text style={styles.section}>Coding challenges</Text>{challenges.slice(0, 4).map((item) => <Card key={item.id}><Text style={styles.tag}>{item.difficulty} · {item.xpReward} XP</Text><Text style={styles.title}>{item.title}</Text><Text style={styles.copy}>{item.description}</Text></Card>)}<Text style={styles.section}>Community impact</Text>{projects.slice(0, 4).map((item) => <Card key={item.id}><Text style={styles.tag}>{item.category} · {item.xpReward} XP</Text><Text style={styles.title}>{item.title}</Text><Text style={styles.copy}>{item.organization}{item.location ? ` · ${item.location}` : ''}</Text></Card>)}</Screen>;
}
const styles = StyleSheet.create({ section: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 5 }, tag: { color: colors.primary, fontSize: 11, fontWeight: '800' }, title: { color: colors.text, fontSize: 16, fontWeight: '700' }, copy: { color: colors.muted, fontSize: 13, lineHeight: 19 } });
