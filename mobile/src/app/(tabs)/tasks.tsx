import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text as RNText, TextInput as RNTextInput, Vibration, View, type TextProps, type TextInputProps } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Button, Card, Field, TaskCard, type TaskCardAction } from '@/components/ui';
import { MyWorkView } from './my-work';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useAccessibility } from '@/context/AccessibilityContext';
import { api } from '@/services/api';
import {
  scheduleFocusCompletionNotification,
  cancelFocusNotification,
  sendImmediateFocusNotification,
} from '@/services/notifications';
import type { ProductivityStats, Task } from '@/types/api';

const MIN_MINUTES = 1;
const MAX_MINUTES = 240;
const DEFAULT_MINUTES = 25;

const nextStatus: Record<Task['status'], Task['status']> = {
  TODO: 'IN_PROGRESS',
  IN_PROGRESS: 'REVIEW',
  REVIEW: 'DONE',
  DONE: 'TODO',
};

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
  const { user, refresh: refreshAuth } = useAuth();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeModule, setActiveModule] = useState<'productivity' | 'my-work'>(
    tab === 'my-work' ? 'my-work' : 'productivity'
  );

  useEffect(() => {
    if (tab === 'my-work') {
      setActiveModule('my-work');
    } else if (tab === 'productivity') {
      setActiveModule('productivity');
    }
  }, [tab]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [initialStatus, setInitialStatus] = useState<Task['status']>('IN_PROGRESS');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [adding, setAdding] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [stats, setStats] = useState<ProductivityStats | null>(null);
  const [learned, setLearned] = useState<Record<string, string>>({});

  // Focus Timer States with Dynamic Custom Duration
  const [durationInput, setDurationInput] = useState(String(DEFAULT_MINUTES));
  const [selectedMinutes, setSelectedMinutes] = useState(DEFAULT_MINUTES);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_MINUTES * 60);
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused' | 'finished'>('idle');
  const [activeNotificationId, setActiveNotificationId] = useState<string | null>(null);

  const endTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  }, [load]);

  // Handle focus session completion
  const handleTimerComplete = useCallback(async () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;
    endTimeRef.current = null;
    setTimerState('finished');
    setTimeLeft(0);

    try {
      deactivateKeepAwake();
    } catch {
      // Ignore keep awake deactivation errors
    }

    // Trigger vibration and immediate notification
    try {
      Vibration.vibrate([0, 500, 200, 500]);
    } catch {
      // Ignore vibration error
    }

    await sendImmediateFocusNotification(selectedMinutes);

    // Record session on backend
    try {
      await api.post('/tasks/focus-session', { durationMinutes: selectedMinutes });
      setSuccess(`🎉 Focus session completed! +15 XP earned.`);
      await Promise.all([load(), refreshAuth()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save focus session.');
    }
  }, [selectedMinutes, load, refreshAuth]);

  // Handle AppState changes (sync timer when returning to foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && timerState === 'running' && endTimeRef.current) {
        const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
        if (remaining <= 0) {
          handleTimerComplete();
        } else {
          setTimeLeft(remaining);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [timerState, handleTimerComplete]);

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
      setTimeLeft(clamped * 60);
      setTimerState('idle');
      if (activeNotificationId) {
        cancelFocusNotification(activeNotificationId);
        setActiveNotificationId(null);
      }
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
        setTimeLeft(clamped * 60);
        setTimerState('idle');
        if (activeNotificationId) {
          cancelFocusNotification(activeNotificationId);
          setActiveNotificationId(null);
        }
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
    setError('');
    setSuccess('');

    const targetSeconds = timeLeft > 0 ? timeLeft : selectedMinutes * 60;
    const targetEndTime = Date.now() + targetSeconds * 1000;
    endTimeRef.current = targetEndTime;

    // Schedule notification for when the timer expires
    const notifId = await scheduleFocusCompletionNotification(targetSeconds, selectedMinutes);
    if (notifId) {
      setActiveNotificationId(notifId);
    }

    try {
      await activateKeepAwakeAsync();
    } catch {}

    setTimerState('running');

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      if (!endTimeRef.current) return;
      const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
      if (remaining <= 0) {
        handleTimerComplete();
      } else {
        setTimeLeft(remaining);
      }
    }, 500);
  }

  async function pauseTimer() {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;
    endTimeRef.current = null;
    setTimerState('paused');

    try {
      deactivateKeepAwake();
    } catch {}

    if (activeNotificationId) {
      await cancelFocusNotification(activeNotificationId);
      setActiveNotificationId(null);
    }
  }

  async function resetTimer() {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;
    endTimeRef.current = null;
    setTimerState('idle');
    setTimeLeft(selectedMinutes * 60);

    try {
      deactivateKeepAwake();
    } catch {}

    if (activeNotificationId) {
      await cancelFocusNotification(activeNotificationId);
      setActiveNotificationId(null);
    }
  }

  async function add() {
    if (!title.trim()) return;
    setAdding(true);
    try {
      await api.post<Task>('/tasks', {
        title: title.trim(),
        status: initialStatus,
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      setTitle('');
      setDescription('');
      setShowAddTask(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create task.');
    } finally {
      setAdding(false);
    }
  }

  async function updateStatus(task: Task, newStatus: Task['status']) {
    try {
      await api.patch<Task>(`/tasks/${task.id}`, { status: newStatus });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update task.');
    }
  }

  async function advance(task: Task) {
    try {
      await api.patch<Task>(`/tasks/${task.id}`, { status: nextStatus[task.status] });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update task.');
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

  if (!loaded) return <Loading />;

  const minutesDisplay = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secondsDisplay = String(timeLeft % 60).padStart(2, '0');
  const completedCount = tasks.filter((t) => t.status === 'DONE').length;

  const timerStatusLabel =
    timerState === 'running'
      ? 'FOCUSING'
      : timerState === 'paused'
      ? 'PAUSED'
      : timerState === 'finished'
      ? 'COMPLETED'
      : 'READY';

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      {/* Module Switcher: Tasks & Focus vs GitHub My Work */}
      <View style={[styles.moduleTabSwitcher, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setActiveModule('productivity')}
          style={[
            styles.moduleTabBtn,
            activeModule === 'productivity' && [styles.moduleTabBtnActive, { backgroundColor: brandGreen }],
          ]}
        >
          <Ionicons
            name="checkbox-outline"
            size={16}
            color={activeModule === 'productivity' ? '#FFFFFF' : colors.muted}
          />
          <Text
            style={[
              styles.moduleTabBtnText,
              {
                color: activeModule === 'productivity' ? '#FFFFFF' : colors.text,
                fontWeight: activeModule === 'productivity' ? '800' : '600',
              },
            ]}
          >
            Tasks & Focus
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => setActiveModule('my-work')}
          style={[
            styles.moduleTabBtn,
            activeModule === 'my-work' && [styles.moduleTabBtnActive, { backgroundColor: brandGreen }],
          ]}
        >
          <Ionicons
            name="git-pull-request-outline"
            size={16}
            color={activeModule === 'my-work' ? '#FFFFFF' : colors.muted}
          />
          <Text
            style={[
              styles.moduleTabBtnText,
              {
                color: activeModule === 'my-work' ? '#FFFFFF' : colors.text,
                fontWeight: activeModule === 'my-work' ? '800' : '600',
              },
            ]}
          >
            My Work
          </Text>
        </Pressable>
      </View>

      {activeModule === 'my-work' ? (
        <MyWorkView showBackButton={false} wrapInScreen={false} />
      ) : (
        <>
          {/* Productivity Center Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleCol}>
          <Text style={[styles.mainHeading, { color: colors.text }]}>Productivity Center</Text>
          <Text style={[styles.mainSubtitle, { color: colors.muted }]}>
            Plan work and track focus.
          </Text>
        </View>
      </View>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {success ? <Notice tone="success">{success}</Notice> : null}

      {/* Focus Timer Card */}
      <Card>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Focus Timer</Text>
          <Text style={[styles.cardSubtitleRight, { color: colors.muted }]}>
            {stats?.focusSessionsToday ?? 0} done today
          </Text>
        </View>

        {/* Circular Timer Display */}
        <View style={styles.timerCircleContainer}>
          <View
            style={[
              styles.timerRing,
              {
                borderColor:
                  timerState === 'running'
                    ? brandGreen
                    : isLight
                    ? '#52606D'
                    : '#334155',
                backgroundColor: isLight ? '#FFFFFF' : colors.surfaceElevated,
              },
            ]}
          >
            <Text style={[styles.timeDigits, { color: colors.text }]}>
              {minutesDisplay}:{secondsDisplay}
            </Text>
            <Text
              style={[
                styles.timeStatus,
                {
                  color:
                    timerState === 'running'
                      ? brandGreen
                      : colors.muted,
                },
              ]}
            >
              {timerStatusLabel}
            </Text>
          </View>
        </View>

        {/* Dynamic Custom Duration Input Controls */}
        {timerState !== 'running' ? (
          <View style={styles.customDurationSection}>
            <Text style={[styles.durationLabel, { color: colors.muted }]}>
              Set Duration (1 – 240 mins)
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
                <Text style={[styles.quickStepText, { color: isLight ? '#374151' : colors.text }]}>
                  -5m
                </Text>
              </Pressable>

              {/* Step -1m button */}
              <Pressable
                onPress={() => adjustDuration(-1)}
                style={({ pressed }) => [
                  styles.iconStepBtn,
                  {
                    backgroundColor: '#FFFFFF',
                    borderColor: '#D1D5DB',
                  },
                  pressed && styles.btnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Decrease 1 minute"
              >
                <Ionicons name="remove" size={18} color="#374151" />
              </Pressable>

              {/* Editable Numerical Input */}
              <View style={styles.editableFieldWrapper}>
                <TextInput
                  value={durationInput}
                  onChangeText={handleInputChange}
                  onBlur={handleInputBlur}
                  keyboardType="number-pad"
                  maxLength={3}
                  selectTextOnFocus
                  style={styles.editableTextInput}
                  placeholder="25"
                  placeholderTextColor="#9CA3AF"
                  accessibilityLabel="Custom focus duration in minutes"
                />
                <Text style={styles.inputUnitSuffix}>min</Text>
              </View>

              {/* Step +1m button */}
              <Pressable
                onPress={() => adjustDuration(1)}
                style={({ pressed }) => [
                  styles.iconStepBtn,
                  {
                    backgroundColor: '#FFFFFF',
                    borderColor: '#D1D5DB',
                  },
                  pressed && styles.btnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Increase 1 minute"
              >
                <Ionicons name="add" size={18} color="#374151" />
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
                <Text style={[styles.quickStepText, { color: isLight ? '#374151' : colors.text }]}>
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

        {/* Timer Control Buttons */}
        <View style={styles.timerActionsRow}>
          {timerState === 'running' ? (
            <Pressable
              onPress={pauseTimer}
              style={[styles.primaryActionBtn, { backgroundColor: '#E07A5F' }]}
            >
              <Ionicons name="pause" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnText}>Pause Session</Text>
            </Pressable>
          ) : timerState === 'paused' ? (
            <Pressable
              onPress={startTimer}
              style={[styles.primaryActionBtn, { backgroundColor: brandGreen }]}
            >
              <Ionicons name="play" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnText}>Resume Session</Text>
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
              Reset
            </Text>
          </Pressable>
        </View>
      </Card>

      {/* Tasks Section Card */}
      <Card>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Tasks</Text>
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
            <View style={{ marginBottom: 10, gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>Initial Status</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => setInitialStatus('IN_PROGRESS')}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    backgroundColor: initialStatus === 'IN_PROGRESS' ? (isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.25)') : colors.surface,
                    borderColor: initialStatus === 'IN_PROGRESS' ? brandGreen : colors.border,
                  }}
                >
                  <Ionicons name="play" size={13} color={initialStatus === 'IN_PROGRESS' ? brandGreen : colors.muted} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: initialStatus === 'IN_PROGRESS' ? brandGreen : colors.text }}>
                    In Progress
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setInitialStatus('TODO')}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    backgroundColor: initialStatus === 'TODO' ? (isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.25)') : colors.surface,
                    borderColor: initialStatus === 'TODO' ? brandGreen : colors.border,
                  }}
                >
                  <Ionicons name="list" size={13} color={initialStatus === 'TODO' ? brandGreen : colors.muted} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: initialStatus === 'TODO' ? brandGreen : colors.text }}>
                    To Do
                  </Text>
                </Pressable>
              </View>
            </View>
            <Button
              title={adding ? 'Adding…' : 'Add task'}
              onPress={add}
              disabled={adding || !title.trim()}
            />
          </View>
        )}

        {tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No tasks yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              Tap + to add your first task.
            </Text>
          </View>
        ) : (
          <View style={styles.tasksList}>
            {tasks.map((task) => {
              const isDone = task.status === 'DONE';
              const isInProgress = task.status === 'IN_PROGRESS';
              const isTodo = task.status === 'TODO';

              const actions: TaskCardAction[] = isTodo
                ? [
                    {
                      label: '▶ Start',
                      onPress: () => updateStatus(task, 'IN_PROGRESS'),
                      secondary: true,
                    },
                    {
                      label: '✓ Done',
                      onPress: () => updateStatus(task, 'DONE'),
                      secondary: true,
                    },
                  ]
                : isInProgress
                ? [
                    {
                      label: '✓ Done',
                      onPress: () => updateStatus(task, 'DONE'),
                      secondary: true,
                    },
                    {
                      label: 'Advance',
                      onPress: () => advance(task),
                      secondary: true,
                    },
                  ]
                : isDone
                ? [
                    {
                      label: 'Reopen',
                      onPress: () => updateStatus(task, 'TODO'),
                      secondary: true,
                    },
                  ]
                : [
                    {
                      label: '✓ Done',
                      onPress: () => updateStatus(task, 'DONE'),
                      secondary: true,
                    },
                  ];

              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  status={task.status}
                  actions={actions}
                  learnedNote={learned[task.id] ?? task.learnedNote ?? ''}
                  onChangeLearnedNote={(val) =>
                    setLearned((curr) => ({ ...curr, [task.id]: val }))
                  }
                  onSaveLearnedNote={() => saveLearned(task)}
                />
              );
            })}
          </View>
        )}
        </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  moduleTabSwitcher: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 6,
    marginBottom: 10,
  },
  moduleTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 9,
    borderRadius: 10,
  },
  moduleTabBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  moduleTabBtnText: {
    fontSize: 13,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  headerTitleCol: {
    flex: 1,
  },
  mainHeading: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  mainSubtitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  xpBadge: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  xpBadgeText: {
    fontSize: 13,
    fontWeight: '700',
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
    marginVertical: 18,
  },
  timerRing: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 13,
    alignItems: 'center',
    justifyContent: 'center',
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
  customDurationSection: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
    minWidth: 96,
  },
  editableTextInput: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    paddingVertical: 0,
    minWidth: 40,
  },
  inputUnitSuffix: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 4,
  },
  runningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginBottom: 16,
  },
  runningBannerText: {
    fontSize: 13,
    fontWeight: '700',
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
