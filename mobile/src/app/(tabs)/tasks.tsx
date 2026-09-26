import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, TextInput, Vibration, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Button, Card, Field } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
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

export default function TasksScreen() {
  const { colors, theme } = useTheme();
  const { user, refresh: refreshAuth } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
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
    <Screen>
      {/* Productivity Center Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleCol}>
          <Text style={[styles.mainHeading, { color: colors.text }]}>Productivity Center</Text>
          <Text style={[styles.mainSubtitle, { color: colors.muted }]}>
            Plan work, track focus, earn XP.
          </Text>
        </View>
        <View style={[styles.xpBadge, { backgroundColor: isLight ? '#00875A' : colors.primaryDark }]}>
          <Text style={[styles.xpBadgeText, { color: isLight ? '#FFFFFF' : colors.primary }]}>
            ⚡ {user?.xp ?? 0} XP · Level {user?.level ?? 1}
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
          <View>
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
              Tap + to add your first task and start earning XP.
            </Text>
          </View>
        ) : (
          <View style={styles.tasksList}>
            {tasks.map((task) => {
              const isDone = task.status === 'DONE';
              return (
                <View
                  key={task.id}
                  style={[
                    styles.taskItem,
                    {
                      borderColor: colors.border,
                      backgroundColor: isLight ? '#F9FBFA' : colors.surfaceElevated,
                    },
                  ]}
                >
                  <View style={styles.taskRow}>
                    <View style={styles.taskBody}>
                      <Text
                        style={[
                          styles.taskStatus,
                          {
                            color: isDone
                              ? colors.completedTitle
                              : brandGreen,
                          },
                        ]}
                      >
                        {task.status.replace('_', ' ')}
                      </Text>
                      <Text
                        style={[
                          styles.taskTitle,
                          { color: isDone ? colors.completedTitle : colors.text },
                          isDone && styles.doneTitle,
                        ]}
                      >
                        {task.title}
                      </Text>
                      {task.description ? (
                        <Text
                          style={[
                            styles.taskDescription,
                            { color: isDone ? colors.completedDesc : colors.muted },
                          ]}
                        >
                          {task.description}
                        </Text>
                      ) : null}
                    </View>
                    <Button
                      title={isDone ? 'Reopen' : 'Advance'}
                      onPress={() => advance(task)}
                      secondary
                    />
                  </View>
                  {isDone ? (
                    <View style={styles.learnedSection}>
                      <Field
                        label="What did you learn?"
                        value={learned[task.id] ?? task.learnedNote ?? ''}
                        onChangeText={(val) =>
                          setLearned((curr) => ({ ...curr, [task.id]: val }))
                        }
                        multiline
                      />
                      <Button
                        title="Save learning note"
                        onPress={() => saveLearned(task)}
                        secondary
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  },
  xpBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardSubtitleRight: {
    fontSize: 13,
    fontWeight: '500',
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
    gap: 10,
    marginTop: 4,
  },
  taskItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  taskBody: {
    flex: 1,
    gap: 4,
  },
  taskStatus: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  doneTitle: {
    textDecorationLine: 'line-through',
  },
  taskDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  learnedSection: {
    marginTop: 8,
    gap: 8,
  },
});
