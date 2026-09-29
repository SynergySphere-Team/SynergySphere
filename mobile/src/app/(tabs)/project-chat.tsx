import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Button, Card, Field, Heading } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import type { ProjectMessage } from '@/types/api';

export default function ProjectChatScreen() {
  const { projectId, title } = useLocalSearchParams<{ projectId: string; title?: string }>();
  const { user } = useAuth();
  const { colors, theme } = useTheme();
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [message, setMessage] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      setError('');
      setMessages(await api.get<ProjectMessage[]>(`/projects/${projectId}/messages`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this discussion.');
    } finally {
      setLoaded(true);
    }
  }, [projectId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  async function send() {
    if (!message.trim() || !projectId) return;
    setSending(true);
    try {
      const created = await api.post<ProjectMessage>(`/projects/${projectId}/messages`, { body: message.trim() });
      setMessages((current) => [...current, created]);
      setMessage('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send your message.');
    } finally {
      setSending(false);
    }
  }

  if (!loaded) return <Loading />;

  const isLight = theme === 'light';
  const brandGreen = isLight ? '#1e6827' : colors.primary;

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      <Heading subtitle={title ? `Coordinate with the people involved in ${title}.` : 'Coordinate with the people involved in this project.'}>
        Project discussion
      </Heading>
      {error ? <Notice>{error}</Notice> : null}
      <Button title="Refresh discussion" secondary onPress={load} />
      {messages.length === 0 ? (
        <Card>
          <Text style={[styles.empty, { color: colors.muted }]}>
            No messages yet. Start the conversation with your project team.
          </Text>
        </Card>
      ) : (
        messages.map((item) => {
          const mine = item.userId === user?.id;
          return (
            <View
              key={item.id}
              style={[
                styles.message,
                {
                  backgroundColor: mine ? (isLight ? '#E2F5DA' : colors.primaryDark) : colors.surfaceElevated,
                  borderColor: mine ? brandGreen : colors.border,
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                },
              ]}
            >
              <Text style={[styles.author, { color: brandGreen }]}>{mine ? 'You' : `${item.firstName} ${item.lastName}`}</Text>
              <Text style={[styles.body, { color: colors.text }]}>{item.body}</Text>
              <Text style={[styles.date, { color: colors.muted }]}>{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
          );
        })
      )}
      <Card>
        <Field
          label="New message"
          value={message}
          onChangeText={setMessage}
          multiline
          placeholder="Share an update, question, or next step…"
          style={styles.input}
        />
        <Button title={sending ? 'Sending…' : 'Send message'} onPress={send} disabled={sending || !message.trim()} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  message: { maxWidth: '88%', gap: 5, padding: 13, borderRadius: 14, borderWidth: 1 },
  author: { fontSize: 12, fontWeight: '800' },
  body: { fontSize: 15, lineHeight: 21 },
  date: { fontSize: 11 },
  empty: { lineHeight: 20 },
  input: { minHeight: 84, textAlignVertical: 'top', paddingTop: 12 },
});
