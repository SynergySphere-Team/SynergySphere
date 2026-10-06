'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  Heart,
  Lightbulb,
  CheckSquare,
  BookOpen,
  Bot,
  Upload,
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  Sparkles,
  Moon,
  Droplets,
  Tag,
  BarChart3,
  Plus,
  Minus,
} from 'lucide-react';

import {
  WellnessEntry,
  Task,
  Insights,
  ModuleMetadata,
} from '@/components/wellness/types';
import {
  MOOD_TAG_OPTIONS,
  generateSeedAnalyticsEntries,
} from '@/components/wellness/mockData';
import { TaskWorkflowOptimizer } from '@/components/wellness/TaskWorkflowOptimizer';
import { BurnoutRiskMeter } from '@/components/wellness/BurnoutRiskMeter';
import { QuickResets } from '@/components/wellness/QuickResets';
import { InteractiveTrendsAnalytics } from '@/components/wellness/InteractiveTrendsAnalytics';
import { GamificationBadgeBar } from '@/components/wellness/GamificationBadgeBar';

const MODULES: ModuleMetadata[] = [
  {
    id: 'PRODUCTIVITY',
    label: 'Productivity & Tasks',
    icon: CheckSquare,
    color: '#10b981',
    neonBorder: 'border-emerald-500/40',
    description: 'Task board, backlog management, sprint execution',
  },
  {
    id: 'LEARNING_HUB',
    label: 'Learning Hub',
    icon: BookOpen,
    color: '#3b82f6',
    neonBorder: 'border-blue-500/40',
    description: 'Java, algorithms, system architecture curriculum',
  },
  {
    id: 'AI_WORKSPACE',
    label: 'AI Workspace',
    icon: Bot,
    color: '#8b5cf6',
    neonBorder: 'border-purple-500/40',
    description: 'Pair programming, code reviews, problem decomposition',
  },
  {
    id: 'LECTURE_TO_LIFE',
    label: 'LectureToLife',
    icon: Upload,
    color: '#f59e0b',
    neonBorder: 'border-amber-500/40',
    description: 'Interactive lecture notes and synthesized study guides',
  },
  {
    id: 'COMMUNITY',
    label: 'Community Projects',
    icon: Users,
    color: '#ec4899',
    neonBorder: 'border-pink-500/40',
    description: 'Collaborative student open-source repositories',
  },
  {
    id: 'INTERVIEWS',
    label: 'Interviews & Career',
    icon: Briefcase,
    color: '#06b6d4',
    neonBorder: 'border-cyan-500/40',
    description: 'Mock technical coding & behavioral coach',
  },
  {
    id: 'GENERAL',
    label: 'Daily Routine',
    icon: Heart,
    color: '#64748b',
    neonBorder: 'border-slate-500/40',
    description: 'Personal lifestyle, hydration, rest, and habits',
  },
];

function Slider({
  label,
  value,
  onChange,
  color,
  helper,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
  helper?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-white">{label}</span>
          {helper && <span className="text-[10px] text-muted-foreground font-mono">({helper})</span>}
        </div>
        <span className="font-mono font-bold text-sm" style={{ color }}>
          {value}/10
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-lg bg-black/60 cursor-pointer appearance-none border border-white/10"
        style={{ accentColor: color }}
      />
    </div>
  );
}

