import { useCallback, useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Card, Heading, Stat } from '@/components/ui';
import { api } from '@/services/api';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import type { DashboardStats } from '@/types/api';

export default function HomeScreen() {
  const router = useRouter(); const { user } = useAuth(); const [data, setData] = useState<DashboardStats | null>(null); const [error, setError] = useState('');
  const load = useCallback(async () => { try { setError(''); setData(await api.get<DashboardStats>('/dashboard/stats')); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load dashboard.'); } }, []);
  useEffect(() => { load(); }, [load]);
  if (!data && !error) return <Loading />;
  const workspaces: { title: string; description: string; route: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { title: 'Learning Hub', description: 'Solve coding challenges and earn XP.', route: '/coding', icon: 'code-slash' },
    { title: 'AI Workspace', description: 'Get explanations, reviews, and debugging help.', route: '/ai-assistant', icon: 'sparkles' },
    { title: 'LectureToLife', description: 'Turn lecture notes into study materials.', route: '/lecture-to-life', icon: 'school' },
    { title: 'Community', description: 'Find and apply to impact projects.', route: '/community', icon: 'people' },
    { title: 'Portfolio', description: 'Build your career project showcase.', route: '/portfolio', icon: 'briefcase' },
    { title: 'Mock Interviews', description: 'Practice technical interview questions.', route: '/interviews', icon: 'chatbubbles' },
    { title: 'Leaderboard', description: 'See the SynergySphere rankings.', route: '/leaderboard', icon: 'trophy' },
  ];
  if (user?.role === 'ADMIN') workspaces.push({ title: 'Analytics', description: 'Review platform-wide learning and wellness metrics.', route: '/admin', icon: 'bar-chart' });
  return <Screen><View style={styles.head}><Text style={styles.brand}>SynergySphere</Text><Text style={styles.slogan}>Learn. Build. Thrive.{data?.levelTitle ? ` · ${data.levelTitle}` : ''}</Text><Text style={styles.greeting}>Hello, {user?.firstName}</Text></View>{error ? <Notice>{error}</Notice> : null}<Card><Text style={styles.xp}>{data?.user?.xp ?? user?.xp ?? 0} XP</Text><Text style={styles.muted}>Level {data?.user?.level ?? user?.level ?? 1} · Your learning momentum</Text></Card><Text style={styles.section}>Your progress</Text><View style={styles.grid}><Stat label="Tasks done" value={data?.stats.tasksCompleted ?? 0} /><Stat label="Challenges" value={data?.stats.challengesPassed ?? 0} /><Stat label="Wellness logs" value={data?.stats.wellnessEntries ?? 0} /><Stat label="Unread" value={data?.stats.unreadNotifications ?? 0} /></View><Text style={styles.section}>Your work</Text><Card>{workspaces.map((workspace, index) => <Pressable key={workspace.route} accessibilityRole="button" accessibilityLabel={`Open ${workspace.title}`} onPress={() => router.push(workspace.route as never)} style={({ pressed }) => [styles.workspace, index > 0 && styles.workspaceDivider, pressed && styles.workspacePressed]}><View style={styles.workspaceIcon}><Ionicons name={workspace.icon} size={20} color={colors.primary} /></View><View style={styles.workspaceBody}><Text style={styles.workspaceTitle}>{workspace.title}</Text><Text style={styles.workspaceDescription}>{workspace.description}</Text></View><Ionicons name="chevron-forward" size={19} color={colors.muted} /></Pressable>)}</Card></Screen>;
}
const styles = StyleSheet.create({ head: { marginTop: 6, gap: 4 }, brand: { color: colors.primary, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 }, slogan: { color: colors.muted, fontSize: 18, fontWeight: '600', lineHeight: 24 }, greeting: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 4 }, xp: { color: colors.primary, fontSize: 32, fontWeight: '800' }, muted: { color: colors.muted, fontSize: 14 }, section: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 4 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, workspace: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }, workspaceDivider: { borderTopWidth: 1, borderTopColor: colors.border }, workspacePressed: { opacity: 0.65 }, workspaceIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryDark }, workspaceBody: { flex: 1, gap: 3 }, workspaceTitle: { color: colors.text, fontSize: 16, fontWeight: '800' }, workspaceDescription: { color: colors.muted, fontSize: 13, lineHeight: 18 } });
