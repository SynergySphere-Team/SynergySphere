import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading, Notice, BackButton } from '@/components/Screen';
import { Button, Heading } from '@/components/ui';
import { api } from '@/services/api';
import type { GithubActivity, Project } from '@/types/api';
import { useTheme } from '@/context/ThemeContext';

const TABS = [
  { id: 'Code', label: 'Code', icon: 'code-slash-outline' },
  { id: 'Commits', label: 'Commits', icon: 'git-commit-outline' },
  { id: 'Issues', label: 'Issues', icon: 'alert-circle-outline' },
  { id: 'Pull Requests', label: 'PRs', icon: 'git-pull-request-outline' },
  { id: 'Discussions', label: 'Chat', icon: 'chatbubbles-outline' },
  { id: 'Contributors', label: 'People', icon: 'people-outline' },
] as const;

type TabId = typeof TABS[number]['id'];

const ENDPOINTS: Record<Exclude<TabId, 'Discussions'>, string> = {
  Code: 'code',
  Commits: 'commits',
  Issues: 'issues',
  'Pull Requests': 'pulls',
  Contributors: 'contributors',
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
};

function relativeDate(value?: string | null) {
  if (!value) return 'recently';
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 1440)}d ago`;
}

function fileIcon(name = '', type = '') {
  if (type === 'dir') return 'folder';
  if (name.endsWith('.md')) return 'document-text-outline';
  if (name.endsWith('.json') || name.endsWith('.yaml') || name.endsWith('.yml')) return 'settings-outline';
  if (name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.js') || name.endsWith('.jsx')) return 'logo-javascript';
  if (name.endsWith('.py')) return 'logo-python';
  return 'document-outline';
}

export default function ProjectDetailScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';

  const [project, setProject] = useState<Project | null>(null);
  const [activity, setActivity] = useState<GithubActivity[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [tab, setTab] = useState<TabId>('Code');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      setError('');
      const [data, eventData] = await Promise.all([
        api.get<Project>(`/projects/${projectId}`),
        api.get<GithubActivity[]>(`/projects/${projectId}/activity`).catch(() => []),
      ]);
      setProject(data);
      setActivity(eventData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load project.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timeout);
  }, [load]);

  useEffect(() => {
    if (!project?.isGithubBacked || tab === 'Discussions') return;
    setTabLoading(true);
    api
      .get<any[]>(`/projects/${project.id}/repository/${ENDPOINTS[tab]}`)
      .then((res) => setItems(Array.isArray(res) ? res : []))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load repository data.'))
      .finally(() => setTabLoading(false));
  }, [project, tab]);

  async function join() {
    if (!project) return;
    try {
      await api.post(`/projects/${project.id}/join-requests`, {});
      await load();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not send join request.';
      setError(message);
      if (/connect github/i.test(message)) {
        router.push(`/github-connect?returnTo=/project-detail?projectId=${project.id}` as never);
      }
    }
  }

  async function fork() {
    if (!project) return;
    try {
      const result = await api.post<{ url: string }>(`/projects/${project.id}/fork`);
      await Linking.openURL(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not fork repository.');
    }
  }

  if (loading) return <Loading />;
  if (!project) {
    return (
      <Screen showBackButton>
        <Notice>{error || 'Project not found.'}</Notice>
      </Screen>
    );
  }

  const langColor = LANGUAGE_COLORS[project.primaryLanguage || ''] || '#7f929a';
  const isPrivate = project.githubVisibility === 'private';

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      <View style={styles.topNavRow}>
        <Pressable
          style={[styles.backNavButton, { backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }]}
          onPress={() => {
            router.navigate('/community?tab=initiatives' as never);
          }}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
          <Text style={[styles.backNavText, { color: colors.text }]}>Back to Initiatives</Text>
        </Pressable>
      </View>

      <Heading subtitle={`${project.githubFullName || project.organization || 'Community'} · ${project.primaryLanguage || 'Community project'}`}>
        {project.title}
      </Heading>

      {error ? <Notice>{error}</Notice> : null}

      {/* Opportunity Details */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>
            Opportunity Details
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
            Learn about the project and how you can contribute.
          </Text>
        </View>
      </View>

<View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Category & XP Banner */}
        <View style={styles.badgeRow}>
          <View style={[styles.categoryBadge, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.categoryText, { color: colors.primary }]}>{project.category}</Text>
          </View>

          <View style={styles.rightBadges}>
            <View
              style={[
                styles.visibilityPill,
                {
                  backgroundColor: isPrivate
                    ? (isDark ? 'rgba(247, 198, 90, 0.15)' : '#FFF8E1')
                    : (isDark ? 'rgba(145, 219, 94, 0.15)' : '#E8F5E9'),
                  borderColor: isPrivate ? colors.warning : colors.primary,
                },
              ]}
            >
              <Ionicons
                name={isPrivate ? 'lock-closed-outline' : 'globe-outline'}
                size={11}
                color={isPrivate ? colors.warning : colors.primary}
              />
              <Text style={[styles.visibilityText, { color: isPrivate ? colors.warning : (isDark ? colors.primary : '#2e7d32') }]}>
                {isPrivate ? 'Private' : 'Public'}
              </Text>
            </View>

            <View style={[styles.xpPill, { backgroundColor: colors.primaryDark }]}>
              <Text style={[styles.xpText, { color: colors.primary }]}>+{project.xpReward} XP</Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <Text style={[styles.heroDescription, { color: colors.text }]}>
          {project.description}
        </Text>

        {/* Opportunity Information */}
        <View style={styles.opportunityInfoGrid}>
          <View style={styles.opportunityInfoItem}>
            <Ionicons name="business-outline" size={16} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.opportunityInfoLabel, { color: colors.muted }]}>
                Organisation
              </Text>
              <Text style={[styles.opportunityInfoValue, { color: colors.text }]}>
                {project.organization || 'Community'}
              </Text>
            </View>
          </View>

          {project.location ? (
            <View style={styles.opportunityInfoItem}>
              <Ionicons name="location-outline" size={16} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.opportunityInfoLabel, { color: colors.muted }]}>
                  Location
                </Text>
                <Text style={[styles.opportunityInfoValue, { color: colors.text }]}>
                  {project.location}
                </Text>
              </View>
            </View>
          ) : null}

          {project.techStack ? (
            <View style={styles.opportunityInfoItem}>
              <Ionicons name="layers-outline" size={16} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.opportunityInfoLabel, { color: colors.muted }]}>
                  Tech Stack
                </Text>
                <Text style={[styles.opportunityInfoValue, { color: colors.text }]}>
                  {project.techStack}
                </Text>
              </View>
            </View>
          ) : null}

          {project.teamCapacity ? (
            <View style={styles.opportunityInfoItem}>
              <Ionicons name="people-outline" size={16} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.opportunityInfoLabel, { color: colors.muted }]}>
                  Team Capacity
                </Text>
                <Text style={[styles.opportunityInfoValue, { color: colors.text }]}>
                  {project.teamCapacity} members
                </Text>
              </View>
            </View>
          ) : null}

          {project.deliverableType ? (
            <View style={styles.opportunityInfoItem}>
              <Ionicons name="cube-outline" size={16} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.opportunityInfoLabel, { color: colors.muted }]}>
                  Deliverable
                </Text>
                <Text style={[styles.opportunityInfoValue, { color: colors.text }]}>
                  {project.deliverableType}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {project.requirements ? (
          <View
            style={[
              styles.requirementsBox,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.requirementsHeader}>
              <Ionicons name="checkmark-circle-outline" size={17} color={colors.primary} />
              <Text style={[styles.requirementsTitle, { color: colors.text }]}>
                Requirements
              </Text>
            </View>

            <Text style={[styles.requirementsText, { color: colors.muted }]}>
              {project.requirements}
            </Text>
          </View>
        ) : null}

        {/* Metrics Bar */}

        {/* Metrics Bar */}
        <View style={styles.metricsBar}>
          {project.primaryLanguage ? (
            <View style={styles.metricItem}>
              <View style={[styles.langDot, { backgroundColor: langColor }]} />
              <Text style={[styles.metricText, { color: colors.muted }]}>{project.primaryLanguage}</Text>
            </View>
          ) : null}

          <View style={styles.metricItem}>
            <Ionicons name="star-outline" size={14} color={colors.muted} />
            <Text style={[styles.metricText, { color: colors.muted }]}>{project.githubStars || 0} stars</Text>
          </View>

          <View style={styles.metricItem}>
            <Ionicons name="git-branch-outline" size={14} color={colors.muted} />
            <Text style={[styles.metricText, { color: colors.muted }]}>{project.githubForks || 0} forks</Text>
          </View>

          {project.license ? (
            <View style={styles.metricItem}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.muted} />
              <Text style={[styles.metricText, { color: colors.muted }]}>{project.license}</Text>
            </View>
          ) : null}
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.actionButtonGroup}>
          {project.githubUrl ? (
            <Pressable
              style={({ pressed }) => [
                styles.primaryActionBtn,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                pressed && styles.pressed,
              ]}
              onPress={() => Linking.openURL(project.githubUrl!)}
            >
              <Ionicons name="logo-github" size={16} color={colors.text} />
              <Text style={[styles.primaryActionBtnText, { color: colors.text }]}>Open on GitHub</Text>
            </Pressable>
          ) : null}

          {project.isCreator ? (
            <Pressable
              style={({ pressed }) => [
                styles.primaryActionBtn,
                { backgroundColor: colors.primary, borderColor: colors.primary },
                pressed && styles.pressed,
              ]}
              onPress={() =>
                router.push({
                  pathname: '/join-requests',
                  params: { projectId: project.id, title: project.title },
                } as never)
              }
            >
              <Ionicons name="people" size={16} color={colors.primaryText} />
              <Text style={[styles.primaryActionBtnText, { color: colors.primaryText, fontWeight: '800' }]}>
                Review Requests ({project._count?.applications || 0})
              </Text>
            </Pressable>
          ) : (
            <View style={styles.contributorActions}>
              <Pressable
                disabled={project.hasApplied}
                style={({ pressed }) => [
                  styles.primaryActionBtn,
                  {
                    backgroundColor: project.hasApplied ? colors.surfaceElevated : colors.primary,
                    borderColor: project.hasApplied ? colors.border : colors.primary,
                    opacity: project.hasApplied ? 0.85 : 1,
                  },
                  pressed && !project.hasApplied && styles.pressed,
                ]}
                onPress={join}
              >
                <Ionicons
                  name={project.hasApplied ? 'checkmark-circle-outline' : 'person-add-outline'}
                  size={16}
                  color={project.hasApplied ? colors.primary : colors.primaryText}
                />
                <Text
                  style={[
                    styles.primaryActionBtnText,
                    {
                      color: project.hasApplied ? colors.text : colors.primaryText,
                      fontWeight: '800',
                    },
                  ]}
                >
                  {project.hasApplied
                    ? project.applicationStatus === 'INVITATION_SENT'
                      ? 'Invitation sent — check GitHub'
                      : `Status: ${project.applicationStatus?.toLowerCase()}`
                    : 'Request to Join'}
                </Text>
              </Pressable>

              {project.isGithubBacked && project.githubVisibility === 'public' ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryActionBtn,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                    pressed && styles.pressed,
                  ]}
                  onPress={fork}
                >
                  <Ionicons name="git-pull-request-outline" size={16} color={colors.text} />
                  <Text style={[styles.primaryActionBtnText, { color: colors.text }]}>Fork & Contribute</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
      </View>

      {/* GitHub Repository Tabs */}
      {project.isGithubBacked ? (
        <View style={styles.tabSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScrollContainer}
          >
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setTab(t.id)}
                  style={({ pressed }) => [
                    styles.tabPill,
                    {
                      backgroundColor: active ? colors.primary : colors.surfaceElevated,
                      borderColor: active ? colors.primary : colors.border,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    name={t.icon as any}
                    size={14}
                    color={active ? colors.primaryText : colors.muted}
                  />
                  <Text
                    style={[
                      styles.tabPillText,
                      {
                        color: active ? colors.primaryText : colors.text,
                        fontWeight: active ? '800' : '600',
                      },
                    ]}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Tab Content Box */}
          <View style={[styles.tabContentBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {tabLoading ? (
              <View style={styles.tabLoadingContainer}>
                <Ionicons name="sync" size={22} color={colors.primary} />
                <Text style={[styles.emptyMeta, { color: colors.muted }]}>Loading repository data...</Text>
              </View>
            ) : tab === 'Discussions' ? (
              <View style={styles.discussionBox}>
                <Ionicons name="chatbubbles-outline" size={32} color={colors.primary} />
                <Text style={[styles.discussionTitle, { color: colors.text }]}>Project Team Discussion</Text>
                <Text style={[styles.discussionSub, { color: colors.muted }]}>
                  Coordinate tasks, discuss PRs, and share updates with fellow contributors.
                </Text>
                <Button
                  title="Open Team Discussion Chat"
                  onPress={() =>
                    router.push({
                      pathname: '/project-chat',
                      params: { projectId: project.id, title: project.title },
                    } as never)
                  }
                />
              </View>
            ) : items.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="folder-open-outline" size={28} color={colors.muted} />
                <Text style={[styles.emptyMeta, { color: colors.muted }]}>No {tab.toLowerCase()} found in this repository.</Text>
              </View>
            ) : (
              <View style={styles.itemsList}>
                {tab === 'Code' &&
                  items.map((file, idx) => (
                    <View
                      key={file.sha || file.name || idx}
                      style={[styles.itemRow, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
                    >
                      <Ionicons
                        name={fileIcon(file.name, file.type) as any}
                        size={17}
                        color={file.type === 'dir' ? '#3178c6' : colors.muted}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemTitle, { color: colors.text }]}>{file.name}</Text>
                        {file.size ? (
                          <Text style={[styles.itemMeta, { color: colors.muted }]}>
                            {(file.size / 1024).toFixed(1)} KB
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}

                {tab === 'Commits' &&
                  items.map((item, idx) => {
                    const author = item.commit?.author || item.author;
                    return (
                      <View
                        key={item.sha || idx}
                        style={[styles.commitRow, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
                      >
                        <View style={styles.commitTimeline}>
                          <Ionicons name="git-commit" size={18} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1, gap: 3 }}>
                          <Text style={[styles.itemTitle, { color: colors.text }]}>
                            {item.commit?.message || 'Commit'}
                          </Text>
                          <View style={styles.commitMetaRow}>
                            <Text style={[styles.itemMeta, { color: colors.muted }]}>
                              {item.author?.login || author?.name || 'Contributor'} · {relativeDate(author?.date)}
                            </Text>
                            <View style={[styles.shaPill, { backgroundColor: colors.surfaceElevated }]}>
                              <Text style={[styles.shaText, { color: colors.primary }]}>
                                {item.sha?.slice(0, 7)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}

                {tab === 'Issues' &&
                  items.map((issue, idx) => (
                    <View
                      key={issue.id || idx}
                      style={[styles.itemRow, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
                    >
                      <Ionicons name="alert-circle-outline" size={18} color="#2e7d32" />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.itemTitle, { color: colors.text }]}>{issue.title}</Text>
                        <Text style={[styles.itemMeta, { color: colors.muted }]}>
                          #{issue.number} opened by {issue.user?.login} · {relativeDate(issue.created_at)}
                        </Text>
                      </View>
                    </View>
                  ))}

                {tab === 'Pull Requests' &&
                  items.map((pr, idx) => (
                    <View
                      key={pr.id || idx}
                      style={[styles.itemRow, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
                    >
                      <Ionicons name="git-pull-request-outline" size={18} color="#6f42c1" />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.itemTitle, { color: colors.text }]}>{pr.title}</Text>
                        <Text style={[styles.itemMeta, { color: colors.muted }]}>
                          #{pr.number} by {pr.user?.login} · {relativeDate(pr.created_at)}
                        </Text>
                      </View>
                    </View>
                  ))}

                {tab === 'Contributors' &&
                  items.map((contributor, idx) => (
                    <View
                      key={contributor.id || contributor.login || idx}
                      style={[styles.itemRow, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
                    >
                      {contributor.avatar_url ? (
                        <Image source={{ uri: contributor.avatar_url }} style={styles.contributorAvatar} />
                      ) : (
                        <Ionicons name="person-circle-outline" size={28} color={colors.muted} />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemTitle, { color: colors.text }]}>@{contributor.login}</Text>
                        <Text style={[styles.itemMeta, { color: colors.muted }]}>
                          {contributor.contributions || 1} contribution{contributor.contributions === 1 ? '' : 's'}
                        </Text>
                      </View>
                    </View>
                  ))}
              </View>
            )}
          </View>
        </View>
      ) : null}

      {/* Recent Activity Section */}
      {activity.length > 0 && (
        <View style={styles.activitySection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent activity</Text>
          {activity.slice(0, 4).map((event) => (
            <View
              key={event.id}
              style={[styles.activityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.activityHeader}>
                <Ionicons
                  name={
                    event.type === 'COMMIT'
                      ? 'git-commit-outline'
                      : event.type === 'PULL_REQUEST'
                      ? 'git-pull-request-outline'
                      : 'alert-circle-outline'
                  }
                  size={15}
                  color={colors.primary}
                />
                <Text style={[styles.activityEventTitle, { color: colors.text }]} numberOfLines={1}>
                  {event.actorLogin ? `${event.actorLogin}: ` : ''}
                  {event.title}
                </Text>
              </View>
              <Text style={[styles.itemMeta, { color: colors.muted }]}>
                {event.summary || event.type} · {relativeDate(event.occurredAt)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
  marginTop: 4,
  marginBottom: 2,
},

sectionHeading: {
  fontSize: 18,
  fontWeight: '800',
},

sectionSubtitle: {
  fontSize: 12,
  marginTop: 2,
},

  heroCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  categoryBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    flexShrink: 1,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  rightBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  visibilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  visibilityText: {
    fontSize: 10,
    fontWeight: '800',
  },
  xpPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  xpText: {
    fontSize: 10,
    fontWeight: '800',
  },
  heroDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  opportunityInfoGrid: {
  gap: 10,
},

opportunityInfoItem: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 9,
},

opportunityInfoLabel: {
  fontSize: 10,
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: 0.4,
},

opportunityInfoValue: {
  fontSize: 13,
  fontWeight: '600',
  marginTop: 2,
},

requirementsBox: {
  borderWidth: 1,
  borderRadius: 14,
  padding: 12,
  gap: 6,
},

requirementsHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},

requirementsTitle: {
  fontSize: 13,
  fontWeight: '800',
},

requirementsText: {
  fontSize: 12,
  lineHeight: 18,
},
  metricsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 2,
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
  actionButtonGroup: {
    gap: 8,
    paddingTop: 4,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  primaryActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  contributorActions: {
    gap: 8,
  },
  tabSection: {
    gap: 10,
    marginTop: 6,
  },
  tabScrollContainer: {
    gap: 8,
    paddingVertical: 2,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  tabPillText: {
    fontSize: 12,
  },
  tabContentBox: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  tabLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  itemsList: {
    paddingVertical: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  commitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  commitTimeline: {
    paddingTop: 2,
  },
  commitMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  shaPill: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  shaText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'Courier',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemMeta: {
    fontSize: 11,
    lineHeight: 16,
  },
  contributorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  emptyMeta: {
    fontSize: 13,
    fontWeight: '600',
  },
  discussionBox: {
    alignItems: 'center',
    padding: 20,
    gap: 10,
    textAlign: 'center',
  },
  discussionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  discussionSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 6,
  },
  activitySection: {
    gap: 8,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  activityCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityEventTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
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

