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

const activityDays = [
  { day: 'Mon', value: 35 },
  { day: 'Tue', value: 74 },
  { day: 'Wed', value: 46 },
  { day: 'Thu', value: 88 },
  { day: 'Fri', value: 66 },
  { day: 'Sat', value: 78 },
  { day: 'Sun', value: 58 },
];

const learningTracks = [
  { label: 'SkillUp', value: 80 },
  { label: 'LectureToLife', value: 64 },
  { label: 'Productivity', value: 72 },
  { label: 'Community', value: 75 },
  { label: 'Career', value: 60 },
];

const upcomingTasks = [
  { title: 'Java Challenge', desc: 'Arrays and hashmaps', due: 'Due today', route: '/coding' },
  { title: 'Study Microservices', desc: 'Summarize JDBC notes', due: 'Due tomorrow', route: '/lecture-to-life' },
  { title: 'Community Update', desc: 'EcoSaver dashboard', due: 'Due in 2 days', route: '/community' },
  { title: 'Mock Interview', desc: 'Backend developer', due: 'Due in 3 days', route: '/interviews' },
];

const aiRecommendations = [
  'Continue JDBC module based on your progress.',
  'Practice binary trees to strengthen your SQL/API task pattern.',
  'Review REST APIs before the mock interview.',
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, theme } = useTheme();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [communityActivity, setCommunityActivity] = useState<GithubActivity[]>([]);
  const [error, setError] = useState('');

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

  const stats = data?.stats ?? {
    tasksCompleted: 23,
    challengesPassed: 18,
    wellnessEntries: 9,
    unreadNotifications: 2,
  };

  const kpis = [
    { label: 'XP Earned', value: `${userXp} XP`, caption: '+160 this week', icon: 'flash' as const },
    { label: 'Coding Streak', value: '14 Days', caption: 'Keep it up', icon: 'code-slash' as const },
    { label: 'Tasks Completed', value: stats.tasksCompleted.toString(), caption: 'Well ahead', icon: 'checkmark-circle' as const },
    { label: 'Challenges', value: stats.challengesPassed.toString(), caption: 'Active solutions', icon: 'trophy' as const },
    { label: 'Wellness Score', value: '78%', caption: 'Good balance', icon: 'heart' as const },
    { label: 'Alerts', value: stats.unreadNotifications.toString(), caption: 'Need review', icon: 'notifications' as const },
  ];

  const workspaces: { title: string; description: string; route: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { title: 'Learning Hub', description: 'Interactive programming curriculum & challenges.', route: '/coding', icon: 'code-slash' },
    { title: 'AI Workspace', description: 'Get explanations, reviews, and debugging help.', route: '/ai-assistant', icon: 'sparkles' },
    { title: 'LectureToLife', description: 'Turn lecture notes into study materials.', route: '/lecture-to-life', icon: 'school' },
    { title: 'Community', description: 'Find and apply to impact projects.', route: '/community', icon: 'people' },
    { title: 'Portfolio', description: 'Build your career project showcase.', route: '/portfolio', icon: 'briefcase' },
    { title: 'Mock Interviews', description: 'Practice technical interview questions.', route: '/interviews', icon: 'chatbubbles' },
    { title: 'Leaderboard', description: 'See the SynergySphere rankings.', route: '/leaderboard', icon: 'trophy' },
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
    <Screen>
      {/* Header */}
      <View style={styles.head}>
        <View style={styles.headTop}>
          <Text style={[styles.subBrand, { color: primaryAccent }]}>STUDENT COMMAND CENTER</Text>
          <View style={[styles.levelBadge, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.2)', borderColor: primaryAccent }]}>
            <Ionicons name="sparkles" size={12} color={primaryAccent} />
            <Text style={[styles.levelBadgeText, { color: primaryAccent }]}>
              {levelTitle} · Lvl {userLevel}
            </Text>
          </View>
        </View>
        <Text style={[styles.greeting, { color: colors.text }]}>
          Good day, {user?.firstName ?? 'Learner'}!
        </Text>
        <Text style={[styles.slogan, { color: colors.muted }]}>
          Let's continue your journey of learning and building.
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

      {/* KPI Cards Grid */}
      <Text style={[styles.section, { color: colors.text }]}>Platform KPIs</Text>
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
              <Ionicons name="arrow-up-outline" size={13} color={colors.muted} />
            </View>
            <Text style={[styles.kpiLabel, { color: colors.muted }]}>{kpi.label}</Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>{kpi.value}</Text>
            <Text style={[styles.kpiCaption, { color: primaryAccent }]}>{kpi.caption}</Text>
          </View>
        ))}
      </View>

      {/* Weekly Activity Visualizer */}
      <Text style={[styles.section, { color: colors.text }]}>Weekly Activity</Text>
      <Card>
        <View style={styles.activityContainer}>
          {activityDays.map((item) => (
            <View key={item.day} style={styles.barCol}>
              <View style={[styles.barTrack, { backgroundColor: colors.surfaceElevated }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${item.value}%`,
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

      {/* Learning Progress Tracks */}
      <Text style={[styles.section, { color: colors.text }]}>Learning Tracks Progress</Text>
      <Card>
        <View style={styles.tracksHeader}>
          <Text style={[styles.overallScore, { color: primaryAccent }]}>72%</Text>
          <Text style={[styles.overallLabel, { color: colors.muted }]}>Overall curriculum mastery</Text>
        </View>
        <View style={styles.tracksList}>
          {learningTracks.map((track) => (
            <View key={track.label} style={styles.trackItem}>
              <View style={styles.trackLabels}>
                <Text style={[styles.trackName, { color: colors.text }]}>{track.label}</Text>
                <Text style={[styles.trackPercent, { color: primaryAccent }]}>{track.value}%</Text>
              </View>
              <View style={[styles.trackTrack, { backgroundColor: colors.surfaceElevated }]}>
                <View style={[styles.trackFill, { width: `${track.value}%`, backgroundColor: primaryAccent }]} />
              </View>
            </View>
          ))}
        </View>
      </Card>

      {/* Upcoming Tasks & Milestones */}
      <Text style={[styles.section, { color: colors.text }]}>Upcoming Tasks & Milestones</Text>
      <Card>
        {upcomingTasks.map((task, idx) => (
          <Pressable
            key={task.title}
            onPress={() => router.push(task.route as never)}
            style={({ pressed }) => [
              styles.taskRow,
              idx > 0 && [styles.taskDivider, { borderTopColor: colors.border }],
              pressed && styles.workspacePressed,
            ]}
          >
            <View style={styles.taskBody}>
              <Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text>
              <Text style={[styles.taskDesc, { color: colors.muted }]}>{task.desc}</Text>
            </View>
            <View style={[styles.dueBadge, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.15)' }]}>
              <Text style={[styles.dueText, { color: primaryAccent }]}>{task.due}</Text>
            </View>
          </Pressable>
        ))}
      </Card>

      {/* AI Recommendations */}
      <Text style={[styles.section, { color: colors.text }]}>AI Recommendations</Text>
      <Card>
        {aiRecommendations.map((rec, idx) => (
          <View
            key={idx}
            style={[
              styles.recRow,
              idx > 0 && [styles.taskDivider, { borderTopColor: colors.border }],
            ]}
          >
            <Ionicons name="bulb-outline" size={18} color={primaryAccent} style={styles.recIcon} />
            <Text style={[styles.recText, { color: colors.text }]}>{rec}</Text>
          </View>
        ))}
      </Card>

      {/* Workspaces / Navigation */}
      <Text style={[styles.section, { color: colors.text }]}>Your Workspaces</Text>
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
  headTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subBrand: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  levelBadgeText: { fontSize: 11, fontWeight: '700' },
  greeting: { fontSize: 24, fontWeight: '800', marginTop: 2 },
  slogan: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
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
});