export default function WellnessPage() {
  const { user, refreshUser } = useAuth();

  // Primary Tab: 'checkin' | 'trends'
  const [activeTab, setActiveTab] = useState<'checkin' | 'trends'>('checkin');

  // Check-In Form State
  const [stress, setStress] = useState(5);
  const [mood, setMood] = useState(6);
  const [energy, setEnergy] = useState(6);
  const [sleepHours, setSleepHours] = useState(7.5);
  const [waterGlasses, setWaterGlasses] = useState(6);
  const [selectedTags, setSelectedTags] = useState<string[]>(['#flow-state']);
  const [gratitudeWin, setGratitudeWin] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedModule, setSelectedModule] = useState('PRODUCTIVITY');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [customTaskTitle, setCustomTaskTitle] = useState('');
  const [markTaskDone, setMarkTaskDone] = useState(false);

  // Status & Data
  const [successBanner, setSuccessBanner] = useState<{
    message: string;
    xp?: number;
    streak?: number;
  } | null>(null);
  const [entries, setEntries] = useState<WellnessEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);



  // Initial Load
  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    try {
      const [entriesRes, insightsRes, tasksRes] = await Promise.all([
        api<WellnessEntry[]>('/wellness').catch(() => []),
        api<Insights>('/wellness/insights').catch(() => null),
        api<Task[]>('/tasks').catch(() => []),
      ]);

      // If database has few entries (fresh user), blend with realistic seed historical data for analytics visualization
      if (entriesRes && entriesRes.length > 0) {
        setEntries(entriesRes);
      } else {
        const fallback = generateSeedAnalyticsEntries();
        setEntries(fallback);
      }

      setInsights(insightsRes);
      setTasks(tasksRes || []);
    } catch (e) {
      console.error('Failed to load wellness dashboard data', e);
    }
  }

  // Toggle mood tag
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  // Submit check-in
  async function logEntry() {
    setLoading(true);
    setSuccessBanner(null);
    try {
      const activeTask = tasks.find((t) => t.id === selectedTaskId);
      const resolvedTaskTitle = customTaskTitle.trim() || activeTask?.title || undefined;
      const resolvedTaskStatus = markTaskDone
        ? 'DONE'
        : activeTask?.status || (resolvedTaskTitle ? 'IN_PROGRESS' : undefined);

      const res = await api<any>('/wellness', {
        method: 'POST',
        body: JSON.stringify({
          stressLevel: stress,
          mood,
          energyLevel: energy,
          notes: notes.trim() || undefined,
          moduleId: selectedModule,
          taskId: selectedTaskId || undefined,
          taskTitle: resolvedTaskTitle,
          taskStatus: resolvedTaskStatus,
          sleepHours,
          waterIntake: waterGlasses,
          tags: selectedTags,
          gratitude: gratitudeWin.trim() || undefined,
        }),
      });

      // Refresh platform gamification (user level & XP)
      if (refreshUser) {
        await refreshUser().catch(() => {});
      }

      // Reload wellness data
      await loadAllData();

      // Clear non-persistent fields
      setNotes('');
      setGratitudeWin('');
      setCustomTaskTitle('');
      setSelectedTaskId('');
      setMarkTaskDone(false);

      const xpEarned = res?.xpAwarded || (markTaskDone ? 25 : 15);
      const streakDays = res?.streak || 1;

      setSuccessBanner({
        message: markTaskDone
          ? `Check-in logged, task completed, and +${xpEarned} XP awarded! 🔥 Streak: ${streakDays} days.`
          : `Daily check-in registered! +${xpEarned} XP added to your Career OS. 🔥 Streak: ${streakDays} days.`,
        xp: xpEarned,
        streak: streakDays,
      });

      setTimeout(() => setSuccessBanner(null), 6500);
    } catch (err) {
      console.error(err);
      setSuccessBanner({
        message: 'Failed to save check-in. Please verify your connection.',
      });
    } finally {
      setLoading(false);
    }
  }

  // Handle logging a quick win from the quick resets card
  const handleLogGratitudeWin = async (winText: string) => {
    setGratitudeWin(winText);
    try {
      await api('/wellness', {
        method: 'POST',
        body: JSON.stringify({
          stressLevel: stress,
          mood,
          energyLevel: energy,
          notes: `Quick Win: ${winText}`,
          moduleId: selectedModule,
          gratitude: winText,
          sleepHours,
          waterIntake: waterGlasses,
          tags: selectedTags,
        }),
      });
      if (refreshUser) await refreshUser().catch(() => {});
      await loadAllData();
      setSuccessBanner({
        message: `Gratitude win logged! Keep celebrating every incremental developer victory (+15 XP).`,
        xp: 15,
      });
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch {}
  };

  const selectedTaskObj = tasks.find((t) => t.id === selectedTaskId);

  // Derived Burnout Risk
  const currentBurnoutRisk = useMemo(() => {
    if (insights?.burnoutRisk) return insights.burnoutRisk;

    // Fallback formula
    const avgStress = stress;
    const avgEnergy = energy;
    const score = Math.round((avgStress / 10) * 55 + ((10 - avgEnergy) / 10) * 45);
    const isCrit = score >= 67;
    const isMod = score >= 35;

    return {
      score,
      level: (isCrit ? 'CRITICAL' : isMod ? 'MODERATE' : 'LOW') as any,
      label: isCrit ? 'Critical Risk' : isMod ? 'Moderate Risk' : 'Low Risk',
      color: isCrit ? '#ef4444' : isMod ? '#f59e0b' : '#22c55e',
      description: isCrit
        ? 'High cognitive strain detected. Immediate pacing adjustments recommended.'
        : isMod
        ? 'Moderate cognitive load. Watch out for extended debugging blocks without breaks.'
        : 'Optimal mental equilibrium and strong developer momentum.',
      triggers: isCrit
        ? [
            'Schedule a 15-minute screen-free rest now.',
            'Move non-urgent deadlines to tomorrow.',
            'Use the 4-7-8 Breathing Guide in Quick Resets.',
          ]
        : isMod
        ? [
            'Break oversized tasks into 25-minute Pomodoros.',
            'Hydrate and aim for 7+ hours of sleep tonight.',
          ]
        : ['Steady pacing. Maintain current hydration and Pomodoro rhythms.'],
    };
  }, [insights, stress, energy]);

  return (
    <DashboardLayout>
      {/* Top Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/20 border border-pink-500/40 text-pink-400">
              <Heart className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Wellness &amp; Career Resilience OS
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Track mental bandwidth, prevent developer burnout, optimize bloated tasks, and earn streak XP.
          </p>
        </div>

        {/* Tab Toggle: Check-In vs Analytics */}
        <div className="flex items-center rounded-xl border border-white/[0.08] bg-black/40 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('checkin')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              activeTab === 'checkin'
                ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            <Heart className="h-3.5 w-3.5 text-pink-400" />
            <span>Daily Check-In &amp; AI Coach</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trends')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              activeTab === 'trends'
                ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />
            <span>Trends &amp; Correlation Analytics</span>
          </button>
        </div>
      </div>

      {/* Gamification Streak & Milestone Progression Banner */}
      <div className="mb-6">
        <GamificationBadgeBar
          streak={insights?.streak}
          isFirstToday={true}
          userXp={user?.xp || 0}
          userLevel={user?.level || 1}
        />
      </div>

      {/* Success / Alert Banner */}
      {successBanner && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-primary/40 bg-gradient-to-r from-primary/15 to-emerald-500/10 p-4 text-sm font-medium text-white shadow-lg shadow-primary/5">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <span>{successBanner.message}</span>
          </div>
          {successBanner.xp && (
            <span className="rounded-lg bg-primary/25 border border-primary/40 px-2.5 py-1 text-xs font-bold text-primary font-mono shrink-0">
              +{successBanner.xp} XP
            </span>
          )}
        </div>
      )}

      {/* VIEW 1: DAILY CHECK-IN & AI COACH */}
      {activeTab === 'checkin' && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* LEFT COLUMN: Check-In Form (5 cols on lg) */}
          <div className="lg:col-span-6 space-y-6">
            <Card className="border-white/[0.08] bg-[#0c141a]/90 backdrop-blur-xl">
              <CardHeader className="pb-3 border-b border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base font-bold text-white">
                    <Heart className="h-4 w-4 text-pink-400" />
                    Daily Wellness Check-in
                  </CardTitle>
                  <span className="rounded-md bg-primary/10 border border-primary/30 px-2 py-0.5 text-[11px] font-bold text-primary font-mono">
                    +15 XP Daily
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-4">
                {/* 1. Module Selector */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    1. Linked SynergySphere Module
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {MODULES.map((mod) => {
                      const Icon = mod.icon;
                      const isSelected = selectedModule === mod.id;
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => setSelectedModule(mod.id)}
                          className={`flex items-center gap-2 rounded-lg border p-2 text-left text-xs font-medium transition ${
                            isSelected
                              ? 'border-primary bg-primary/15 text-white shadow-sm shadow-primary/10'
                              : 'border-white/[0.08] bg-black/25 text-muted-foreground hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: mod.color }} />
                          <span className="truncate">{mod.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Task Association */}
                <div className="rounded-xl border border-white/[0.08] bg-black/35 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <CheckSquare className="h-3.5 w-3.5 text-primary" />
                      2. Active Task or Project Blocker
                    </label>
                    <span className="text-[10px] text-muted-foreground font-mono">Optional</span>
                  </div>

                  {tasks.length > 0 && (
                    <select
                      value={selectedTaskId}
                      onChange={(e) => {
                        setSelectedTaskId(e.target.value);
                        if (e.target.value) setCustomTaskTitle('');
                      }}
                      className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#0c141a] px-3 text-xs text-foreground outline-none focus:border-primary/50"
                    >
                      <option value="">-- Choose from active tasks --</option>
                      {tasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.status === 'DONE' ? '✓ ' : '○ '}
                          {t.title} ({t.status})
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Or custom task title */}
                  <input
                    type="text"
                    value={customTaskTitle}
                    onChange={(e) => {
                      setCustomTaskTitle(e.target.value);
                      if (e.target.value) setSelectedTaskId('');
                    }}
                    placeholder={
                      selectedTaskId
                        ? 'Task selected above (or type custom)'
                        : 'e.g., Refactoring Spring Security Filter Chain / LeetCode Tree...'
                    }
                    className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#0c141a] px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 outline-none"
                  />

                  {/* Mark as Done Toggle */}
                  {(selectedTaskId || customTaskTitle.trim()) && (
                    <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-foreground select-none">
                      <input
                        type="checkbox"
                        checked={markTaskDone}
                        onChange={(e) => setMarkTaskDone(e.target.checked)}
                        className="h-4 w-4 rounded border-white/[0.2] bg-black/40 accent-primary text-primary"
                      />
                      <span>Mark this task as completed (DONE) with this check-in</span>
                      <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        +10 XP
                      </span>
                    </label>
                  )}
                </div>

                {/* 3. Sliders */}
                <div className="space-y-4 rounded-xl border border-white/[0.06] bg-black/25 p-3.5">
                  <Slider
                    label="Stress Level"
                    value={stress}
                    onChange={setStress}
                    color="#f472b6"
                    helper={stress > 6 ? 'High cognitive load' : 'Manageable'}
                  />
                  <Slider
                    label="Mood"
                    value={mood}
                    onChange={setMood}
                    color="#c084fc"
                    helper={mood >= 7 ? 'High morale' : 'Reflective'}
                  />
                  <Slider
                    label="Energy Level"
                    value={energy}
                    onChange={setEnergy}
                    color="#2dd4bf"
                    helper={energy < 5 ? 'Biological drain' : 'Sustained flow'}
                  />
                </div>

                {/* 4. Sleep & Hydration Micro-Trackers */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Sleep Tracker */}
                  <div className="rounded-xl border border-white/[0.08] bg-black/30 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Moon className="h-3.5 w-3.5 text-purple-400" />
                        Sleep Hours
                      </span>
                      <span className="font-mono font-bold text-purple-300">{sleepHours} hrs</span>
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => setSleepHours((s) => Math.max(3, Number((s - 0.5).toFixed(1))))}
                        className="h-7 w-7 rounded-lg border border-white/10 bg-black/40 flex items-center justify-center text-muted-foreground hover:text-white"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <div className="flex gap-1">
                        {[5, 6.5, 7.5, 8.5].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setSleepHours(preset)}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-mono transition ${
                              sleepHours === preset
                                ? 'bg-purple-500/30 text-purple-200 border border-purple-400/40'
                                : 'bg-black/30 text-muted-foreground hover:text-white'
                            }`}
                          >
                            {preset}h
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSleepHours((s) => Math.min(14, Number((s + 0.5).toFixed(1))))}
                        className="h-7 w-7 rounded-lg border border-white/10 bg-black/40 flex items-center justify-center text-muted-foreground hover:text-white"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Water Tracker */}
                  <div className="rounded-xl border border-white/[0.08] bg-black/30 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Droplets className="h-3.5 w-3.5 text-cyan-400" />
                        Water Intake
                      </span>
                      <span className="font-mono font-bold text-cyan-300">
                        {waterGlasses} glasses ({(waterGlasses * 0.25).toFixed(1)}L)
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => setWaterGlasses((w) => Math.max(0, w - 1))}
                        className="h-7 w-7 rounded-lg border border-white/10 bg-black/40 flex items-center justify-center text-muted-foreground hover:text-white"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <div className="flex gap-1 overflow-x-auto py-0.5">
                        {[4, 6, 8, 10].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setWaterGlasses(preset)}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-mono transition ${
                              waterGlasses === preset
                                ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/40'
                                : 'bg-black/30 text-muted-foreground hover:text-white'
                            }`}
                          >
                            {preset}💧
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setWaterGlasses((w) => Math.min(20, w + 1))}
                        className="h-7 w-7 rounded-lg border border-white/10 bg-black/40 flex items-center justify-center text-muted-foreground hover:text-white"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 5. Notes & Clickable Mood Tags */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-primary" />
                      5. Quick Mood &amp; Focus Tags
                    </label>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {selectedTags.length} selected
                    </span>
                  </div>

                  {/* Clickable Pill Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {MOOD_TAG_OPTIONS.map((tag) => {
                      const isSelected = selectedTags.includes(tag.label);
                      return (
                        <button
                          key={tag.label}
                          type="button"
                          onClick={() => toggleTag(tag.label)}
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                            isSelected
                              ? `${tag.color} shadow-sm font-semibold`
                              : 'border-white/[0.08] bg-black/30 text-muted-foreground hover:border-white/20 hover:text-white'
                          }`}
                        >
                          {tag.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Notes Textarea */}
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Log technical blockers, breakthrough realizations, or context for the AI coach (optional)..."
                    className="h-20 w-full rounded-lg border border-white/[0.08] bg-black/30 p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>

                {/* 6. Quick Win Gratitude Box (optional in checkin form) */}
                <div className="rounded-lg border border-white/[0.06] bg-black/25 p-3 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    Quick Win Gratitude Micro-Prompt (Optional)
                  </label>
                  <input
                    type="text"
                    value={gratitudeWin}
                    onChange={(e) => setGratitudeWin(e.target.value)}
                    placeholder="1 win before logging off: e.g. 'Solved recursive memoization bug!'"
                    className="h-8 w-full rounded border border-white/[0.08] bg-black/40 px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-amber-400/50 outline-none"
                  />
                </div>

                {/* Submit Check-In Button */}
                <Button
                  onClick={logEntry}
                  disabled={loading}
                  className="w-full h-11 text-xs sm:text-sm font-bold shadow-lg shadow-primary/10"
                >
                  {loading ? (
                    'Saving Check-in & Syncing XP...'
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span>Log Wellness Check-in</span>
                      <span className="rounded bg-black/20 px-2 py-0.5 text-xs font-mono font-bold">
                        +15 XP
                      </span>
                    </span>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: AI Wellness Coach, Task Optimizer & Quick Resets (6 cols on lg) */}
          <div className="lg:col-span-6 space-y-6">
            {/* 1. AI Wellness Coach Card */}
            <Card className="border-white/[0.08] bg-[#0c141a]/90 backdrop-blur-xl">
              <CardHeader className="pb-3 border-b border-white/[0.06]">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-white">
                  <Lightbulb className="h-4 w-4 text-amber-400" />
                  AI Wellness Coach &amp; Cognitive Architecture
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-4">
                {/* Burnout Risk & Predictive Alert Meter */}
                <BurnoutRiskMeter
                  risk={currentBurnoutRisk}
                  avgStress={insights?.averages?.stress ?? stress}
                  avgEnergy={insights?.averages?.energy ?? energy}
                  onActivateReset={() => {
                    document.getElementById('quick-resets-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                />

                {/* Task & Workflow Optimizer Component */}
                <TaskWorkflowOptimizer
                  linkedTask={selectedTaskObj}
                  customTaskTitle={customTaskTitle}
                  selectedModuleId={selectedModule}
                  stressLevel={stress}
                  energyLevel={energy}
                />

                {/* Actionable Recommendations */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    Personalized AI Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {(insights?.recommendations || [
                      'Break work into 25-minute Pomodoros during high cognitive strain.',
                      'Maintain 7+ hours of sleep and regular hydration breaks.',
                    ]).map((rec, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 rounded-lg border border-white/[0.06] bg-black/30 p-2.5 text-xs text-foreground/90 leading-relaxed"
                      >
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* 2. Quick Resets Collapsible Micro-Toolbox */}
            <div id="quick-resets-section">
              <QuickResets onLogGratitudeWin={handleLogGratitudeWin} />
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: INTERACTIVE TRENDS & ANALYTICS TAB */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          <InteractiveTrendsAnalytics entries={entries} modules={MODULES} />
        </div>
      )}

      {/* RECENT CHECK-IN HISTORY FEED (Visible on both tabs for easy inspection) */}
      {entries.length > 0 && (
        <Card className="mt-8 border-white/[0.08] bg-[#0c141a]/90 backdrop-blur-xl">
          <CardHeader className="border-b border-white/[0.06] pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                Recent Wellness &amp; Task History
              </CardTitle>
              <span className="text-xs font-mono text-muted-foreground">
                Showing {Math.min(10, entries.length)} latest logs
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="divide-y divide-white/[0.06]">
              {entries.slice(0, 10).map((e) => {
                const mod = MODULES.find((m) => m.id === e.moduleId) || MODULES[MODULES.length - 1];
                const ModIcon = mod.icon;
                const taskName = e.linkedTaskTitle || e.taskTitle;
                const isTaskDone = e.linkedTaskStatus === 'DONE' || e.taskStatus === 'DONE';

                return (
                  <div
                    key={e.id}
                    className="py-3.5 first:pt-1 last:pb-1 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        {/* Module Badge */}
                        <span
                          className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-medium border border-white/[0.08] bg-black/40"
                          style={{ color: mod.color }}
                        >
                          <ModIcon className="h-3 w-3" />
                          <span>{mod.label}</span>
                        </span>

                        {/* Linked Task Tag */}
                        {taskName && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-secondary/60 px-2 py-0.5 text-foreground font-mono">
                            {isTaskDone ? (
                              <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                            ) : (
                              <Clock className="h-3 w-3 text-amber-400 shrink-0" />
                            )}
                            <span className="truncate max-w-[220px]">{taskName}</span>
                          </span>
                        )}

                        <span className="text-muted-foreground text-[11px] font-mono">
                          {new Date(e.date).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          at{' '}
                          {new Date(e.date).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Notes / Tags / Gratitude */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {e.tags &&
                          e.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded bg-white/[0.05] border border-white/[0.08] px-1.5 py-0.2 text-[10px] text-muted-foreground font-mono"
                            >
                              {t}
                            </span>
                          ))}
                        {e.notes && (
                          <p className="text-xs text-foreground/80 italic pl-1 truncate max-w-md">
                            &ldquo;{e.notes}&rdquo;
                          </p>
                        )}
                        {e.gratitude && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300">
                            <Sparkles className="h-2.5 w-2.5" />
                            <span>Win: {e.gratitude}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metric Pills */}
                    <div className="flex items-center gap-2 shrink-0 text-xs font-mono">
                      <span className="rounded-md border border-pink-500/30 bg-pink-500/10 px-2 py-0.5 text-pink-300">
                        Stress: {e.stressLevel}
                      </span>
                      <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-purple-300">
                        Mood: {e.mood}
                      </span>
                      <span className="rounded-md border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 text-teal-300">
                        Energy: {e.energyLevel}
                      </span>
                      {e.sleepHours != null && (
                        <span className="hidden sm:inline-flex rounded-md border border-white/10 bg-black/40 px-1.5 py-0.5 text-muted-foreground text-[11px]">
                          🌙 {e.sleepHours}h
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
