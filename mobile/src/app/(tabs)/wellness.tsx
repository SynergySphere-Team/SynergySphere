import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Button, Card, Field, Heading } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import type { WellnessEntry } from '@/types/api';

function ScoreControl({ label, value, onChange }: { label: string; value: number; onChange(value: number): void }) {
  const { colors, theme } = useTheme();
  return (
    <View style={styles.control}>
      <Text style={[styles.label, { color: colors.text }]}>
        {label}: <Text style={[styles.score, { color: theme === 'light' ? '#1e6827' : colors.primary }]}>{value}/10</Text>
      </Text>
      <View style={styles.choices}>
        {[1, 3, 5, 7, 10].map((score) => (
          <Button key={score} title={String(score)} secondary={score !== value} onPress={() => onChange(score)} />
        ))}
      </View>
    </View>
  );
}

export default function WellnessScreen() {
  const { colors, theme } = useTheme();
  const [entries, setEntries] = useState<WellnessEntry[]>([]);
  const [stress, setStress] = useState(5);
  const [mood, setMood] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [notes, setNotes] = useState('');
  const [insights, setInsights] = useState<{ recommendations: string[]; averages: { stress: number; mood: number; energy: number } | null } | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [entryData, insightData] = await Promise.all([
        api.get<WellnessEntry[]>('/wellness'),
        api.get<{ recommendations: string[]; averages: { stress: number; mood: number; energy: number } | null }>('/wellness/insights'),
      ]);
      setEntries(entryData);
      setInsights(insightData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load wellness history.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    try {
      setError('');
      await api.post('/wellness', {
        stressLevel: stress,
        mood,
        energyLevel: energy,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      setNotes('');
      setSaved('Check-in saved. You earned 10 XP!');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save check-in.');
    }
  }

  if (!loaded) return <Loading />;

  const isLight = theme === 'light';
  const primaryAccent = isLight ? '#1e6827' : colors.primary;

  return (
    <Screen>
      <Heading subtitle="A small daily check-in helps you notice your patterns.">Wellness</Heading>
      {error ? <Notice>{error}</Notice> : null}
      {saved ? <Notice tone="success">{saved}</Notice> : null}
      <Card>
        <ScoreControl label="Stress" value={stress} onChange={setStress} />
        <ScoreControl label="Mood" value={mood} onChange={setMood} />
        <ScoreControl label="Energy" value={energy} onChange={setEnergy} />
        <Field label="Notes (optional)" value={notes} onChangeText={setNotes} multiline placeholder="What is affecting your wellbeing today?" />
        <Button title="Save check-in" onPress={save} />
      </Card>
      {insights ? (
        <Card>
          <Text style={[styles.history, { color: colors.text }]}>Your insights</Text>
          {insights.averages ? (
            <Text style={[styles.summary, { color: colors.muted }]}>
              Average: Stress {insights.averages.stress.toFixed(1)} · Mood {insights.averages.mood.toFixed(1)} · Energy {insights.averages.energy.toFixed(1)}
            </Text>
          ) : null}
          {insights.recommendations.map((item, index) => (
            <Text key={index} style={[styles.summary, { color: colors.muted }]}>
              • {item}
            </Text>
          ))}
        </Card>
      ) : null}
      <Text style={[styles.history, { color: colors.text }]}>Recent check-ins</Text>
      {entries.slice(0, 7).map((entry) => (
        <Card key={entry.id}>
          <Text style={[styles.date, { color: primaryAccent }]}>{new Date(entry.date).toLocaleDateString()}</Text>
          <Text style={[styles.summary, { color: colors.muted }]}>
            Stress {entry.stressLevel} · Mood {entry.mood} · Energy {entry.energyLevel}
          </Text>
          {entry.notes ? <Text style={[styles.summary, { color: colors.muted }]}>{entry.notes}</Text> : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  control: { gap: 8 },
  label: { fontWeight: '700' },
  score: { fontWeight: '800' },
  choices: { flexDirection: 'row', gap: 6 },
  history: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  date: { fontWeight: '700' },
  summary: { fontSize: 13, lineHeight: 18 },
});
