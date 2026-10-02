'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/utils';
import Link from 'next/link';
import {
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Coffee,
  ExternalLink,
  Flame,
  Heart,
  Link2,
  Minus,
  Pause,
  Play,
  Plus,
  Rocket,
  RotateCcw,
  Sparkles,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  learnedNote: string | null;
  status: string;
  dueDate: string | null;
  targetDurationMinutes?: number | null;
  breakIntervalMinutes?: number | null;
  link?: string | null;
  pushedToPortfolio?: boolean;
  timeSpentMinutes?: number;
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

interface NotificationAlert {
  title: string;
  message: string;
  type: 'focus_ended' | 'task_done' | 'portfolio_boost' | 'break_time';
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
const DEFAULT_BREAK_MINUTES = 5;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Gentle Web Audio API synthesizer for timer chimes and task notifications
function playNotificationChime(type: 'focus_done' | 'task_done' | 'break') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'focus_done') {
      // 3-tone cheerful ascending chime (C5, E5, G5)
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);
        gain.gain.setValueAtTime(0, now + idx * 0.14);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.14 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.36);
      });
    } else if (type === 'break') {
      // Gentle bell tone (A4, F4)
      const freqs = [440, 349.23];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.18);
        gain.gain.setValueAtTime(0.18, now + idx * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.18);
        osc.stop(now + idx * 0.18 + 0.41);
      });
    } else {
      // Task completed celebration chord
      const freqs = [587.33, 739.99, 880];
      freqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.51);
      });
    }
  } catch {
    // Audio context not allowed or not supported; ignore gracefully
  }
}

