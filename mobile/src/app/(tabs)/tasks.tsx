import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Image, Platform, Pressable, StyleSheet, Switch, Text as RNText, TextInput as RNTextInput, Vibration, View, type TextProps, type TextInputProps } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as SecureStore from 'expo-secure-store';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Button, Card, Field } from '@/components/ui';
import { TaskCard, type TaskCardAction } from '@/components/TaskCard';
import {
  LearningLog,
  ProgressRing,
  SwipeableTaskRow,
  TodaySummary,
  WeeklyInsights,
} from '@/components/ProductivityWidgets';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useAccessibility } from '@/context/AccessibilityContext';
import { api } from '@/services/api';
import {
  scheduleFocusCompletionNotification,
  scheduleBreakCompletionNotification,
  cancelFocusNotification,
  sendImmediateFocusNotification,
} from '@/services/notifications';
import type { ProductivityStats, Task } from '@/types/api';

const MIN_MINUTES = 1;
const MAX_MINUTES = 240;
const DEFAULT_MINUTES = 25;
const BREAK_MINUTES = 5;
const XP_MIN_MINUTES = 25;
const DURATION_PRESETS = [15, 25, 50, 90];

const GOAL_OPTIONS = [60, 90, 120, 180, 240];
const DEFAULT_GOAL_MINUTES = 120;
const GOAL_STORAGE_KEY = 'synergysphere.focusGoalMinutes';

type TimerState = 'idle' | 'running' | 'paused' | 'finished';
type TimerMode = 'focus' | 'break';
type TaskFilter = 'all' | 'todo' | 'active' | 'done';
type DueOption = 'none' | 'today' | 'tomorrow' | 'in3' | 'week';

const DUE_OPTIONS: { key: DueOption; label: string }[] = [
  { key: 'none', label: 'No date' },
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'in3', label: 'In 3 days' },
  { key: 'week', label: 'Next week' },
];

function dueOptionToIso(option: DueOption): string | undefined {
  if (option === 'none') return undefined;
  const offsets: Record<Exclude<DueOption, 'none'>, number> = { today: 0, tomorrow: 1, in3: 3, week: 7 };
  const date = new Date();
  date.setDate(date.getDate() + offsets[option]);
  date.setHours(23, 59, 0, 0);
  return date.toISOString();
}

async function readGoal(): Promise<number> {
  try {
    const raw =
      Platform.OS === 'web'
        ? typeof window !== 'undefined'
          ? window.localStorage.getItem(GOAL_STORAGE_KEY)
          : null
        : await SecureStore.getItemAsync(GOAL_STORAGE_KEY);
    const value = raw ? parseInt(raw, 10) : NaN;
    return GOAL_OPTIONS.includes(value) ? value : DEFAULT_GOAL_MINUTES;
  } catch {
    return DEFAULT_GOAL_MINUTES;
  }
}

async function writeGoal(value: number): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.localStorage.setItem(GOAL_STORAGE_KEY, String(value));
      return;
    }
    await SecureStore.setItemAsync(GOAL_STORAGE_KEY, String(value));
  } catch {
    // Persisting the goal is best-effort
  }
}

