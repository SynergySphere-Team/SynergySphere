import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Screen, Notice } from '@/components/Screen';
import { Button, Card, Field, Heading } from '@/components/ui';
import { api } from '@/services/api';
import { colors } from '@/constants/theme';

type Message = { role: 'You' | 'SynergySphere AI'; content: string };
export default function AIAssistantScreen() {
  const [messages, setMessages] = useState<Message[]>([{ role: 'SynergySphere AI', content: 'How can I help with your code or learning today?' }]); const [message, setMessage] = useState(''); const [context, setContext] = useState(''); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  async function send(value = message) { if (!value.trim() || loading) return; const question = value.trim(); setMessages(current => [...current, { role: 'You', content: question }]); setMessage(''); setLoading(true); try { const response = await api.post<{ response: string }>('/ai/chat', { message: question, ...(context.trim() ? { context } : {}) }); setMessages(current => [...current, { role: 'SynergySphere AI', content: response.response }]); } catch (e) { setError(e instanceof Error ? e.message : 'AI workspace is unavailable.'); } finally { setLoading(false); } }
  return <Screen><Heading subtitle="Explain concepts, debug code, or get an improvement suggestion.">AI Workspace</Heading>{error ? <Notice>{error}</Notice> : null}<Card><Field label="Optional code context" value={context} onChangeText={setContext} multiline placeholder="Paste code or notes for better answers" style={styles.context} autoCapitalize="none" autoCorrect={false} /></Card>{messages.map((item, index) => <Card key={index}><Text style={item.role === 'You' ? styles.you : styles.ai}>{item.role}</Text><Text style={styles.copy}>{item.content}</Text></Card>)}<Card><Field label="Ask SynergySphere AI" value={message} onChangeText={setMessage} placeholder="e.g. Explain JavaScript closures" multiline /><Button title={loading ? 'Thinking…' : 'Send'} onPress={() => send()} disabled={loading || !message.trim()} secondary /><Button title="Explain my code" onPress={() => send('Explain the code context step by step and suggest one improvement.')} disabled={loading || !context.trim()} /></Card></Screen>;
}
const styles = StyleSheet.create({ you: { color: colors.primary, fontWeight: '800' }, ai: { color: '#9dc8ff', fontWeight: '800' }, copy: { color: colors.text, lineHeight: 21 }, context: { minHeight: 110, textAlignVertical: 'top', fontFamily: 'monospace', paddingTop: 12 } });
