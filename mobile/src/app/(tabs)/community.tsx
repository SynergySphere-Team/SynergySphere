import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Button, Card, Heading } from '@/components/ui';
import { api } from '@/services/api';
import { github } from '@/services/github';
import { useTheme } from '@/context/ThemeContext';
import type { GithubConnection, Project } from '@/types/api';
import { CommunityChat } from '@/components/community/CommunityChat';

const CATEGORIES = [
  'ALL',
  'Open Source',
  'Eco Tourism',
  'Green Infrastructure',
  'Sustainability',
  'Recycling',
  'Other',
] as const;

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Java: '#b07219',
  Kotlin: '#A97BFF',
  Swift: '#F05138',
  Go: '#00ADD8',
  Rust: '#dea584',
  C: '#555555',
  'C++': '#f34b7d',
  HTML: '#e34c26',
  CSS: '#563d7c',
};

function relativeDate(value?: string | null) {
  if (!value) return 'recently';
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 1440)}d ago`;
}

export default function CommunityScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const isLight = theme === 'light';
  const primaryAccent = isLight ? '#1e6827' : colors.primary;

  const [activeTab, setActiveTab] = useState<'chat' | 'repositories'>('chat');
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [connection, setConnection] = useState<GithubConnection | null>(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async (queryText = '', cat = selectedCategory) => {
    try {
      setError('');
      const params = new URLSearchParams();
      if (queryText.trim()) params.append('search', queryText.trim());
      if (cat && cat !== 'ALL') params.append('category', cat);
      const queryStr = params.toString() ? `?${params.toString()}` : '';

      const [list, githubState] = await Promise.all([
        api.get<Project[]>(`/projects${queryStr}`),
        github.connection(),
      ]);
      setProjects(list);
      setConnection(githubState);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load Community.');
    } finally {
      setLoaded(true);
    }
  }, [selectedCategory]);

  useFocusEffect(
    useCallback(() => {
      void load(search, selectedCategory);
    }, [load, search, selectedCategory])
  );

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    void load(search, category);
  };

  const handleSearchSubmit = () => {
    void load(search, selectedCategory);
  };

  const handleClearSearch = () => {
    setSearch('');
    void load('', selectedCategory);
  };

  if (!loaded) return <Loading />;

  return (
    <Screen>
      {/* Header */}
      <View style={styles.headerRow}>
        <Image
          source={require('../../../assets/images/community-logo.png')}
          style={styles.communityLogo}
          resizeMode="contain"
        />
        <View style={styles.headerText}>
          <Heading subtitle="Chat with peers, ask questions, and collaborate on software initiatives.">
            Community
          </Heading>
        </View>
      </View>

      {/* Tab Switcher */}
      <View
        style={[
          styles.tabSwitcher,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Switch to Community Chat"
          onPress={() => setActiveTab('chat')}
          style={[
            styles.tabButton,
            activeTab === 'chat' && [
              styles.tabButtonActive,
              { backgroundColor: primaryAccent },
            ],
          ]}
        >
          <Ionicons
            name="chatbubbles"
            size={16}
            color={activeTab === 'chat' ? (isLight ? '#FFFFFF' : '#07180d') : colors.muted}
          />
          <Text
            style={[
              styles.tabButtonText,
              {
                color: activeTab === 'chat' ? (isLight ? '#FFFFFF' : '#07180d') : colors.text,
                fontWeight: activeTab === 'chat' ? '800' : '600',
              },
            ]}
          >
            Community Chat
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Switch to Repositories"
          onPress={() => setActiveTab('repositories')}
          style={[
            styles.tabButton,
            activeTab === 'repositories' && [
              styles.tabButtonActive,
              { backgroundColor: primaryAccent },
            ],
          ]}
        >
          <Ionicons
            name="logo-github"
            size={16}
            color={activeTab === 'repositories' ? (isLight ? '#FFFFFF' : '#07180d') : colors.muted}
          />
          <Text
            style={[
              styles.tabButtonText,
              {
                color: activeTab === 'repositories' ? (isLight ? '#FFFFFF' : '#07180d') : colors.text,
                fontWeight: activeTab === 'repositories' ? '800' : '600',
              },
            ]}
          >
            Repositories
          </Text>
        </Pressable>
      </View>

      {activeTab === 'chat' ? (
        <CommunityChat />
      ) : (
        <>
          {error ? <Notice>{error}</Notice> : null}

          {/* GitHub Connection & Quick Actions Bar (Commit 7e991db setup, My Work moved to Tasks) */}
          <View style={[styles.connectionCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <View style={styles.connectionHeader}>
              {connection?.connected ? (
                <View style={styles.connectedUserRow}>
                  {connection.avatarUrl ? (
                    <Image source={{ uri: connection.avatarUrl }} style={styles.connectedAvatar} />
                  ) : (
                    <View style={[styles.connectedAvatar, styles.avatarPlaceholder, { backgroundColor: colors.primaryDark }]}>
                      <Ionicons name="logo-github" size={16} color={colors.primary} />
                    </View>
                  )}
                  <View>
                    <View style={styles.statusBadgeRow}>
                      <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
                      <Text style={[styles.connectedStatusText, { color: colors.primary }]}>Connected to GitHub</Text>
                    </View>
                    <Text style={[styles.connectedUsername, { color: colors.text }]}>@{connection.username}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.unconnectedRow}>
                  <View style={[styles.githubIconBadge, { backgroundColor: isDark ? '#161b22' : '#f0f3f6' }]}>
                    <Ionicons name="logo-github" size={24} color={colors.text} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.connectionTitle, { color: colors.text }]}>Collaborate with GitHub</Text>
                    <Text style={[styles.connectionSub, { color: colors.muted }]}>
                      Link your account to create and join live repositories.
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.connectionActions}>
              {connection?.connected ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.actionChip,
                    { backgroundColor: colors.primary, borderColor: colors.primary },
                    pressed && styles.pressed,
                  ]}
                  onPress={() => router.push('/project-wizard' as never)}
                >
                  <Ionicons name="add-circle-outline" size={16} color={colors.primaryText} />
                  <Text style={[styles.actionChipText, { color: colors.primaryText, fontWeight: '700' }]}>
                    New Project
                  </Text>
                </Pressable>
              ) : (
                <>
                  <Pressable
                    style={({ pressed }) => [
                      styles.actionChip,
                      { backgroundColor: colors.primary, borderColor: colors.primary },
                      pressed && styles.pressed,
                    ]}
                    onPress={() => router.push('/github-connect?returnTo=/community' as never)}
                  >
                    <Ionicons name="logo-github" size={16} color={colors.primaryText} />
                    <Text style={[styles.actionChipText, { color: colors.primaryText, fontWeight: '700' }]}>
                      Connect GitHub
                    </Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.actionChip,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      pressed && styles.pressed,
                    ]}
                    onPress={() => router.push('/github-connect?returnTo=/project-wizard' as never)}
                  >
                    <Ionicons name="add-circle-outline" size={16} color={colors.text} />
                    <Text style={[styles.actionChipText, { color: colors.text }]}>New Project</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>

          {/* Search Input Bar */}
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.muted} style={styles.searchIcon} />
            <TextInput
              placeholder="Search repositories, tags, topics..."
              placeholderTextColor={colors.placeholderText}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearchSubmit}
              style={[styles.searchInput, { color: colors.text }]}
              returnKeyType="search"
            />
            {search ? (
              <Pressable onPress={handleClearSearch} style={styles.clearBtn} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>

          {/* Category Pills Strip */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => handleCategorySelect(cat)}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      { color: isSelected ? colors.primaryText : colors.text, fontWeight: isSelected ? '700' : '500' },
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Repository Cards */}
          {projects.map((item) => {
            const repoFullName = item.githubFullName || `${item.githubOwner || item.organization}/${item.githubRepo || item.title}`;
            const isPrivate = item.githubVisibility === 'PRIVATE' || item.visibility === 'PRIVATE';
            const lang = item.primaryLanguage || 'Code';
            const langColor = LANGUAGE_COLORS[lang] || colors.primary;

            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.projectCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && styles.cardPressed,
                ]}
                onPress={() => router.push(`/project-detail?id=${item.id}` as never)}
              >
                {/* Header: Avatar, Name, Visibility, XP */}
                <View style={styles.cardHeader}>
                  <View style={styles.ownerRow}>
                    {item.githubOwnerAvatar ? (
                      <Image source={{ uri: item.githubOwnerAvatar }} style={styles.repoOwnerAvatar} />
                    ) : (
                      <View style={[styles.repoOwnerAvatar, styles.avatarPlaceholder, { backgroundColor: colors.surfaceElevated }]}>
                        <Ionicons name="folder-outline" size={16} color={colors.primary} />
                      </View>
                    )}
                    <View style={styles.titleColumn}>
                      <Text style={[styles.repoFullName, { color: colors.text }]} numberOfLines={1}>
                        {repoFullName}
                      </Text>
                      <Text style={[styles.categoryTag, { color: colors.primary }]}>{item.category}</Text>
                    </View>
                  </View>

                  <View style={styles.headerBadges}>
                    <View
                      style={[
                        styles.visibilityBadge,
                        {
                          borderColor: isPrivate ? colors.border : '#2ea44f40',
                          backgroundColor: isPrivate ? colors.surfaceElevated : '#2ea44f15',
                        },
                      ]}
                    >
                      <Ionicons
                        name={isPrivate ? 'lock-closed-outline' : 'globe-outline'}
                        size={11}
                        color={isPrivate ? colors.muted : '#2ea44f'}
                      />
                      <Text style={[styles.visibilityText, { color: isPrivate ? colors.muted : '#2ea44f' }]}>
                        {isPrivate ? 'Private' : 'Public'}
                      </Text>
                    </View>

                    <View style={[styles.xpBadge, { backgroundColor: isDark ? '#1b4722' : '#e8f5e9' }]}>
                      <Text style={[styles.xpBadgeText, { color: colors.primary }]}>
                        +{item.xpReward || 150} XP
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Description */}
                <Text style={[styles.description, { color: colors.muted }]} numberOfLines={2}>
                  {item.description || 'Community repository on SynergySphere.'}
                </Text>

                {/* Metrics: Language, Stars, Forks, Requests */}
                <View style={styles.metricsRow}>
                  <View style={styles.metricItem}>
                    <View style={[styles.langDot, { backgroundColor: langColor }]} />
                    <Text style={[styles.metricText, { color: colors.text }]}>{lang}</Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Ionicons name="star-outline" size={13} color={colors.muted} />
                    <Text style={[styles.metricText, { color: colors.muted }]}>{item.githubStars || 0}</Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Ionicons name="git-network-outline" size={13} color={colors.muted} />
                    <Text style={[styles.metricText, { color: colors.muted }]}>{item.githubForks || 0}</Text>
                  </View>

                  {item._count?.applications ? (
                    <View style={styles.metricItem}>
                      <Ionicons name="people-outline" size={13} color={colors.muted} />
                      <Text style={[styles.metricText, { color: colors.muted }]}>
                        {item._count.applications} request{item._count.applications === 1 ? '' : 's'}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Contributors Avatars Row */}
                {item.contributorAvatars && item.contributorAvatars.length > 0 && (
                  <View style={styles.contributorsRow}>
                    <View style={styles.avatarStack}>
                      {item.contributorAvatars.slice(0, 5).map((avatar, idx) => (
                        <Image
                          key={`${avatar}-${idx}`}
                          source={{ uri: avatar }}
                          style={[
                            styles.contributorAvatar,
                            { marginLeft: idx === 0 ? 0 : -8, borderColor: colors.surface },
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.contributorCount, { color: colors.muted }]}>
                      {item.contributorAvatars.length} contributor{item.contributorAvatars.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                )}

                {/* Recent Activity Ticker */}
                {item.lastActivityMessage ? (
                  <View style={[styles.activityTicker, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                    <Ionicons name="git-commit-outline" size={14} color={colors.primary} />
                    <Text style={[styles.activityText, { color: colors.muted }]} numberOfLines={1}>
                      {item.lastActivityActor ? `${item.lastActivityActor}: ` : ''}
                      {item.lastActivityMessage}
                    </Text>
                    <Text style={[styles.activityTime, { color: colors.muted }]}>
                      · {relativeDate(item.lastActivityAt)}
                    </Text>
                  </View>
                ) : null}

                {/* View Repo Action link */}
                <View style={styles.cardFooter}>
                  <Text style={[styles.viewRepoText, { color: colors.primary }]}>View repository details</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </View>
              </Pressable>
            );
          })}

          {projects.length === 0 ? (
            <Card>
              <View style={styles.emptyContainer}>
                <Ionicons name="file-tray-outline" size={36} color={colors.muted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No matching projects found</Text>
                <Text style={[styles.emptySub, { color: colors.muted }]}>
                  Try adjusting your search query or switching to another category.
                </Text>
                <Button title="Clear filters" secondary onPress={() => { setSearch(''); setSelectedCategory('ALL'); }} />
              </View>
            </Card>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 8,
  },
  communityLogo: {
    width: 54,
    height: 54,
  },
  headerText: {
    flex: 1,
  },
  tabSwitcher: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 6,
    marginBottom: 10,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 13,
  },
  connectionCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectedUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  connectedAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  connectedStatusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  connectedUsername: {
    fontSize: 15,
    fontWeight: '800',
  },
  unconnectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  githubIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  connectionSub: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  connectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryPill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 12,
  },
  projectCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  ownerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  repoOwnerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  titleColumn: {
    flex: 1,
  },
  repoFullName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  categoryTag: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  visibilityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  xpBadge: {
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 8,
  },
  xpBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 2,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  langDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '600',
  },
  contributorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contributorAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  contributorCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  activityTicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  activityText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
  },
  activityTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingTop: 4,
  },
  viewRepoText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  pressed: {
    opacity: 0.8,
  },
});