import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Screen, Notice } from '@/components/Screen';
import { Button, Card, Field, Heading } from '@/components/ui';
import { api } from '@/services/api';
import { colors } from '@/constants/theme';
import type { Interview, InterviewQuestion } from '@/types/api';
const topics = ['Java', 'Python', 'SQL', 'Web Development'] as const;
const list = <T,>(value: T[] | string | null): T[] => Array.isArray(value) ? value : (() => { try { return JSON.parse(value || '[]'); } catch { return []; } })();
export default function InterviewsScreen() {
  const [interview, setInterview] = useState<Interview | null>(null); const [answers, setAnswers] = useState<string[]>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  async function start(topic: typeof topics[number]) { setLoading(true); try { setError(''); const value = await api.post<Interview>('/ai/interview/start', { topic }); setInterview(value); setAnswers(new Array(list<InterviewQuestion>(value.questions).length).fill('')); } catch (e) { setError(e instanceof Error ? e.message : 'Could not start the interview.'); } finally { setLoading(false); } }
  async function evaluate() { if (!interview) return; setLoading(true); try { setInterview(await api.post<Interview>('/ai/interview/evaluate', { interviewId: interview.id, answers })); } catch (e) { setError(e instanceof Error ? e.message : 'Could not evaluate answers.'); } finally { setLoading(false); } }
  const questions = list<InterviewQuestion>(interview?.questions || null); const weakAreas = list<string>(interview?.weakAreas || null); return <Screen><Heading subtitle="Generate a focused technical interview and receive feedback.">Mock Interviews</Heading>{error ? <Notice>{error}</Notice> : null}<Card><Text style={styles.title}>Choose a topic</Text>{topics.map(topic => <Button key={topic} title={topic} secondary onPress={() => start(topic)} disabled={loading} />)}</Card>{interview ? <><Card><Text style={styles.title}>{interview.topic} interview</Text>{questions.map((question, index) => <Field key={index} label={`${index + 1}. ${question.question}`} value={answers[index] || ''} onChangeText={value => setAnswers(current => current.map((answer, answerIndex) => answerIndex === index ? value : answer))} multiline placeholder="Your answer" style={styles.answer} />)}<Button title={loading ? 'Evaluating…' : 'Submit answers'} onPress={evaluate} disabled={loading} /></Card>{interview.score !== null ? <Card><Text style={styles.score}>Score: {interview.score}/100</Text><Text style={styles.copy}>{interview.feedback}</Text>{weakAreas.length ? <Text style={styles.copy}>Focus next on: {weakAreas.join(', ')}</Text> : null}</Card> : null}</> : null}</Screen>;
}
const styles = StyleSheet.create({ title: { color: colors.text, fontSize: 17, fontWeight: '800' }, answer: { minHeight: 100, textAlignVertical: 'top', paddingTop: 12 }, score: { color: colors.primary, fontSize: 24, fontWeight: '800' }, copy: { color: colors.muted, lineHeight: 20 } });
