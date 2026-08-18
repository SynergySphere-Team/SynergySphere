import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Card, Heading } from '@/components/ui';
import { api } from '@/services/api';
import { colors } from '@/constants/theme';
import type { Leader } from '@/types/api';
const rankLabels = ['1st', '2nd', '3rd'];
export default function LeaderboardScreen() { const [leaders, setLeaders] = useState<Leader[]>([]); const [error, setError] = useState(''); const [loaded, setLoaded] = useState(false); const load = useCallback(async () => { try { setLeaders(await api.get<Leader[]>('/leaderboard')); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load leaderboard.'); } finally { setLoaded(true); } }, []); useEffect(() => { load(); }, [load]); if (!loaded) return <Loading />; return <Screen><Heading subtitle="See how the community is growing its impact.">Leaderboard</Heading>{error ? <Notice>{error}</Notice> : null}{leaders.map((leader, index) => <Card key={leader.id}><Text style={styles.rank}>{rankLabels[index] || `#${index + 1}`}</Text><Text style={styles.name}>{leader.firstName} {leader.lastName}</Text><Text style={styles.copy}>Level {leader.level} · {leader.xp} XP · {leader._count.challengeAttempts} challenges passed</Text></Card>)}</Screen>; }
const styles = StyleSheet.create({ rank: { color: colors.primary, fontSize: 20, fontWeight: '800' }, name: { color: colors.text, fontSize: 17, fontWeight: '800' }, copy: { color: colors.muted } });
