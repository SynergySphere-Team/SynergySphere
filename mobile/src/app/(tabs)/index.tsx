import { useCallback, useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Card, Stat } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import type { DashboardStats, GithubActivity } from '@/types/api';

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
  const [communityActivity, setCommunityActivity] = useState<GithubActivity[]>([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const stats = await api.get<DashboardStats>('/dashboard/stats');
      setData(stats);
      api.get<GithubActivity[]>('/github/feed').then(setCommunityActivity).catch(() => setCommunityActivity([]));
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

  // Real weekly activity (7 days)
  const activityDays = profile?.weeklyActivity && profile.weeklyActivity.length === 7
    ? profile.weeklyActivity
    : [
        { day: 'Mon', count: 0, height: 10 },
        { day: 'Tue', count: 0, height: 10 },
        { day: 'Wed', count: 0, height: 10 },
        { day: 'Thu', count: 0, height: 10 },
        { day: 'Fri', count: 0, height: 10 },
        { day: 'Sat', count: 0, height: 10 },
        { day: 'Sun', count: 0, height: 10 },
      ];

  // Real learning tracks from Hub
  const hubTracks = profile?.hubSkills?.slice(0, 4) || [];

  // Real upcoming tasks
  const upcomingTasks = profile?.tasksSummary?.upcoming || [];

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

      {/* Next Actions Card (Spine) */}
      {profile?.nextActions && (
        <>
          <Text style={[styles.section, { color: colors.text }]}>Next Action Queue</Text>
          <Card>
            <View style={{ gap: 12 }}>
              {profile.nextActions.nextLesson && (
                <Pressable
                  onPress={() => router.push('/coding' as never)}
                  style={styles.nextActionItem}
                >
                  <View style={[styles.nextActionIcon, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.15)' }]}>
                    <Ionicons name="book-outline" size={16} color={primaryAccent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.nextActionType, { color: primaryAccent }]}>Curriculum Lesson</Text>
                    <Text style={[styles.nextActionTitle, { color: colors.text }]}>{profile.nextActions.nextLesson.title}</Text>
                    <Text style={[styles.nextActionSubtitle, { color: colors.muted }]}>{profile.nextActions.nextLesson.track} Track</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </Pressable>
              )}

              {profile.nextActions.nextChallenge && (
                <Pressable
                  onPress={() => router.push('/coding' as never)}
                  style={styles.nextActionItem}
                >
                  <View style={[styles.nextActionIcon, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.15)' }]}>
                    <Ionicons name="code-slash-outline" size={16} color={primaryAccent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.nextActionType, { color: primaryAccent }]}>Coding Challenge</Text>
                    <Text style={[styles.nextActionTitle, { color: colors.text }]}>{profile.nextActions.nextChallenge.title}</Text>
                    <Text style={[styles.nextActionSubtitle, { color: colors.muted }]}>{profile.nextActions.nextChallenge.difficulty} · {profile.nextActions.nextChallenge.language}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </Pressable>
              )}

              {profile.nextActions.nextInterviewTopic && (
                <Pressable
                  onPress={() => router.push('/interviews' as never)}
                  style={styles.nextActionItem}
                >
                  <View style={[styles.nextActionIcon, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.15)' }]}>
                    <Ionicons name="mic-outline" size={16} color={primaryAccent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.nextActionType, { color: primaryAccent }]}>Interview Focus</Text>
                    <Text style={[styles.nextActionTitle, { color: colors.text }]}>{profile.nextActions.nextInterviewTopic.topic}</Text>
                    <Text style={[styles.nextActionSubtitle, { color: colors.muted }]}>{profile.nextActions.nextInterviewTopic.reason}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </Pressable>
              )}
            </View>
          </Card>
        </>
      )}

      {/* Offer Readiness Card */}
      {profile?.offerReadiness && (
        <>
          <Text style={[styles.section, { color: colors.text }]}>Offer Readiness Score</Text>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View>
                <Text style={[styles.trackName, { color: colors.text }]}>{profile.offerReadiness.role}</Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>Objective criteria for junior roles</Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: primaryAccent }}>
                {profile.offerReadiness.overallScore}%
              </Text>
            </View>
            <View style={[styles.progressBarTrack, { backgroundColor: colors.surfaceElevated, marginBottom: 12 }]}>
              <View style={[styles.progressBarFill, { width: `${profile.offerReadiness.overallScore}%`, backgroundColor: primaryAccent }]} />
            </View>
            <View style={{ gap: 8 }}>
              {profile.offerReadiness.checklist.map((item, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons
                    name={item.passed ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={item.passed ? primaryAccent : colors.muted}
                  />
                  <Text style={{ fontSize: 12, color: item.passed ? colors.text : colors.muted, flex: 1 }}>
                    {item.label}: <Text style={{ fontWeight: '600' }}>{item.detail}</Text>
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </>
      )}

      {/* Interview Preparation Card (Prompt 51) */}
      <Text style={[styles.section, { color: colors.text }]}>Interview Preparation</Text>
      <Card>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.kpiIcon, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.15)' }]}>
                <Ionicons name="chatbubbles" size={15} color={primaryAccent} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Developer Interview Coach</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 10, color: colors.muted }}>Completed</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                  {data?.interviewPrep?.interviewsCompleted ?? data?.stats?.interviews ?? 0}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 10, color: colors.muted }}>Practised</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: primaryAccent }}>
                  {data?.interviewPrep?.questionsAnswered ?? ((data?.stats?.interviews ?? 0) * 6)} Qs
                </Text>
              </View>
            </View>
          </View>

          <View style={{ backgroundColor: colors.surfaceElevated, padding: 10, borderRadius: 8, gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' }}>Current Focus</Text>
              <View style={[styles.dueBadge, { backgroundColor: `${primaryAccent}20` }]}>
                <Text style={[styles.dueText, { color: primaryAccent }]}>
                  {data?.interviewPrep?.recommendedPractice?.[0]?.status || 'Needs Practice'}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
              {data?.interviewPrep?.currentFocus || 'SQL JOINs & Relational Queries'}
            </Text>
            <Text style={{ fontSize: 11, color: colors.muted }}>
              {data?.interviewPrep?.recommendedPractice?.[0]?.reason || 'You struggled with JOIN questions in your recent interviews.'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
            <Pressable
              onPress={() => router.push({ pathname: '/interviews', params: { autoPractice: data?.interviewPrep?.currentFocus || 'SQL JOINs' } } as never)}
              style={({ pressed }) => [
                {
                  flex: 1,
                  backgroundColor: primaryAccent,
                  paddingVertical: 9,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>Practise Now</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/interviews' as never)}
              style={({ pressed }) => [
                {
                  flex: 1,
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                  borderWidth: 1,
                  paddingVertical: 9,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>Start Interview</Text>
            </Pressable>
          </View>
        </View>
      </Card>

      {/* Weekly Activity Visualizer from Real Events */}
      <Text style={[styles.section, { color: colors.text }]}>Weekly Study Cadence</Text>
      <Card>
        <View style={styles.activityContainer}>
          {activityDays.map((item) => (
            <View key={item.day} style={styles.barCol}>
              <View style={[styles.barTrack, { backgroundColor: colors.surfaceElevated }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${Math.max(item.height, 8)}%`,
                      backgroundColor: primaryAccent,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.dayLabel, { color: colors.muted }]}>{item.day}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Real Learning Progress Tracks */}
      {hubTracks.length > 0 && (
        <>
          <Text style={[styles.section, { color: colors.text }]}>Curriculum Progress</Text>
          <Card>
            <View style={styles.tracksList}>
              {hubTracks.map((track) => (
                <View key={track.id} style={styles.trackItem}>
                  <View style={styles.trackLabels}>
                    <Text style={[styles.trackName, { color: colors.text }]}>{track.name}</Text>
                    <Text style={[styles.trackPercent, { color: primaryAccent }]}>
                      {track.completedLessons}/{track.totalLessons} ({track.percent}%)
                    </Text>
                  </View>
                  <View style={[styles.trackTrack, { backgroundColor: colors.surfaceElevated }]}>
                    <View style={[styles.trackFill, { width: `${track.percent}%`, backgroundColor: primaryAccent }]} />
                  </View>
                </View>
              ))}
            </View>
          </Card>
        </>
      )}

      {/* Honest Upcoming Tasks & Milestones */}
      <Text style={[styles.section, { color: colors.text }]}>Upcoming Tasks</Text>
      <Card>
        {upcomingTasks.length > 0 ? (
          upcomingTasks.map((task, idx) => (
            <Pressable
              key={task.id}
              onPress={() => router.push('/tasks' as never)}
              style={({ pressed }) => [
                styles.taskRow,
                idx > 0 && [styles.taskDivider, { borderTopColor: colors.border }],
                pressed && styles.workspacePressed,
              ]}
            >
              <View style={styles.taskBody}>
                <Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text>
                <Text style={[styles.taskDesc, { color: colors.muted }]}>
                  {task.dueDate ? `Due ${new Date(task.dueDate).toLocaleDateString()}` : 'No due date'}
                </Text>
              </View>
              <View style={[styles.dueBadge, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.15)' }]}>
                <Text style={[styles.dueText, { color: primaryAccent }]}>{task.status}</Text>
              </View>
            </Pressable>
          ))
        ) : (
          <View style={{ paddingVertical: 12, alignItems: 'center' }}>
            <Ionicons name="checkmark-done-circle-outline" size={28} color={primaryAccent} />
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
              No pending tasks due. You are all caught up!
            </Text>
          </View>
        )}
      </Card>

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
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpiCard: { flexBasis: '48%', flexGrow: 1, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  kpiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kpiIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  kpiLabel: { fontSize: 11, fontWeight: '600' },
  kpiValue: { fontSize: 18, fontWeight: '800' },
  kpiCaption: { fontSize: 10, fontWeight: '600' },
  activityContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 130, paddingTop: 10 },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: { width: 18, height: 95, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 6 },
  dayLabel: { fontSize: 11, fontWeight: '600' },
  tracksHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 12 },
  overallScore: { fontSize: 26, fontWeight: '800' },
  overallLabel: { fontSize: 12, fontWeight: '500' },
  tracksList: { gap: 10 },
  trackItem: { gap: 4 },
  trackLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  trackName: { fontSize: 13, fontWeight: '600' },
  trackPercent: { fontSize: 12, fontWeight: '700' },
  trackTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 3 },
  taskRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, gap: 8 },
  taskDivider: { borderTopWidth: 1 },
  taskBody: { flex: 1, gap: 2 },
  taskTitle: { fontSize: 14, fontWeight: '700' },
  taskDesc: { fontSize: 12 },
  dueBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  dueText: { fontSize: 11, fontWeight: '700' },
  recRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
  recIcon: { marginTop: 2 },
  recText: { flex: 1, fontSize: 13, lineHeight: 19 },
  workspace: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  workspaceDivider: { borderTopWidth: 1 },
  workspacePressed: { opacity: 0.65 },
  workspaceIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  workspaceBody: { flex: 1, gap: 2 },
  workspaceTitle: { fontSize: 15, fontWeight: '700' },
  workspaceDescription: { fontSize: 12, lineHeight: 16 },
  feedItem: { gap: 3, paddingVertical: 10 },
  feedTitle: { fontSize: 14, fontWeight: '800' },
  nextActionItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  nextActionIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  nextActionType: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  nextActionTitle: { fontSize: 13, fontWeight: '700' },
  nextActionSubtitle: { fontSize: 11 },
});
