'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/utils';
import Link from 'next/link';
import {
  TrendingUp,
  Target,
  Flame,
  Award,
  Zap,
  AlertCircle,
  BookOpen,
  ArrowRight,
  Layers,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import type { InterviewHomeStats, UserTopicProgressData } from './types';

interface SkillGapAnalyticsViewProps {
  onStartTrack: (topic: string) => void;
}

export function SkillGapAnalyticsView({ onStartTrack }: SkillGapAnalyticsViewProps) {
  const [stats, setStats] = useState<InterviewHomeStats | null>(null);
  const [topicProgress, setTopicProgress] = useState<UserTopicProgressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setLoading(true);
    setError('');
    try {
      const [statsRes, progressRes] = await Promise.all([
        api<InterviewHomeStats>('/ai/interview/home-stats').catch(() => null),
        api<{ progress: UserTopicProgressData[] }>('/ai/interview/practice/topic-progress').catch(() => null),
      ]);

      if (statsRes) setStats(statsRes);
      if (progressRes?.progress) setTopicProgress(progressRes.progress);
    } catch {
      setError('Could not load analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function getLevelColor(level: string) {
    switch (level) {
      case 'Strong':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30';
      case 'Improving':
        return 'text-lime-400 bg-lime-950/40 border-lime-500/30';
      case 'Developing':
        return 'text-amber-400 bg-amber-950/40 border-amber-500/30';
      default:
        return 'text-rose-400 bg-rose-950/40 border-rose-500/30';
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3.5 rounded-lg border border-destructive/30 bg-destructive/15 text-xs text-destructive flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={loadAnalytics} className="h-6 text-xs">
            <RotateCcw className="h-3 w-3 mr-1" /> Retry
          </Button>
        </div>
      )}

      {/* Top 4 KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Interviews */}
        <Card className="border-white/[0.08] bg-[#0d131f]/90">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Interviews Completed
              </p>
              <h3 className="text-2xl font-black text-white mt-1">
                {stats?.interviewsCompleted ?? 0}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {stats?.questionsAnswered ?? 0} questions graded
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Award className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Practice Streak */}
        <Card className="border-white/[0.08] bg-[#0d131f]/90">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Active Daily Streak
              </p>
              <h3 className="text-2xl font-black text-amber-400 mt-1 flex items-center gap-1.5">
                <Flame className="h-6 w-6 fill-amber-400 text-amber-400" />
                {stats?.analytics?.currentStreak ?? 1} Days
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Consistency metric</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Most Practiced Skills */}
        <Card className="border-white/[0.08] bg-[#0d131f]/90">
          <CardContent className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Most Practiced Skills
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {(stats?.analytics?.mostPractisedSkills || ['TypeScript', 'React', 'Node.js']).map((s, i) => (
                <span
                  key={i}
                  className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary"
                >
                  {s}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Accuracy Trajectory */}
        <Card className="border-white/[0.08] bg-[#0d131f]/90">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Improvement Trajectory
              </p>
              <h3 className="text-xs font-bold text-emerald-400 mt-1.5 leading-tight">
                {stats?.analytics?.recentImprovement || 'Complete sessions to track curve'}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1">Multi-session delta</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommended Practice & Skill Gaps Banner */}
      {stats?.recommendedPractice && stats.recommendedPractice.length > 0 && (
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-[#0d131f] to-[#0d131f]">
          <CardHeader className="pb-3 border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-400" />
                Targeted Practice Recommendations (Skill Gaps Detected)
              </CardTitle>
              <span className="text-[11px] text-amber-300 font-mono">
                {stats.recommendedPractice.length} Priority Topics
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Based on missed rubric criteria in recent mock interviews and question performance.
            </p>
          </CardHeader>
          <CardContent className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.recommendedPractice.map((rec) => (
              <div
                key={rec.id}
                className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-black/40 p-3.5 space-y-2.5 transition hover:border-amber-500/40"
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-white truncate" title={rec.topic}>
                      {rec.topic}
                    </span>
                    <span className={`rounded border px-1.5 py-0.2 text-[9px] font-bold ${getLevelColor(rec.status)}`}>
                      {rec.status}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {rec.reason}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Priority: {rec.priorityScore}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => onStartTrack(rec.topic)}
                    className="h-7 text-[11px] font-bold bg-amber-400 text-black hover:bg-amber-300"
                  >
                    Practice <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Two Column Grid: Topic Mastery Matrix + Learning Paths */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left: Topic Mastery Matrix */}
        <Card className="border-white/[0.08] bg-[#0d131f]/90">
          <CardHeader className="pb-3 border-b border-white/[0.06]">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Topic Mastery Matrix
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Dynamic tracking across technical domains based on accuracy and rubric coverage.
            </p>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {topicProgress.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <p>No topic scores recorded yet.</p>
                <p className="mt-1">Complete mock interviews to populate your technical skill matrix.</p>
              </div>
            ) : (
              topicProgress.map((tp) => (
                <div
                  key={tp.id || tp.topic}
                  className="rounded-xl border border-white/[0.06] bg-black/30 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white">{tp.topic}</span>
                      <span className="ml-2 text-[10px] text-muted-foreground uppercase font-mono">
                        {tp.category}
                      </span>
                    </div>
                    <span className={`rounded border px-1.5 py-0.2 text-[10px] font-bold ${getLevelColor(tp.currentLevel)}`}>
                      {tp.currentLevel} ({tp.averagePerformance}%)
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        tp.averagePerformance >= 80
                          ? 'bg-emerald-400'
                          : tp.averagePerformance >= 60
                          ? 'bg-amber-400'
                          : 'bg-rose-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, tp.averagePerformance))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{tp.attempts} session attempts</span>
                    <span>{tp.correctCount} mastered questions</span>
                    {tp.lastPractisedAt && (
                      <span>Last: {new Date(tp.lastPractisedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right: Curated Interview Learning Tracks */}
        <Card className="border-white/[0.08] bg-[#0d131f]/90">
          <CardHeader className="pb-3 border-b border-white/[0.06]">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              Interview Learning Paths
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Structured progressive tracks connected to Learning Hub curricula.
            </p>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5">
            {(stats?.learningPaths || defaultLearningPaths).map((lp) => (
              <div
                key={lp.id}
                className="rounded-xl border border-white/[0.06] bg-black/30 p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">{lp.title}</h4>
                  <span className="text-xs font-mono font-bold text-primary">{lp.progress}%</span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, Math.max(5, lp.progress))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    Current Milestone: <strong className="text-slate-200">{lp.currentStep}</strong>
                  </span>
                  <Link
                    href={`/learning-hub?search=${encodeURIComponent(lp.currentStep)}`}
                    className="text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    Hub Lesson <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const defaultLearningPaths = [
  {
    id: 'path-csharp',
    title: 'C# / .NET Enterprise Practice Path',
    progress: 45,
    steps: ['Value Types vs Reference Types', 'Async/Await', 'Dependency Injection', 'Entity Framework Core'],
    currentStep: 'Dependency Injection',
  },
  {
    id: 'path-algorithms',
    title: 'Algorithms & Problem Solving Path',
    progress: 30,
    steps: ['Arrays & Hash Maps', 'Two Pointers', 'Binary Search', 'Sorting', 'Big-O Complexity'],
    currentStep: 'Binary Search',
  },
  {
    id: 'path-databases',
    title: 'Relational Database & SQL Path',
    progress: 60,
    steps: ['SELECT & Filtering', 'INNER & LEFT JOINs', 'Indexes & Performance', 'Transactions'],
    currentStep: 'INNER & LEFT JOINs',
  },
];
