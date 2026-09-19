'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/utils';
import { Bell, CheckCheck } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  type: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<Notification[]>('/notifications');
      setNotifications(data);
    } catch (cause) {
      // Loading a secondary dashboard screen should never cause an uncaught
      // client error. Keep the page usable and show the actionable reason.
      setError(cause instanceof Error ? cause.message : 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id: string) {
    try {
      await api(`/notifications/${id}/read`, { method: 'PATCH' });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update this notification.');
    }
  }

  async function markAllRead() {
    try {
      await api('/notifications/read-all', { method: 'PATCH' });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update notifications.');
    }
  }

  const typeIcon: Record<string, string> = {
    welcome: '👋',
    xp: '⚡',
    badge: '🏅',
    achievement: '🎉',
    info: 'ℹ️',
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">Stay updated on your progress</p>
        </div>
        <Button variant="outline" onClick={markAllRead} disabled={loading || notifications.length === 0}>
          <CheckCheck className="mr-2 h-4 w-4" />Mark All Read
        </Button>
      </div>

      {error && (
        <Card className="mb-4 border-destructive/40 bg-destructive/10">
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={load}>Try again</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {loading && (
          <Card className="flex h-32 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading notifications…</p>
          </Card>
        )}
        {!loading && notifications.map((n) => (
          <Card key={n.id} className={n.read ? 'opacity-60' : ''}>
            <CardContent className="flex items-center gap-4 pt-6">
              <span className="text-xl">{typeIcon[n.type] || <Bell className="h-5 w-5" />}</span>
              <div className="flex-1">
                <p className="font-medium">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              {!n.read && (
                <Button variant="ghost" size="sm" onClick={() => markRead(n.id)}>Mark Read</Button>
              )}
            </CardContent>
          </Card>
        ))}
        {!loading && !error && notifications.length === 0 && (
          <Card className="flex h-32 items-center justify-center">
            <p className="text-muted-foreground">No notifications yet</p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
