'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/utils';
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
  Layers,
} from 'lucide-react';

interface WellnessEntry {
  id: string;
  stressLevel: number;
  mood: number;
  energyLevel: number;
  notes: string | null;
  date: string;
  moduleId?: string | null;
  taskId?: string | null;
  taskTitle?: string | null;
  taskStatus?: string | null;
  linkedTaskTitle?: string | null;
  linkedTaskStatus?: string | null;
}

interface Task {
  id: string;
  title: string;
  status: string;
}

interface Insights {
  recommendations: string[];
  averages: { stress: number; mood: number; energy: number } | null;
  moduleBreakdown?: Record<string, { count: number; avgStress: number; avgMood: number; avgEnergy: number }>;
}

const MODULES = [
  { id: 'PRODUCTIVITY', label: 'Productivity & Tasks', icon: CheckSquare, color: '#10b981' },
  { id: 'LEARNING_HUB', label: 'Learning Hub', icon: BookOpen, color: '#3b82f6' },
  { id: 'AI_WORKSPACE', label: 'AI Workspace', icon: Bot, color: '#8b5cf6' },
  { id: 'LECTURE_TO_LIFE', label: 'LectureToLife', icon: Upload, color: '#f59e0b' },
  { id: 'COMMUNITY', label: 'Community Projects', icon: Users, color: '#ec4899' },
  { id: 'INTERVIEWS', label: 'Interviews & Career', icon: Briefcase, color: '#06b6d4' },
  { id: 'GENERAL', label: 'Daily Routine', icon: Heart, color: '#64748b' },
];

function Slider({ label, value, onChange, color }: { label: string; value: number; onChange: (v: number) => void; color: string }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="font-semibold" style={{ color }}>{value}/10</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-lg bg-secondary/60 cursor-pointer"
        style={{ accentColor: color }}
      />
    </div>
  );
}

