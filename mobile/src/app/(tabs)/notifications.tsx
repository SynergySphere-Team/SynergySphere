import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Card, Heading } from '@/components/ui';
import { api } from '@/services/api';
import { colors } from '@/constants/theme';
import type { Notification } from '@/types/api';

export default function NotificationsScreen() {
  const [items, setItems] = useState<Notification[]>([]); const [loaded, setLoaded] = useState(false); const [error, setError] = useState('');
  const load = useCallback(async () => { try { setError(''); setItems(await api.get<Notification[]>('/notifications')); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load notifications.'); } finally { setLoaded(true); } }, []);
  useEffect(() => { load(); }, [load]);
  async function markRead(id: string) { try { await api.patch(`/notifications/${id}/read`); setItems((current) => current.map((item) => item.id === id ? { ...item, read: true } : item)); } catch (e) { setError(e instanceof Error ? e.message : 'Could not update notification.'); } }
  if (!loaded) return <Loading />;
  return <Screen><Heading subtitle="Your latest learning and community updates.">Notifications</Heading>{error ? <Notice>{error}</Notice> : null}{items.length === 0 ? <Text style={styles.empty}>You’re all caught up.</Text> : items.map((item) => <Pressable key={item.id} onPress={() => !item.read && markRead(item.id)}><Card><Text style={[styles.title, !item.read && styles.unread]}>{item.title}</Text><Text style={styles.message}>{item.message}</Text><Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text></Card></Pressable>)}</Screen>;
}
const styles = StyleSheet.create({ title: { color: colors.text, fontSize: 16, fontWeight: '700' }, unread: { color: colors.primary }, message: { color: colors.muted, lineHeight: 19 }, date: { color: colors.muted, fontSize: 12 }, empty: { color: colors.muted, textAlign: 'center', marginTop: 40 } });
