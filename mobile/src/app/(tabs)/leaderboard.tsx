import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Card, Heading } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import type { Leader } from '@/types/api';

const LEVEL_TITLES = [
  'Junior Developer',
  'Developer',
  'Advanced Developer',
  'Software Engineer',
  'Tech Leader',
];

function getLevelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(Math.max(level - 1, 0), LEVEL_TITLES.length - 1)];
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen() {
  const { colors, theme } = useTheme();
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setLeaders(await api.get<Leader[]>('/leaderboard'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load leaderboard.');
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
  const accentColor = isLight ? '#1e6827' : colors.primary;

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      <View style={styles.headerRow}>
        <View
          style={[
            styles.leaderboardLogoWrapper,
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
          <Ionicons name="trophy" size={26} color={accentColor} />
        </View>

        <View style={styles.headerText}>
          <Text
            allowFontScaling
            style={[styles.headerTitle, { color: colors.text }]}
          >
            Community{'\n'}Leaderboard
          </Text>

          <Text
            allowFontScaling
            numberOfLines={2}
            style={[
              styles.headerSubtitle,
              { color: colors.muted },
            ]}
          >
            Top learners, builders, and contributors across SynergySphere.
          </Text>
        </View>
      </View>

      {error ? <Notice>{error}</Notice> : null}

      <View style={{ gap: 12, marginTop: 8 }}>
        {leaders.map((leader, index) => {
          const isPodium = index < 3;
          return (
            <Card key={leader.id}>
              <View style={styles.cardRow}>
                {/* Medal or Rank */}
                <View style={styles.rankContainer}>
                  {isPodium ? (
                    <Text style={styles.medalEmoji}>{MEDALS[index]}</Text>
                  ) : (
                    <Text style={[styles.rankNumber, { color: colors.muted }]}>#{index + 1}</Text>
                  )}
                </View>

                {/* Avatar Initials */}
                <View
                  style={[
                    styles.avatarCircle,
                    {
                      backgroundColor: isPodium ? `${colors.primary}25` : colors.surfaceElevated,
                      borderColor: isPodium ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.avatarText,
                      { color: isPodium ? colors.primary : colors.text },
                    ]}
                  >
                    {leader.firstName?.[0] ?? 'U'}{leader.lastName?.[0] ?? 'D'}
                  </Text>
                </View>

                {/* User Info */}
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: colors.text }]}>
                    {leader.firstName} {leader.lastName}
                  </Text>
                  <Text style={[styles.levelTitle, { color: colors.muted }]}>
                    Level {leader.level} · {getLevelTitle(leader.level)}
                  </Text>
                </View>

                {/* Score & Badges */}
                <View style={styles.scoreBlock}>
                  <Text style={[styles.xpText, { color: accentColor }]}>{leader.xp} XP</Text>
                  <View style={styles.statsMiniRow}>
                    <View style={styles.miniStat}>
                      <Ionicons name="trophy-outline" size={12} color={colors.muted} />
                      <Text style={[styles.miniStatText, { color: colors.muted }]}>
                        {leader._count?.challengeAttempts ?? 0}
                      </Text>
                    </View>
                    <View style={styles.miniStat}>
                      <Ionicons name="ribbon-outline" size={12} color={colors.muted} />
                      <Text style={[styles.miniStatText, { color: colors.muted }]}>
                        {leader._count?.userBadges ?? 0}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </Card>
          );
        })}
      </View>
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
  leaderboardLogoWrapper: {
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
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalEmoji: {
    fontSize: 22,
  },
  rankNumber: {
    fontSize: 15,
    fontWeight: '800',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
  },
  levelTitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  scoreBlock: {
    alignItems: 'flex-end',
    gap: 3,
  },
  xpText: {
    fontSize: 15,
    fontWeight: '800',
  },
  statsMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  miniStatText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
