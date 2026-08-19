import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Button, Card, Field, Heading } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import type { Challenge, LearningResource } from '@/types/api';

export default function CodingScreen() {
  const { colors, theme } = useTheme();
  const [items, setItems] = useState<Challenge[]>([]);
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [selected, setSelected] = useState<Challenge | null>(null);
  const [code, setCode] = useState('');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [challenges, learning] = await Promise.all([
        api.get<Challenge[]>('/challenges'),
        api.get<LearningResource[]>('/learning'),
      ]);
      setItems(challenges);
      setResources(learning);
      setSelected((current) => current || challenges[0] || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load learning content.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (!selected || !code.trim()) return;
    try {
      setError('');
      const response = await api.post<{ passed: boolean; xpEarned: number }>(`/challenges/${selected.id}/submit`, { code });
      setResult(response.passed ? `Passed. You earned ${response.xpEarned} XP.` : 'Submitted. Review the challenge and try again.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit solution.');
    }
  }

  async function checkResource(resource: LearningResource) {
    const answer = answers[resource.id];
    if (answer === undefined) return;
    setChecked((current) => ({ ...current, [resource.id]: true }));
    if (answer !== resource.answer || resource.completed) return;
    try {
      const response = await api.post<{ xpEarned: number }>(`/learning/${resource.id}/complete`);
      setResources((current) => current.map((item) => (item.id === resource.id ? { ...item, completed: true } : item)));
      setResult(`Learning resource completed. You earned ${response.xpEarned} XP.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your learning progress.');
    }
  }

  if (!loaded) return <Loading />;

  const isLight = theme === 'light';
  const tagColor = isLight ? '#1e6827' : colors.primary;

  return (
    <Screen>
      <Heading subtitle="Use curated external tutorials, then confirm your understanding with original SynergySphere checks.">
        Learning Hub
      </Heading>
      {error ? <Notice>{error}</Notice> : null}
      {result ? <Notice tone="success">{result}</Notice> : null}
      <Text style={[styles.section, { color: colors.text }]}>Curated tutorials</Text>
      <Text style={[styles.disclosure, { color: colors.muted }]}>
        Tutorials open on GeeksforGeeks. SynergySphere stores only the link, its own learning outcome, and its own knowledge check.
      </Text>
      {resources.map((resource) => {
        const answer = answers[resource.id];
        const isChecked = checked[resource.id];
        const correct = answer === resource.answer;
        return (
          <Card key={resource.id}>
            <Text style={[styles.tag, { color: tagColor }]}>
              {resource.topic} · {resource.level} · {resource.minutes} min
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>{resource.title}</Text>
            <Text style={[styles.copy, { color: colors.muted }]}>{resource.outcome}</Text>
            <Button
              title={`Open ${resource.source} tutorial`}
              secondary
              onPress={() => Linking.openURL(resource.url).catch(() => setError('Could not open this tutorial link.'))}
            />
            <Text style={[styles.question, { color: colors.text }]}>{resource.question}</Text>
            {resource.options.map((option, index) => (
              <Pressable
                key={option}
                disabled={isChecked || resource.completed}
                accessibilityRole="radio"
                accessibilityState={{ selected: answer === index, disabled: isChecked || resource.completed }}
                onPress={() => setAnswers((current) => ({ ...current, [resource.id]: index }))}
                style={({ pressed }) => [
                  styles.option,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                  answer === index && { borderColor: isLight ? '#1e6827' : colors.primary },
                  isChecked && index === resource.answer && {
                    backgroundColor: isLight ? '#E2F5DA' : colors.primaryDark,
                    borderColor: isLight ? '#1e6827' : colors.primary,
                  },
                  isChecked && answer === index && !correct && {
                    backgroundColor: isLight ? '#FDE8E8' : '#421d24',
                    borderColor: colors.danger,
                  },
                  pressed && !isChecked && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.radio,
                    { borderColor: colors.muted },
                    answer === index && { borderColor: isLight ? '#1e6827' : colors.primary },
                  ]}
                >
                  {answer === index ? (
                    <View style={[styles.radioDot, { backgroundColor: isLight ? '#1e6827' : colors.primary }]} />
                  ) : null}
                </View>
                <Text style={[styles.optionText, { color: colors.text }]}>{option}</Text>
              </Pressable>
            ))}
            {resource.completed ? (
              <Text style={[styles.complete, { color: tagColor }]}>Completed · {resource.xpReward} XP earned</Text>
            ) : (
              <Button
                title={isChecked ? (correct ? 'Correct — saving completion' : 'Review tutorial and try again') : 'Check answer'}
                onPress={() => checkResource(resource)}
                disabled={answer === undefined || (isChecked && !correct)}
              />
            )}
          </Card>
        );
      })}
      <Text style={[styles.section, { color: colors.text }]}>Coding challenges</Text>
      {items.map((item) => (
        <Card key={item.id}>
          <Text style={[styles.tag, { color: tagColor }]}>
            {item.difficulty} · {item.language || 'Programming'} · {item.xpReward} XP
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.copy, { color: colors.muted }]}>{item.description}</Text>
          <Button
            title={selected?.id === item.id ? 'Selected' : 'Solve this challenge'}
            secondary={selected?.id !== item.id}
            onPress={() => {
              setSelected(item);
              setCode('');
              setResult('');
            }}
          />
        </Card>
      ))}
      {selected ? (
        <Card>
          <Text style={[styles.title, { color: colors.text }]}>Your solution: {selected.title}</Text>
          <Field
            label="Code"
            value={code}
            onChangeText={setCode}
            multiline
            placeholder="Write your solution here…"
            style={styles.code}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Button title="Submit solution" onPress={submit} disabled={!code.trim()} />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  disclosure: { fontSize: 13, lineHeight: 19 },
  tag: { fontWeight: '800', fontSize: 12 },
  title: { fontSize: 17, fontWeight: '800' },
  copy: { lineHeight: 20, fontSize: 13 },
  question: { fontSize: 14, fontWeight: '700', lineHeight: 20, marginTop: 2 },
  option: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, borderWidth: 1 },
  radio: { width: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  radioDot: { width: 7, height: 7, borderRadius: 4 },
  optionText: { flex: 1, fontSize: 14 },
  complete: { fontWeight: '800', fontSize: 13 },
  pressed: { opacity: 0.7 },
  code: { minHeight: 180, textAlignVertical: 'top', fontFamily: 'monospace', paddingTop: 12 },
});
