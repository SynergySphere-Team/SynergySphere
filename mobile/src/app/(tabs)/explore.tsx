import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Card } from '@/components/ui';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import type { Challenge, DashboardStats, Project } from '@/types/api';

export default function ExploreScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { fontSize, largerText } = useAccessibility();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [statsData, setStatsData] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [challengeData, projectData, dashStats] = await Promise.all([
        api.get<Challenge[]>('/challenges').catch(() => []),
        api.get<Project[]>('/projects').catch(() => []),
        api.get<DashboardStats>('/dashboard/stats').catch(() => null),
      ]);
      setChallenges(challengeData);
      setProjects(projectData);
      setStatsData(dashStats);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load explore content.');
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

  if (!loaded) return <Loading />;

  const isLight = theme === 'light';
  const primaryAccent = isLight ? '#1e6827' : colors.primary;
  const tagColor = isLight ? '#1e6827' : colors.primary;

  const profile = statsData?.developerProfile;

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

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      {/* EXPLORE HEADER */}
      <View
        style={[
          styles.headerRow,
          largerText && styles.headerRowLarge,
        ]}
      >
        <View
          style={[
            styles.exploreLogoWrapper,
            largerText && styles.exploreLogoWrapperLarge,
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
            source={require('../../../assets/images/explore-logo.png')}
            style={[
              styles.exploreLogo,
              largerText && styles.exploreLogoLarge,
            ]}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>

        <View style={styles.headerText}>
          <Text
            allowFontScaling
            style={[
              styles.headerTitle,
              {
                color: colors.text,
                fontSize: fontSize(24),
              },
            ]}
          >
            Explore
          </Text>

          <Text
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
            Explore your career readiness, study tracks, challenges, and upcoming work.
          </Text>
        </View>
      </View>

      {error ? <Notice>{error}</Notice> : null}

      {/* Offer Readiness Score */}
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

      {/* Interview Preparation Card */}
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
                  {statsData?.interviewPrep?.interviewsCompleted ?? statsData?.stats?.interviews ?? 0}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 10, color: colors.muted }}>Practised</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: primaryAccent }}>
                  {statsData?.interviewPrep?.questionsAnswered ?? ((statsData?.stats?.interviews ?? 0) * 6)} Qs
                </Text>
              </View>
            </View>
          </View>

          <View style={{ backgroundColor: colors.surfaceElevated, padding: 10, borderRadius: 8, gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', flex: 1, minWidth: 0, paddingRight: 4 }}>Current Focus</Text>
              <View style={[styles.dueBadge, { backgroundColor: `${primaryAccent}20` }]}>
                <Text style={[styles.dueText, { color: primaryAccent }]}>
                  {statsData?.interviewPrep?.recommendedPractice?.[0]?.status || 'Needs Practice'}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
              {statsData?.interviewPrep?.currentFocus || 'SQL JOINs & Relational Queries'}
            </Text>
            <Text style={{ fontSize: 11, color: colors.muted }}>
              {statsData?.interviewPrep?.recommendedPractice?.[0]?.reason || 'You struggled with JOIN questions in your recent interviews.'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
            <Pressable
              onPress={() => router.push({ pathname: '/interviews', params: { autoPractice: statsData?.interviewPrep?.currentFocus || 'SQL JOINs' } } as never)}
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

      {/* Weekly Study Cadence */}
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

      {/* Curriculum Progress */}
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

      {/* Upcoming Tasks */}
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

      {/* Coding Challenges */}
      <Text style={[styles.section, { color: colors.text }]}>Coding Challenges</Text>
      {challenges.slice(0, 4).map((item) => (
        <Card key={item.id}>
          <Pressable onPress={() => router.push('/coding' as never)}>
            <Text style={[styles.tag, { color: tagColor }]}>{item.difficulty} · {item.xpReward} XP</Text>
            <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.copy, { color: colors.muted }]}>{item.description}</Text>
          </Pressable>
        </Card>
      ))}

      {/* Community Impact */}
      <Text style={[styles.section, { color: colors.text }]}>Community Impact Projects</Text>
      {projects.slice(0, 4).map((item) => (
        <Card key={item.id}>
          <Pressable onPress={() => router.push('/community' as never)}>
            <Text style={[styles.tag, { color: tagColor }]}>{item.category} · {item.xpReward} XP</Text>
            <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.copy, { color: colors.muted }]}>{item.organization}{item.location ? ` · ${item.location}` : ''}</Text>
          </Pressable>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 17, fontWeight: '800', marginTop: 14, marginBottom: 2 },
  tag: { fontSize: 11, fontWeight: '800' },
  title: { fontSize: 16, fontWeight: '700', marginVertical: 2 },
  copy: { fontSize: 13, lineHeight: 19 },
  kpiIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  progressBarTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  dueBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, flexShrink: 0, alignSelf: 'flex-start' },
  dueText: { fontSize: 11, fontWeight: '700' },
  activityContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 130, paddingTop: 10 },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: { width: 18, height: 95, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 6 },
  dayLabel: { fontSize: 11, fontWeight: '600' },
  tracksList: { gap: 10 },
  trackItem: { gap: 4 },
  trackLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  trackName: { fontSize: 13, fontWeight: '600', flex: 1, minWidth: 0, paddingRight: 4 },
  trackPercent: { fontSize: 12, fontWeight: '700', flexShrink: 0, alignSelf: 'center' },
  trackTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 3 },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 10, gap: 8 },
  taskDivider: { borderTopWidth: 1 },
  taskBody: { flex: 1, minWidth: 0, paddingRight: 4, gap: 2 },
  taskTitle: { fontSize: 14, fontWeight: '700' },
  taskDesc: { fontSize: 12 },
  workspacePressed: { opacity: 0.65 },
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
  exploreLogoWrapper: {
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
  exploreLogoWrapperLarge: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  exploreLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  exploreLogoLarge: {
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
});
