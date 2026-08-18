import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Button, Card, Field, Heading } from '@/components/ui';
import { api } from '@/services/api';
import { colors } from '@/constants/theme';
import type { Project } from '@/types/api';

export default function CommunityScreen() {
  const [projects, setProjects] = useState<Project[]>([]); const [search, setSearch] = useState(''); const [loaded, setLoaded] = useState(false); const [error, setError] = useState('');
  const load = useCallback(async (query = '') => { try { setError(''); setProjects(await api.get<Project[]>(`/projects${query ? `?search=${encodeURIComponent(query)}` : ''}`)); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load projects.'); } finally { setLoaded(true); } }, []); useEffect(() => { load(); }, [load]);
  async function apply(id: string) { try { await api.post(`/projects/${id}/apply`, {}); await load(search); } catch (e) { setError(e instanceof Error ? e.message : 'Could not join the project.'); } }
  if (!loaded) return <Loading />; return <Screen><Heading subtitle="Join projects that create a practical community impact.">Community</Heading>{error ? <Notice>{error}</Notice> : null}<Card><Field label="Find projects" value={search} onChangeText={setSearch} placeholder="Search projects or organizations" onSubmitEditing={() => load(search)} /><Button title="Search" onPress={() => load(search)} secondary /></Card>{projects.map(item => <Card key={item.id}><Text style={styles.tag}>{item.category} · {item.xpReward} XP</Text><Text style={styles.title}>{item.title}</Text><Text style={styles.copy}>{item.organization}{item.location ? ` · ${item.location}` : ''}</Text><Text style={styles.copy}>{item.description}</Text><Button title={item.hasApplied ? `Applied · ${item.applicationStatus || 'Pending'}` : 'Join project'} onPress={() => apply(item.id)} disabled={item.hasApplied} /></Card>)}</Screen>;
}
const styles = StyleSheet.create({ tag: { color: colors.primary, fontSize: 12, fontWeight: '800' }, title: { color: colors.text, fontSize: 17, fontWeight: '800' }, copy: { color: colors.muted, lineHeight: 20 } });
