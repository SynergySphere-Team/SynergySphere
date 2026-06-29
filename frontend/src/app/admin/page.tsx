'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/utils';
import { BarChart3, Users, Code2, Heart, Mic } from 'lucide-react';

interface AdminData {
  totalUsers: number;
  activeUsers: number;
  dailyLogins: number;
  challengesCompleted: number;
  projectApplications: number;
  avgInterviewScore: number;
  avgStressLevel: number;
  recentUsers: Array<{ firstName: string; lastName: string; email: string; role: string; createdAt: string }>;
}

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);

  useEffect(() => {
    api<AdminData>('/admin/overview').then(setData).catch(console.error);
  }, []);

  if (!data) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </DashboardLayout>
    );
  }

  const metrics = [
    { label: 'Total Users', value: data.totalUsers, icon: Users, color: 'text-blue-400' },
    { label: 'Active Users (7d)', value: data.activeUsers, icon: Users, color: 'text-green-400' },
    { label: 'Daily Logins', value: data.dailyLogins, icon: BarChart3, color: 'text-purple-400' },
    { label: 'Challenges Completed', value: data.challengesCompleted, icon: Code2, color: 'text-amber-400' },
    { label: 'Project Applications', value: data.projectApplications, icon: Users, color: 'text-teal-400' },
    { label: 'Avg Interview Score', value: data.avgInterviewScore.toFixed(0), icon: Mic, color: 'text-pink-400' },
    { label: 'Avg Stress Level', value: data.avgStressLevel.toFixed(1), icon: Heart, color: 'text-red-400' },
  ];

  return (
    <DashboardLayout>
      <h1 className="mb-2 text-3xl font-bold">Analytics Dashboard</h1>
      <p className="mb-8 text-muted-foreground">Platform metrics for research and monitoring</p>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="flex items-center gap-3 pt-6">
              <m.icon className={`h-8 w-8 ${m.color}`} />
              <div>
                <p className="text-2xl font-bold">{m.value}</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Registrations</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.recentUsers.map((u, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/30 p-3 text-sm">
                <div>
                  <p className="font-medium">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="text-right">
                  <span className="rounded bg-primary/20 px-2 py-0.5 text-xs text-primary">{u.role}</span>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
