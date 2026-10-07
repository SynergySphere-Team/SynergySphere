import { useCallback, useEffect, useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { AppState, Image, Pressable, StyleSheet, Text as RNText, Vibration, View, type TextProps } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Card } from '@/components/ui';
import { WorkspaceMenu } from '@/components/WorkspaceMenu';
import { useTheme } from '@/context/ThemeContext';
import { useAccessibility } from '@/context/AccessibilityContext';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import {
  scheduleFocusCompletionNotification,
  cancelFocusNotification,
  sendImmediateFocusNotification,
} from '@/services/notifications';
import type { DashboardStats, GithubActivity, Task } from '@/types/api';

function getLevelTitle(level: number): string {
  if (level >= 20) return 'Principal Innovator';
  if (level >= 15) return 'Staff Engineer';
  if (level >= 10) return 'Senior Builder';
  if (level >= 5) return 'Rising Contributor';
  return 'Apprentice';
}

function getXpProgress(xp: number): number {
  return Math.min(100, Math.max(0, (xp % 1000) / 10));
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function Text({
  style,
  ...props
}: TextProps) {
  const {
    largerText,
    fontSize,
  } = useAccessibility();

  const flattenedStyle =
    StyleSheet.flatten(style);

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

export default function HomeScreen() {
  const router = useRouter();
  const { user, refresh: refreshAuth } = useAuth();
  const { colors, theme } = useTheme();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [communityActivity, setCommunityActivity] = useState<GithubActivity[]>([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Confined Mini Focus Session State
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [focusTimeLeft, setFocusTimeLeft] = useState(25 * 60);
  const [focusTimerState, setFocusTimerState] = useState<'idle' | 'running' | 'paused' | 'finished'>('idle');
  const [focusSuccess, setFocusSuccess] = useState('');
  const [activeNotificationId, setActiveNotificationId] = useState<string | null>(null);

  const focusEndTimeRef = useRef<number | null>(null);
  const focusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLight = theme === 'light';
  const primaryAccent = isLight ? '#1e6827' : colors.primary;

  const userInitials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user?.firstName && user.firstName.length >= 2
      ? user.firstName.slice(0, 2).toUpperCase()
      : user?.firstName
      ? user.firstName[0].toUpperCase()
      : 'AS';

  const load = useCallback(async () => {
    try {
      setError('');
      const [stats, taskList, feed] = await Promise.all([
        api.get<DashboardStats>('/dashboard/stats'),
        api.get<Task[]>('/tasks').catch(() => []),
        api.get<GithubActivity[]>('/github/feed').catch(() => []),
      ]);
      setData(stats);
      // Active tasks: any uncompleted task (IN_PROGRESS, TODO, REVIEW), sorted with IN_PROGRESS first
      const open = Array.isArray(taskList) ? taskList.filter((t) => t.status !== 'DONE') : [];
      open.sort((a, b) => {
        if (a.status === 'IN_PROGRESS' && b.status !== 'IN_PROGRESS') return -1;
        if (a.status !== 'IN_PROGRESS' && b.status === 'IN_PROGRESS') return 1;
        return 0;
      });
      setActiveTasks(open);
      setCommunityActivity(Array.isArray(feed) ? feed : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load dashboard.');
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

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function toggleTaskStatus(task: Task) {
    const nextSt =
      task.status === 'TODO'
        ? 'IN_PROGRESS'
        : task.status === 'IN_PROGRESS'
        ? 'DONE'
        : 'IN_PROGRESS';
    try {
      await api.patch<Task>(`/tasks/${task.id}`, { status: nextSt });
      await load();
    } catch (e) {
      // Ignore or log
    }
  }

  // Focus Timer Handlers
  const handleFocusComplete = useCallback(async () => {
    if (focusIntervalRef.current) clearInterval(focusIntervalRef.current);
    focusIntervalRef.current = null;
    focusEndTimeRef.current = null;
    setFocusTimerState('finished');
    setFocusTimeLeft(0);

    try {
      deactivateKeepAwake();
    } catch {}

    try {
      Vibration.vibrate([0, 500, 200, 500]);
    } catch {}

    await sendImmediateFocusNotification(focusMinutes);

    try {
      await api.post('/tasks/focus-session', { durationMinutes: focusMinutes });
      setFocusSuccess(`🎉 ${focusMinutes}m sprint complete! +15 XP earned.`);
      await Promise.all([load(), refreshAuth()]);
    } catch {
      // Ignore save error
    }
  }, [focusMinutes, load, refreshAuth]);

  // Sync timer when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && focusTimerState === 'running' && focusEndTimeRef.current) {
        const remaining = Math.max(0, Math.round((focusEndTimeRef.current - Date.now()) / 1000));
        if (remaining <= 0) {
          handleFocusComplete();
        } else {
          setFocusTimeLeft(remaining);
        }
      }
    });
    return () => subscription.remove();
  }, [focusTimerState, handleFocusComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (focusIntervalRef.current) clearInterval(focusIntervalRef.current);
      try {
        deactivateKeepAwake();
      } catch {}
    };
  }, []);

  function setPreset(mins: number) {
    if (focusTimerState === 'running') return;
    setFocusMinutes(mins);
    setFocusTimeLeft(mins * 60);
    setFocusTimerState('idle');
    setFocusSuccess('');
    if (activeNotificationId) {
      cancelFocusNotification(activeNotificationId);
      setActiveNotificationId(null);
    }
  }

  async function startFocusTimer() {
    setFocusSuccess('');
    const targetSeconds = focusTimeLeft > 0 ? focusTimeLeft : focusMinutes * 60;
    focusEndTimeRef.current = Date.now() + targetSeconds * 1000;

    const notifId = await scheduleFocusCompletionNotification(targetSeconds, focusMinutes);
    if (notifId) setActiveNotificationId(notifId);

    try {
      await activateKeepAwakeAsync();
    } catch {}

    setFocusTimerState('running');
    if (focusIntervalRef.current) clearInterval(focusIntervalRef.current);
    focusIntervalRef.current = setInterval(() => {
      if (!focusEndTimeRef.current) return;
      const remaining = Math.max(0, Math.round((focusEndTimeRef.current - Date.now()) / 1000));
      if (remaining <= 0) {
        handleFocusComplete();
      } else {
        setFocusTimeLeft(remaining);
      }
    }, 500);
  }

  function pauseFocusTimer() {
    if (focusIntervalRef.current) clearInterval(focusIntervalRef.current);
    focusIntervalRef.current = null;
    focusEndTimeRef.current = null;
    if (activeNotificationId) {
      cancelFocusNotification(activeNotificationId);
      setActiveNotificationId(null);
    }
    try {
      deactivateKeepAwake();
    } catch {}
    setFocusTimerState('paused');
  }

  function resetFocusTimer() {
    if (focusIntervalRef.current) clearInterval(focusIntervalRef.current);
    focusIntervalRef.current = null;
    focusEndTimeRef.current = null;
    if (activeNotificationId) {
      cancelFocusNotification(activeNotificationId);
      setActiveNotificationId(null);
    }
    try {
      deactivateKeepAwake();
    } catch {}
    setFocusTimeLeft(focusMinutes * 60);
    setFocusTimerState('idle');
    setFocusSuccess('');
  }

  if (!data && !error) return <Loading />;

  const userLevel = data?.user?.level ?? user?.level ?? 1;
  const userXp = data?.user?.xp ?? user?.xp ?? 0;
  const levelTitle = data?.levelTitle || getLevelTitle(userLevel);
  const xpProgress = getXpProgress(userXp);

  const profile = data?.developerProfile;

  // Real 3 core metrics
  const challengesPassed = profile?.challenges?.passedTotal ?? data?.stats?.challengesPassed ?? 0;
  const tasksCompletedThisWeek = profile?.tasksSummary?.completedThisWeek ?? data?.stats?.tasksCompleted ?? 0;
  const lessonsCompleted = profile?.hubSkills
    ? profile.hubSkills.reduce((sum, s) => sum + s.completedLessons, 0)
    : 0;

  const kpis = [
    { label: 'Challenges Passed', value: challengesPassed.toString(), caption: 'Server-verified', icon: 'trophy' as const },
    { label: 'Tasks This Week', value: tasksCompletedThisWeek.toString(), caption: 'Completed', icon: 'checkmark-circle' as const },
    { label: 'Lessons Mastered', value: lessonsCompleted.toString(), caption: 'Across 11 tracks', icon: 'book' as const },
  ];

  const focusMinsFormatted = String(Math.floor(focusTimeLeft / 60)).padStart(2, '0');
  const focusSecsFormatted = String(focusTimeLeft % 60).padStart(2, '0');
  const focusProgressPercent = Math.min(
    100,
    Math.max(0, ((focusMinutes * 60 - focusTimeLeft) / (focusMinutes * 60)) * 100)
  );

  const inProgressCount = activeTasks.filter((t) => t.status === 'IN_PROGRESS').length;

  const workspaces: { title: string; description: string; route: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { title: 'Learning Hub', description: 'Curriculum tracks, role paths & flashcards.', route: '/coding', icon: 'code-slash' },
    { title: 'AI Workspace', description: 'Staff Engineer tutor, review gym & chat.', route: '/ai-assistant', icon: 'sparkles' },
    { title: 'Lecture to Life', description: 'Upload slides & docs to create study materials.', route: '/lecture-to-life', icon: 'school' },
    { title: 'Interview Coach', description: '10+ question sessions & live rubrics.', route: '/interviews', icon: 'chatbubbles' },
    { title: 'Community & GitHub', description: 'Join open projects & contribute PRs.', route: '/community', icon: 'people' },
    { title: 'Portfolio Evidence', description: 'Verified credentials & public share link.', route: '/portfolio', icon: 'briefcase' },
    { title: 'Tasks & Productivity', description: 'Weekly deadlines & focus timer.', route: '/tasks', icon: 'checkbox' },
    { title: 'Settings & Security', description: 'Profile, notifications, theme & account.', route: '/settings', icon: 'settings' },
  ];
  if (user?.role === 'ADMIN') {
    workspaces.push({
      title: 'Analytics',
      description: 'Review platform-wide learning and wellness metrics.',
      route: '/admin',
      icon: 'bar-chart',
    });
  }

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      {/* HOME HEADER */}
      <View style={styles.headerRow}>
        <View
          style={[
            styles.brandLogoWrapper,
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
            source={require('../../../assets/images/synergysphere-brand-icon.png')}
            style={styles.brandLogo}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>

        <View style={styles.headerText}>
          <Text
            allowFontScaling
            style={[styles.headerTitle, { color: colors.text }]}
          >
            SynergySphere{'\n'}<Text style={{ color: primaryAccent }}>Workspace</Text>
          </Text>

          <Text
            allowFontScaling
            numberOfLines={2}
            style={[styles.headerSubtitle, { color: colors.muted }]}
          >
            {getGreeting()}, {user?.firstName ?? 'Developer'}! · {levelTitle || 'Learn. Build. Thrive.'}
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open workspace menu"
            onPress={() => setMenuOpen(true)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.navIconButton,
              {
                backgroundColor: isLight ? 'rgba(237, 243, 239, 0.95)' : colors.surfaceElevated,
                borderColor: isLight ? 'rgba(145, 219, 94, 0.35)' : colors.border,
              },
              pressed && styles.pressedBtn,
            ]}
          >
            <Ionicons name="menu" size={21} color={colors.text} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => router.push('/notifications' as never)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.navIconButton,
              {
                backgroundColor: isLight ? 'rgba(237, 243, 239, 0.95)' : colors.surfaceElevated,
                borderColor: isLight ? 'rgba(145, 219, 94, 0.35)' : colors.border,
              },
              pressed && styles.pressedBtn,
            ]}
          >
            <Ionicons name="notifications-outline" size={19} color={colors.text} />
            {(data?.stats?.unreadNotifications ?? 0) > 0 ? (
              <View style={[styles.unreadDot, { backgroundColor: colors.danger }]} />
            ) : null}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View profile"
            onPress={() => router.push('/profile' as never)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.avatarBtn,
              pressed && styles.pressedBtn,
            ]}
          >
            <View
              style={[
                styles.avatarCircle,
                {
                  backgroundColor: isLight ? '#0B2314' : '#0F3D24',
                  borderColor: isLight ? '#1e6827' : colors.primary,
                },
              ]}
            >
              {user?.profilePicture ? (
                <Image
                  source={{
                    uri: user.profilePicture,
                  }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                  accessibilityLabel={`${user.firstName ?? ''} ${
                    user.lastName ?? ''
                  } profile picture`}
                />
              ) : (
                <Text style={styles.avatarInitials}>
                  {userInitials}
                </Text>
              )}
            </View>
          </Pressable>
        </View>
      </View>

      {error ? <Notice>{error}</Notice> : null}

      {/* Level & Momentum Progress Card */}
      <Card>
        <View style={styles.xpRow}>
          <View>
            <Text style={[styles.xp, { color: primaryAccent }]}>{userXp} XP</Text>
            <Text style={[styles.muted, { color: colors.muted }]}>
              Level {userLevel} · {levelTitle}
            </Text>
          </View>
          <View style={styles.xpTarget}>
            <Text style={[styles.xpNextText, { color: primaryAccent }]}>{xpProgress}% to next level</Text>
          </View>
        </View>
        <View style={[styles.progressBarTrack, { backgroundColor: colors.surfaceElevated }]}>
          <View style={[styles.progressBarFill, { width: `${xpProgress}%`, backgroundColor: primaryAccent }]} />
        </View>
      </Card>

      {/* 3 Real Measured KPIs */}
      <Text style={[styles.section, { color: colors.text }]}>Measured Engineering Activity</Text>
      <View style={styles.kpiGrid}>
        {kpis.map((kpi) => (
          <View
            key={kpi.label}
            style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.kpiHeader}>
              <View style={[styles.kpiIcon, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.15)' }]}>
                <Ionicons name={kpi.icon} size={15} color={primaryAccent} />
              </View>
            </View>
            <Text style={[styles.kpiLabel, { color: colors.muted }]}>{kpi.label}</Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>{kpi.value}</Text>
            <Text style={[styles.kpiCaption, { color: primaryAccent }]}>{kpi.caption}</Text>
          </View>
        ))}
      </View>

      {/* Next Action Queue & Confined Focus Session: Appears dynamically when active tasks exist */}
      {activeTasks.length > 0 ? (
        <>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.section, { color: colors.text }]}>Next Action Queue</Text>
            <View style={[styles.activeCountBadge, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.2)', borderColor: primaryAccent }]}>
              <View style={[styles.pulseDot, { backgroundColor: primaryAccent }]} />
              <Text style={[styles.activeCountText, { color: primaryAccent }]}>
                {inProgressCount > 0 ? `${inProgressCount} in progress` : `${activeTasks.length} active`}
              </Text>
            </View>
          </View>
          <Card>
            {/* Active Tasks List */}
            <View style={{ gap: 8 }}>
              {activeTasks.map((task, idx) => {
                const isInProgress = task.status === 'IN_PROGRESS';
                return (
                  <Pressable
                    key={task.id}
                    onPress={() => router.push('/tasks' as never)}
                    style={({ pressed }) => [
                      styles.activeTaskRow,
                      idx > 0 && [styles.taskDivider, { borderTopColor: colors.border }],
                      pressed && styles.workspacePressed,
                    ]}
                  >
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        void toggleTaskStatus(task);
                      }}
                      hitSlop={8}
                      style={[
                        styles.taskStatusIcon,
                        {
                          backgroundColor: isInProgress
                            ? isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.25)'
                            : isLight ? '#F1F5F9' : colors.surfaceElevated,
                          borderColor: isInProgress ? primaryAccent : colors.border,
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <Ionicons
                        name={isInProgress ? 'play' : task.status === 'REVIEW' ? 'eye-outline' : 'ellipse-outline'}
                        size={14}
                        color={isInProgress ? primaryAccent : colors.muted}
                      />
                    </Pressable>
                    <View style={{ flex: 1, minWidth: 0, paddingRight: 6, gap: 2 }}>
                      <Text style={[styles.activeTaskTitle, { color: colors.text }]}>{task.title}</Text>
                      {task.description ? (
                        <Text numberOfLines={2} style={[styles.activeTaskDesc, { color: colors.muted }]}>
                          {task.description}
                        </Text>
                      ) : null}
                      <View style={styles.taskMetaRow}>
                        <View
                          style={[
                            styles.inProgressBadge,
                            {
                              backgroundColor: isInProgress
                                ? isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.2)'
                                : isLight ? '#F3F4F6' : colors.surfaceElevated,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.inProgressBadgeText,
                              { color: isInProgress ? primaryAccent : colors.muted },
                            ]}
                          >
                            {task.status.replace('_', ' ')}
                          </Text>
                        </View>
                        {task.dueDate ? (
                          <Text style={[styles.taskDueText, { color: colors.muted }]}>
                            Due {new Date(task.dueDate).toLocaleDateString()}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        void toggleTaskStatus(task);
                      }}
                      style={[
                        styles.quickActionChip,
                        {
                          backgroundColor: isInProgress
                            ? primaryAccent
                            : isLight
                            ? '#E8F5E9'
                            : 'rgba(30, 104, 39, 0.2)',
                          borderColor: primaryAccent,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.quickActionChipText,
                          { color: isInProgress ? '#FFFFFF' : primaryAccent },
                        ]}
                      >
                        {isInProgress ? '✓ Done' : '▶ Start'}
                      </Text>
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>

            {/* Confined Mini Focus Session Box */}
            <View style={[styles.miniFocusBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={styles.miniFocusHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="timer-outline" size={15} color={primaryAccent} />
                  <Text style={[styles.miniFocusTitle, { color: colors.text }]}>Focus Sprint</Text>
                </View>
                <Text
                  style={[
                    styles.miniTimerDigits,
                    { color: focusTimerState === 'running' ? primaryAccent : colors.text },
                  ]}
                >
                  {focusMinsFormatted}:{focusSecsFormatted}
                </Text>
              </View>

              {/* Progress bar */}
              <View style={[styles.miniProgressBarTrack, { backgroundColor: colors.surface }]}>
                <View style={[styles.miniProgressBarFill, { width: `${focusProgressPercent}%`, backgroundColor: primaryAccent }]} />
              </View>

              {focusSuccess ? (
                <Text style={[styles.miniFocusSuccessText, { color: primaryAccent }]}>{focusSuccess}</Text>
              ) : null}

              {/* Presets and Timer Action Controls */}
              <View style={styles.miniFocusControlsRow}>
                {/* Preset Chips */}
                <View style={styles.presetGroup}>
                  {[15, 25, 45].map((mins) => (
                    <Pressable
                      key={mins}
                      onPress={() => setPreset(mins)}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor:
                            focusMinutes === mins
                              ? isLight
                                ? '#E8F5E9'
                                : 'rgba(30, 104, 39, 0.25)'
                              : colors.surface,
                          borderColor: focusMinutes === mins ? primaryAccent : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          { color: focusMinutes === mins ? primaryAccent : colors.muted },
                        ]}
                      >
                        {mins}m
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Start / Pause / Reset Buttons */}
                <View style={styles.timerBtnGroup}>
                  {focusTimerState === 'running' ? (
                    <Pressable
                      onPress={pauseFocusTimer}
                      style={[styles.miniActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <Ionicons name="pause" size={14} color={colors.text} />
                      <Text style={[styles.miniActionBtnText, { color: colors.text }]}>Pause</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={startFocusTimer}
                      style={[styles.miniActionBtn, { backgroundColor: primaryAccent }]}
                    >
                      <Ionicons name="play" size={14} color="#FFFFFF" />
                      <Text style={[styles.miniActionBtnText, { color: '#FFFFFF', fontWeight: '800' }]}>
                        {focusTimerState === 'paused' ? 'Resume' : 'Focus'}
                      </Text>
                    </Pressable>
                  )}

                  {(focusTimerState === 'paused' || focusTimerState === 'running') && (
                    <Pressable
                      onPress={resetFocusTimer}
                      style={[styles.miniResetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <Ionicons name="refresh" size={14} color={colors.muted} />
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          </Card>
        </>
      ) : null}

      {/* Workspaces / Navigation */}
      <Text style={[styles.section, { color: colors.text }]}>Platform Workspaces</Text>
      <Card>
        {workspaces.map((workspace, index) => (
          <Pressable
            key={workspace.route}
            accessibilityRole="button"
            accessibilityLabel={`Open ${workspace.title}`}
            onPress={() => router.push(workspace.route as never)}
            style={({ pressed }) => [
              styles.workspace,
              index > 0 && [styles.workspaceDivider, { borderTopColor: colors.border }],
              pressed && styles.workspacePressed,
            ]}
          >
            <View style={[styles.workspaceIcon, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons name={workspace.icon} size={20} color={primaryAccent} />
            </View>
            <View style={styles.workspaceBody}>
              <Text style={[styles.workspaceTitle, { color: colors.text }]}>{workspace.title}</Text>
              <Text style={[styles.workspaceDescription, { color: colors.muted }]}>{workspace.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={19} color={colors.muted} />
          </Pressable>
        ))}
      </Card>

      {/* Community Activity */}
      {communityActivity.length ? (
        <>
          <Text style={[styles.section, { color: colors.text }]}>Community Activity</Text>
          <Card>
            {communityActivity.slice(0, 4).map((event, index) => (
              <View
                key={event.id}
                style={[styles.feedItem, index > 0 && [styles.workspaceDivider, { borderTopColor: colors.border }]]}
              >
                <Text style={[styles.feedTitle, { color: colors.text }]}>
                  {event.actorLogin ? `${event.actorLogin} · ` : ''}
                  {event.title}
                </Text>
                <Text style={[styles.workspaceDescription, { color: colors.muted }]}>{event.summary || event.type}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}
      <WorkspaceMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
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
  brandLogoWrapper: {
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
  brandLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    backgroundColor: 'transparent',
    overflow: 'hidden',
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  navIconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pressedBtn: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  unreadDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  avatarBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 },
  xp: { fontSize: 32, fontWeight: '800' },
  xpTarget: { paddingBottom: 4 },
  xpNextText: { fontSize: 12, fontWeight: '700' },
  progressBarTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  muted: { fontSize: 13 },
  section: { fontSize: 17, fontWeight: '800', marginTop: 14, marginBottom: 2 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 2 },
  activeCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pulseDot: { width: 6, height: 6, borderRadius: 3 },
  activeCountText: { fontSize: 11, fontWeight: '700' },
  activeTaskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8 },
  taskStatusIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  activeTaskTitle: { fontSize: 15, fontWeight: '700' },
  activeTaskDesc: { fontSize: 13, lineHeight: 18 },
  taskMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  inProgressBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexShrink: 0, alignSelf: 'flex-start' },
  inProgressBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  taskDueText: { fontSize: 11 },
  taskDivider: { borderTopWidth: 1 },
  miniFocusBox: { marginTop: 10, borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  miniFocusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  miniFocusTitle: { fontSize: 13, fontWeight: '700' },
  miniTimerDigits: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  miniProgressBarTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  miniProgressBarFill: { height: '100%', borderRadius: 2 },
  miniFocusSuccessText: { fontSize: 12, fontWeight: '700' },
  miniFocusControlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  presetGroup: { flexDirection: 'row', gap: 6 },
  presetChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  presetChipText: { fontSize: 11, fontWeight: '700' },
  timerBtnGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  miniActionBtnText: { fontSize: 12, fontWeight: '700' },
  miniResetBtn: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpiCard: { flexBasis: '48%', flexGrow: 1, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  kpiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kpiIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  kpiLabel: { fontSize: 11, fontWeight: '600' },
  kpiValue: { fontSize: 18, fontWeight: '800' },
  kpiCaption: { fontSize: 10, fontWeight: '600' },
  workspace: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  workspaceDivider: { borderTopWidth: 1 },
  workspacePressed: { opacity: 0.65 },
  workspaceIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  workspaceBody: { flex: 1, gap: 2 },
  workspaceTitle: { fontSize: 15, fontWeight: '700' },
  workspaceDescription: { fontSize: 12, lineHeight: 16 },
  feedItem: { gap: 3, paddingVertical: 10 },
  feedTitle: { fontSize: 14, fontWeight: '800' },
  quickActionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'center',
    flexShrink: 0,
  },
  quickActionChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
