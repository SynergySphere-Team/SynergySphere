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
      <View style={styles.head}>
        <Text style={[styles.brand, { color: primaryAccent }]}>SynergySphere</Text>
        <Text style={[styles.slogan, { color: colors.muted }]}>Learn. Build. Thrive.</Text>
        <Text style={[styles.greeting, { color: colors.text }]}>
          Hello, {user?.firstName}
          {data?.levelTitle ? ` · ${data.levelTitle}` : ''}
        </Text>
      </View>
      {error ? <Notice>{error}</Notice> : null}
      <Card>
        <Text style={[styles.xp, { color: primaryAccent }]}>{data?.user?.xp ?? user?.xp ?? 0} XP</Text>
        <Text style={[styles.muted, { color: colors.muted }]}>
          Level {data?.user?.level ?? user?.level ?? 1} · Your learning momentum
        </Text>
      </Card>
      <Text style={[styles.section, { color: colors.text }]}>Your progress</Text>
      <View style={styles.grid}>
        <Stat label="Tasks done" value={data?.stats.tasksCompleted ?? 0} />
        <Stat label="Challenges" value={data?.stats.challengesPassed ?? 0} />
        <Stat label="Wellness logs" value={data?.stats.wellnessEntries ?? 0} />
        <Stat label="Unread" value={data?.stats.unreadNotifications ?? 0} />
      </View>
      <Text style={[styles.section, { color: colors.text }]}>Your work</Text>
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
      {communityActivity.length ? <>
        <Text style={[styles.section, { color: colors.text }]}>Community activity</Text>
        <Card>
          {communityActivity.slice(0, 4).map((event, index) => (
            <View key={event.id} style={[styles.feedItem, index > 0 && [styles.workspaceDivider, { borderTopColor: colors.border }]]}>
              <Text style={[styles.feedTitle, { color: colors.text }]}>{event.actorLogin ? `${event.actorLogin} · ` : ''}{event.title}</Text>
              <Text style={[styles.workspaceDescription, { color: colors.muted }]}>{event.summary || event.type}</Text>
            </View>
          ))}
        </Card>
      </> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { marginTop: 6, gap: 4 },
  brand: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  slogan: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  greeting: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  xp: { fontSize: 32, fontWeight: '800' },
  muted: { fontSize: 14 },
  section: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  workspace: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  workspaceDivider: { borderTopWidth: 1 },
  workspacePressed: { opacity: 0.65 },
  workspaceIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  workspaceBody: { flex: 1, gap: 3 },
  workspaceTitle: { fontSize: 16, fontWeight: '800' },
  workspaceDescription: { fontSize: 13, lineHeight: 18 },
  feedItem: { gap: 3, paddingVertical: 10 },
  feedTitle: { fontSize: 14, fontWeight: '800' },
});