export default function WellnessPage() {
  const [stress, setStress] = useState(5);
  const [mood, setMood] = useState(5);
  const [energy, setEnergy] = useState(6);
  const [notes, setNotes] = useState('');
  const [selectedModule, setSelectedModule] = useState('PRODUCTIVITY');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [customTaskTitle, setCustomTaskTitle] = useState('');
  const [markTaskDone, setMarkTaskDone] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [entries, setEntries] = useState<WellnessEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<WellnessEntry[]>('/wellness').then(setEntries).catch(console.error);
    api<Insights>('/wellness/insights').then(setInsights).catch(console.error);
    api<Task[]>('/tasks').then(setTasks).catch(console.error);
  }, []);

  async function logEntry() {
    setLoading(true);
    setSuccessMessage('');
    try {
      const activeTask = tasks.find((t) => t.id === selectedTaskId);
      const resolvedTaskTitle = customTaskTitle.trim() || activeTask?.title || undefined;
      const resolvedTaskStatus = markTaskDone
        ? 'DONE'
        : activeTask?.status || (resolvedTaskTitle ? 'IN_PROGRESS' : undefined);

      await api('/wellness', {
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
        }),
      });

      const [e, i, t] = await Promise.all([
        api<WellnessEntry[]>('/wellness'),
        api<Insights>('/wellness/insights'),
        api<Task[]>('/tasks'),
      ]);

      setEntries(e);
      setInsights(i);
      setTasks(t);
      setNotes('');
      setCustomTaskTitle('');
      setSelectedTaskId('');
      setMarkTaskDone(false);
      setSuccessMessage(
        markTaskDone
          ? '🎉 Wellness check-in logged and task completed (+20 XP)!'
          : '✨ Daily wellness check-in logged (+10 XP)!'
      );
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch {
      setSuccessMessage('Failed to save check-in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const selectedModuleMeta = MODULES.find((m) => m.id === selectedModule) || MODULES[0];

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-white">Wellness Tracker</h1>
        <p className="text-sm text-muted-foreground">
          Monitor your mental health, link check-ins to your daily tasks and modules, and get personalized AI insights.
        </p>
      </div>

      {successMessage && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4 shrink-0" />
          {successMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Daily Check-in Form */}
        <Card className="border-white/[0.08] bg-[#0c141a]/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Heart className="h-5 w-5 text-pink-400" />
              Daily Check-in
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Select SynergySphere Module */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Linked SynergySphere Module
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
                      className={`flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs font-medium transition ${
                        isSelected
                          ? 'border-primary bg-primary/15 text-white shadow-sm'
                          : 'border-white/[0.08] bg-black/20 text-muted-foreground hover:border-white/20 hover:text-white'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: mod.color }} />
                      <span className="truncate">{mod.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Task Association */}
            <div className="rounded-xl border border-white/[0.08] bg-black/25 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5 text-primary" />
                  Task Being Done or Completed
                </label>
                <span className="text-[11px] text-muted-foreground">Optional</span>
              </div>

              {tasks.length > 0 ? (
                <div>
                  <select
                    value={selectedTaskId}
                    onChange={(e) => {
                      setSelectedTaskId(e.target.value);
                      if (e.target.value) setCustomTaskTitle('');
                    }}
                    className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#0c141a] px-3 text-xs text-foreground outline-none focus:border-primary/50"
                  >
                    <option value="">-- Select an active task --</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.status === 'DONE' ? '✓ ' : '○ '}
                        {t.title} ({t.status})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {/* Or enter custom task title */}
              <div>
                <input
                  type="text"
                  value={customTaskTitle}
                  onChange={(e) => {
                    setCustomTaskTitle(e.target.value);
                    if (e.target.value) setSelectedTaskId('');
                  }}
                  placeholder={selectedTaskId ? 'Task selected above (or type custom)' : 'Enter task or activity name...'}
                  className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#0c141a] px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 outline-none"
                />
              </div>

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
                  <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">+10 XP</span>
                </label>
              )}
            </div>

            {/* Sliders */}
            <div className="space-y-4 pt-1">
              <Slider label="Stress Level" value={stress} onChange={setStress} color="#f472b6" />
              <Slider label="Mood" value={mood} onChange={setMood} color="#a78bfa" />
              <Slider label="Energy Level" value={energy} onChange={setEnergy} color="#2dd4bf" />
            </div>

            {/* Notes */}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What went well or what challenges did you face today? (optional)..."
              className="h-20 w-full rounded-lg border border-white/[0.08] bg-black/25 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            />

            <Button onClick={logEntry} disabled={loading} className="w-full">
              {loading ? 'Logging Check-in...' : 'Log Wellness Entry'}
            </Button>
          </CardContent>
        </Card>

        {/* Right Column: AI Wellness Coach & Module Insights */}
        <div className="space-y-6">
          <Card className="border-white/[0.08] bg-[#0c141a]/80 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lightbulb className="h-5 w-5 text-amber-400" />
                AI Wellness Coach
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {insights?.averages && (
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3">
                    <p className="text-xl font-bold text-pink-400">{insights.averages.stress.toFixed(1)}</p>
                    <p className="text-[11px] text-muted-foreground">Avg Stress</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3">
                    <p className="text-xl font-bold text-purple-400">{insights.averages.mood.toFixed(1)}</p>
                    <p className="text-[11px] text-muted-foreground">Avg Mood</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3">
                    <p className="text-xl font-bold text-teal-400">{insights.averages.energy.toFixed(1)}</p>
                    <p className="text-[11px] text-muted-foreground">Avg Energy</p>
                  </div>
                </div>
              )}

              {/* Module Correlation Insights */}
              {insights?.moduleBreakdown && Object.keys(insights.moduleBreakdown).length > 0 && (
                <div>
                  <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    Module Wellness Breakdown
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(insights.moduleBreakdown).map(([modId, stats]) => {
                      const mod = MODULES.find((m) => m.id === modId) || { label: modId, color: '#94a3b8' };
                      return (
                        <div key={modId} className="rounded-lg border border-white/[0.06] bg-black/20 p-2.5 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-white truncate">{mod.label}</span>
                            <span className="text-[10px] text-muted-foreground">{stats.count} checks</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span>Stress: <strong className="text-foreground">{stats.avgStress}</strong></span>
                            <span>Mood: <strong className="text-foreground">{stats.avgMood}</strong></span>
                            <span>Energy: <strong className="text-foreground">{stats.avgEnergy}</strong></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actionable Recommendations */}
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Personalized Recommendations
                </h4>
                <ul className="space-y-2">
                  {insights?.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2.5 rounded-lg border border-white/[0.05] bg-black/20 p-3 text-sm text-foreground/90">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Linked Check-in History */}
      {entries.length > 0 && (
        <Card className="mt-8 border-white/[0.08] bg-[#0c141a]/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-lg">Recent Check-in History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-white/[0.06]">
              {entries.slice(0, 10).map((e) => {
                const mod = MODULES.find((m) => m.id === e.moduleId) || MODULES[MODULES.length - 1];
                const ModIcon = mod.icon;
                const taskName = e.linkedTaskTitle || e.taskTitle;
                const isTaskDone = e.linkedTaskStatus === 'DONE' || e.taskStatus === 'DONE';

                return (
                  <div key={e.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Module Badge */}
                        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border border-white/[0.08] bg-black/30" style={{ color: mod.color }}>
                          <ModIcon className="h-3 w-3" />
                          {mod.label}
                        </span>

                        {/* Linked Task Tag */}
                        {taskName ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-secondary/40 px-2 py-0.5 text-xs text-foreground">
                            {isTaskDone ? (
                              <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                            ) : (
                              <Clock className="h-3 w-3 text-amber-400 shrink-0" />
                            )}
                            <span className="font-medium truncate max-w-[200px]">{taskName}</span>
                          </span>
                        ) : null}

                        <span className="text-xs text-muted-foreground">
                          {new Date(e.date).toLocaleDateString()} at{' '}
                          {new Date(e.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {e.notes ? (
                        <p className="text-xs text-muted-foreground italic pl-1">{e.notes}</p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-xs">
                      <span className="rounded-md border border-pink-500/20 bg-pink-500/10 px-2 py-0.5 text-pink-300">
                        Stress: {e.stressLevel}
                      </span>
                      <span className="rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-purple-300">
                        Mood: {e.mood}
                      </span>
                      <span className="rounded-md border border-teal-500/20 bg-teal-500/10 px-2 py-0.5 text-teal-300">
                        Energy: {e.energyLevel}
                      </span>
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
