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

  useEffect(() => { load(); }, []);

  async function load() {
    const data = await api<Notification[]>('/notifications');
    setNotifications(data);
  }

  async function markRead(id: string) {
    await api(`/notifications/${id}/read`, { method: 'PATCH' });
    load();
  }

  async function markAllRead() {
    await api('/notifications/read-all', { method: 'PATCH' });
    load();
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
        <Button variant="outline" onClick={markAllRead}>
          <CheckCheck className="mr-2 h-4 w-4" />Mark All Read
        </Button>
      </div>

      <div className="space-y-2">
        {notifications.map((n) => (
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
        {notifications.length === 0 && (
          <Card className="flex h-32 items-center justify-center">
            <p className="text-muted-foreground">No notifications yet</p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
