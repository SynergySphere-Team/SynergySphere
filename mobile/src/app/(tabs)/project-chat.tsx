import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Button, Card, Field, Heading } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import type { ProjectMessage } from '@/types/api';

export default function ProjectChatScreen() {
  const { projectId, title } = useLocalSearchParams<{ projectId: string; title?: string }>(); const { user } = useAuth(); const [messages, setMessages] = useState<ProjectMessage[]>([]); const [message, setMessage] = useState(''); const [loaded, setLoaded] = useState(false); const [sending, setSending] = useState(false); const [error, setError] = useState('');
  const load = useCallback(async () => { if (!projectId) return; try { setError(''); setMessages(await api.get<ProjectMessage[]>(`/projects/${projectId}/messages`)); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load this discussion.'); } finally { setLoaded(true); } }, [projectId]); useEffect(() => { load(); }, [load]);
  async function send() { if (!message.trim() || !projectId) return; setSending(true); try { const created = await api.post<ProjectMessage>(`/projects/${projectId}/messages`, { body: message.trim() }); setMessages(current => [...current, created]); setMessage(''); } catch (e) { setError(e instanceof Error ? e.message : 'Could not send your message.'); } finally { setSending(false); } }
  if (!loaded) return <Loading />;
  return <Screen><Heading subtitle={title ? `Coordinate with the people involved in ${title}.` : 'Coordinate with the people involved in this project.'}>Project discussion</Heading>{error ? <Notice>{error}</Notice> : null}<Button title="Refresh discussion" secondary onPress={load} />{messages.length === 0 ? <Card><Text style={styles.empty}>No messages yet. Start the conversation with your project team.</Text></Card> : messages.map((item) => { const mine = item.userId === user?.id; return <View key={item.id} style={[styles.message, mine && styles.mine]}><Text style={styles.author}>{mine ? 'You' : `${item.firstName} ${item.lastName}`}</Text><Text style={styles.body}>{item.body}</Text><Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text></View>; })}<Card><Field label="New message" value={message} onChangeText={setMessage} multiline placeholder="Share an update, question, or next step…" style={styles.input} /><Button title={sending ? 'Sending…' : 'Send message'} onPress={send} disabled={sending || !message.trim()} /></Card></Screen>;
}
const styles = StyleSheet.create({ message: { alignSelf: 'flex-start', maxWidth: '88%', gap: 5, padding: 13, borderRadius: 14, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border }, mine: { alignSelf: 'flex-end', backgroundColor: colors.primaryDark, borderColor: colors.primary }, author: { color: colors.primary, fontSize: 12, fontWeight: '800' }, body: { color: colors.text, fontSize: 15, lineHeight: 21 }, date: { color: colors.muted, fontSize: 11 }, empty: { color: colors.muted, lineHeight: 20 }, input: { minHeight: 84, textAlignVertical: 'top', paddingTop: 12 } });
