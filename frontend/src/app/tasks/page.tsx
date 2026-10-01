'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/utils';
import Link from 'next/link';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Flame,
  Heart,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string | null;
  learnedNote: string | null;
  status: string;
  dueDate: string | null;
  updatedAt?: string;
}

interface ProductivityStats {
  tasksCompletedToday: number;
  totalTasksCompleted: number;
  focusSessionsToday: number;
  focusMinutesToday: number;
  focusHoursToday: string;
  learnedTasks: Array<{ id: string; title: string; learnedNote: string | null; updatedAt: string }>;
  wellnessScore: number | null;
  statusCounts: Record<string, number>;
}

const columns = [
  { key: 'TODO', title: 'To Do' },
  { key: 'IN_PROGRESS', title: 'In Progress' },
  { key: 'REVIEW', title: 'To Review' },
  { key: 'DONE', title: 'Done' },
];

const TIMER_STORAGE_KEY = 'synergysphere_focus_timer';
const MIN_MINUTES = 1;
const MAX_MINUTES = 240;
const DEFAULT_MINUTES = 25;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<ProductivityStats | null>(null);
  const [title, setTitle] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingLearned, setEditingLearned] = useState<string | null>(null);
  const [learnedDraft, setLearnedDraft] = useState('');
  const [includeWellnessCheckIn, setIncludeWellnessCheckIn] = useState(true);
  const [checkInStress, setCheckInStress] = useState(3);
  const [checkInMood, setCheckInMood] = useState(8);
  const [checkInEnergy, setCheckInEnergy] = useState(7);

  const [durationInput, setDurationInput] = useState(String(DEFAULT_MINUTES));
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_MINUTES);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_MINUTES * 60);
  const [timerStatus, setTimerStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      const data = await api<Task[]>('/tasks');
      setTasks(data);
    } catch {
      setError('Could not load tasks from the backend.');
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await api<ProductivityStats>('/tasks/productivity-stats');
      setStats(data);
    } catch {
      /* stats are optional */
    }
  }, []);

  const completeFocusSession = useCallback(async () => {
    try {
      await api('/tasks/focus-session', {
        method: 'POST',
        body: JSON.stringify({ durationMinutes }),
      });
      setSuccess('🎉 Focus session completed! +15 XP earned.');
      await loadStats();
    } catch {
      /* still count locally */
    }
  }, [durationMinutes, loadStats]);

  useEffect(() => {
    Promise.all([loadTasks(), loadStats()]).finally(() => setLoading(false));
  }, [loadTasks, loadStats]);

  useEffect(() => {
    const saved = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as {
        durationMinutes: number;
        secondsLeft: number;
        timerStatus: 'idle' | 'running' | 'paused';
        endsAt?: number;
      };
      const initialMins = Math.max(
        MIN_MINUTES,
        Math.min(MAX_MINUTES, parsed.durationMinutes || DEFAULT_MINUTES)
      );
      setDurationMinutes(initialMins);
      setDurationInput(String(initialMins));
      if (parsed.timerStatus === 'running' && parsed.endsAt) {
        const remaining = Math.max(0, Math.ceil((parsed.endsAt - Date.now()) / 1000));
        setSecondsLeft(remaining);
        setTimerStatus(remaining > 0 ? 'running' : 'idle');
      } else {
        setSecondsLeft(parsed.secondsLeft ?? initialMins * 60);
        setTimerStatus(parsed.timerStatus || 'idle');
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (timerStatus !== 'running') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerStatus]);

  useEffect(() => {
    if (timerStatus === 'running' && secondsLeft === 0) {
      setTimerStatus('idle');
      setSecondsLeft(durationMinutes * 60);
      void completeFocusSession();
    }
  }, [secondsLeft, timerStatus, durationMinutes, completeFocusSession]);

  useEffect(() => {
    const payload = {
      durationMinutes,
      secondsLeft,
      timerStatus,
      endsAt: timerStatus === 'running' ? Date.now() + secondsLeft * 1000 : undefined,
    };
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(payload));
  }, [durationMinutes, secondsLeft, timerStatus]);

  function applyDuration(mins: number) {
    const clamped = Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, Math.round(mins)));
    setDurationMinutes(clamped);
    setDurationInput(String(clamped));
    if (timerStatus !== 'running') {
      setSecondsLeft(clamped * 60);
      setTimerStatus('idle');
    }
  }

  function handleInputChange(text: string) {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    setDurationInput(digitsOnly);

    if (!digitsOnly) {
      return;
    }

    const val = parseInt(digitsOnly, 10);
    if (!isNaN(val)) {
      const clamped = Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, val));
      setDurationMinutes(clamped);
      if (timerStatus !== 'running') {
        setSecondsLeft(clamped * 60);
        setTimerStatus('idle');
      }
    }
  }

  function handleInputBlur() {
    const val = parseInt(durationInput, 10);
    if (isNaN(val) || val < MIN_MINUTES) {
      applyDuration(DEFAULT_MINUTES);
    } else if (val > MAX_MINUTES) {
      applyDuration(MAX_MINUTES);
    } else {
      applyDuration(val);
    }
  }

  function adjustDuration(delta: number) {
    if (timerStatus === 'running') return;
    const current = parseInt(durationInput, 10) || durationMinutes;
    applyDuration(current + delta);
  }

  function startTimer() {
    setError('');
    setSuccess('');
    if (timerStatus === 'idle') {
      setSecondsLeft(durationMinutes * 60);
    }
    setTimerStatus('running');
  }

  function pauseTimer() {
    setTimerStatus('paused');
  }

  function resetTimer() {
    setTimerStatus('idle');
    setSecondsLeft(durationMinutes * 60);
  }

  async function addTask() {
    if (!title.trim()) return;
    try {
      setError('');
      await api('/tasks', { method: 'POST', body: JSON.stringify({ title }) });
      await Promise.all([loadTasks(), loadStats()]);
    } catch {
      setError('Could not add this task. Please try again.');
    }
    setTitle('');
    setShowForm(false);
  }

  async function moveTask(task: Task, status: string) {
    try {
      setError('');
      await api(`/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await Promise.all([loadTasks(), loadStats()]);
    } catch {
      setError('Could not update this task. Please try again.');
    }
  }

  async function saveLearnedNote(taskId: string) {
    try {
      setError('');
      await api(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          learnedNote: learnedDraft,
          status: 'DONE',
          ...(includeWellnessCheckIn
            ? {
                wellnessCheckIn: {
                  stressLevel: checkInStress,
                  mood: checkInMood,
                  energyLevel: checkInEnergy,
                  notes: learnedDraft ? `Completed task: ${learnedDraft}` : undefined,
                },
              }
            : {}),
        }),
      });
      setEditingLearned(null);
      setLearnedDraft('');
      await Promise.all([loadTasks(), loadStats()]);
    } catch {
      setError('Could not save your learning note.');
    }
  }

  async function deleteTask(id: string) {
    try {
      setError('');
      await api(`/tasks/${id}`, { method: 'DELETE' });
      await Promise.all([loadTasks(), loadStats()]);
    } catch {
      setError('Could not delete this task. Please try again.');
    }
  }

  const learnedTasks = stats?.learnedTasks || tasks.filter((t) => t.status === 'DONE');

  return (
    <DashboardLayout>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Productivity & Wellness Hub</p>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Tasks</h1>
          <p className="text-sm text-muted-foreground">Plan coursework, track progress, focus deeply, and record what you learn.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4" />Add Task</Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {success && (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-primary">{success}</div>
      )}

      {showForm && (
        <Card className="mb-4">
          <CardContent className="flex flex-col gap-3 pt-1 sm:flex-row">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title..." onKeyDown={(e) => e.key === 'Enter' && addTask()} />
            <Button onClick={addTask}>Add</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-4">
            {columns.map((column) => {
              const items = tasks.filter((task) => task.status === column.key);
              return (
                <Card key={column.key} className="min-h-[360px]">
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm">{column.title}</CardTitle>
                    <span className="rounded-md border border-white/[0.08] bg-secondary/50 px-2 py-1 text-[11px] text-muted-foreground">
                      {items.length}
                    </span>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {loading ? (
                      <p className="text-xs text-muted-foreground">Loading...</p>
                    ) : items.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No tasks here yet.</p>
                    ) : (
                      items.map((task) => (
                        <div key={task.id} className="rounded-lg border border-white/[0.08] bg-secondary/40 p-3">
                          <p className="text-sm font-semibold text-white">{task.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{task.description || task.status.replace('_', ' ')}</p>
                          {task.learnedNote && (
                            <p className="mt-2 text-xs italic text-primary">Learned: {task.learnedNote}</p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-1">
                            {column.key !== 'TODO' && (
                              <Button size="sm" variant="secondary" className="h-7 text-[10px]" onClick={() => {
                                const flow = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
                                const idx = flow.indexOf(column.key);
                                if (idx > 0) moveTask(task, flow[idx - 1]);
                              }}>
                                ← Back
                              </Button>
                            )}
                            {column.key !== 'DONE' && (
                              <Button size="sm" variant="secondary" className="h-7 text-[10px]" onClick={() => {
                                const flow = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
                                const idx = flow.indexOf(column.key);
                                if (idx < flow.length - 1) {
                                  const next = flow[idx + 1];
                                  if (next === 'DONE') {
                                    setEditingLearned(task.id);
                                    setLearnedDraft(task.learnedNote || '');
                                  } else {
                                    moveTask(task, next);
                                  }
                                }
                              }}>
                                Advance →
                              </Button>
                            )}
                            <button onClick={() => deleteTask(task.id)} className="ml-auto rounded-md p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {editingLearned === task.id && (
                            <div className="mt-3 space-y-3 rounded-lg border border-primary/25 bg-black/40 p-3">
                              <div>
                                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">What did you learn?</label>
                                <Input
                                  value={learnedDraft}
                                  onChange={(e) => setLearnedDraft(e.target.value)}
                                  placeholder="Key takeaway from this task..."
                                  className="mt-1 text-xs"
                                />
                              </div>

                              {/* Integrated Daily Wellness Check-in */}
                              <div className="border-t border-white/[0.08] pt-2.5 space-y-2">
                                <label className="flex items-center justify-between text-xs text-foreground cursor-pointer select-none">
                                  <span className="flex items-center gap-1.5 font-medium text-pink-300">
                                    <Heart className="h-3.5 w-3.5 text-pink-400" />
                                    Daily Check-in for this task
                                  </span>
                                  <input
                                    type="checkbox"
                                    checked={includeWellnessCheckIn}
                                    onChange={(e) => setIncludeWellnessCheckIn(e.target.checked)}
                                    className="h-3.5 w-3.5 rounded accent-primary"
                                  />
                                </label>

                                {includeWellnessCheckIn && (
                                  <div className="space-y-1.5 rounded-md bg-secondary/30 p-2 text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">Stress: {checkInStress}/10</span>
                                      <input
                                        type="range"
                                        min={1}
                                        max={10}
                                        value={checkInStress}
                                        onChange={(e) => setCheckInStress(Number(e.target.value))}
                                        className="h-1.5 w-28 accent-pink-400"
                                      />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">Mood: {checkInMood}/10</span>
                                      <input
                                        type="range"
                                        min={1}
                                        max={10}
                                        value={checkInMood}
                                        onChange={(e) => setCheckInMood(Number(e.target.value))}
                                        className="h-1.5 w-28 accent-purple-400"
                                      />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">Energy: {checkInEnergy}/10</span>
                                      <input
                                        type="range"
                                        min={1}
                                        max={10}
                                        value={checkInEnergy}
                                        onChange={(e) => setCheckInEnergy(Number(e.target.value))}
                                        className="h-1.5 w-28 accent-teal-400"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-2">
                                <Button size="sm" className="flex-1 text-xs" onClick={() => saveLearnedNote(task.id)}>
                                  Complete {includeWellnessCheckIn ? '(+20 XP)' : '(+10 XP)'}
                                </Button>
                                <Button size="sm" variant="secondary" className="text-xs" onClick={() => setEditingLearned(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                What You&apos;ve Learned So Far
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {learnedTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Complete tasks and add learning notes to build your knowledge log.
                </p>
              ) : (
                learnedTasks.map((task) => (
                  <div key={task.id} className="rounded-lg border border-white/[0.07] bg-secondary/40 p-3">
                    <p className="text-sm font-semibold text-white">{task.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {task.learnedNote || 'Completed — add a note next time to capture what you learned.'}
                    </p>
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      {'updatedAt' in task && task.updatedAt
                        ? new Date(task.updatedAt).toLocaleDateString()
                        : ''}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-primary" />
                Focus Timer
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center pt-0">
              {/* Dynamic Custom Duration Controls */}
              {timerStatus !== 'running' ? (
                <div className="mb-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Set Duration (1 – 240 mins)
                  </p>
                  <div className="flex items-center justify-center gap-1.5">
                    {/* Rapid -5m step */}
                    <button
                      type="button"
                      onClick={() => adjustDuration(-5)}
                      className="inline-flex h-8 items-center justify-center rounded-md border border-white/10 bg-secondary/60 px-2 text-xs font-semibold text-muted-foreground transition-all hover:bg-secondary hover:text-white active:scale-95"
                      title="Decrease 5 minutes"
                      aria-label="Decrease 5 minutes"
                    >
                      -5m
                    </button>

                    {/* Step -1m button */}
                    <button
                      type="button"
                      onClick={() => adjustDuration(-1)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-secondary/60 text-muted-foreground transition-all hover:bg-secondary hover:text-white active:scale-95"
                      title="Decrease 1 minute"
                      aria-label="Decrease 1 minute"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>

                    {/* Numerical Input with 'min' suffix */}
                    <div className="relative flex items-center">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={3}
                        value={durationInput}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onBlur={handleInputBlur}
                        className="h-8 w-16 pr-6 text-center text-sm font-bold bg-background/80 border-white/15"
                        aria-label="Custom focus duration in minutes"
                      />
                      <span className="pointer-events-none absolute right-1.5 text-[11px] font-medium text-muted-foreground">
                        min
                      </span>
                    </div>

                    {/* Step +1m button */}
                    <button
                      type="button"
                      onClick={() => adjustDuration(1)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-secondary/60 text-muted-foreground transition-all hover:bg-secondary hover:text-white active:scale-95"
                      title="Increase 1 minute"
                      aria-label="Increase 1 minute"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>

                    {/* Rapid +5m step */}
                    <button
                      type="button"
                      onClick={() => adjustDuration(5)}
                      className="inline-flex h-8 items-center justify-center rounded-md border border-white/10 bg-secondary/60 px-2 text-xs font-semibold text-muted-foreground transition-all hover:bg-secondary hover:text-white active:scale-95"
                      title="Increase 5 minutes"
                      aria-label="Increase 5 minutes"
                    >
                      +5m
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-4 flex items-center justify-center gap-1.5 rounded-md border border-primary/25 bg-primary/10 py-1.5 px-2 text-xs font-medium text-primary">
                  <Flame className="h-3.5 w-3.5 animate-pulse text-primary shrink-0" />
                  <span className="truncate">Focusing ({durationMinutes}m target)</span>
                </div>
              )}

              <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full border-4 border-primary/70 bg-primary/10">
                <div>
                  <p className="text-3xl font-bold text-white">{formatTime(secondsLeft)}</p>
                  <p className="text-xs text-muted-foreground">
                    {timerStatus === 'running' ? 'Focusing...' : timerStatus === 'paused' ? 'Paused' : 'Focus session'}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                {timerStatus !== 'running' ? (
                  <Button className="flex-1" onClick={startTimer}>
                    <Play className="h-4 w-4" />{timerStatus === 'paused' ? 'Resume' : 'Start'}
                  </Button>
                ) : (
                  <Button className="flex-1" variant="secondary" onClick={pauseTimer}>
                    <Pause className="h-4 w-4" />Pause
                  </Button>
                )}
                <Button variant="secondary" onClick={resetTimer}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-primary" />
                Today&apos;s Wins
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-center">
              {[
                ['Focus Hours', stats ? `${stats.focusHoursToday}h` : '0.0h'],
                ['Tasks Completed', String(stats?.tasksCompletedToday ?? 0)],
                ['Deep Sessions', String(stats?.focusSessionsToday ?? 0)],
                ['Total Learned', String(stats?.totalTasksCompleted ?? 0)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/[0.07] bg-secondary/40 p-3">
                  <p className="text-lg font-bold text-white">{value}</p>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Heart className="h-4 w-4 text-pink-400" />
                Wellness
              </CardTitle>
              <Link href="/wellness" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Full Tracker →
              </Link>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Wellness Score</span>
                <span className="font-semibold text-white">{stats?.wellnessScore ?? '—'}{stats?.wellnessScore ? '%' : ''}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/35">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${stats?.wellnessScore ?? 0}%` }}
                />
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-primary">
                <CheckCircle2 className="h-4 w-4" />
                {stats?.wellnessScore ? 'Synced with your daily task check-ins' : 'Log a check-in to see your score'}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
