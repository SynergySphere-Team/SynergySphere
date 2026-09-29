import { useCallback, useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Card, Stat } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
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

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, theme } = useTheme();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [communityActivity, setCommunityActivity] = useState<GithubActivity[]>([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const [stats, taskList, feed] = await Promise.all([
        api.get<DashboardStats>('/dashboard/stats'),
        api.get<Task[]>('/tasks').catch(() => []),
        api.get<GithubActivity[]>('/github/feed').catch(() => []),
      ]);
      setData(stats);
      setActiveTasks(taskList.filter((t) => t.status === 'IN_PROGRESS'));
      setCommunityActivity(feed);
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

  if (!data && !error) return <Loading />;

  const isLight = theme === 'light';
  const primaryAccent = isLight ? '#1e6827' : colors.primary;
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

  const workspaces: { title: string; description: string; route: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { title: 'Learning Hub', description: 'Curriculum tracks, role paths & flashcards.', route: '/coding', icon: 'code-slash' },
    { title: 'AI Workspace', description: 'Staff Engineer tutor, review gym & chat.', route: '/ai-assistant', icon: 'sparkles' },
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
      {/* Header */}
      <View style={styles.head}>
        <Text style={[styles.brand, { color: primaryAccent }]}>SynergySphere</Text>
        <Text style={[styles.slogan, { color: colors.muted }]}>
          Learn. Build. Thrive.{levelTitle ? ` · ${levelTitle}` : ''}
        </Text>
        <Text style={[styles.greeting, { color: colors.text }]}>
          {getGreeting()}, {user?.firstName ?? 'Developer'}!
        </Text>
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

      {/* Next Action Queue: Appears ONLY when tasks are currently in progress */}
      {activeTasks.length > 0 ? (
        <>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.section, { color: colors.text }]}>Next Action Queue</Text>
            <View style={[styles.activeCountBadge, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.2)', borderColor: primaryAccent }]}>
              <View style={[styles.pulseDot, { backgroundColor: primaryAccent }]} />
              <Text style={[styles.activeCountText, { color: primaryAccent }]}>
                {activeTasks.length} in progress
              </Text>
            </View>
          </View>
          <Card>
            <View style={{ gap: 10 }}>
              {activeTasks.map((task, idx) => (
                <Pressable
                  key={task.id}
                  onPress={() => router.push('/tasks' as never)}
                  style={({ pressed }) => [
                    styles.activeTaskRow,
                    idx > 0 && [styles.taskDivider, { borderTopColor: colors.border }],
                    pressed && styles.workspacePressed,
                  ]}
                >
                  <View style={[styles.taskStatusIcon, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.15)' }]}>
                    <Ionicons name="play" size={14} color={primaryAccent} />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[styles.activeTaskTitle, { color: colors.text }]}>{task.title}</Text>
                    {task.description ? (
                      <Text numberOfLines={2} style={[styles.activeTaskDesc, { color: colors.muted }]}>
                        {task.description}
                      </Text>
                    ) : null}
                    <View style={styles.taskMetaRow}>
                      <View style={[styles.inProgressBadge, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.15)' }]}>
                        <Text style={[styles.inProgressBadgeText, { color: primaryAccent }]}>IN PROGRESS</Text>
                      </View>
                      {task.dueDate ? (
                        <Text style={[styles.taskDueText, { color: colors.muted }]}>
                          Due {new Date(task.dueDate).toLocaleDateString()}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </Pressable>
              ))}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { marginTop: 6, gap: 4 },
  brand: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  slogan: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  greeting: { fontSize: 15, fontWeight: '700', marginTop: 4 },
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
  inProgressBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  inProgressBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  taskDueText: { fontSize: 11 },
  taskDivider: { borderTopWidth: 1 },
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
});
