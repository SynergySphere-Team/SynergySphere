'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { SkillBar } from '@/components/ui/SkillBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { api, getLevelTitle } from '@/lib/utils';
import { BringLectureToLifeModule } from '@/components/dashboard/BringLectureToLifeModule';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  Flame,
  Layers,
  Mic,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';

interface DashboardStatsResponse {
  user: { firstName: string; lastName: string; xp: number; level: number };
  levelTitle: string;
  streak: number;
  stats: {
    tasksCompleted: number;
    challengesPassed: number;
    wellnessEntries: number;
    interviews: number;
    projectApplications: number;
    unreadNotifications: number;
  };
  developerProfile?: {
    hubSkills: Array<{
      id: string;
      name: string;
      percent: number;
      completedLessons: number;
      totalLessons: number;
      unlocked: boolean;
    }>;
    challenges: {
      passedCount: number;
      passedList: Array<{ id: string; title: string; difficulty: string }>;
    };
    weeklyActivity: {
      days: Array<{ day: string; count: number; height: number }>;
      totalEvents: number;
    };
    tasksSummary: {
      completedThisWeek: number;
      upcoming: Array<{
        id: string;
        title: string;
        description: string | null;
        dueDate: string | null;
        status: string;
      }>;
    };
    offerReadiness: {
      role: string;
      score: number;
      checklist: Array<{ label: string; met: boolean; current: string }>;
    };
    nextActions: {
      lesson: { id: string; title: string; subjectId: string; subjectName: string } | null;
      challenge: { id: string; title: string; difficulty: string } | null;
      interviewTopic: { id: string; name: string; reason: string } | null;
    };
    starBullets: Array<{ id: string; title: string; bullet: string }>;
    stats: {
      totalCompletedLessons: number;
      hasRealProgress: boolean;
    };
  };
}

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardStatsResponse | null>(null);
  useEffect(() => {
    api<DashboardStatsResponse>('/dashboard/stats')
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const greeting = getTimeOfDayGreeting();
  const name = user?.firstName || 'Developer';
  const profile = data?.developerProfile;

  // Real KPI numbers directly from the authoritative server profile
  const totalXp = user?.xp ?? 0;
  const currentStreak = data?.streak ?? 1;
  const challengesPassed = profile?.challenges.passedCount ?? data?.stats.challengesPassed ?? 0;
  const completedLessons = profile?.stats.totalCompletedLessons ?? 0;

  // Hub tracks with progress or top featured tracks
  const topTracks = (profile?.hubSkills || []).slice(0, 4);

  // Next actions from profile gaps
  const nextLesson = profile?.nextActions?.lesson;
  const nextChallenge = profile?.nextActions?.challenge;
  const nextInterview = profile?.nextActions?.interviewTopic;

  // Real upcoming tasks from DB
  const upcomingTasks = profile?.tasksSummary?.upcoming || [];
  const weeklyDays = profile?.weeklyActivity?.days || [
    { day: 'Mon', count: 0, height: 8 },
    { day: 'Tue', count: 0, height: 8 },
    { day: 'Wed', count: 0, height: 8 },
    { day: 'Thu', count: 0, height: 8 },
    { day: 'Fri', count: 0, height: 8 },
    { day: 'Sat', count: 0, height: 8 },
    { day: 'Sun', count: 0, height: 8 },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="Developer Headquarters"
        title={`${greeting}, ${name}`}
        description="Your authentic engineering progress across verified curriculum lessons, server-evaluated coding challenges, and mock interviews."
        actions={
          <div className="flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs text-primary font-medium">
            <Sparkles className="h-4 w-4" />
            <span>{getLevelTitle(user?.level || 1)} • Level {user?.level || 1}</span>
          </div>
        }
      />

      {/* 3 Real Numbers + Level Progress */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Verified XP"
          value={totalXp}
          caption={`${completedLessons} curriculum lessons passed`}
          icon={Zap}
        />
        <StatCard
          label="Coding Streak"
          value={`${currentStreak} ${currentStreak === 1 ? 'Day' : 'Days'}`}
          caption="Active engineering habit"
          icon={Flame}
        />
        <StatCard
          label="Challenges Passed"
          value={challengesPassed}
          caption="Server-evaluated test suites"
          icon={Code2}
        />
        <StatCard
          label="Offer Readiness"
          value={`${profile?.offerReadiness?.score ?? 0}%`}
          caption={profile?.offerReadiness?.role || 'Junior Software Engineer'}
          icon={Target}
        />
      </div>

      {/* Next Actions & Offer Readiness Spine */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        {/* Next Action Card */}
        <Card className="border-white/[0.08] bg-[#071015]/90">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-white">
              <Target className="h-4 w-4 text-primary" />
              What to do next today
            </CardTitle>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-mono text-primary font-medium">
              Profile Gap Queue
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Next Lesson */}
            {nextLesson ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.07] bg-black/25 p-3 hover:border-primary/30 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Lesson • {nextLesson.subjectName}
                    </p>
                    <p className="truncate text-sm font-semibold text-white">{nextLesson.title}</p>
                  </div>
                </div>
                <Link href={`/learning-hub?subject=${nextLesson.subjectId}&lesson=${nextLesson.id}`}>
                  <Button size="sm" variant="outline" className="gap-1 text-xs shrink-0">
                    Study <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="rounded-lg border border-white/[0.07] bg-black/25 p-3 text-xs text-muted-foreground">
                All foundational lessons in active track completed!
              </div>
            )}

            {/* Next Challenge */}
            {nextChallenge ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.07] bg-black/25 p-3 hover:border-primary/30 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                    <Code2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Challenge • {nextChallenge.difficulty}
                    </p>
                    <p className="truncate text-sm font-semibold text-white">{nextChallenge.title}</p>
                  </div>
                </div>
                <Link href="/coding">
                  <Button size="sm" variant="outline" className="gap-1 text-xs shrink-0">
                    Solve <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            ) : null}

            {/* Next Interview Question */}
            {nextInterview && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.07] bg-black/25 p-3 hover:border-primary/30 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                    <Mic className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Interview Practice • {nextInterview.name}
                    </p>
                    <p className="truncate text-sm font-semibold text-white">{nextInterview.reason}</p>
                  </div>
                </div>
                <Link href="/interviews">
                  <Button size="sm" variant="outline" className="gap-1 text-xs shrink-0">
                    Practice <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Offer Readiness Checklist */}
        <Card className="border-white/[0.08] bg-[#071015]/90">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center justify-between text-white">
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Intern Readiness
              </span>
              <span className="text-xs font-mono text-primary font-bold">
                {profile?.offerReadiness?.score ?? 0}% Ready
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-black/40">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-300 transition-all duration-500"
                style={{ width: `${profile?.offerReadiness?.score ?? 0}%` }}
              />
            </div>
            <div className="space-y-2 pt-1">
              {(profile?.offerReadiness?.checklist || []).map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2 text-xs"
                >
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2
                      className={`h-4 w-4 shrink-0 ${
                        item.met ? 'text-primary' : 'text-muted-foreground/30'
                      }`}
                    />
                    <span className={item.met ? 'text-white' : ''}>{item.label}</span>
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-white shrink-0 ml-2">
                    {item.current}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bring the Lecture to Life Module */}
      <div className="mt-6">
        <BringLectureToLifeModule />
      </div>

      {/* Real Weekly Events & Learning Hub Progress */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Weekly Activity (from real events) */}
        <Card className="border-white/[0.08] bg-[#071015]/90">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-white">
              <TrendingUp className="h-4 w-4 text-primary" />
              Verified Weekly Activity
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {profile?.weeklyActivity?.totalEvents ?? 0} events this week
            </span>
          </CardHeader>
          <CardContent>
            <div className="flex h-36 items-end gap-3 pt-4">
              {weeklyDays.map((item) => (
                <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full items-end justify-center rounded-t bg-black/30" style={{ height: '100px' }}>
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-primary/60 to-emerald-400 transition-all duration-500"
                      style={{ height: `${item.height}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">{item.day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Learning Hub Verified Progress */}
        <Card className="border-white/[0.08] bg-[#071015]/90">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-white">
              <BookOpen className="h-4 w-4 text-primary" />
              Learning Hub Skills
            </CardTitle>
            <Link href="/learning-hub" className="text-xs text-primary hover:underline">
              View all tracks →
            </Link>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {topTracks.length > 0 ? (
              topTracks.map((track) => (
                <SkillBar
                  key={track.id}
                  name={track.name}
                  percent={track.percent}
                  subtitle={`${track.completedLessons} of ${track.totalLessons} lessons completed`}
                  unlocked={track.unlocked}
                />
              ))
            ) : (
              <EmptyState
                icon={BookOpen}
                title="No lessons completed yet"
                description="Start a module in the Learning Hub to begin building your verified skill record."
                action={{ label: 'Explore Hub', href: '/learning-hub' }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Real Upcoming Tasks (Honest Empty State) */}
      <div className="mt-6">
        <Card className="border-white/[0.08] bg-[#071015]/90">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-white">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Active Tasks
            </CardTitle>
            <Link href="/tasks">
              <Button size="sm" variant="outline" className="text-xs">
                Manage Tasks
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {upcomingTasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-white/[0.07] bg-black/25 p-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{t.title}</p>
                      {t.description && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{t.description}</p>
                      )}
                    </div>
                    {t.dueDate && (
                      <span className="shrink-0 text-[11px] font-mono font-medium text-primary">
                        Due {t.dueDate}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="No upcoming tasks scheduled"
                description="Your task board is clear. Plan your study sessions and engineering milestones in Productivity."
                action={{ label: 'Create a Task', href: '/tasks' }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
