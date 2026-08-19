import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Screen, Notice } from '@/components/Screen';
import { Button, Card, Field, Heading } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import type { Interview, InterviewQuestion } from '@/types/api';

const topics = ['Java', 'Python', 'SQL', 'Web Development'] as const;
const list = <T,>(value: T[] | string | null): T[] =>
  Array.isArray(value)
    ? value
    : (() => {
        try {
          return JSON.parse(value || '[]');
        } catch {
          return [];
        }
      })();

export default function InterviewsScreen() {
  const { colors, theme } = useTheme();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function start(topic: (typeof topics)[number]) {
    setLoading(true);
    try {
      setError('');
      const value = await api.post<Interview>('/ai/interview/start', { topic });
      setInterview(value);
      setAnswers(new Array(list<InterviewQuestion>(value.questions).length).fill(''));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the interview.');
    } finally {
      setLoading(false);
    }
  }

  async function evaluate() {
    if (!interview) return;
    setLoading(true);
    try {
      setInterview(await api.post<Interview>('/ai/interview/evaluate', { interviewId: interview.id, answers }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not evaluate answers.');
    } finally {
      setLoading(false);
    }
  }

  const isLight = theme === 'light';
  const scoreColor = isLight ? '#1e6827' : colors.primary;
  const questions = list<InterviewQuestion>(interview?.questions || null);
  const weakAreas = list<string>(interview?.weakAreas || null);

  return (
    <Screen>
      <Heading subtitle="Generate a focused technical interview and receive feedback.">Mock Interviews</Heading>
      {error ? <Notice>{error}</Notice> : null}
      <Card>
        <Text style={[styles.title, { color: colors.text }]}>Choose a topic</Text>
        {topics.map((topic) => (
          <Button key={topic} title={topic} secondary onPress={() => start(topic)} disabled={loading} />
        ))}
      </Card>
      {interview ? (
        <>
          <Card>
            <Text style={[styles.title, { color: colors.text }]}>{interview.topic} interview</Text>
            {questions.map((question, index) => (
              <Field
                key={index}
                label={`${index + 1}. ${question.question}`}
                value={answers[index] || ''}
                onChangeText={(value) =>
                  setAnswers((current) => current.map((answer, answerIndex) => (answerIndex === index ? value : answer)))
                }
                multiline
                placeholder="Your answer"
                style={styles.answer}
              />
            ))}
            <Button title={loading ? 'Evaluating…' : 'Submit answers'} onPress={evaluate} disabled={loading} />
          </Card>
          {interview.score !== null ? (
            <Card>
              <Text style={[styles.score, { color: scoreColor }]}>Score: {interview.score}/100</Text>
              <Text style={[styles.copy, { color: colors.muted }]}>{interview.feedback}</Text>
              {weakAreas.length ? (
                <Text style={[styles.copy, { color: colors.muted }]}>Focus next on: {weakAreas.join(', ')}</Text>
              ) : null}
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 17, fontWeight: '800' },
  answer: { minHeight: 100, textAlignVertical: 'top', paddingTop: 12 },
  score: { fontSize: 24, fontWeight: '800' },
  copy: { lineHeight: 20, fontSize: 13 },
});
