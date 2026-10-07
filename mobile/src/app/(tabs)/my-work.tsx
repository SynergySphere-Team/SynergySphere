import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading, Notice, BackButton } from '@/components/Screen';
import { Button, Heading } from '@/components/ui';
import { api } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';

type TabType = 'all' | 'issues' | 'prs' | 'repos' | 'starred' | 'orgs';

type Work = {
  issues: any[];
  pullRequests: { items?: any[] } | any[];
  repositories: any[];
  starred: any[];
  organizations: any[];
};

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

export function MyWorkView({
  showBackButton = true,
  wrapInScreen = true,
}: {
  showBackButton?: boolean;
  wrapInScreen?: boolean;
}) {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';

  const [data, setData] = useState<Work | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const res = await api.get<Work>('/github/my-work');
      setData(res);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load GitHub work.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const issues = useMemo(() => data?.issues || [], [data]);
  const pullRequests = useMemo(() => {
    if (!data?.pullRequests) return [];
    return Array.isArray(data.pullRequests)
      ? data.pullRequests
      : data.pullRequests.items || [];
  }, [data]);
  const repositories = useMemo(() => data?.repositories || [], [data]);
  const starred = useMemo(() => data?.starred || [], [data]);
  const organizations = useMemo(() => data?.organizations || [], [data]);

  const isNotConnected =
    error.toLowerCase().includes('connect github') ||
    error.toLowerCase().includes('not connected') ||
    error.toLowerCase().includes('github_not_connected');

  // Search filter
  const query = search.trim().toLowerCase();

  const filteredIssues = useMemo(() => {
    if (!query) return issues;
    return issues.filter(
      (item) =>
        item.title?.toLowerCase().includes(query) ||
        item.repository?.full_name?.toLowerCase().includes(query) ||
        item.body?.toLowerCase().includes(query),
    );
  }, [issues, query]);

  const filteredPRs = useMemo(() => {
    if (!query) return pullRequests;
    return pullRequests.filter(
      (item: any) =>
        item.title?.toLowerCase().includes(query) ||
        item.repository_url?.toLowerCase().includes(query) ||
        item.user?.login?.toLowerCase().includes(query),
    );
  }, [pullRequests, query]);

  const filteredRepos = useMemo(() => {
    if (!query) return repositories;
    return repositories.filter(
      (item) =>
        item.name?.toLowerCase().includes(query) ||
        item.full_name?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.language?.toLowerCase().includes(query),
    );
  }, [repositories, query]);

  const filteredStarred = useMemo(() => {
    if (!query) return starred;
    return starred.filter(
      (item) =>
        item.name?.toLowerCase().includes(query) ||
        item.full_name?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.language?.toLowerCase().includes(query),
    );
  }, [starred, query]);

  const filteredOrgs = useMemo(() => {
    if (!query) return organizations;
    return organizations.filter(
      (item) =>
        item.login?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query),
    );
  }, [organizations, query]);

  if (loading && !data && !error) return <Loading />;

  const tabs: { id: TabType; label: string; count: number; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'all', label: 'Overview', count: issues.length + pullRequests.length + repositories.length, icon: 'layers-outline' },
    { id: 'issues', label: 'Issues', count: issues.length, icon: 'alert-circle-outline' },
    { id: 'prs', label: 'Pull Requests', count: pullRequests.length, icon: 'git-pull-request-outline' },
    { id: 'repos', label: 'Repositories', count: repositories.length, icon: 'git-branch-outline' },
    { id: 'starred', label: 'Starred', count: starred.length, icon: 'star-outline' },
    { id: 'orgs', label: 'Organizations', count: organizations.length, icon: 'business-outline' },
  ];

  const content = (
    <>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Heading
            subtitle="Your assigned tasks, active PRs, and synced repositories."
            rightAction={
              <Pressable
                style={[styles.refreshIconButton, { backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }]}
                onPress={load}
                accessibilityLabel="Refresh GitHub data"
              >
                <Ionicons name="reload" size={18} color={colors.primary} />
              </Pressable>
            }
          >
            My Work
          </Heading>
        </View>
      </View>

      {/* Disconnected state banner */}
      {isNotConnected ? (
        <View style={[styles.connectBanner, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
          <View style={styles.connectIconContainer}>
            <Ionicons name="logo-github" size={36} color={colors.text} />
          </View>
          <Text style={[styles.connectTitle, { color: colors.text }]}>Connect Your GitHub Account</Text>
          <Text style={[styles.connectSubtitle, { color: colors.muted }]}>
            Link your GitHub account to track assigned issues, manage pull requests, and review synced project repositories directly from SynergySphere.
          </Text>
          <Button
            title="Connect GitHub"
            onPress={() => router.push('/github-connect?returnTo=/my-work' as never)}
          />
        </View>
      ) : null}

      {/* Generic Error Notice if not disconnected */}
      {error && !isNotConnected ? <Notice>{error}</Notice> : null}

      {/* If connected or has data */}
      {!isNotConnected ? (
        <>
          {/* Quick Metrics Bar */}
          <View style={styles.metricsBar}>
            <View style={[styles.metricCard, { backgroundColor: isDark ? '#111827' : '#f8fafc', borderColor: colors.border }]}>
              <View style={styles.metricIconRow}>
                <Ionicons name="alert-circle-outline" size={16} color="#10b981" />
                <Text style={[styles.metricValue, { color: colors.text }]}>{issues.length}</Text>
              </View>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>Assigned Issues</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: isDark ? '#111827' : '#f8fafc', borderColor: colors.border }]}>
              <View style={styles.metricIconRow}>
                <Ionicons name="git-pull-request-outline" size={16} color="#8b5cf6" />
                <Text style={[styles.metricValue, { color: colors.text }]}>{pullRequests.length}</Text>
              </View>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>Pull Requests</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: isDark ? '#111827' : '#f8fafc', borderColor: colors.border }]}>
              <View style={styles.metricIconRow}>
                <Ionicons name="git-branch-outline" size={16} color={colors.primary} />
                <Text style={[styles.metricValue, { color: colors.text }]}>{repositories.length}</Text>
              </View>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>Repositories</Text>
            </View>
          </View>

          {/* Search bar */}
          <View style={[styles.searchContainer, { backgroundColor: isDark ? '#111827' : '#f9fafb', borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.muted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Filter issues, PRs, repos..."
              placeholderTextColor={colors.muted}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 ? (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>

          {/* Horizontal segmented tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
          >
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  style={[
                    styles.tabChip,
                    {
                      backgroundColor: active
                        ? colors.primary
                        : isDark
                          ? '#1f2937'
                          : '#f3f4f6',
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setActiveTab(tab.id)}
                >
                  <Ionicons
                    name={tab.icon}
                    size={14}
                    color={active ? '#ffffff' : colors.text}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.tabChipText,
                      { color: active ? '#ffffff' : colors.text },
                    ]}
                  >
                    {tab.label}
                  </Text>
                  {tab.count > 0 ? (
                    <View
                      style={[
                        styles.tabBadge,
                        {
                          backgroundColor: active
                            ? 'rgba(255,255,255,0.25)'
                            : isDark
                              ? 'rgba(255,255,255,0.08)'
                              : 'rgba(0,0,0,0.06)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tabBadgeText,
                          { color: active ? '#ffffff' : colors.muted },
                        ]}
                      >
                        {tab.count}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Content sections based on activeTab */}
          <View style={styles.contentList}>
            {/* ISSUES SECTION */}
            {(activeTab === 'all' || activeTab === 'issues') ? (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionTitleLeft}>
                    <Ionicons name="alert-circle-outline" size={18} color="#10b981" />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Assigned Issues</Text>
                  </View>
                  <Text style={[styles.sectionCount, { color: colors.muted }]}>
                    {filteredIssues.length}
                  </Text>
                </View>

                {filteredIssues.length > 0 ? (
                  filteredIssues.slice(0, activeTab === 'all' ? 5 : 50).map((item, idx) => (
                    <Pressable
                      key={item.id || `issue-${idx}`}
                      style={[
                        styles.itemCard,
                        {
                          backgroundColor: isDark ? '#111827' : '#ffffff',
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => item.html_url && Linking.openURL(item.html_url)}
                    >
                      <View style={styles.itemHeader}>
                        <View style={styles.statusPill}>
                          <Ionicons name="alert-circle" size={14} color="#10b981" />
                          <Text style={styles.statusPillText}>Open</Text>
                        </View>
                        {item.repository?.full_name ? (
                          <Text style={[styles.repoPill, { color: colors.muted }]} numberOfLines={1}>
                            {item.repository.full_name}
                          </Text>
                        ) : null}
                        <Text style={[styles.timeAgo, { color: colors.muted }]}>
                          {relativeDate(item.updated_at || item.created_at)}
                        </Text>
                      </View>

                      <Text style={[styles.itemTitle, { color: colors.text }]}>
                        {item.title} <Text style={{ color: colors.muted, fontWeight: '400' }}>#{item.number}</Text>
                      </Text>

                      {item.labels && item.labels.length > 0 ? (
                        <View style={styles.labelsRow}>
                          {item.labels.slice(0, 3).map((l: any, i: number) => (
                            <View
                              key={l.id || `label-${i}`}
                              style={[
                                styles.labelBadge,
                                { backgroundColor: l.color ? `#${l.color}22` : 'rgba(100,100,100,0.15)' },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.labelBadgeText,
                                  { color: l.color ? `#${l.color}` : colors.text },
                                ]}
                              >
                                {l.name}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}

                      <View style={styles.itemFooter}>
                        {item.user?.avatar_url ? (
                          <View style={styles.authorRow}>
                            <Image source={{ uri: item.user.avatar_url }} style={styles.userAvatar} />
                            <Text style={[styles.authorName, { color: colors.muted }]}>
                              {item.user.login}
                            </Text>
                          </View>
                        ) : <View />}

                        <View style={styles.itemActionRow}>
                          {item.comments ? (
                            <View style={styles.commentCount}>
                              <Ionicons name="chatbubble-outline" size={13} color={colors.muted} />
                              <Text style={[styles.commentText, { color: colors.muted }]}>
                                {item.comments}
                              </Text>
                            </View>
                          ) : null}
                          <Ionicons name="open-outline" size={14} color={colors.primary} />
                        </View>
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <View style={[styles.emptyCard, { borderColor: colors.border }]}>
                    <Ionicons name="checkmark-done-circle-outline" size={32} color={colors.muted} />
                    <Text style={[styles.emptyText, { color: colors.muted }]}>
                      {query ? 'No matching issues found.' : 'No open issues assigned to you.'}
                    </Text>
                  </View>
                )}
              </View>
            ) : null}

            {/* PULL REQUESTS SECTION */}
            {(activeTab === 'all' || activeTab === 'prs') ? (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionTitleLeft}>
                    <Ionicons name="git-pull-request-outline" size={18} color="#8b5cf6" />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Pull Requests</Text>
                  </View>
                  <Text style={[styles.sectionCount, { color: colors.muted }]}>
                    {filteredPRs.length}
                  </Text>
                </View>

                {filteredPRs.length > 0 ? (
                  filteredPRs.slice(0, activeTab === 'all' ? 5 : 50).map((item: any, idx: number) => {
                    const repoName = item.repository_url
                      ? item.repository_url.replace('https://api.github.com/repos/', '')
                      : item.repository?.full_name || '';

                    return (
                      <Pressable
                        key={item.id || `pr-${idx}`}
                        style={[
                          styles.itemCard,
                          {
                            backgroundColor: isDark ? '#111827' : '#ffffff',
                            borderColor: colors.border,
                          },
                        ]}
                        onPress={() => item.html_url && Linking.openURL(item.html_url)}
                      >
                        <View style={styles.itemHeader}>
                          <View style={[styles.statusPill, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
                            <Ionicons name="git-pull-request" size={14} color="#8b5cf6" />
                            <Text style={[styles.statusPillText, { color: '#8b5cf6' }]}>
                              {item.state === 'closed' ? 'Merged' : 'Open'}
                            </Text>
                          </View>
                          {repoName ? (
                            <Text style={[styles.repoPill, { color: colors.muted }]} numberOfLines={1}>
                              {repoName}
                            </Text>
                          ) : null}
                          <Text style={[styles.timeAgo, { color: colors.muted }]}>
                            {relativeDate(item.updated_at || item.created_at)}
                          </Text>
                        </View>

                        <Text style={[styles.itemTitle, { color: colors.text }]}>
                          {item.title} <Text style={{ color: colors.muted, fontWeight: '400' }}>#{item.number}</Text>
                        </Text>

                        <View style={styles.itemFooter}>
                          {item.user?.avatar_url ? (
                            <View style={styles.authorRow}>
                              <Image source={{ uri: item.user.avatar_url }} style={styles.userAvatar} />
                              <Text style={[styles.authorName, { color: colors.muted }]}>
                                {item.user.login}
                              </Text>
                            </View>
                          ) : <View />}

                          <View style={styles.itemActionRow}>
                            {item.comments ? (
                              <View style={styles.commentCount}>
                                <Ionicons name="chatbubble-outline" size={13} color={colors.muted} />
                                <Text style={[styles.commentText, { color: colors.muted }]}>
                                  {item.comments}
                                </Text>
                              </View>
                            ) : null}
                            <Ionicons name="open-outline" size={14} color={colors.primary} />
                          </View>
                        </View>
                      </Pressable>
                    );
                  })
                ) : (
                  <View style={[styles.emptyCard, { borderColor: colors.border }]}>
                    <Ionicons name="git-pull-request-outline" size={32} color={colors.muted} />
                    <Text style={[styles.emptyText, { color: colors.muted }]}>
                      {query ? 'No matching pull requests found.' : 'No open pull requests created by you.'}
                    </Text>
                  </View>
                )}
              </View>
            ) : null}

            {/* REPOSITORIES SECTION */}
            {(activeTab === 'all' || activeTab === 'repos') ? (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionTitleLeft}>
                    <Ionicons name="git-branch-outline" size={18} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Contributed Repositories</Text>
                  </View>
                  <Text style={[styles.sectionCount, { color: colors.muted }]}>
                    {filteredRepos.length}
                  </Text>
                </View>

                {filteredRepos.length > 0 ? (
                  filteredRepos.slice(0, activeTab === 'all' ? 5 : 50).map((item, idx) => {
                    const langColor = item.language ? (LANGUAGE_COLORS[item.language] || '#9ca3af') : null;

                    return (
                      <Pressable
                        key={item.id || `repo-${idx}`}
                        style={[
                          styles.itemCard,
                          {
                            backgroundColor: isDark ? '#111827' : '#ffffff',
                            borderColor: colors.border,
                          },
                        ]}
                        onPress={() => item.html_url && Linking.openURL(item.html_url)}
                      >
                        <View style={styles.itemHeader}>
                          <Text style={[styles.repoFullName, { color: colors.primary }]} numberOfLines={1}>
                            {item.full_name || item.name}
                          </Text>
                          <View style={[styles.visibilityBadge, { borderColor: colors.border }]}>
                            <Text style={[styles.visibilityText, { color: colors.muted }]}>
                              {item.private ? 'Private' : 'Public'}
                            </Text>
                          </View>
                        </View>

                        {item.description ? (
                          <Text style={[styles.repoDesc, { color: colors.muted }]} numberOfLines={2}>
                            {item.description}
                          </Text>
                        ) : null}

                        <View style={styles.repoFooter}>
                          <View style={styles.repoStatsLeft}>
                            {item.language ? (
                              <View style={styles.langItem}>
                                <View style={[styles.langDot, { backgroundColor: langColor || '#9ca3af' }]} />
                                <Text style={[styles.langText, { color: colors.text }]}>{item.language}</Text>
                              </View>
                            ) : null}

                            {typeof item.stargazers_count === 'number' && item.stargazers_count > 0 ? (
                              <View style={styles.statItem}>
                                <Ionicons name="star-outline" size={13} color={colors.muted} />
                                <Text style={[styles.statText, { color: colors.muted }]}>
                                  {item.stargazers_count}
                                </Text>
                              </View>
                            ) : null}

                            {typeof item.forks_count === 'number' && item.forks_count > 0 ? (
                              <View style={styles.statItem}>
                                <Ionicons name="git-network-outline" size={13} color={colors.muted} />
                                <Text style={[styles.statText, { color: colors.muted }]}>
                                  {item.forks_count}
                                </Text>
                              </View>
                            ) : null}
                          </View>

                          <Text style={[styles.timeAgo, { color: colors.muted }]}>
                            Updated {relativeDate(item.updated_at)}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })
                ) : (
                  <View style={[styles.emptyCard, { borderColor: colors.border }]}>
                    <Ionicons name="folder-open-outline" size={32} color={colors.muted} />
                    <Text style={[styles.emptyText, { color: colors.muted }]}>
                      {query ? 'No matching repositories found.' : 'No contributed repositories.'}
                    </Text>
                  </View>
                )}
              </View>
            ) : null}

            {/* STARRED REPOSITORIES */}
            {(activeTab === 'all' || activeTab === 'starred') ? (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionTitleLeft}>
                    <Ionicons name="star-outline" size={18} color="#f59e0b" />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Starred Repositories</Text>
                  </View>
                  <Text style={[styles.sectionCount, { color: colors.muted }]}>
                    {filteredStarred.length}
                  </Text>
                </View>

                {filteredStarred.length > 0 ? (
                  filteredStarred.slice(0, activeTab === 'all' ? 4 : 50).map((item, idx) => {
                    const langColor = item.language ? (LANGUAGE_COLORS[item.language] || '#9ca3af') : null;

                    return (
                      <Pressable
                        key={item.id || `starred-${idx}`}
                        style={[
                          styles.itemCard,
                          {
                            backgroundColor: isDark ? '#111827' : '#ffffff',
                            borderColor: colors.border,
                          },
                        ]}
                        onPress={() => item.html_url && Linking.openURL(item.html_url)}
                      >
                        <View style={styles.itemHeader}>
                          <Text style={[styles.repoFullName, { color: colors.text }]} numberOfLines={1}>
                            {item.full_name || item.name}
                          </Text>
                          {item.stargazers_count ? (
                            <View style={styles.starPill}>
                              <Ionicons name="star" size={12} color="#f59e0b" />
                              <Text style={styles.starPillText}>{item.stargazers_count}</Text>
                            </View>
                          ) : null}
                        </View>

                        {item.description ? (
                          <Text style={[styles.repoDesc, { color: colors.muted }]} numberOfLines={2}>
                            {item.description}
                          </Text>
                        ) : null}

                        {item.language ? (
                          <View style={styles.langItem}>
                            <View style={[styles.langDot, { backgroundColor: langColor || '#9ca3af' }]} />
                            <Text style={[styles.langText, { color: colors.muted }]}>{item.language}</Text>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })
                ) : (
                  <View style={[styles.emptyCard, { borderColor: colors.border }]}>
                    <Ionicons name="star-outline" size={32} color={colors.muted} />
                    <Text style={[styles.emptyText, { color: colors.muted }]}>
                      {query ? 'No matching starred repos found.' : 'No starred repositories.'}
                    </Text>
                  </View>
                )}
              </View>
            ) : null}

            {/* ORGANIZATIONS */}
            {(activeTab === 'all' || activeTab === 'orgs') ? (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionTitleLeft}>
                    <Ionicons name="business-outline" size={18} color="#3b82f6" />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Organizations</Text>
                  </View>
                  <Text style={[styles.sectionCount, { color: colors.muted }]}>
                    {filteredOrgs.length}
                  </Text>
                </View>

                {filteredOrgs.length > 0 ? (
                  <View style={styles.orgGrid}>
                    {filteredOrgs.map((org, idx) => (
                      <Pressable
                        key={org.id || `org-${idx}`}
                        style={[
                          styles.orgCard,
                          {
                            backgroundColor: isDark ? '#111827' : '#ffffff',
                            borderColor: colors.border,
                          },
                        ]}
                        onPress={() => (org.html_url || org.url) && Linking.openURL(org.html_url || `https://github.com/${org.login}`)}
                      >
                        {org.avatar_url ? (
                          <Image source={{ uri: org.avatar_url }} style={styles.orgAvatar} />
                        ) : (
                          <View style={[styles.orgAvatarFallback, { backgroundColor: colors.primary }]}>
                            <Ionicons name="business" size={20} color="#ffffff" />
                          </View>
                        )}
                        <Text style={[styles.orgName, { color: colors.text }]} numberOfLines={1}>
                          {org.login || org.name}
                        </Text>
                        {org.description ? (
                          <Text style={[styles.orgDesc, { color: colors.muted }]} numberOfLines={2}>
                            {org.description}
                          </Text>
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View style={[styles.emptyCard, { borderColor: colors.border }]}>
                    <Ionicons name="business-outline" size={32} color={colors.muted} />
                    <Text style={[styles.emptyText, { color: colors.muted }]}>
                      {query ? 'No matching organizations found.' : 'No organizations associated.'}
                    </Text>
                  </View>
                )}
              </View>
            ) : null}
          </View>
        </>
      ) : null}
    </>
  );

  if (wrapInScreen) {
    return (
      <Screen>
        {content}
      </Screen>
    );
  }

  return <View style={{ gap: 12 }}>{content}</View>;
}

export default function MyWorkScreen() {
  return <MyWorkView showBackButton wrapInScreen />;
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  refreshIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectBanner: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 12,
    marginVertical: 12,
  },
  connectIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(100, 100, 100, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  connectSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 4,
  },
  metricsBar: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 12,
  },
  metricCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  metricIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  tabsContainer: {
    gap: 8,
    paddingBottom: 14,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 6,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  contentList: {
    gap: 20,
    paddingBottom: 32,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  repoPill: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  timeAgo: {
    fontSize: 11,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  labelsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  labelBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  labelBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  authorName: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  commentCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  repoFullName: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  visibilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  visibilityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  repoDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  repoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  repoStatsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  langDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  langText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
  },
  starPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  starPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f59e0b',
  },
  orgGrid: {
    gap: 10,
  },
  orgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  orgAvatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  orgAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgName: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  orgDesc: {
    fontSize: 12,
    lineHeight: 16,
    flex: 2,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  topNavRow: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  backNavText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