/** Active work first, then by due date (overdue/earliest first, undated last), then newest. */
function sortTasks(list: Task[]): Task[] {
  return [...list].sort((a, b) => {
    const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
    const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
    if (aDue !== bDue) return aDue - bDue;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function Text({
  style,
  ...props
}: TextProps) {
  const { largerText, fontSize } = useAccessibility();

  const flattenedStyle = StyleSheet.flatten(style);

  const baseFontSize =
    typeof flattenedStyle?.fontSize === 'number'
      ? flattenedStyle.fontSize
      : 14;

  const baseLineHeight =
    typeof flattenedStyle?.lineHeight === 'number'
      ? flattenedStyle.lineHeight
      : undefined;

  return (
    <RNText
      {...props}
      allowFontScaling
      style={[
        style,
        largerText && {
          fontSize: fontSize(baseFontSize),
          lineHeight:
            baseLineHeight !== undefined
              ? fontSize(baseLineHeight)
              : undefined,
        },
      ]}
    />
  );
}

function TextInput({
  style,
  ...props
}: TextInputProps) {
  const { largerText, fontSize } = useAccessibility();

  const flattenedStyle = StyleSheet.flatten(style);

  const baseFontSize =
    typeof flattenedStyle?.fontSize === 'number'
      ? flattenedStyle.fontSize
      : 16;

  const baseLineHeight =
    typeof flattenedStyle?.lineHeight === 'number'
      ? flattenedStyle.lineHeight
      : undefined;

  return (
    <RNTextInput
      {...props}
      allowFontScaling
      style={[
        style,
        largerText && {
          fontSize: fontSize(baseFontSize),
          lineHeight:
            baseLineHeight !== undefined
              ? fontSize(baseLineHeight)
              : undefined,
        },
      ]}
    />
  );
}

export default function TasksScreen() {
  const { colors, theme } = useTheme();
  const { fontSize, largerText } = useAccessibility();
  const { refresh: refreshAuth } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [initialStatus, setInitialStatus] = useState<Task['status']>('IN_PROGRESS');
  const [dueOption, setDueOption] = useState<DueOption>('none');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [adding, setAdding] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [stats, setStats] = useState<ProductivityStats | null>(null);
  const [learned, setLearned] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [goalMinutes, setGoalMinutes] = useState(DEFAULT_GOAL_MINUTES);

  // Focus Timer States with Dynamic Custom Duration
  const [durationInput, setDurationInput] = useState(String(DEFAULT_MINUTES));
  const [selectedMinutes, setSelectedMinutes] = useState(DEFAULT_MINUTES);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_MINUTES * 60);
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [timerMode, setTimerMode] = useState<TimerMode>('focus');
  const [pomodoro, setPomodoro] = useState(false);
  const [focusTask, setFocusTask] = useState<Task | null>(null);

  const endTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notificationIdRef = useRef<string | null>(null);
  // Always points at the latest completion handler so the interval never runs stale state
  const completeRef = useRef<() => void>(() => {});

  const isLight = theme === 'light';
  const brandGreen = isLight ? '#00875A' : colors.primary;

  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const [taskData, statsData] = await Promise.all([
        api.get<Task[]>('/tasks'),
        api.get<ProductivityStats>('/tasks/productivity-stats'),
      ]);
      setTasks(taskData);
      setStats(statsData);
      // Keep the focus target in sync with the latest server data
      setFocusTask((current) => (current ? taskData.find((t) => t.id === current.id) ?? null : null));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load tasks.');
    } finally {
      setLoaded(true);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    load();
    void readGoal().then(setGoalMinutes);
  }, [load]);

  function cycleGoal() {
    const index = GOAL_OPTIONS.indexOf(goalMinutes);
    const next = GOAL_OPTIONS[(index + 1) % GOAL_OPTIONS.length];
    setGoalMinutes(next);
    void writeGoal(next);
  }

  function clearInterval_() {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;
    endTimeRef.current = null;
  }

  async function cancelScheduledNotification() {
    if (notificationIdRef.current) {
      await cancelFocusNotification(notificationIdRef.current);
      notificationIdRef.current = null;
    }
  }

  async function beginCountdown(seconds: number, mode: TimerMode) {
    setError('');
    const targetSeconds = Math.max(1, Math.round(seconds));
    endTimeRef.current = Date.now() + targetSeconds * 1000;
    setTimeLeft(targetSeconds);
    setTimerMode(mode);
    setTimerState('running');

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      if (!endTimeRef.current) return;
      const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
      if (remaining <= 0) {
        completeRef.current();
      } else {
        setTimeLeft(remaining);
      }
    }, 500);

    try {
      await activateKeepAwakeAsync();
    } catch {}

    // Schedule a notification for when the countdown expires
    await cancelScheduledNotification();
    notificationIdRef.current =
      mode === 'focus'
        ? await scheduleFocusCompletionNotification(targetSeconds, selectedMinutes)
        : await scheduleBreakCompletionNotification(targetSeconds, BREAK_MINUTES);
  }

  function promptMarkDone(task: Task) {
    const message = `Nice work! Mark "${task.title}" as done?`;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm?.(message)) {
        void updateStatus(task, 'DONE');
      }
      return;
    }
    Alert.alert('Session complete', message, [
      { text: 'Keep working', style: 'cancel' },
      { text: 'Mark done', onPress: () => void updateStatus(task, 'DONE') },
    ]);
  }

  // Handle focus/break completion
  async function handleTimerComplete() {
    clearInterval_();
    const hadScheduledNotification = Boolean(notificationIdRef.current);
    notificationIdRef.current = null;

    try {
      deactivateKeepAwake();
    } catch {
      // Ignore keep awake deactivation errors
    }

    // Gentle single pulse
    try {
      Vibration.vibrate(150);
    } catch {
      // Ignore vibration error
    }

    if (timerMode === 'break') {
      setTimerMode('focus');
      setTimerState('idle');
      setTimeLeft(selectedMinutes * 60);
      setSuccess('Break over — ready for the next focus session.');
      return;
    }

    const completedTask = focusTask;
    const minutes = selectedMinutes;

    if (pomodoro) {
      void beginCountdown(BREAK_MINUTES * 60, 'break');
    } else {
      setTimerState('finished');
      setTimeLeft(0);
    }

    // The scheduled notification already fired if one was set
    if (!hadScheduledNotification) {
      await sendImmediateFocusNotification(minutes);
    }

    // Record session on backend (and log minutes against the task)
    try {
      await api.post('/tasks/focus-session', {
        durationMinutes: minutes,
        ...(completedTask ? { taskId: completedTask.id } : {}),
      });
      const xpText = minutes >= XP_MIN_MINUTES ? ' +15 XP earned.' : '';
      const taskText = completedTask ? ` on "${completedTask.title}"` : '';
      const breakText = pomodoro ? ` Enjoy a ${BREAK_MINUTES}-minute break.` : '';
      setSuccess(`${minutes}m focus session completed${taskText}!${xpText}${breakText}`);
      await Promise.all([load(), refreshAuth()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save focus session.');
    }

    if (completedTask && completedTask.status !== 'DONE') {
      promptMarkDone(completedTask);
    }
  }
  completeRef.current = () => void handleTimerComplete();

  // Handle AppState changes (sync timer when returning to foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && timerState === 'running' && endTimeRef.current) {
        const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
        if (remaining <= 0) {
          completeRef.current();
        } else {
          setTimeLeft(remaining);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [timerState]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      try {
        deactivateKeepAwake();
      } catch {}
    };
  }, []);

  // Duration input handlers with validation
  function applyDuration(mins: number) {
    const clamped = Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, Math.round(mins)));
    setSelectedMinutes(clamped);
    setDurationInput(String(clamped));
    if (timerState !== 'running') {
      setTimerMode('focus');
      setTimeLeft(clamped * 60);
      setTimerState('idle');
      void cancelScheduledNotification();
    }
  }

  function handleInputChange(text: string) {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    setDurationInput(digitsOnly);

    if (!digitsOnly) {
      return; // Allow user to clear text without resetting immediately
    }

    const val = parseInt(digitsOnly, 10);
    if (!isNaN(val)) {
      const clamped = Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, val));
      setSelectedMinutes(clamped);
      if (timerState !== 'running') {
        setTimerMode('focus');
        setTimeLeft(clamped * 60);
        setTimerState('idle');
        void cancelScheduledNotification();
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
    if (timerState === 'running') return;
    const current = parseInt(durationInput, 10) || selectedMinutes;
    applyDuration(current + delta);
  }

  async function startTimer() {
    setSuccess('');
    const total = (timerMode === 'break' ? BREAK_MINUTES : selectedMinutes) * 60;
    const resumeFrom = timerState === 'paused' && timeLeft > 0 ? timeLeft : total;
    await beginCountdown(resumeFrom, timerMode);
  }

  async function pauseTimer() {
    clearInterval_();
    setTimerState('paused');

    try {
      deactivateKeepAwake();
    } catch {}

    await cancelScheduledNotification();
  }

  async function resetTimer() {
    clearInterval_();
    setTimerMode('focus');
    setTimerState('idle');
    setTimeLeft(selectedMinutes * 60);

    try {
      deactivateKeepAwake();
    } catch {}

    await cancelScheduledNotification();
  }

  async function focusOnTask(task: Task) {
    if (timerState === 'running') return;
    setSuccess('');
    setFocusTask(task);
    if (task.status === 'TODO') {
      void updateStatus(task, 'IN_PROGRESS', { silent: true });
    }
    const resumeFrom =
      timerMode === 'focus' && timerState === 'paused' && timeLeft > 0 ? timeLeft : selectedMinutes * 60;
    await beginCountdown(resumeFrom, 'focus');
  }

  async function add() {
    if (!title.trim()) return;
    setAdding(true);
    try {
      const dueDate = dueOptionToIso(dueOption);
      await api.post<Task>('/tasks', {
        title: title.trim(),
        status: initialStatus,
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(dueDate ? { dueDate } : {}),
      });
      setTitle('');
      setDescription('');
      setDueOption('none');
      setShowAddTask(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create task.');
    } finally {
      setAdding(false);
    }
  }

  async function updateStatus(task: Task, newStatus: Task['status'], options?: { silent?: boolean }) {
    // Optimistic update so the list reacts instantly
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
    if (newStatus === 'DONE' && focusTask?.id === task.id && timerState !== 'running') {
      setFocusTask(null);
    }
    try {
      await api.patch<Task>(`/tasks/${task.id}`, { status: newStatus });
      if (!options?.silent && newStatus === 'DONE') {
        setSuccess(`"${task.title}" completed! +10 XP`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update task.');
      await load();
    }
  }

  async function saveLearned(task: Task) {
    try {
      await api.patch<Task>(`/tasks/${task.id}`, { learnedNote: learned[task.id] || null });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save learned note.');
    }
  }

  async function deleteTask(task: Task) {
    try {
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      if (focusTask?.id === task.id) setFocusTask(null);
      await api.delete(`/tasks/${task.id}`);
      setSuccess(`Task "${task.title}" deleted.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete task.');
      await load();
    }
  }

  function confirmDeleteTask(task: Task) {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm) {
        if (window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
          void deleteTask(task);
        }
      } else {
        void deleteTask(task);
      }
    } else {
      Alert.alert(
        'Delete Task',
        `Are you sure you want to delete "${task.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => void deleteTask(task),
          },
        ],
      );
    }
  }

  const taskGroups = useMemo(() => {
    const todo = sortTasks(tasks.filter((t) => t.status === 'TODO'));
    const active = sortTasks(tasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'REVIEW'));
    const done = [...tasks.filter((t) => t.status === 'DONE')];
    return { todo, active, done, open: sortTasks([...todo, ...active]) };
  }, [tasks]);

  if (!loaded) return <Loading />;

  const minutesDisplay = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secondsDisplay = String(timeLeft % 60).padStart(2, '0');
  const completedCount = taskGroups.done.length;
  const isRunning = timerState === 'running';
  const isBreak = timerMode === 'break';
  const timerAccent = isBreak ? '#3B82F6' : brandGreen;

  const totalSeconds = (isBreak ? BREAK_MINUTES : selectedMinutes) * 60;
  const ringProgress =
    timerState === 'finished'
      ? 1
      : timerState === 'idle'
      ? 0
      : Math.max(0, Math.min(1, 1 - timeLeft / totalSeconds));

  const timerStatusLabel = isBreak
    ? timerState === 'paused'
      ? 'BREAK PAUSED'
      : 'BREAK'
    : timerState === 'running'
    ? 'FOCUSING'
    : timerState === 'paused'
    ? 'PAUSED'
    : timerState === 'finished'
    ? 'COMPLETED'
    : 'READY';

  const filterTabs: { key: TaskFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: tasks.length },
    { key: 'todo', label: 'To Do', count: taskGroups.todo.length },
    { key: 'active', label: 'In Progress', count: taskGroups.active.length },
    { key: 'done', label: 'Done', count: taskGroups.done.length },
  ];

  const visibleTasks =
    filter === 'todo'
      ? taskGroups.todo
      : filter === 'active'
      ? taskGroups.active
      : filter === 'done'
      ? taskGroups.done
      : taskGroups.open;

  function actionsFor(task: Task): TaskCardAction[] {
    const isFocusTarget = focusTask?.id === task.id;
    const focusAction: TaskCardAction = {
      label: isFocusTarget && isRunning ? 'Focusing' : 'Focus',
      onPress: () => focusOnTask(task),
      disabled: isRunning,
      secondary: true,
    };
    const doneAction: TaskCardAction = {
      label: 'Done',
      onPress: () => updateStatus(task, 'DONE'),
      secondary: true,
    };

    switch (task.status) {
      case 'TODO':
        return [focusAction, doneAction];
      case 'IN_PROGRESS':
        return [
          focusAction,
          { label: 'Review', onPress: () => updateStatus(task, 'REVIEW'), secondary: true },
          doneAction,
        ];
      case 'REVIEW':
        return [
          { label: 'Rework', onPress: () => updateStatus(task, 'IN_PROGRESS'), secondary: true },
          doneAction,
        ];
      case 'DONE':
      default:
        return [
          { label: 'Reopen', onPress: () => updateStatus(task, 'TODO'), secondary: true },
          { label: 'Delete', onPress: () => confirmDeleteTask(task), danger: true, secondary: true },
        ];
    }
  }

  function renderTask(task: Task) {
    return (
      <SwipeableTaskRow
        key={task.id}
        isDone={task.status === 'DONE'}
        onComplete={() => void updateStatus(task, 'DONE')}
        onReopen={() => void updateStatus(task, 'TODO')}
        onDelete={() => confirmDeleteTask(task)}
      >
        <TaskCard
          task={task}
          status={task.status}
          actions={actionsFor(task)}
          onDelete={() => confirmDeleteTask(task)}
          isFocusTarget={focusTask?.id === task.id}
          learnedNote={learned[task.id] ?? task.learnedNote ?? ''}
          onChangeLearnedNote={(val) =>
            setLearned((curr) => ({ ...curr, [task.id]: val }))
          }
          onSaveLearnedNote={() => saveLearned(task)}
        />
      </SwipeableTaskRow>
    );
  }

  const stepButtonStyle = {
    backgroundColor: isLight ? '#FFFFFF' : colors.surfaceElevated,
    borderColor: isLight ? '#D1D5DB' : colors.border,
  };
  const stepIconColor = isLight ? '#374151' : colors.text;

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      {/* PRODUCTIVITY CENTER HEADER */}
      <View
        style={[
          styles.headerRow,
          largerText && styles.headerRowLarge,
        ]}
      >
        <View
          style={[
            styles.productivityLogoWrapper,
            largerText && styles.productivityLogoWrapperLarge,
            {
              backgroundColor:
                theme === 'dark'
                  ? 'rgba(16, 33, 40, 0.7)'
                  : 'rgba(237, 243, 239, 0.85)',
              borderColor:
                theme === 'dark'
                  ? 'rgba(145, 219, 94, 0.28)'
                  : 'rgba(145, 219, 94, 0.45)',
              shadowColor: theme === 'dark' ? '#91db5e' : '#10231D',
            },
          ]}
        >
          <Image
            source={require('../../../assets/images/productivity-logo.png')}
            style={[
              styles.productivityLogo,
              largerText && styles.productivityLogoLarge,
            ]}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>

        <View style={styles.headerText}>
          <RNText
            allowFontScaling
            style={[
              styles.headerTitle,
              {
                color: colors.text,
                fontSize: fontSize(24),
              },
            ]}
          >
            Productivity{'\n'}Center
          </RNText>

          <RNText
            allowFontScaling
            numberOfLines={2}
            style={[
              styles.headerSubtitle,
              {
                color: colors.muted,
                fontSize: fontSize(13),
                lineHeight: fontSize(18),
              },
            ]}
          >
            Plan work, track focus sessions &amp; organize tasks.
          </RNText>
        </View>
      </View>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {success ? <Notice tone="success">{success}</Notice> : null}

      {/* Today summary & daily goal */}
      <TodaySummary stats={stats} goalMinutes={goalMinutes} onCycleGoal={cycleGoal} accent={brandGreen} />

      {/* Focus Timer Section Header */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {isBreak ? 'Break Time' : 'Focus Timer'}
        </Text>
        <Text style={[styles.sectionSubtitleRight, { color: colors.muted }]}>
          {stats?.focusSessionsToday ?? 0} done today
        </Text>
      </View>

      {/* Focus Timer Card */}
      <Card>
        {/* Circular Timer Display with live progress */}
        <View style={styles.timerCircleContainer}>
          <ProgressRing
            size={210}
            progress={ringProgress}
            activeColor={timerAccent}
            trackColor={isLight ? '#DCE3DF' : '#2A3A44'}
            innerColor={isLight ? '#FFFFFF' : colors.surfaceElevated}
          >
            <Text style={[styles.timeDigits, { color: colors.text }]}>
              {minutesDisplay}:{secondsDisplay}
            </Text>
            <Text
              style={[
                styles.timeStatus,
                { color: isRunning || isBreak ? timerAccent : colors.muted },
              ]}
            >
              {timerStatusLabel}
            </Text>
            {focusTask && !isBreak ? (
              <Text
                numberOfLines={2}
                style={[styles.ringTaskTitle, { color: colors.muted }]}
              >
                {focusTask.title}
              </Text>
            ) : null}
          </ProgressRing>
        </View>

        {/* Linked task chip */}
        {focusTask && !isBreak ? (
          <View
            style={[
              styles.focusTaskChip,
              {
                backgroundColor: isLight ? '#E8F5E9' : 'rgba(145,219,94,0.12)',
                borderColor: isLight ? '#B7DFC3' : 'rgba(145,219,94,0.3)',
              },
            ]}
          >
            <Ionicons name="link" size={14} color={brandGreen} />
            <Text style={[styles.focusTaskChipText, { color: colors.text }]} numberOfLines={1}>
              Focusing on: {focusTask.title}
            </Text>
            {!isRunning ? (
              <Pressable
                onPress={() => setFocusTask(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Unlink task from timer"
              >
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>
        ) : !isBreak && !isRunning && taskGroups.open.length > 0 ? (
          <Text style={[styles.focusHint, { color: colors.muted }]}>
            Tip: tap "Focus" on a task to log this session against it.
          </Text>
        ) : null}

        {/* Dynamic Custom Duration Input Controls */}
        {isBreak ? (
          <View style={styles.runningBanner}>
            <Ionicons name="cafe" size={16} color={timerAccent} />
            <Text style={[styles.runningBannerText, { color: timerAccent }]}>
              Step away from the screen — {BREAK_MINUTES}-minute break
            </Text>
          </View>
        ) : !isRunning ? (
          <View style={styles.customDurationSection}>
            {/* Preset chips */}
            <View style={styles.presetRow}>
              {DURATION_PRESETS.map((preset) => {
                const selected = selectedMinutes === preset;
                return (
                  <Pressable
                    key={preset}
                    onPress={() => applyDuration(preset)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${preset} minute session`}
                    style={({ pressed }) => [
                      styles.presetChip,
                      {
                        backgroundColor: selected
                          ? brandGreen
                          : isLight
                          ? '#F1F5F9'
                          : colors.surfaceElevated,
                        borderColor: selected ? brandGreen : isLight ? '#D1D5DB' : colors.border,
                      },
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        { color: selected ? '#FFFFFF' : isLight ? '#374151' : colors.text },
                      ]}
                    >
                      {preset}m
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.durationLabel, { color: colors.muted }]}>
              Or set custom (1 – 240 mins)
            </Text>
            <View style={styles.durationInputRow}>
              {/* Rapid -5m step */}
              <Pressable
                onPress={() => adjustDuration(-5)}
                style={({ pressed }) => [
                  styles.quickStepBtn,
                  {
                    backgroundColor: isLight ? '#F1F5F9' : colors.surfaceElevated,
                    borderColor: isLight ? '#D1D5DB' : colors.border,
                  },
                  pressed && styles.btnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Decrease 5 minutes"
              >
                <Text style={[styles.quickStepText, { color: stepIconColor }]}>
                  -5m
                </Text>
              </Pressable>

              {/* Step -1m button */}
              <Pressable
                onPress={() => adjustDuration(-1)}
                style={({ pressed }) => [
                  styles.iconStepBtn,
                  stepButtonStyle,
                  pressed && styles.btnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Decrease 1 minute"
              >
                <Ionicons name="remove" size={18} color={stepIconColor} />
              </Pressable>

              {/* Editable Numerical Input */}
              <View style={[styles.editableFieldWrapper, stepButtonStyle]}>
                <TextInput
                  value={durationInput}
                  onChangeText={handleInputChange}
                  onBlur={handleInputBlur}
                  keyboardType="number-pad"
                  maxLength={3}
                  selectTextOnFocus
                  style={[styles.editableTextInput, { color: colors.text }]}
                  placeholder="25"
                  placeholderTextColor={colors.muted}
                  accessibilityLabel="Custom focus duration in minutes"
                />
                <Text style={[styles.inputUnitSuffix, { color: colors.muted }]}>min</Text>
              </View>

              {/* Step +1m button */}
              <Pressable
                onPress={() => adjustDuration(1)}
                style={({ pressed }) => [
                  styles.iconStepBtn,
                  stepButtonStyle,
                  pressed && styles.btnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Increase 1 minute"
              >
                <Ionicons name="add" size={18} color={stepIconColor} />
              </Pressable>

              {/* Rapid +5m step */}
              <Pressable
                onPress={() => adjustDuration(5)}
                style={({ pressed }) => [
                  styles.quickStepBtn,
                  {
                    backgroundColor: isLight ? '#F1F5F9' : colors.surfaceElevated,
                    borderColor: isLight ? '#D1D5DB' : colors.border,
                  },
                  pressed && styles.btnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Increase 5 minutes"
              >
                <Text style={[styles.quickStepText, { color: stepIconColor }]}>
                  +5m
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.runningBanner}>
            <Ionicons name="flame" size={16} color={brandGreen} />
            <Text style={[styles.runningBannerText, { color: brandGreen }]}>
              Focus session in progress ({selectedMinutes}m target)
            </Text>
          </View>
        )}

        {/* Pomodoro mode toggle */}
        <View style={[styles.pomodoroRow, { borderColor: colors.border }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.pomodoroTitle, { color: colors.text }]}>Pomodoro mode</Text>
            <Text style={[styles.pomodoroDesc, { color: colors.muted }]}>
              Auto-start a {BREAK_MINUTES}-minute break after each session
            </Text>
          </View>
          <Switch
            value={pomodoro}
            onValueChange={setPomodoro}
            accessibilityLabel="Pomodoro mode"
            trackColor={{ false: colors.border, true: isLight ? '#8fdf58' : brandGreen }}
            thumbColor={pomodoro ? (isLight ? '#1e6827' : '#FFFFFF') : colors.surfaceElevated}
          />
        </View>

        {/* Timer Control Buttons */}
        <View style={styles.timerActionsRow}>
          {isRunning ? (
            <Pressable
              onPress={pauseTimer}
              style={[styles.primaryActionBtn, { backgroundColor: '#E07A5F' }]}
            >
              <Ionicons name="pause" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnText}>{isBreak ? 'Pause Break' : 'Pause Session'}</Text>
            </Pressable>
          ) : timerState === 'paused' ? (
            <Pressable
              onPress={startTimer}
              style={[styles.primaryActionBtn, { backgroundColor: timerAccent }]}
            >
              <Ionicons name="play" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnText}>{isBreak ? 'Resume Break' : 'Resume Session'}</Text>
            </Pressable>
          ) : timerState === 'finished' ? (
            <Pressable
              onPress={resetTimer}
              style={[styles.primaryActionBtn, { backgroundColor: brandGreen }]}
            >
              <Ionicons name="refresh" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnText}>Start Again</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={startTimer}
              style={[styles.primaryActionBtn, { backgroundColor: brandGreen }]}
            >
              <Ionicons name="play" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnText}>Start Focus Session</Text>
            </Pressable>
          )}

          <Pressable
            onPress={resetTimer}
            style={[
              styles.resetBtn,
              {
                borderColor: isLight ? '#D5E0DA' : colors.border,
                backgroundColor: isLight ? '#FFFFFF' : colors.surfaceElevated,
              },
            ]}
          >
            <Text style={[styles.resetBtnText, { color: isLight ? '#334155' : colors.text }]}>
              {isBreak ? 'Skip' : 'Reset'}
            </Text>
          </Pressable>
        </View>
      </Card>

      {/* Tasks Section Header */}
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tasks</Text>
          <Text style={[styles.tasksSubtitle, { color: colors.muted }]}>
            {completedCount}/{tasks.length} completed
          </Text>
        </View>
        <Pressable
          onPress={() => setShowAddTask((prev) => !prev)}
          style={[styles.addTaskIconBtn, { backgroundColor: brandGreen }]}
          accessibilityRole="button"
          accessibilityLabel="Add Task"
        >
          <Ionicons name={showAddTask ? 'close' : 'add'} size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Tasks Section Card */}
      <Card>
        {showAddTask && (
          <View style={styles.addTaskForm}>
            <Field
              label="New task"
              value={title}
              onChangeText={setTitle}
              placeholder="What do you want to accomplish?"
            />
            <Field
              label="Description (optional)"
              value={description}
              onChangeText={setDescription}
              placeholder="Add context"
              multiline
            />
            <View style={{ gap: 6 }}>
              <Text style={[styles.formLabel, { color: colors.muted }]}>Initial Status</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([
                  { key: 'IN_PROGRESS', label: 'In Progress', icon: 'play' },
                  { key: 'TODO', label: 'To Do', icon: 'list' },
                ] as const).map((option) => {
                  const selected = initialStatus === option.key;
                  return (
                    <Pressable
                      key={option.key}
                      onPress={() => setInitialStatus(option.key)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[
                        styles.statusOption,
                        {
                          backgroundColor: selected ? (isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.25)') : colors.surface,
                          borderColor: selected ? brandGreen : colors.border,
                        },
                      ]}
                    >
                      <Ionicons name={option.icon} size={13} color={selected ? brandGreen : colors.muted} />
                      <Text style={[styles.statusOptionText, { color: selected ? brandGreen : colors.text }]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <Text style={[styles.formLabel, { color: colors.muted }]}>Due date</Text>
              <View style={styles.dueChipRow}>
                {DUE_OPTIONS.map((option) => {
                  const selected = dueOption === option.key;
                  return (
                    <Pressable
                      key={option.key}
                      onPress={() => setDueOption(option.key)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[
                        styles.dueChip,
                        {
                          backgroundColor: selected ? (isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.25)') : colors.surface,
                          borderColor: selected ? brandGreen : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.statusOptionText, { color: selected ? brandGreen : colors.text }]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Button
              title={adding ? 'Adding…' : 'Add task'}
              onPress={add}
              disabled={adding || !title.trim()}
            />
          </View>
        )}

        {/* Filter tabs */}
        {tasks.length > 0 ? (
          <View
            style={[
              styles.tabBar,
              {
                backgroundColor: isLight ? '#F1F5F3' : colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
            accessibilityRole="tablist"
          >
            {filterTabs.map((tab) => {
              const selected = filter === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setFilter(tab.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  style={[
                    styles.tabButton,
                    selected && { backgroundColor: isLight ? '#FFFFFF' : colors.surface },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[styles.tabText, { color: selected ? brandGreen : colors.muted }]}
                  >
                    {tab.label} {tab.count}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {tasks.length > 0 && Platform.OS !== 'web' ? (
          <Text style={[styles.swipeHint, { color: colors.muted }]}>
            Swipe right to complete · swipe left to delete
          </Text>
        ) : null}

        {tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={40} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No tasks yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              Tap + to add your first task.
            </Text>
          </View>
        ) : (
          <View style={styles.tasksList}>
            {visibleTasks.length === 0 ? (
              <Text style={[styles.filterEmpty, { color: colors.muted }]}>
                {filter === 'all' ? 'All caught up — nothing open right now.' : 'No tasks here.'}
              </Text>
            ) : (
              visibleTasks.map(renderTask)
            )}

            {/* Collapsible completed section (All view only) */}
            {filter === 'all' && taskGroups.done.length > 0 ? (
              <>
                <Pressable
                  onPress={() => setShowCompleted((value) => !value)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showCompleted }}
                  style={({ pressed }) => [
                    styles.completedToggle,
                    { borderColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Ionicons
                    name={showCompleted ? 'chevron-down' : 'chevron-forward'}
                    size={16}
                    color={colors.muted}
                  />
                  <Text style={[styles.completedToggleText, { color: colors.muted }]}>
                    Completed ({taskGroups.done.length})
                  </Text>
                </Pressable>
                {showCompleted ? taskGroups.done.map(renderTask) : null}
              </>
            ) : null}
          </View>
        )}
      </Card>

      {/* Weekly insights */}
      {stats?.weeklyFocus && stats.weeklyFocus.length > 0 ? (
        <WeeklyInsights weeklyFocus={stats.weeklyFocus} streak={stats.focusStreak ?? 0} accent={brandGreen} />
      ) : null}

      {/* Learning log */}
      <LearningLog items={stats?.learnedTasks ?? []} accent={brandGreen} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
    minHeight: 88,
    width: '100%',
  },
  headerRowLarge: {
    alignItems: 'flex-start',
  },
  productivityLogoWrapper: {
    width: 58,
    height: 58,
    borderRadius: 29,
    padding: 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
    flexShrink: 0,
  },
  productivityLogoWrapperLarge: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  productivityLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  productivityLogoLarge: {
    borderRadius: 31,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  headerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginBottom: 12,
    width: '100%',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 9,
    minWidth: 0,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 1,
  },
  swipeHint: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: -4,
    marginBottom: 8,
  },
  filterEmpty: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 18,
  },
  completedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  completedToggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 2,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  sectionSubtitleRight: {
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 0,
    alignSelf: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  cardSubtitleRight: {
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  tasksSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  addTaskIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  timerCircleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  timeDigits: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: 1,
  },
  timeStatus: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  ringTaskTitle: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 120,
  },
  focusTaskChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 14,
  },
  focusTaskChipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  focusHint: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 14,
  },
  customDurationSection: {
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginBottom: 6,
  },
  presetChip: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipText: {
    fontSize: 14,
    fontWeight: '800',
  },
  durationLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  durationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  quickStepBtn: {
    paddingHorizontal: 10,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStepText: {
    fontSize: 12,
    fontWeight: '700',
  },
  iconStepBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editableFieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
    minWidth: 96,
  },
  editableTextInput: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 0,
    minWidth: 40,
  },
  inputUnitSuffix: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  runningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginBottom: 12,
  },
  runningBannerText: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  pomodoroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  pomodoroTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  pomodoroDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  timerActionsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  primaryActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  resetBtn: {
    height: 48,
    paddingHorizontal: 22,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  addTaskForm: {
    gap: 12,
    marginTop: 6,
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dueChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dueChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 38,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  tasksList: {
    gap: 12,
    marginTop: 6,
  },
});
