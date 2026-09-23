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

  const load = useCallback(async () => {
    try {
      setLeaders(await api.get<Leader[]>('/leaderboard'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load leaderboard.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!loaded) return <Loading />;

  const isLight = theme === 'light';
  const accentColor = isLight ? '#1e6827' : colors.primary;

  return (
    <Screen>
      <View style={styles.headerWrap}>
        <Text style={[styles.kicker, { color: colors.primary }]}>COMMUNITY RANKINGS</Text>
        <Heading subtitle="Top learners, builders, and contributors across SynergySphere.">
          Leaderboard
        </Heading>
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
  headerWrap: {
    marginBottom: 4,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
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
