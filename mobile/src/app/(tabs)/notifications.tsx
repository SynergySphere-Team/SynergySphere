import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Button, Card, Heading } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import type { Notification } from '@/types/api';

export default function NotificationsScreen() {
  const { colors, theme } = useTheme();
  const [items, setItems] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setItems(await api.get<Notification[]>('/notifications'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load notifications.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markRead(id: string) {
    try {
      await api.patch(`/notifications/${id}/read`);
      setItems((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update notification.');
    }
  }

  async function markAllRead() {
    try {
      await api.patch('/notifications/read-all');
      setItems((current) => current.map((item) => ({ ...item, read: true })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update notifications.');
    }
  }

  if (!loaded) return <Loading />;

  const isLight = theme === 'light';
  const unreadColor = isLight ? '#1e6827' : colors.primary;

  return (
    <Screen>
      <Heading subtitle="Your latest learning and community updates.">Notifications</Heading>
      {error ? <Notice>{error}</Notice> : null}
      {items.some((item) => !item.read) ? <Button title="Mark all as read" secondary onPress={markAllRead} /> : null}
      {items.length === 0 ? (
        <Text style={[styles.empty, { color: colors.muted }]}>You’re all caught up.</Text>
      ) : (
        items.map((item) => (
          <Pressable key={item.id} onPress={() => !item.read && markRead(item.id)}>
            <Card>
              <Text style={[styles.title, { color: !item.read ? unreadColor : colors.text }]}>{item.title}</Text>
              <Text style={[styles.message, { color: colors.muted }]}>{item.message}</Text>
              <Text style={[styles.date, { color: colors.muted }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700' },
  message: { lineHeight: 19 },
  date: { fontSize: 12 },
  empty: { textAlign: 'center', marginTop: 40 },
});
