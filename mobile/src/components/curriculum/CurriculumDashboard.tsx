import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import type {
  Technology,
  TechnologyDetail,
  CurriculumSearchResult,
} from '@/types/curriculum';

interface CurriculumDashboardProps {
  onSelectLesson: (lessonId: string, technologyId: string) => void;
  onRefreshLectureNotes?: () => void;
}

export function CurriculumDashboard({ onSelectLesson }: CurriculumDashboardProps) {
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';

  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [activeTechId, setActiveTechId] = useState<string>('java');
  const [activeTechDetail, setActiveTechDetail] = useState<TechnologyDetail | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CurriculumSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Sync state
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const technologyRequestId = useRef(0);
  const detailCache = useRef<Map<string, TechnologyDetail>>(new Map());

  // Load technologies list
  const loadTechnologies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ technologies: Technology[] }>('/curriculum/technologies');
      const list = Array.isArray(data?.technologies) ? data.technologies : [];
      setTechnologies(list);
      if (list.length > 0) {
        setActiveTechId((curr) => (curr && list.some((t) => t.id === curr) ? curr : list[0].id));
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load curriculum. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load active technology detail
  const loadTechDetail = useCallback(async (techId: string) => {
    if (!techId) return;
    const requestId = ++technologyRequestId.current;

    // Check fast in-memory cache first for instant responsiveness
    const cached = detailCache.current.get(techId);
    if (cached) {
      setActiveTechDetail(cached);
      setDetailLoading(false);
    } else {
      setDetailLoading(true);
      setActiveTechDetail(null);
    }

    try {
      const detail = await api.get<TechnologyDetail>(`/curriculum/technologies/${techId}`);
      if (requestId !== technologyRequestId.current) return;
      detailCache.current.set(techId, detail);
      setActiveTechDetail(detail);
      // Auto-expand first module by default
      if (detail.modules && detail.modules.length > 0) {
        setExpandedModules((prev) => ({
          ...prev,
          [detail.modules[0].id]: true,
        }));
      }
    } catch {
      // If cached version was already shown, leave it; otherwise detail remains null
    } finally {
      if (requestId === technologyRequestId.current) setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTechnologies();
  }, [loadTechnologies]);

  useEffect(() => {
    if (activeTechId) {
      loadTechDetail(activeTechId);
    }
  }, [activeTechId, loadTechDetail]);

  // Search handler with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get<{ results: CurriculumSearchResult[] }>(
          `/curriculum/search?q=${encodeURIComponent(searchQuery)}`,
        );
        setSearchResults(res.results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  async function handleSyncCheck() {
    setSyncing(true);
    setSyncNotice(null);
    try {
      const res = await api.post<{ lastSynchronized: string; message: string }>('/curriculum/sync');
      setSyncNotice(`${res.message} (Synced: ${res.lastSynchronized})`);
      detailCache.current.clear();
      await loadTechnologies();
      if (activeTechId) await loadTechDetail(activeTechId);
    } catch {
      setSyncNotice('Could not verify synchronization with server.');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncNotice(null), 5000);
    }
  }

  // 1. LOADING STATE
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>
          Loading curriculum...
        </Text>
      </View>
    );
  }

  // 2. ERROR STATE (when no technologies could be loaded)
  if (error && technologies.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={44} color={colors.danger} />
        <Text style={[styles.stateTitle, { color: colors.text }]}>
          Unable to load curriculum. Please try again.
        </Text>
        <Text style={[styles.stateSubtitle, { color: colors.muted }]}>
          {error}
        </Text>
        <Pressable
          onPress={loadTechnologies}
          style={({ pressed }) => [
            styles.retryButton,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={[styles.retryButtonText, { color: colors.primaryText }]}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  // 3. EMPTY STATE (technologies list is empty)
  if (technologies.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="school-outline" size={44} color={colors.muted} />
        <Text style={[styles.stateTitle, { color: colors.text }]}>
          No technologies available.
        </Text>
        <Pressable
          onPress={loadTechnologies}
          style={({ pressed }) => [
            styles.retryButton,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={[styles.retryButtonText, { color: colors.text }]}>Refresh</Text>
        </Pressable>
      </View>
    );
  }

  // Active tech resolution (safe fallback)
  const activeTech = technologies.find((t) => t.id === activeTechId) || (technologies.length > 0 ? technologies[0] : null);

  // Find continue learning candidate
  const continueLesson = activeTechDetail?.modules
    ?.flatMap((m) => m.lessons)
    ?.find((l) => !l.completed);

  return (
    <View style={styles.container}>
      {/* 1. Header & Search Bar */}
      <View style={styles.headerArea}>
        <Text style={[styles.superTitle, { color: isLight ? '#1e6827' : colors.primary }]}>
          PROGRAMMING & SOFTWARE
        </Text>
        <Text style={[styles.mainHeading, { color: colors.text }]}>
          W3Schools Academy
        </Text>
        <Text style={[styles.subheading, { color: colors.muted }]}>
          Structured, native programming paths with interactive code & practice.
        </Text>

        {/* Search Box */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.inputBg,
              borderColor: colors.inputBorder,
            },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search lessons (e.g. 'variables', 'inheritance', 'joins')…"
            placeholderTextColor={colors.placeholderText}
            style={[styles.searchInput, { color: colors.text }]}
            returnKeyType="search"
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          ) : searchLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : null}
        </View>

        {/* Live Search Results Popover */}
        {searchQuery.trim().length > 0 ? (
          <View style={[styles.searchResultsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.searchResultHeader}>
              <Text style={[styles.searchResultCount, { color: colors.muted }]}>
                {searchResults.length} lesson{searchResults.length === 1 ? '' : 's'} found
              </Text>
            </View>
            {searchResults.length === 0 && !searchLoading ? (
              <Text style={[styles.emptySearchText, { color: colors.muted }]}>
                No lessons matched "{searchQuery}". Try "variables", "classes", or "syntax".
              </Text>
            ) : (
              searchResults.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setSearchQuery('');
                    onSelectLesson(item.id, item.subjectId);
                  }}
                  style={({ pressed }) => [
                    styles.searchResultItem,
                    { borderBottomColor: colors.border },
                    pressed && { backgroundColor: colors.surfaceElevated },
                  ]}
                >
                  <View style={styles.searchResultRow}>
                    <Text style={[styles.searchResultTitle, { color: colors.text }]}>
                      {item.title}
                    </Text>
                    <View style={[styles.tagBadge, { backgroundColor: isLight ? '#e0f2fe' : '#0369a1' }]}>
                      <Text style={[styles.tagText, { color: isLight ? '#0284c7' : '#e0f2fe' }]}>
                        {item.subjectName}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.searchResultSnippet, { color: colors.muted }]} numberOfLines={1}>
                    {item.overview}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        ) : null}
      </View>

      {/* 2. Continue Learning Banner */}
      {continueLesson ? (
        <Pressable
          onPress={() => onSelectLesson(continueLesson.id, activeTechId)}
          style={({ pressed }) => [
            styles.continueCard,
            { backgroundColor: isLight ? '#e8f5e9' : '#064e3b', borderColor: isLight ? '#a5d6a7' : '#059669' },
            pressed && { opacity: 0.85 },
          ]}
        >
          <View style={styles.continueLeft}>
            <View style={styles.continueHeaderRow}>
              <Ionicons name="sparkles" size={16} color={isLight ? '#1b5e20' : '#34d399'} />
              <Text style={[styles.continueBadge, { color: isLight ? '#1b5e20' : '#34d399' }]}>
                CONTINUE LEARNING
              </Text>
            </View>
            <Text style={[styles.continueTitle, { color: isLight ? '#14532d' : '#ecfdf5' }]}>
              {continueLesson.title}
            </Text>
            <Text style={[styles.continueMeta, { color: isLight ? '#166534' : '#a7f3d0' }]}>
              {activeTech ? activeTech.name : ''} · {continueLesson.difficulty}
            </Text>
          </View>
          <View style={styles.continueRight}>
            <View style={[styles.continueIconCircle, { backgroundColor: isLight ? '#2e7d32' : '#10b981' }]}>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </View>
          </View>
        </Pressable>
      ) : null}

      {/* 3. Horizontal Technology Selector */}
      <View style={styles.techSection}>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Technologies</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.techScroll}
        >
          {technologies.map((tech) => {
            const isSelected = tech.id === activeTechId;
            return (
              <Pressable
                key={tech.id}
                onPress={() => setActiveTechId(tech.id)}
                style={({ pressed }) => [
                  styles.techChip,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : colors.surfaceElevated,
                    borderColor: isSelected
                      ? colors.primary
                      : colors.border,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text
                  style={[
                    styles.techChipText,
                    {
                      color: isSelected ? colors.primaryText : colors.text,
                      fontWeight: isSelected ? '800' : '600',
                    },
                  ]}
                >
                  {tech.name}
                </Text>
                {tech.completedLessons > 0 ? (
                  <View style={[styles.techChipDot, { backgroundColor: isSelected ? '#ffffff' : '#22c55e' }]} />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 4. Active Technology Progress Card */}
      {activeTechDetail ? (
        <View style={[styles.techHeaderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.techTitleRow}>
            <View>
              <Text style={[styles.techName, { color: colors.text }]}>
                {activeTechDetail.name}
              </Text>
              <Text style={[styles.techCategory, { color: colors.muted }]}>
                {activeTechDetail.category} · {activeTechDetail.difficulty}
              </Text>
            </View>
            <View style={styles.techProgressPill}>
              <Text style={[styles.techProgressPercent, { color: isLight ? '#1b5e20' : colors.primary }]}>
                {activeTechDetail.progressPercent}%
              </Text>
              <Text style={[styles.techProgressFraction, { color: colors.muted }]}>
                {activeTechDetail.completedLessons}/{activeTechDetail.totalLessons}
              </Text>
            </View>
          </View>

          <Text style={[styles.techDescription, { color: colors.muted }]}>
            {activeTechDetail.description}
          </Text>

          {/* Progress Bar */}
          <View style={[styles.progressBarBg, { backgroundColor: isLight ? '#e5e7eb' : '#1f2937' }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.max(activeTechDetail.progressPercent, 4)}%`,
                  backgroundColor: isLight ? '#16a34a' : colors.primary,
                },
              ]}
            />
          </View>
        </View>
      ) : null}

      {/* 5. Collapsible Curriculum Sections */}
      <View style={styles.modulesContainer}>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Curriculum</Text>

        {detailLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
        ) : activeTechDetail?.modules && activeTechDetail.modules.length > 0 ? (
          activeTechDetail.modules.map((module) => {
            const isExpanded = Boolean(expandedModules[module.id]);
            const completedCount = module.lessons.filter((l) => l.completed).length;

            return (
              <View
                key={module.id}
                style={[
                  styles.moduleCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                {/* Expandable Module Header */}
                <Pressable
                  onPress={() => toggleModule(module.id)}
                  style={({ pressed }) => [
                    styles.moduleHeader,
                    { borderBottomColor: isExpanded ? colors.border : 'transparent' },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <View style={styles.moduleHeaderLeft}>
                    <Ionicons
                      name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                      size={18}
                      color={isLight ? '#16a34a' : colors.primary}
                    />
                    <View>
                      <Text style={[styles.moduleTitle, { color: colors.text }]}>
                        {module.name}
                      </Text>
                      <Text style={[styles.moduleSubtitle, { color: colors.muted }]}>
                        {module.lessons.length} lessons · {completedCount} completed
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.moduleBadge, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[styles.moduleBadgeText, { color: colors.muted }]}>
                      {completedCount}/{module.lessons.length}
                    </Text>
                  </View>
                </Pressable>

                {/* Lessons List inside expanded Module */}
                {isExpanded ? (
                  <View style={styles.lessonsList}>
                    {module.lessons.map((lesson, index) => (
                      <Pressable
                        key={lesson.id}
                        onPress={() => onSelectLesson(lesson.id, activeTechId)}
                        style={({ pressed }) => [
                          styles.lessonRow,
                          index < module.lessons.length - 1 && {
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                          },
                          pressed && { backgroundColor: colors.surfaceElevated },
                        ]}
                      >
                        <View style={styles.lessonRowLeft}>
                          <Ionicons
                            name={
                              lesson.completed
                                ? 'checkmark-circle'
                                : 'radio-button-off'
                            }
                            size={19}
                            color={
                              lesson.completed
                                ? '#22c55e'
                                : colors.muted
                            }
                          />
                          <View style={styles.lessonInfo}>
                            <Text
                              style={[
                                styles.lessonTitleText,
                                {
                                  color: colors.text,
                                  fontWeight: lesson.completed ? '600' : '700',
                                },
                              ]}
                            >
                              {lesson.title}
                            </Text>
                            <Text
                              style={[styles.lessonOverviewText, { color: colors.muted }]}
                              numberOfLines={1}
                            >
                              {lesson.overview}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.lessonRowRight}>
                          <View
                            style={[
                              styles.diffPill,
                              {
                                backgroundColor:
                                  lesson.difficulty === 'Beginner'
                                    ? isLight ? '#dcfce7' : '#064e3b'
                                    : lesson.difficulty === 'Intermediate'
                                    ? isLight ? '#fef3c7' : '#78350f'
                                    : isLight ? '#fee2e2' : '#7f1d1d',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.diffText,
                                {
                                  color:
                                    lesson.difficulty === 'Beginner'
                                      ? isLight ? '#166534' : '#34d399'
                                      : lesson.difficulty === 'Intermediate'
                                      ? isLight ? '#b45309' : '#fcd34d'
                                      : isLight ? '#b91c1c' : '#fca5a5',
                                },
                              ]}
                            >
                              {lesson.difficulty}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={14} color={colors.muted} />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })
        ) : !activeTech ? (
          <View style={[styles.moduleCard, { padding: 18, alignItems: 'center' }]}>
            <Text style={[{ color: colors.muted, fontSize: 13 }]}>
              Select a technology to view lessons.
            </Text>
          </View>
        ) : (
          <View style={[styles.moduleCard, { padding: 18, alignItems: 'center' }]}>
            <Text style={[{ color: colors.muted, fontSize: 13 }]}>
              Lessons for {activeTech.name} are coming soon in the next release!
            </Text>
          </View>
        )}
      </View>

      {/* 6. Sync / Attribution Footer */}
      <View style={[styles.syncCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <View style={styles.syncRow}>
          <Ionicons name="sync-circle-outline" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.syncTitle, { color: colors.text }]}>
              Source: W3Schools Educational Integration
            </Text>
            <Text style={[styles.syncSubtitle, { color: colors.muted }]}>
              Last synchronized: 17 September 2026
            </Text>
          </View>
          <Pressable
            onPress={handleSyncCheck}
            disabled={syncing}
            style={({ pressed }) => [
              styles.syncBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.syncBtnText, { color: colors.text }]}>
              {syncing ? 'Checking…' : 'Check Updates'}
            </Text>
          </Pressable>
        </View>
        {syncNotice ? (
          <Text style={[styles.syncNoticeText, { color: isLight ? '#166534' : '#4ade80' }]}>
            {syncNotice}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  centerContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
  },
  stateSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginHorizontal: 24,
    marginTop: 4,
    lineHeight: 18,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 14,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  headerArea: {
    gap: 6,
  },
  superTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  mainHeading: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
  },
  searchResultsCard: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  searchResultHeader: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  searchResultCount: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptySearchText: {
    padding: 12,
    fontSize: 13,
    textAlign: 'center',
  },
  searchResultItem: {
    padding: 10,
    gap: 3,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  searchResultSnippet: {
    fontSize: 12,
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  continueLeft: {
    flex: 1,
    gap: 3,
  },
  continueHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  continueBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  continueTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  continueMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  continueRight: {
    marginLeft: 12,
  },
  continueIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techSection: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  techScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  techChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  techChipText: {
    fontSize: 13,
  },
  techChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  techHeaderCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  techTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  techName: {
    fontSize: 20,
    fontWeight: '800',
  },
  techCategory: {
    fontSize: 12,
    fontWeight: '600',
  },
  techProgressPill: {
    alignItems: 'flex-end',
  },
  techProgressPercent: {
    fontSize: 18,
    fontWeight: '800',
  },
  techProgressFraction: {
    fontSize: 11,
    fontWeight: '600',
  },
  techDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  modulesContainer: {
    gap: 10,
  },
  moduleCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
  },
  moduleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  moduleSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  moduleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  moduleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  lessonsList: {
    paddingHorizontal: 8,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 6,
  },
  lessonRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  lessonInfo: {
    flex: 1,
    gap: 2,
  },
  lessonTitleText: {
    fontSize: 14,
  },
  lessonOverviewText: {
    fontSize: 11,
  },
  lessonRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  diffPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  diffText: {
    fontSize: 10,
    fontWeight: '700',
  },
  syncCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  syncTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  syncSubtitle: {
    fontSize: 11,
  },
  syncBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  syncBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  syncNoticeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