function sendBrowserNotification(title: string, body: string) {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { body });
      } catch {
        /* ignore */
      }
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission()
        .then((perm) => {
          if (perm === 'granted') {
            new Notification(title, { body });
          }
        })
        .catch(() => {});
    }
  }
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<ProductivityStats | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [alertNotification, setAlertNotification] = useState<NotificationAlert | null>(null);

  // New task form fields
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState('TODO');
  const [formTargetDuration, setFormTargetDuration] = useState('25');
  const [formBreakInterval, setFormBreakInterval] = useState('25');
  const [formLink, setFormLink] = useState('');
  const [formPushOnComplete, setFormPushOnComplete] = useState(false);

  // Task completion & wellness modal state
  const [editingLearned, setEditingLearned] = useState<string | null>(null);
  const [learnedDraft, setLearnedDraft] = useState('');
  const [includeWellnessCheckIn, setIncludeWellnessCheckIn] = useState(true);
  const [checkInPushToPortfolio, setCheckInPushToPortfolio] = useState(false);
  const [checkInStress, setCheckInStress] = useState(3);
  const [checkInMood, setCheckInMood] = useState(8);
  const [checkInEnergy, setCheckInEnergy] = useState(7);

  // Focus Timer state
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [timerPhase, setTimerPhase] = useState<'work' | 'break'>('work');
  const [durationInput, setDurationInput] = useState(String(DEFAULT_MINUTES));
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_MINUTES);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_MINUTES * 60);
  const [timerStatus, setTimerStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeTask = tasks.find((t) => t.id === activeTaskId) || null;

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
        body: JSON.stringify({
          durationMinutes,
          taskId: activeTaskId,
        }),
      });

      playNotificationChime('focus_done');
      const taskMsg = activeTask ? ` on "${activeTask.title}"` : '';
      const notifBody = `Your ${durationMinutes}-minute focus session${taskMsg} has ended! Time to recharge.`;
      sendBrowserNotification('Focus Session Completed! ⏰', notifBody);

      setAlertNotification({
        title: '⏰ Focus Session Finished!',
        message: `Your ${durationMinutes}-minute session${taskMsg} has officially ended. Great work! Take a break before your next focus interval.`,
        type: 'focus_ended',
      });

      setSuccess(`🎉 Focus session completed! +15 XP earned.`);
      await Promise.all([loadTasks(), loadStats()]);
    } catch {
      /* count locally */
    }
  }, [durationMinutes, activeTaskId, activeTask, loadTasks, loadStats]);

  useEffect(() => {
    Promise.all([loadTasks(), loadStats()]).finally(() => setLoading(false));
  }, [loadTasks, loadStats]);

  // Request browser notification permissions non-intrusively
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Restore timer state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as {
        durationMinutes: number;
        secondsLeft: number;
        timerStatus: 'idle' | 'running' | 'paused';
        endsAt?: number;
        activeTaskId?: string | null;
        timerPhase?: 'work' | 'break';
      };
      const initialMins = Math.max(
        MIN_MINUTES,
        Math.min(MAX_MINUTES, parsed.durationMinutes || DEFAULT_MINUTES)
      );
      setDurationMinutes(initialMins);
      setDurationInput(String(initialMins));
      if (parsed.activeTaskId) setActiveTaskId(parsed.activeTaskId);
      if (parsed.timerPhase) setTimerPhase(parsed.timerPhase);

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

  // Timer interval clock
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

  // Timer completion handler
  useEffect(() => {
    if (timerStatus === 'running' && secondsLeft === 0) {
      if (timerPhase === 'work') {
        setTimerStatus('idle');
        void completeFocusSession();
        // Prepare break interval
        setTimerPhase('break');
        setSecondsLeft(DEFAULT_BREAK_MINUTES * 60);
      } else {
        // Break ended
        playNotificationChime('break');
        sendBrowserNotification('Break Ended! ☕', 'Break time has finished. Ready to start your next sprint?');
        setAlertNotification({
          title: '☕ Break Time Finished',
          message: 'Your break has concluded! Ready to jump back into your next focus sprint?',
          type: 'break_time',
        });
        setTimerPhase('work');
        setTimerStatus('idle');
        setSecondsLeft(durationMinutes * 60);
      }
    }
  }, [secondsLeft, timerStatus, timerPhase, durationMinutes, completeFocusSession]);

  // Sync timer to localStorage
  useEffect(() => {
    const payload = {
      durationMinutes,
      secondsLeft,
      timerStatus,
      activeTaskId,
      timerPhase,
      endsAt: timerStatus === 'running' ? Date.now() + secondsLeft * 1000 : undefined,
    };
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(payload));
  }, [durationMinutes, secondsLeft, timerStatus, activeTaskId, timerPhase]);

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

    if (!digitsOnly) return;

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
    setTimerPhase('work');
  }

  // Start or resume focus directly on a specific task
  function startTaskTimer(task: Task) {
    setError('');
    setSuccess('');
    setActiveTaskId(task.id);
    setTimerPhase('work');

    const sprintMins = task.breakIntervalMinutes || task.targetDurationMinutes || DEFAULT_MINUTES;
    const clamped = Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, sprintMins));

    setDurationMinutes(clamped);
    setDurationInput(String(clamped));
    setSecondsLeft(clamped * 60);
    setTimerStatus('running');

    setSuccess(`🔥 Now focusing on "${task.title}" (${clamped}m sprint before break).`);
  }

  function pauseTaskTimer() {
    setTimerStatus('paused');
  }

  function resumeTaskTimer() {
    setTimerStatus('running');
  }

  function detachActiveTask() {
    setActiveTaskId(null);
  }

  function startBreakTimer(breakMins = DEFAULT_BREAK_MINUTES) {
    setTimerPhase('break');
    setSecondsLeft(breakMins * 60);
    setTimerStatus('running');
  }

  // Create task with full configuration (description, target minutes, break intervals, link, status)
  async function handleCreateTask(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!formTitle.trim()) {
      setError('Please provide a task title.');
      return;
    }

    try {
      setError('');
      const targetMins = parseInt(formTargetDuration, 10) || 25;
      const breakInterval = parseInt(formBreakInterval, 10) || 25;

      const created = await api<Task>('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim() || undefined,
          status: formStatus,
          targetDurationMinutes: Math.max(1, Math.min(480, targetMins)),
          breakIntervalMinutes: Math.max(1, Math.min(240, breakInterval)),
          link: formLink.trim() || undefined,
        }),
      });

      if (formPushOnComplete && formStatus === 'DONE' && created?.id) {
        await api(`/tasks/${created.id}/push-to-portfolio`, { method: 'POST' });
      }

      if (formStatus === 'DONE') {
        playNotificationChime('task_done');
        sendBrowserNotification('Task Created & Completed! 🎉', `"${formTitle}" is completed.`);
        setAlertNotification({
          title: '🎉 Task Completed!',
          message: `Awesome work! "${formTitle}" has been logged as completed (+10 XP).`,
          type: 'task_done',
        });
      }

      setSuccess(`Task "${formTitle}" successfully created!`);
      setFormTitle('');
      setFormDescription('');
      setFormStatus('TODO');
      setFormTargetDuration('25');
      setFormBreakInterval('25');
      setFormLink('');
      setFormPushOnComplete(false);
      setShowForm(false);
      await Promise.all([loadTasks(), loadStats()]);
    } catch {
      setError('Could not create this task. Please check your connection.');
    }
  }

  async function moveTask(task: Task, status: string) {
    try {
      setError('');
      await api(`/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });

      if (status === 'DONE') {
        playNotificationChime('task_done');
        sendBrowserNotification('Task Completed! 🎉', `"${task.title}" has been completed.`);
        setAlertNotification({
          title: '🎉 Task Completed!',
          message: `Great job! You finished "${task.title}". Keep up the strong momentum!`,
          type: 'task_done',
        });
        setSuccess(`🎉 Task "${task.title}" marked as done!`);
      }

      await Promise.all([loadTasks(), loadStats()]);
    } catch {
      setError('Could not update this task.');
    }
  }

  async function saveLearnedNote(taskId: string) {
    const target = tasks.find((t) => t.id === taskId);
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

      if (checkInPushToPortfolio && target) {
        await api(`/tasks/${taskId}/push-to-portfolio`, { method: 'POST' });
        setSuccess(`🎉 Task completed and boosted to Career Portfolio (+35 XP)!`);
      } else {
        setSuccess('🎉 Task completed! Learning note logged.');
      }

      playNotificationChime('task_done');
      sendBrowserNotification('Task Finished! 🏆', `"${target?.title || 'Task'}" completed and logged.`);

      setAlertNotification({
        title: '🎉 Task Completed & Logged!',
        message: `Outstanding! You wrapped up "${target?.title || 'your task'}" with reflection notes.`,
        type: 'task_done',
      });

      setEditingLearned(null);
      setLearnedDraft('');
      setCheckInPushToPortfolio(false);
      await Promise.all([loadTasks(), loadStats()]);
    } catch {
      setError('Could not save your learning note.');
    }
  }

  async function pushToPortfolio(task: Task) {
    try {
      setError('');
      await api(`/tasks/${task.id}/push-to-portfolio`, { method: 'POST' });
      playNotificationChime('task_done');
      sendBrowserNotification('Career Portfolio Boosted! 🚀', `"${task.title}" was added to your portfolio.`);

      setAlertNotification({
        title: '🚀 Portfolio Boosted!',
        message: `"${task.title}" was successfully pushed to your Career Portfolio and is now showcased in your verified developer evidence locker!`,
        type: 'portfolio_boost',
      });

      setSuccess(`🚀 Boosted! "${task.title}" was added to your Career Portfolio (+25 XP).`);
      await Promise.all([loadTasks(), loadStats()]);
    } catch {
      setError('Could not push task to Career Portfolio.');
    }
  }

  async function deleteTask(id: string) {
    try {
      setError('');
      if (activeTaskId === id) {
        setActiveTaskId(null);
      }
      await api(`/tasks/${id}`, { method: 'DELETE' });
      await Promise.all([loadTasks(), loadStats()]);
    } catch {
      setError('Could not delete this task. Please try again.');
    }
  }

  const learnedTasks = stats?.learnedTasks || tasks.filter((t) => t.status === 'DONE');

  return (
    <DashboardLayout>
      {/* Top Banner / Breadcrumb Header */}
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Productivity &amp; Focus Center
          </p>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Tasks &amp; Focus Sessions</h1>
          <p className="text-sm text-muted-foreground">
            Plan deep work sprints, set custom break intervals, pause when interrupted, and boost completed achievements to your Career Portfolio.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowForm(!showForm)} className="bg-primary text-black hover:bg-primary/90">
            {showForm ? <X className="h-4 w-4 mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
            {showForm ? 'Close Form' : 'Add New Task'}
          </Button>
        </div>
      </div>

      {/* Pop-up Celebration / Notification Banner */}
      {alertNotification && (
        <div className="mb-4 animate-in fade-in slide-in-from-top-2 rounded-xl border border-primary/40 bg-gradient-to-r from-primary/15 via-[#0c2419] to-background p-4 shadow-lg flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-primary/20 p-2 text-primary">
              {alertNotification.type === 'portfolio_boost' ? (
                <Rocket className="h-5 w-5" />
              ) : alertNotification.type === 'break_time' ? (
                <Coffee className="h-5 w-5 text-amber-400" />
              ) : alertNotification.type === 'focus_ended' ? (
                <Clock className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                {alertNotification.title}
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] text-primary font-mono font-medium">
                  Notification
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {alertNotification.message}
              </p>
              {alertNotification.type === 'portfolio_boost' && (
                <Link
                  href="/portfolio"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  View in Career Portfolio →
                </Link>
              )}
              {alertNotification.type === 'focus_ended' && (
                <div className="mt-2.5 flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
                    onClick={() => {
                      startBreakTimer(DEFAULT_BREAK_MINUTES);
                      setAlertNotification(null);
                    }}
                  >
                    <Coffee className="h-3.5 w-3.5 mr-1" />
                    Start 5m Break
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground hover:text-white"
                    onClick={() => {
                      setTimerPhase('work');
                      setAlertNotification(null);
                    }}
                  >
                    Skip to Next Sprint
                  </Button>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setAlertNotification(null)}
            className="text-muted-foreground hover:text-white transition p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-primary flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Comprehensive Add Task Modal / Card with description, timer setup, break interval, links */}
      {showForm && (
        <Card className="mb-5 border-primary/30 bg-gradient-to-b from-secondary/40 to-background shadow-xl animate-in fade-in slide-in-from-top-2">
          <CardHeader className="pb-3 border-b border-white/[0.06]">
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Configure &amp; Add New Task
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Define the scope, set targeted focus minutes, schedule break intervals, link related resources, and choose initial status.
            </p>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <form onSubmit={handleCreateTask} className="space-y-4">
              {/* Task Title */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Task Title <span className="text-destructive">*</span>
                </label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Build JWT auth middleware, design hero section, solve challenge..."
                  className="bg-background/80 border-white/15 text-white"
                  autoFocus
                />
              </div>

              {/* Task Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Description &amp; Objective
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="What needs to be achieved? Outline technical requirements, steps, or acceptance criteria..."
                  className="w-full rounded-md border border-white/15 bg-background/80 p-2.5 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                />
              </div>

              {/* Grid: Initial Status, Focus Minutes, Break Interval */}
              <div className="grid gap-3 sm:grid-cols-3">
                {/* Initial Status */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Initial Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full h-9 rounded-md border border-white/15 bg-background/80 px-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="REVIEW">To Review</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>

                {/* Target Focus Duration */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center justify-between">
                    <span>Target Focus Time</span>
                    <span className="text-[10px] text-primary font-normal">Total task</span>
                  </label>
                  <div className="relative flex items-center">
                    <Input
                      type="number"
                      min={1}
                      max={480}
                      value={formTargetDuration}
                      onChange={(e) => setFormTargetDuration(e.target.value)}
                      placeholder="25"
                      className="bg-background/80 border-white/15 text-xs pr-10"
                    />
                    <span className="pointer-events-none absolute right-2.5 text-[11px] text-muted-foreground">
                      mins
                    </span>
                  </div>
                </div>

                {/* Break Interval */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center justify-between">
                    <span>Break Interval</span>
                    <span className="text-[10px] text-amber-400 font-normal">Rest cycle</span>
                  </label>
                  <div className="relative flex items-center">
                    <Input
                      type="number"
                      min={1}
                      max={240}
                      value={formBreakInterval}
                      onChange={(e) => setFormBreakInterval(e.target.value)}
                      placeholder="25"
                      className="bg-background/80 border-white/15 text-xs pr-10"
                    />
                    <span className="pointer-events-none absolute right-2.5 text-[11px] text-muted-foreground">
                      mins
                    </span>
                  </div>
                </div>
              </div>

              {/* Resource / External Link */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Resource or Evidence Link (Optional)
                </label>
                <div className="relative flex items-center">
                  <Input
                    value={formLink}
                    onChange={(e) => setFormLink(e.target.value)}
                    placeholder="https://github.com/..., Figma, docs, ticket, or lecture reference"
                    className="bg-background/80 border-white/15 text-xs pl-8 text-white"
                  />
                  <Link2 className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>

              {/* Push to Portfolio preview toggle */}
              <div className="rounded-lg border border-white/[0.08] bg-secondary/30 p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Rocket className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs font-medium text-white">Career Portfolio Boost</p>
                    <p className="text-[11px] text-muted-foreground">
                      Feature completed task in your developer showcase and resume builder (+25 XP).
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formPushOnComplete}
                  onChange={(e) => setFormPushOnComplete(e.target.checked)}
                  className="h-4 w-4 rounded accent-primary cursor-pointer"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-1 border-t border-white/[0.06]">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowForm(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-primary text-black hover:bg-primary/90 text-xs font-semibold px-4"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Save Task
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Main Grid: Kanban Board + Focus Timer Sidebar */}
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        {/* Left Column: Kanban Board & Knowledge Log */}
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-4">
            {columns.map((column) => {
              const items = tasks.filter((task) => task.status === column.key);
              return (
                <Card key={column.key} className="min-h-[380px] bg-secondary/20">
                  <CardHeader className="flex-row items-center justify-between space-y-0 pb-3 border-b border-white/[0.04]">
                    <CardTitle className="text-sm font-semibold">{column.title}</CardTitle>
                    <span className="rounded-md border border-white/[0.08] bg-secondary/60 px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                      {items.length}
                    </span>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-3">
                    {loading ? (
                      <p className="text-xs text-muted-foreground">Loading tasks...</p>
                    ) : items.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-white/10 p-4 text-center">
                        <p className="text-xs text-muted-foreground">No tasks in this lane.</p>
                      </div>
                    ) : (
                      items.map((task) => {
                        const isThisActive = activeTaskId === task.id;
                        const isRunning = isThisActive && timerStatus === 'running';
                        const isPaused = isThisActive && timerStatus === 'paused';

                        return (
                          <div
                            key={task.id}
                            className={`rounded-lg border p-3 transition-all ${
                              isThisActive
                                ? 'border-primary/50 bg-primary/10 shadow-md shadow-primary/5'
                                : 'border-white/[0.08] bg-secondary/40 hover:border-white/20'
                            }`}
                          >
                            {/* Card Header: Title & Badges */}
                            <div className="flex items-start justify-between gap-1.5">
                              <p className="text-sm font-semibold text-white leading-tight">
                                {task.title}
                              </p>
                              {isThisActive && (
                                <span className="inline-flex items-center gap-1 rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary shrink-0 uppercase tracking-wide">
                                  <Flame className="h-2.5 w-2.5 animate-pulse" />
                                  Active
                                </span>
                              )}
                            </div>

                            {/* Description */}
                            {task.description && (
                              <p className="mt-1.5 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                                {task.description}
                              </p>
                            )}

                            {/* Resource Link & Time Metadata Badges */}
                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                              {/* External Link */}
                              {task.link && (
                                <a
                                  href={task.link.startsWith('http') ? task.link : `https://${task.link}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded bg-blue-500/10 border border-blue-500/25 px-1.5 py-0.5 text-[10px] text-blue-300 hover:bg-blue-500/20 transition"
                                  title={task.link}
                                >
                                  <Link2 className="h-2.5 w-2.5" />
                                  Link
                                  <ExternalLink className="h-2 w-2 opacity-60" />
                                </a>
                              )}

                              {/* Target Minutes */}
                              <span
                                className="inline-flex items-center gap-1 rounded bg-secondary/70 border border-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                title="Target focus minutes"
                              >
                                <Clock className="h-2.5 w-2.5 text-primary" />
                                {task.targetDurationMinutes || 25}m target
                              </span>

                              {/* Break Interval */}
                              <span
                                className="inline-flex items-center gap-1 rounded bg-secondary/70 border border-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                title="Interval before break"
                              >
                                <Coffee className="h-2.5 w-2.5 text-amber-400" />
                                Break: {task.breakIntervalMinutes || 25}m
                              </span>

                              {/* Time Spent if recorded */}
                              {(task.timeSpentMinutes ?? 0) > 0 && (
                                <span className="inline-flex items-center gap-1 rounded bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 text-[10px] text-teal-300">
                                  ✓ Spent: {task.timeSpentMinutes}m
                                </span>
                              )}

                              {/* In Career Portfolio badge */}
                              {task.pushedToPortfolio ? (
                                <Link
                                  href="/portfolio"
                                  className="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300 hover:bg-emerald-500/25 transition"
                                >
                                  <Sparkles className="h-2.5 w-2.5" />
                                  In Portfolio
                                </Link>
                              ) : (
                                <button
                                  onClick={() => pushToPortfolio(task)}
                                  className="inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 text-[10px] text-amber-300 hover:bg-amber-500/20 transition"
                                  title="Push to Career Portfolio to boost your developer showcase"
                                >
                                  <Rocket className="h-2.5 w-2.5" />
                                  Boost
                                </button>
                              )}
                            </div>

                            {/* Learned note display */}
                            {task.learnedNote && (
                              <p className="mt-2 text-xs italic text-primary/90 bg-primary/5 rounded p-1.5 border border-primary/20">
                                💡 Learned: {task.learnedNote}
                              </p>
                            )}

                            {/* Actions Toolbar */}
                            <div className="mt-3 flex flex-wrap items-center gap-1 pt-2 border-t border-white/[0.06]">
                              {/* Focus & Pause button controls */}
                              {isRunning ? (
                                <Button
                                  size="sm"
                                  className="h-7 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 px-2"
                                  onClick={pauseTaskTimer}
                                  title="Pause task timer"
                                >
                                  <Pause className="h-3 w-3 mr-1 animate-pulse" />
                                  Pause ({formatTime(secondsLeft)})
                                </Button>
                              ) : isPaused ? (
                                <Button
                                  size="sm"
                                  className="h-7 text-[10px] bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 px-2"
                                  onClick={resumeTaskTimer}
                                  title="Resume task timer"
                                >
                                  <Play className="h-3 w-3 mr-1" />
                                  Resume ({formatTime(secondsLeft)})
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-7 text-[10px] hover:border-primary/40 px-2"
                                  onClick={() => startTaskTimer(task)}
                                  title="Load this task into focus timer"
                                >
                                  <Play className="h-3 w-3 mr-1 text-primary" />
                                  Focus
                                </Button>
                              )}

                              {/* Back column */}
                              {column.key !== 'TODO' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-[10px] px-1.5"
                                  onClick={() => {
                                    const flow = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
                                    const idx = flow.indexOf(column.key);
                                    if (idx > 0) moveTask(task, flow[idx - 1]);
                                  }}
                                >
                                  ← Back
                                </Button>
                              )}

                              {/* Advance column */}
                              {column.key !== 'DONE' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-[10px] text-primary px-1.5"
                                  onClick={() => {
                                    const flow = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
                                    const idx = flow.indexOf(column.key);
                                    if (idx < flow.length - 1) {
                                      const next = flow[idx + 1];
                                      if (next === 'DONE') {
                                        setEditingLearned(task.id);
                                        setLearnedDraft(task.learnedNote || '');
                                        setCheckInPushToPortfolio(!task.pushedToPortfolio);
                                      } else {
                                        moveTask(task, next);
                                      }
                                    }
                                  }}
                                >
                                  Advance →
                                </Button>
                              )}

                              {/* Delete button */}
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="ml-auto rounded-md p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                                title="Delete task"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {/* Done / Reflection Modal */}
                            {editingLearned === task.id && (
                              <div className="mt-3 space-y-3 rounded-lg border border-primary/30 bg-black/60 p-3 shadow-inner">
                                <div>
                                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    What did you learn?
                                  </label>
                                  <Input
                                    value={learnedDraft}
                                    onChange={(e) => setLearnedDraft(e.target.value)}
                                    placeholder="Key takeaway, technical insight or solution..."
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

                                {/* Push to Career Portfolio toggle on task completion */}
                                <div className="border-t border-white/[0.08] pt-2">
                                  <label className="flex items-center justify-between text-xs text-foreground cursor-pointer select-none">
                                    <span className="flex items-center gap-1.5 font-medium text-amber-300">
                                      <Rocket className="h-3.5 w-3.5 text-amber-400" />
                                      Push to Career Portfolio (+25 XP)
                                    </span>
                                    <input
                                      type="checkbox"
                                      checked={checkInPushToPortfolio}
                                      onChange={(e) => setCheckInPushToPortfolio(e.target.checked)}
                                      className="h-3.5 w-3.5 rounded accent-primary"
                                    />
                                  </label>
                                </div>

                                <div className="flex gap-2 pt-1">
                                  <Button
                                    size="sm"
                                    className="flex-1 text-xs bg-primary text-black hover:bg-primary/90"
                                    onClick={() => saveLearnedNote(task.id)}
                                  >
                                    Complete {includeWellnessCheckIn ? '(+20 XP)' : '(+10 XP)'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="text-xs"
                                    onClick={() => setEditingLearned(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* What You've Learned Section */}
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
                  Complete tasks and add learning notes to build your knowledge log and career evidence locker.
                </p>
              ) : (
                learnedTasks.map((task) => (
                  <div key={task.id} className="rounded-lg border border-white/[0.07] bg-secondary/40 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">{task.title}</p>
                      {'pushedToPortfolio' in task && task.pushedToPortfolio ? (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Featured in Portfolio
                        </span>
                      ) : (
                        <button
                          onClick={() => pushToPortfolio(task as Task)}
                          className="text-[10px] text-amber-300 hover:underline flex items-center gap-1"
                        >
                          <Rocket className="h-3 w-3" /> Push to Portfolio
                        </button>
                      )}
                    </div>
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

        {/* Right Sidebar: Focus Timer & Stats */}
        <div className="space-y-4">
          {/* Enhanced Focus Timer Card */}
          <Card className="border-primary/25">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-primary" />
                  Focus Timer
                </CardTitle>
                <span className="text-[10px] font-mono rounded bg-secondary px-2 py-0.5 text-muted-foreground">
                  {timerPhase === 'work' ? 'Sprint Phase' : 'Break Phase'}
                </span>
              </div>
            </CardHeader>
            <CardContent className="text-center pt-0">
              {/* Linked Active Task Banner */}
              {activeTask ? (
                <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 p-2.5 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                      <Flame className="h-3 w-3 animate-pulse" />
                      Active Task
                    </span>
                    <button
                      onClick={detachActiveTask}
                      className="text-[10px] text-muted-foreground hover:text-white transition"
                      title="Detach task from timer"
                    >
                      ✕ Detach
                    </button>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-white truncate" title={activeTask.title}>
                    {activeTask.title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                    <span>Target: {activeTask.targetDurationMinutes || 25}m</span>
                    <span>•</span>
                    <span>Break every: {activeTask.breakIntervalMinutes || 25}m</span>
                    {(activeTask.timeSpentMinutes ?? 0) > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-teal-300">Spent: {activeTask.timeSpentMinutes}m</span>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mb-3 rounded-lg border border-white/[0.06] bg-secondary/20 p-2 text-xs text-muted-foreground">
                  Click <span className="font-semibold text-primary">Focus</span> on any task to auto-load its interval.
                </div>
              )}

              {/* Dynamic Duration Controls when not running */}
              {timerStatus !== 'running' && timerPhase === 'work' ? (
                <div className="mb-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Sprint Duration (1 – 240 mins)
                  </p>
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => adjustDuration(-5)}
                      className="inline-flex h-8 items-center justify-center rounded-md border border-white/10 bg-secondary/60 px-2 text-xs font-semibold text-muted-foreground transition hover:bg-secondary hover:text-white"
                      title="Decrease 5 minutes"
                    >
                      -5m
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustDuration(-1)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-secondary/60 text-muted-foreground transition hover:bg-secondary hover:text-white"
                      title="Decrease 1 minute"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
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
                      />
                      <span className="pointer-events-none absolute right-1.5 text-[11px] font-medium text-muted-foreground">
                        min
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => adjustDuration(1)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-secondary/60 text-muted-foreground transition hover:bg-secondary hover:text-white"
                      title="Increase 1 minute"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustDuration(5)}
                      className="inline-flex h-8 items-center justify-center rounded-md border border-white/10 bg-secondary/60 px-2 text-xs font-semibold text-muted-foreground transition hover:bg-secondary hover:text-white"
                      title="Increase 5 minutes"
                    >
                      +5m
                    </button>
                  </div>
                </div>
              ) : timerStatus === 'running' ? (
                <div className="mb-4 flex items-center justify-center gap-1.5 rounded-md border border-primary/25 bg-primary/10 py-1.5 px-2 text-xs font-medium text-primary">
                  <Flame className="h-3.5 w-3.5 animate-pulse text-primary shrink-0" />
                  <span className="truncate">
                    {timerPhase === 'break' ? 'Recharging & Rest Cycle' : `Focusing (${durationMinutes}m sprint)`}
                  </span>
                </div>
              ) : null}

              {/* Countdown Dial */}
              <div
                className={`mx-auto flex h-36 w-36 items-center justify-center rounded-full border-4 transition-colors ${
                  timerPhase === 'break'
                    ? 'border-amber-400/80 bg-amber-500/10'
                    : 'border-primary/70 bg-primary/10'
                }`}
              >
                <div>
                  <p className="text-3xl font-bold text-white tracking-tight">{formatTime(secondsLeft)}</p>
                  <p className="text-xs text-muted-foreground">
                    {timerPhase === 'break'
                      ? timerStatus === 'running'
                        ? 'Break session'
                        : 'Break ready'
                      : timerStatus === 'running'
                      ? 'Focusing...'
                      : timerStatus === 'paused'
                      ? 'Paused'
                      : 'Sprint ready'}
                  </p>
                </div>
              </div>

              {/* Start / Pause / Resume / Reset Controls */}
              <div className="mt-4 flex gap-2">
                {timerStatus !== 'running' ? (
                  <Button className="flex-1 bg-primary text-black hover:bg-primary/90" onClick={startTimer}>
                    <Play className="h-4 w-4 mr-1" />
                    {timerStatus === 'paused' ? 'Resume' : timerPhase === 'break' ? 'Start Break' : 'Start Focus'}
                  </Button>
                ) : (
                  <Button className="flex-1" variant="secondary" onClick={pauseTimer}>
                    <Pause className="h-4 w-4 mr-1 text-amber-300" />
                    Pause
                  </Button>
                )}
                <Button variant="secondary" onClick={resetTimer} title="Reset Timer">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              {/* Break toggle button */}
              {timerStatus !== 'running' && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      if (timerPhase === 'work') {
                        startBreakTimer(DEFAULT_BREAK_MINUTES);
                      } else {
                        setTimerPhase('work');
                        setSecondsLeft(durationMinutes * 60);
                      }
                    }}
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <Coffee className="h-3 w-3" />
                    {timerPhase === 'work' ? 'Switch to Break Timer (5m)' : 'Switch back to Sprint Timer'}
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Today's Wins */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
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

          {/* Wellness */}
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
                <span className="font-semibold text-white">
                  {stats?.wellnessScore ?? '—'}
                  {stats?.wellnessScore ? '%' : ''}
                </span>
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
