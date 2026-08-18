import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Button, Card, Field, Heading } from '@/components/ui';
import { api } from '@/services/api';
import { colors } from '@/constants/theme';
import type { Challenge } from '@/types/api';

export default function CodingScreen() {
  const [items, setItems] = useState<Challenge[]>([]); const [selected, setSelected] = useState<Challenge | null>(null); const [code, setCode] = useState(''); const [error, setError] = useState(''); const [result, setResult] = useState(''); const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => { try { const data = await api.get<Challenge[]>('/challenges'); setItems(data); setSelected(current => current || data[0] || null); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load challenges.'); } finally { setLoaded(true); } }, []);
  useEffect(() => { load(); }, [load]);
  async function submit() { if (!selected || !code.trim()) return; try { setError(''); const response = await api.post<{ passed: boolean; xpEarned: number }>(`/challenges/${selected.id}/submit`, { code }); setResult(response.passed ? `Passed! You earned ${response.xpEarned} XP.` : 'Submitted. Review the challenge and try again.'); } catch (e) { setError(e instanceof Error ? e.message : 'Could not submit solution.'); } }
  if (!loaded) return <Loading />;
  return <Screen><Heading subtitle="Choose a challenge, write a solution, and earn XP.">Learning Hub</Heading>{error ? <Notice>{error}</Notice> : null}{result ? <Notice tone="success">{result}</Notice> : null}
    {items.map(item => <Card key={item.id}><Text style={styles.tag}>{item.difficulty} · {item.language || 'Programming'} · {item.xpReward} XP</Text><Text style={styles.title}>{item.title}</Text><Text style={styles.copy}>{item.description}</Text><Button title={selected?.id === item.id ? 'Selected' : 'Solve this challenge'} secondary={selected?.id !== item.id} onPress={() => { setSelected(item); setCode(''); setResult(''); }} /></Card>)}
    {selected ? <Card><Text style={styles.title}>Your solution: {selected.title}</Text><Field label="Code" value={code} onChangeText={setCode} multiline placeholder="Write your solution here…" style={styles.code} autoCapitalize="none" autoCorrect={false} /><Button title="Submit solution" onPress={submit} disabled={!code.trim()} /></Card> : null}
  </Screen>;
}
const styles = StyleSheet.create({ tag: { color: colors.primary, fontWeight: '800', fontSize: 12 }, title: { color: colors.text, fontSize: 17, fontWeight: '800' }, copy: { color: colors.muted, lineHeight: 20 }, code: { minHeight: 180, textAlignVertical: 'top', fontFamily: 'monospace', paddingTop: 12 } });
