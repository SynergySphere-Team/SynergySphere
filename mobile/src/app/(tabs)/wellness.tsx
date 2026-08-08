import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Button, Card, Heading } from '@/components/ui';
import { api } from '@/services/api';
import { colors } from '@/constants/theme';
import type { WellnessEntry } from '@/types/api';

function ScoreControl({ label, value, onChange }: { label: string; value: number; onChange(value: number): void }) { return <View style={styles.control}><Text style={styles.label}>{label}: <Text style={styles.score}>{value}/10</Text></Text><View style={styles.choices}>{[1, 3, 5, 7, 10].map((score) => <Button key={score} title={String(score)} secondary={score !== value} onPress={() => onChange(score)} />)}</View></View>; }
export default function WellnessScreen() {
  const [entries, setEntries] = useState<WellnessEntry[]>([]); const [stress, setStress] = useState(5); const [mood, setMood] = useState(5); const [energy, setEnergy] = useState(5); const [error, setError] = useState(''); const [saved, setSaved] = useState(''); const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => { try { setEntries(await api.get<WellnessEntry[]>('/wellness')); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load wellness history.'); } finally { setLoaded(true); } }, []);
  useEffect(() => { load(); }, [load]);
  async function save() { try { setError(''); await api.post('/wellness', { stressLevel: stress, mood, energyLevel: energy }); setSaved('Check-in saved. You earned 10 XP!'); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save check-in.'); } }
  if (!loaded) return <Loading />;
  return <Screen><Heading subtitle="A small daily check-in helps you notice your patterns.">Wellness</Heading>{error ? <Notice>{error}</Notice> : null}{saved ? <Notice tone="success">{saved}</Notice> : null}<Card><ScoreControl label="Stress" value={stress} onChange={setStress} /><ScoreControl label="Mood" value={mood} onChange={setMood} /><ScoreControl label="Energy" value={energy} onChange={setEnergy} /><Button title="Save check-in" onPress={save} /></Card><Text style={styles.history}>Recent check-ins</Text>{entries.slice(0, 7).map((entry) => <Card key={entry.id}><Text style={styles.date}>{new Date(entry.date).toLocaleDateString()}</Text><Text style={styles.summary}>Stress {entry.stressLevel} · Mood {entry.mood} · Energy {entry.energyLevel}</Text></Card>)}</Screen>;
}
const styles = StyleSheet.create({ control: { gap: 8 }, label: { color: colors.text, fontWeight: '700' }, score: { color: colors.primary }, choices: { flexDirection: 'row', gap: 6 }, history: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 4 }, date: { color: colors.primary, fontWeight: '700' }, summary: { color: colors.muted } });
