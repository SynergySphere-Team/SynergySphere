import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { Button, Card } from '@/components/ui';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { github } from '@/services/github';
import type { GithubConnection, Project } from '@/types/api';

const CATEGORIES = [
  'ALL',
  'Open Source',
  'Green Software',
  'Civic Tech',
  'EdTech',
  'Sustainability',
  'Recycling',
  'Eco Tourism',
  'Green Infrastructure',
  'Developer Tools',
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
  Shell: '#89e051',
  Ruby: '#701516',
};

function relativeDate(value?: string | null) {
  if (!value) return 'recently';
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 1440)}d ago`;
}

function formatCategoryLabel(category?: string | null) {
  if (!category) return 'Other';
  return category
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
function statusLabel(status?: string | null) {
  switch (String(status ?? '').toUpperCase()) {
    case 'APPROVED':
      return 'Approved';
    case 'DECLINED':
      return 'Declined';
    case 'INVITATION_SENT':
      return 'GitHub invitation sent';
    case 'ACCEPTED':
      return 'Joined';
    case 'COMPLETED':
      return 'Completed';
    case 'PENDING':
      return 'Pending';
    default:
      return status || 'Submitted';
  }
}
export function CommunityGithub() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, theme } = useTheme();
  const { fontSize, largerText } = useAccessibility();
  const isDark = theme === 'dark';
  const accentColor = theme === 'light' ? '#1e6827' : colors.primary;

  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [connection, setConnection] = useState<GithubConnection | null>(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const myApplications = useMemo(
  () =>
    projects.filter(
      (project) =>
        !project.isCreator &&
        project.hasApplied,
    ),
  [projects],
);

const [showAllApplications, setShowAllApplications] = useState(false);

  const visibleApplications = useMemo(
    () => showAllApplications ? myApplications : myApplications.slice(0, 3),
    [myApplications, showAllApplications],
  );

  const opportunities = useMemo(
  () => projects,
  [projects],
);
const [showAllOpportunities, setShowAllOpportunities] = useState(false);

const visibleOpportunities = useMemo(
  () => showAllOpportunities
    ? opportunities
    : opportunities.slice(0, 3),
  [opportunities, showAllOpportunities],
);

  const load = useCallback(async (queryText = '', cat = selectedCategory) => {
    try {
      setError('');
      const params = new URLSearchParams();
      if (queryText.trim()) params.append('search', queryText.trim());
      if (cat && cat !== 'ALL') {
        params.append('category', cat.toUpperCase().replace(/\s+/g, '_'));
      }
      const queryStr = params.toString() ? `?${params.toString()}` : '';

      const [list, githubState] = await Promise.all([
        api.get<Project[]>(`/projects${queryStr}`).catch((e) => {
          console.warn('Could not load projects:', e);
          return [] as Project[];
        }),
        github.connection().catch(() => ({ connected: false, username: null, avatarUrl: null })),
      ]);

      let filteredList = Array.isArray(list) ? list : [];
      if (cat && cat !== 'ALL') {
        const normCat = cat.toLowerCase().replace(/[\s_]+/g, '');
        filteredList = filteredList.filter((p) => {
          const pCat = String(p.category || '').toLowerCase().replace(/[\s_]+/g, '');
          return pCat === normCat || pCat.includes(normCat);
        });
      }

      setProjects(filteredList);
      setConnection(githubState);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load GitHub community repositories.');
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

  if (!loaded) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ActivityIndicator color={accentColor} size="large" />
        <Text style={[styles.loadingText, { color: colors.muted, fontSize: fontSize(13) }]}>
          Loading GitHub repositories & collaboration...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.surface, borderColor: '#B3261E' }]}>
          <Ionicons name="alert-circle-outline" size={18} color="#B3261E" />
          <Text style={[styles.errorText, { color: colors.text, fontSize: fontSize(13) }]}>{error}</Text>
          <Pressable onPress={() => setError('')} hitSlop={8}>
            <Ionicons name="close" size={18} color={colors.muted} />
          </Pressable>
        </View>
      ) : null}

      {/* GitHub Connection & Quick Actions Bar */}
      <View
        style={[
          styles.connectionCard,
          largerText && styles.connectionCardLarge,
          { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
        ]}
      >
        <View style={styles.connectionHeader}>
          {connection?.connected ? (
            <View style={styles.connectedUserRow}>
              {connection.avatarUrl ? (
                <Image source={{ uri: connection.avatarUrl }} style={styles.connectedAvatar} />
              ) : (
                <View
                  style={[
                    styles.connectedAvatar,
                    styles.avatarPlaceholder,
                    { backgroundColor: theme === 'light' ? '#e2e8f0' : colors.primaryDark },
                  ]}
                >
                  <Ionicons name="logo-github" size={18} color={accentColor} />
                </View>
              )}
              <View style={styles.connectedUserInfo}>
                <View style={styles.statusBadgeRow}>
                  <View style={[styles.statusDot, { backgroundColor: '#22c55e' }]} />
                  <Text style={[styles.connectedStatusText, { color: '#22c55e', fontSize: fontSize(11) }]}>
                    Connected to GitHub
                  </Text>
                </View>
                <Text style={[styles.connectedUsername, { color: colors.text, fontSize: fontSize(15) }]}>
                  @{connection.username}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.unconnectedRow}>
              <View style={[styles.githubIconBadge, { backgroundColor: isDark ? '#161b22' : '#eef2f6' }]}>
                <Ionicons name="logo-github" size={24} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.connectionTitle, { color: colors.text, fontSize: fontSize(15) }]}>
                  Collaborate with GitHub
                </Text>
                <Text
                  style={[
                    styles.connectionSub,
                    { color: colors.muted, fontSize: fontSize(12), lineHeight: fontSize(16) },
                  ]}
                >
                  Link your account to create and join live repositories.
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.connectionActions}>
          {!connection?.connected ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Connect GitHub account"
              style={({ pressed }) => [
                styles.actionChip,
                largerText && styles.actionChipLarge,
                { backgroundColor: accentColor, borderColor: accentColor },
                pressed && styles.pressed,
              ]}
              onPress={() => router.push('/github-connect?returnTo=/community?tab=initiatives' as never)}
            >
              <Ionicons name="logo-github" size={largerText ? 18 : 16} color={theme === 'light' ? '#FFFFFF' : '#07180d'} />
              <Text
                style={[
                  styles.actionChipText,
                  { color: theme === 'light' ? '#FFFFFF' : '#07180d', fontWeight: '800', fontSize: fontSize(13) },
                ]}
              >
                Connect GitHub
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create new repository project"
            style={({ pressed }) => [
              styles.actionChip,
              largerText && styles.actionChipLarge,
              {
                backgroundColor:
                  user?.role === 'ADMIN'
                    ? (theme === 'light' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.18)')
                    : connection?.connected
                    ? accentColor
                    : colors.surface,
                borderColor:
                  user?.role === 'ADMIN'
                    ? (theme === 'light' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.45)')
                    : connection?.connected
                    ? accentColor
                    : colors.border,
              },
              pressed && styles.pressed,
            ]}
            onPress={() => {
              if (user?.role === 'ADMIN') {
                Alert.alert(
                  'Project Creation Restricted',
                  'Admin accounts cannot create community repository projects. Project initiatives are reserved for student contributors and organizations.',
                  [{ text: 'OK' }]
                );
                return;
              }
              router.push('/project-wizard' as never);
            }}
          >
            <Ionicons
              name={user?.role === 'ADMIN' ? 'ban-outline' : 'add-circle-outline'}
              size={largerText ? 18 : 16}
              color={
                user?.role === 'ADMIN'
                  ? (theme === 'light' ? '#dc2626' : '#f87171')
                  : connection?.connected
                  ? (theme === 'light' ? '#FFFFFF' : '#07180d')
                  : colors.text
              }
            />
            <Text
              style={[
                styles.actionChipText,
                {
                  color:
                    user?.role === 'ADMIN'
                      ? (theme === 'light' ? '#dc2626' : '#f87171')
                      : connection?.connected
                      ? (theme === 'light' ? '#FFFFFF' : '#07180d')
                      : colors.text,
                  fontWeight: '800',
                  fontSize: fontSize(13),
                },
              ]}
            >
              {user?.role === 'ADMIN' ? 'New Project (Restricted)' : 'New Project'}
            </Text>
          </Pressable>
        </View>
      </View>
      {/* My Applications */}
      {myApplications.length > 0 && (
        <View style={styles.applicationsSection}>
          <View style={styles.applicationsHeader}>
            <View>
              <Text
                style={[
                  styles.applicationsHeading,
                  {
                    color: colors.text,
                    fontSize: fontSize(18),
                  },
                ]}
              >
                My Applications
              </Text>

              <Text
                style={[
                  styles.applicationsSubheading,
                  {
                    color: colors.muted,
                    fontSize: fontSize(12),
                  },
                ]}
              >
                Track projects you've applied to join.
              </Text>
            </View>

            <View
              style={[
                styles.applicationCountBadge,
                { backgroundColor: colors.surfaceElevated },
              ]}
            >
              <Text
                style={[
                  styles.applicationCountText,
                  {
                    color: accentColor,
                    fontSize: fontSize(11),
                  },
                ]}
              >
                {myApplications.length}
              </Text>
            </View>
          </View>

          {visibleApplications.map((project) => (
            <Pressable
              key={project.id}
              accessibilityRole="button"
              accessibilityLabel={`Open application for ${project.title}`}
              onPress={() =>
              router.push({
                pathname: '/community/[id]',
                params: { id: project.id },
              } as never)
            }
              style={({ pressed }) => [
                styles.applicationCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.applicationInfo}>
                <Text
                  style={[
                    styles.applicationTitle,
                    {
                      color: colors.text,
                      fontSize: fontSize(14),
                    },
                  ]}
                >
                  {project.title}
                </Text>

                <Text
                  style={[
                    styles.applicationMeta,
                    {
                      color: colors.muted,
                      fontSize: fontSize(11),
                    },
                  ]}
                >
                  {project.organization || 'Community'}
                </Text>
              </View>

              <View
                style={[
                  styles.applicationStatusBadge,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.applicationStatusText,
                    {
                      color: accentColor,
                      fontSize: fontSize(10),
                    },
                  ]}
                >
                  {statusLabel(project.applicationStatus)}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={17}
                color={colors.muted}
              />
            </Pressable>
          ))}
          {myApplications.length > 3 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showAllApplications ? 'Show fewer applications' : 'Show all applications'}
              onPress={() => setShowAllApplications((previous) => !previous)}
              style={({ pressed }) => [
                styles.showAllButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={{ color: accentColor, fontSize: fontSize(14), fontWeight: '700' }}>
                {showAllApplications ? 'Show Less' : `Show All Results (${myApplications.length})`}
              </Text>
              <Ionicons
                name={showAllApplications ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={accentColor}
              />
            </Pressable>
          )}
        </View>
      )}
      {/* Integrated Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
        <Ionicons name="search" size={18} color={colors.placeholderText} style={styles.searchIcon} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search repositories, topics or owners..."
          placeholderTextColor={colors.placeholderText}
          style={[styles.searchInput, { color: colors.text, fontSize: fontSize(13) }]}
          returnKeyType="search"
          onSubmitEditing={handleSearchSubmit}
        />
        {search.length > 0 && (
          <Pressable onPress={handleClearSearch} hitSlop={8} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>

      {/* Category Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <Pressable
              key={cat}
              onPress={() => handleCategorySelect(cat)}
              style={({ pressed }) => [
                styles.categoryPill,
                {
                  backgroundColor: isSelected ? accentColor : colors.surfaceElevated,
                  borderColor: isSelected ? accentColor : colors.border,
                },
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  {
                    color: isSelected
                      ? (theme === 'light' ? '#FFFFFF' : '#07180d')
                      : colors.muted,
                    fontWeight: isSelected ? '800' : '600',
                    fontSize: fontSize(12),
                  },
                ]}
              >
                {cat}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Featured Opportunities */}
      <View style={styles.opportunitiesHeader}>
        <View>
          <Text
            style={[
              styles.opportunitiesHeading,
              {
                color: colors.text,
                fontSize: fontSize(18),
              },
            ]}
          >
            Featured Opportunities
          </Text>

          <Text
            style={[
              styles.opportunitiesSubheading,
              {
                color: colors.muted,
                fontSize: fontSize(12),
              },
            ]}
          >
            Discover projects looking for collaborators.
          </Text>
        </View>

        <Text
          style={[
            styles.opportunitiesCount,
            {
              color: colors.muted,
              fontSize: fontSize(11),
            },
          ]}
        >
          {opportunities.length}{' '}
          {opportunities.length === 1 ? 'result' : 'results'}
        </Text>
      </View>

      {visibleOpportunities.map((item) => {
        const langColor =
          LANGUAGE_COLORS[item.primaryLanguage || ''] || '#7f929a';
        const isPrivate = item.githubVisibility === 'private';

        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`Open repository ${item.githubFullName || item.title}`}
            onPress={() =>
              router.push({
                pathname: '/community/[id]',
                params: { id: item.id },
              } as never)
            }
            style={({ pressed }) => [
              styles.projectCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              pressed && styles.cardPressed,
            ]}
          >
            {/* Card Header: Owner Avatar & Title */}
            <View style={styles.cardHeader}>
              <View style={styles.ownerRow}>
                {item.contributorAvatars?.[0] ? (
                  <Image source={{ uri: item.contributorAvatars[0] }} style={styles.repoOwnerAvatar} />
                ) : (
                  <View
                    style={[
                      styles.repoOwnerAvatar,
                      styles.avatarPlaceholder,
                      { backgroundColor: colors.surfaceElevated },
                    ]}
                  >
                    <Ionicons name="git-branch" size={14} color={accentColor} />
                  </View>
                )}
                <View style={styles.titleColumn}>
                  <Text
                    style={[styles.repoFullName, { color: colors.text, fontSize: fontSize(15) }]}
                    numberOfLines={1}
                  >
                    {item.githubFullName || item.title}
                  </Text>
                  <Text
                    style={[styles.categoryTag, { color: colors.muted, fontSize: fontSize(11) }]}
                  >
                    {formatCategoryLabel(item.category)}
                  </Text>
                </View>
              </View>

              <View style={styles.headerBadges}>
                <View
                  style={[
                    styles.visibilityBadge,
                    {
                      backgroundColor: isPrivate
                        ? (isDark ? 'rgba(247, 198, 90, 0.15)' : '#FFF8E1')
                        : (isDark ? 'rgba(145, 219, 94, 0.15)' : '#E8F5E9'),
                      borderColor: isPrivate ? (isDark ? '#eab308' : '#b45309') : accentColor,
                    },
                  ]}
                >
                  <Ionicons
                    name={isPrivate ? 'lock-closed-outline' : 'globe-outline'}
                    size={11}
                    color={isPrivate ? (isDark ? '#eab308' : '#b45309') : accentColor}
                  />
                  <Text
                    style={[
                      styles.visibilityText,
                      {
                        color: isPrivate
                          ? (isDark ? '#eab308' : '#b45309')
                          : (isDark ? colors.primary : '#1e6827'),
                        fontSize: fontSize(10),
                      },
                    ]}
                  >
                    {isPrivate ? 'Private' : 'Public'}
                  </Text>
                </View>

                {item.xpReward ? (
                  <View
                    style={[
                      styles.xpBadge,
                      { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#E8F5E9' },
                    ]}
                  >
                    <Text style={[styles.xpBadgeText, { color: accentColor, fontSize: fontSize(10) }]}>
                      +{item.xpReward} XP
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Description */}
            {item.description ? (
              <Text
                style={[
                  styles.description,
                  { color: colors.muted, fontSize: fontSize(13), lineHeight: fontSize(18) },
                ]}
                numberOfLines={2}
              >
                {item.description}
              </Text>
            ) : null}

            {/* Repository Metrics Row */}
            <View style={styles.metricsRow}>
              {item.primaryLanguage ? (
                <View style={styles.metricItem}>
                  <View style={[styles.langDot, { backgroundColor: langColor }]} />
                  <Text style={[styles.metricText, { color: colors.muted, fontSize: fontSize(12) }]}>
                    {item.primaryLanguage}
                  </Text>
                </View>
              ) : null}

              <View style={styles.metricItem}>
                <Ionicons name="star-outline" size={13} color={colors.muted} />
                <Text style={[styles.metricText, { color: colors.muted, fontSize: fontSize(12) }]}>
                  {item.githubStars || 0}
                </Text>
              </View>

              <View style={styles.metricItem}>
                <Ionicons name="git-branch-outline" size={13} color={colors.muted} />
                <Text style={[styles.metricText, { color: colors.muted, fontSize: fontSize(12) }]}>
                  {item.githubForks || 0}
                </Text>
              </View>

              {item._count?.applications ? (
                <View style={styles.metricItem}>
                  <Ionicons name="people-outline" size={13} color={colors.muted} />
                  <Text style={[styles.metricText, { color: colors.muted, fontSize: fontSize(12) }]}>
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
                <Text style={[styles.contributorCount, { color: colors.muted, fontSize: fontSize(11) }]}>
                  {item.contributorAvatars.length} contributor{item.contributorAvatars.length === 1 ? '' : 's'}
                </Text>
              </View>
            )}

            {/* Recent Activity Ticker */}
            {item.lastActivityMessage ? (
              <View
                style={[
                  styles.activityTicker,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                ]}
              >
                <Ionicons name="git-commit-outline" size={14} color={accentColor} />
                <Text
                  style={[styles.activityText, { color: colors.muted, fontSize: fontSize(11) }]}
                  numberOfLines={1}
                >
                  {item.lastActivityActor ? `${item.lastActivityActor}: ` : ''}
                  {item.lastActivityMessage}
                </Text>
                <Text style={[styles.activityTime, { color: colors.muted, fontSize: fontSize(11) }]}>
                  · {relativeDate(item.lastActivityAt)}
                </Text>
              </View>
            ) : null}

            {/* View Repo Action link */}
            <View style={styles.cardFooter}>
              <Text style={[styles.viewRepoText, { color: accentColor, fontSize: fontSize(12) }]}>
                View opportunity details
              </Text>
              <Ionicons name="chevron-forward" size={14} color={accentColor} />
            </View>
                    </Pressable>
        );
      })}

      {/* Show All / Show Less Opportunities */}
      {opportunities.length > 3 && (
        <Pressable
          onPress={() => setShowAllOpportunities((previous) => !previous)}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.showAllButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text
            style={{
              color: accentColor,
              fontSize: fontSize(14),
              fontWeight: '600',
              marginRight: 8,
            }}
          >
            {showAllOpportunities
              ? 'Show Less'
              : `Show All Results (${opportunities.length})`}
          </Text>

          <Ionicons
            name={showAllOpportunities ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={accentColor}
          />
        </Pressable>
      )}

      {projects.length === 0 ? (
        <Card>
          <View style={styles.emptyContainer}>
            <Ionicons name="file-tray-outline" size={36} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.text, fontSize: fontSize(16) }]}>
              No matching repositories found
            </Text>
            <Text
              style={[
                styles.emptySub,
                { color: colors.muted, fontSize: fontSize(13), lineHeight: fontSize(18) },
              ]}
            >
              Try adjusting your search query or switching to another category.
            </Text>
            <Button
              title="Clear filters"
              secondary
              onPress={() => {
                setSearch('');
                setSelectedCategory('ALL');
              }}
            />
          </View>
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  loadingContainer: {
    padding: 32,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  applicationsSection: {
  gap: 10,
  marginTop: 4,
  marginBottom: 4,
},

applicationsHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
},

applicationsHeading: {
  fontSize: 18,
  fontWeight: '800',
},

applicationsSubheading: {
  fontSize: 12,
  marginTop: 2,
},

applicationCountBadge: {
  minWidth: 28,
  height: 28,
  paddingHorizontal: 8,
  borderRadius: 14,
  alignItems: 'center',
  justifyContent: 'center',
},

applicationCountText: {
  fontSize: 11,
  fontWeight: '800',
},

applicationCard: {
  minHeight: 64,
  borderWidth: 1,
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 12,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
},

applicationInfo: {
  flex: 1,
  gap: 3,
},

applicationTitle: {
  fontSize: 14,
  fontWeight: '700',
},

applicationMeta: {
  fontSize: 11,
},

applicationStatusBadge: {
  borderWidth: 1,
  borderRadius: 999,
  paddingHorizontal: 9,
  paddingVertical: 5,
},

applicationStatusText: {
  fontSize: 10,
  fontWeight: '800',
},
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  connectionCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
  },
  connectionCardLarge: {
    padding: 16,
    gap: 14,
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
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectedUserInfo: {
    gap: 2,
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
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionChipLarge: {
    minHeight: 48,
    paddingVertical: 11,
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
    fontSize: 13,
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
  opportunitiesHeader: {
  flexDirection: 'row',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: 12,
  marginTop: 6,
  marginBottom: 2,
},

  opportunitiesHeading: {
    fontSize: 18,
    fontWeight: '800',
  },

  opportunitiesSubheading: {
    fontSize: 12,
    marginTop: 2,
  },

  opportunitiesCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  showAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
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
    fontSize: 15,
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
