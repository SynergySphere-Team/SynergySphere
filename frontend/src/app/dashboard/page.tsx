'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { api, getLevelTitle, getXpProgress } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  CheckCircle2,
  Code2,
  HeartPulse,
  ListChecks,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

interface DashboardData {
  user: { firstName: string; lastName: string; xp: number; level: number };
  levelTitle: string;
  stats: {
    tasksCompleted: number;
    challengesPassed: number;
    wellnessEntries: number;
    interviews: number;
    projectApplications: number;
    unreadNotifications: number;
  };
  wellnessTrend: Array<{ stressLevel: number; mood: number; energyLevel: number; date: string }>;
}

const activity = [35, 74, 46, 88, 66, 78, 58];
const progress = [
  ['SkillUp', 80],
  ['LectureToLife', 64],
  ['Productivity', 72],
  ['Community', 75],
  ['Career', 60],
];

const upcoming = [
  ['Java Challenge', 'Arrays and hashmaps', 'Due today'],
  ['Study Microservices', 'Summarize JDBC notes', 'Due tomorrow'],
  ['Community Update', 'EcoSaver dashboard', 'Due in 2 days'],
  ['Mock Interview', 'Backend developer', 'Due in 3 days'],
];

const recommendations = [
  'Continue JDBC module based on your progress.',
  'Practice binary trees to strengthen your SQL/API task pattern.',
  'Review REST APIs before the mock interview.',
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    api<DashboardData>('/dashboard/stats').then(setData).catch(() => setData(null));
  }, []);

  const stats = data?.stats ?? {
    tasksCompleted: 23,
    challengesPassed: 18,
    wellnessEntries: 9,
    interviews: 3,
    projectApplications: 5,
    unreadNotifications: 2,
  };

  const kpis = [
    { label: 'XP Earned', value: user?.xp ?? 2450, caption: '+160 this week', icon: Zap },
    { label: 'Coding Streak', value: '14 Days', caption: 'Keep it up', icon: Code2 },
    { label: 'Tasks Completed', value: stats.tasksCompleted, caption: '+5 from last week', icon: CheckCircle2 },
    { label: 'Projects Joined', value: stats.projectApplications, caption: 'Active contributions', icon: Users },
    { label: 'Wellness Score', value: '78%', caption: 'Good balance', icon: HeartPulse },
    { label: 'Alerts', value: stats.unreadNotifications, caption: 'Need review', icon: Bell },
  ];

  return (
    <DashboardLayout>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Student Command Center</p>
          <h1 className="text-2xl font-bold text-white md:text-3xl">
            Good morning, {user?.firstName ?? 'Lerato'}!
          </h1>
          <p className="text-sm text-muted-foreground">Let&apos;s continue your journey of learning and building.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary">
          <Sparkles className="h-4 w-4" />
          {getLevelTitle(user?.level || 1)} - Level {user?.level ?? 12}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-6">
        {kpis.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="xl:col-span-1"
          >
            <Card className="h-full">
              <CardContent className="pt-1">
                <div className="mb-3 flex items-center justify-between">
                  <div className="rounded-lg border border-primary/20 bg-primary/10 p-2">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-xl font-bold text-white">{item.value}</p>
                <p className="mt-1 text-[11px] text-primary">{item.caption}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_0.85fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Learning Progress
            </CardTitle>
            <span className="rounded-lg border border-white/[0.08] bg-secondary/50 px-2 py-1 text-[11px] text-muted-foreground">This week</span>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 lg:grid-cols-[0.8fr_1fr]">
              <div className="relative mx-auto flex aspect-square w-full max-w-[260px] items-center justify-center rounded-full border border-primary/20 bg-black/25">
                <div className="absolute inset-6 rounded-full border border-white/[0.08]" />
                <div className="absolute inset-14 rounded-full border border-white/[0.08]" />
                <div
                  className="h-[68%] w-[68%] bg-primary/45"
                  style={{ clipPath: 'polygon(50% 0%, 87% 24%, 78% 82%, 25% 90%, 9% 34%)' }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-center">
                  <div>
                    <p className="text-2xl font-bold text-white">72%</p>
                    <p className="text-[11px] text-muted-foreground">overall</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {progress.map(([label, value]) => (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-semibold text-white">{value}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-black/35">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-300" style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
                <div className="pt-3">
                  <p className="mb-1 text-xs text-muted-foreground">Level progress</p>
                  <div className="h-2 overflow-hidden rounded-full bg-black/35">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${getXpProgress(user?.xp || 2450)}%` }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              Upcoming Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.map(([title, desc, due]) => (
              <div key={title} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.07] bg-secondary/40 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{title}</p>
                  <p className="truncate text-xs text-muted-foreground">{desc}</p>
                </div>
                <span className="shrink-0 text-[11px] text-primary">{due}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Weekly Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-end gap-3">
              {activity.map((height, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full items-end rounded-t bg-primary/10" style={{ height: `${height}%` }}>
                    <div className="h-full w-full rounded-t bg-gradient-to-t from-primary/55 to-emerald-300" />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-lg border border-white/[0.07] bg-secondary/40 p-3">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm leading-5 text-muted-foreground">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
