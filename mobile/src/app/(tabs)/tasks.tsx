import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Button, Card, Field, Heading } from '@/components/ui';
import { api } from '@/services/api';
import { colors } from '@/constants/theme';
import type { Task } from '@/types/api';

const nextStatus: Record<Task['status'], Task['status']> = { TODO: 'IN_PROGRESS', IN_PROGRESS: 'REVIEW', REVIEW: 'DONE', DONE: 'TODO' };
export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]); const [title, setTitle] = useState(''); const [error, setError] = useState(''); const [adding, setAdding] = useState(false); const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => { try { setError(''); setTasks(await api.get<Task[]>('/tasks')); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load tasks.'); } finally { setLoaded(true); } }, []);
  useEffect(() => { load(); }, [load]);
  async function add() { if (!title.trim()) return; setAdding(true); try { await api.post<Task>('/tasks', { title: title.trim() }); setTitle(''); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not create task.'); } finally { setAdding(false); } }
  async function advance(task: Task) { try { await api.patch<Task>(`/tasks/${task.id}`, { status: nextStatus[task.status] }); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not update task.'); } }
  if (!loaded) return <Loading />;
  return <Screen><Heading subtitle="Plan work, track focus, and earn XP.">Productivity</Heading>{error ? <Notice>{error}</Notice> : null}<Card><Field label="New task" value={title} onChangeText={setTitle} placeholder="What do you want to accomplish?" onSubmitEditing={add} /><Button title={adding ? 'Adding…' : 'Add task'} onPress={add} disabled={adding || !title.trim()} /></Card>{tasks.length === 0 ? <Text style={styles.empty}>No tasks yet. Add one above to get started.</Text> : tasks.map((task) => <Card key={task.id}><View style={styles.row}><View style={styles.body}><Text style={[styles.status, task.status === 'DONE' && styles.done]}>{task.status.replace('_', ' ')}</Text><Text style={[styles.title, task.status === 'DONE' && styles.done]}>{task.title}</Text>{task.description ? <Text style={styles.description}>{task.description}</Text> : null}</View><Button title={task.status === 'DONE' ? 'Reopen' : 'Advance'} onPress={() => advance(task)} secondary /></View></Card>)}</Screen>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, body: { flex: 1, gap: 4 }, status: { color: colors.primary, fontSize: 11, fontWeight: '800' }, title: { color: colors.text, fontSize: 16, fontWeight: '700' }, description: { color: colors.muted, fontSize: 13 }, done: { color: colors.muted, textDecorationLine: 'line-through' }, empty: { color: colors.muted, textAlign: 'center', marginTop: 30 } });
