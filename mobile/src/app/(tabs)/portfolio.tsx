import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as SecureStore from 'expo-secure-store';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Button, Card, Field } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import type { PortfolioItem } from '@/types/api';
import {
  SocialLinksModal,
  SkillModal,
  PublicPortfolioModal,
} from '@/components/portfolio/PortfolioModals';
import {
  CareerStudioModal,
  CAREER_TOOLS,
  type CareerToolId,
} from '@/components/portfolio/CareerStudioModal';

interface HubSkillSignal {
  id: string;
  name: string;
  completedLessons: number;
  totalLessons: number;
  percent: number;
}

interface ManualSkillSignal {
  id: string;
  name: string;
  level: number;
}

const LINKS_KEY = 'synergysphere.portfolio.links';

export default function PortfolioScreen() {
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';
  const primaryAccent = isLight ? '#1e6827' : colors.primary;
  const { user } = useAuth();

  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    projectLink: '',
    githubLink: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  // Social Links
  const [links, setLinks] = useState({ github: '', linkedin: '' });
  const [targetRole, setTargetRole] = useState('');
  const [showLinksModal, setShowLinksModal] = useState(false);

  // Real Skills from Hub & DB
  const [hubSkills, setHubSkills] = useState<HubSkillSignal[]>([]);
  const [manualSkills, setManualSkills] = useState<ManualSkillSignal[]>([]);
  const [showSkillModal, setShowSkillModal] = useState(false);

  // Modals
  const [showPublicModal, setShowPublicModal] = useState(false);
  const [activeCareerTool, setActiveCareerTool] = useState<CareerToolId | null>(null);

  const fullName = `${user?.firstName ?? 'Student'} ${user?.lastName ?? 'Developer'}`;

  // Combined skills for career studio
  const effectiveSkills: [string, number][] = [
    ...hubSkills.filter((h) => h.percent > 0).map((h): [string, number] => [h.name, h.percent]),
    ...manualSkills.map((m): [string, number] => [m.name, m.level]),
  ];

  const [refreshing, setRefreshing] = useState(false);

  // Load portfolio items and profile signals from backend
  const load = useCallback(async () => {
    try {
      const [portfolioRes, signalsRes] = await Promise.allSettled([
        api.get<PortfolioItem[]>('/portfolio'),
        api.get<{
          profile: { githubUrl?: string; linkedinUrl?: string; targetRole?: string };
          hubSkills: HubSkillSignal[];
          manualSkills: ManualSkillSignal[];
        }>('/portfolio/profile-signals'),
      ]);

      if (portfolioRes.status === 'fulfilled') {
        setItems(portfolioRes.value);
      }

      if (signalsRes.status === 'fulfilled') {
        const sig = signalsRes.value;
        if (sig.hubSkills) setHubSkills(sig.hubSkills);
        if (sig.manualSkills) setManualSkills(sig.manualSkills);
        if (sig.profile) {
          setLinks({
            github: sig.profile.githubUrl || '',
            linkedin: sig.profile.linkedinUrl || '',
          });
            setTargetRole(sig.profile.targetRole || '');
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your portfolio.');
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
    void load();
  }, [load]);

  async function saveLinks(newLinks: { github: string; linkedin: string }) {
    setLinks(newLinks);
    try {
      await api.put('/portfolio/profile', {
        githubUrl: newLinks.github,
        linkedinUrl: newLinks.linkedin,
      });
      const serialized = JSON.stringify(newLinks);
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem(LINKS_KEY, serialized);
      } else {
        await SecureStore.setItemAsync(LINKS_KEY, serialized);
      }
    } catch (e) {
      console.warn('Error saving links:', e);
    }
  }

  async function saveSkill(name: string, level: number) {
    try {
      const added = await api.post<ManualSkillSignal>('/portfolio/skills', {
        name,
        level,
        category: 'Manual',
      });
      setManualSkills((prev) => [...prev.filter((s) => s.name.toLowerCase() !== name.toLowerCase()), added]);
    } catch {
      const fallback: ManualSkillSignal = { id: `local-${Date.now()}`, name, level };
      setManualSkills((prev) => [...prev.filter((s) => s.name.toLowerCase() !== name.toLowerCase()), fallback]);
    }
  }

  async function removeSkill(skillId: string) {
    setManualSkills((prev) => prev.filter((s) => s.id !== skillId));
    try {
      await api.delete(`/portfolio/skills/${skillId}`);
    } catch (e) {
      console.warn('Error deleting skill:', e);
    }
  }

  async function saveProject() {
    if (!form.title.trim()) return;

    try {
      setError('');

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        projectLink: form.projectLink.trim(),
        githubLink: form.githubLink.trim(),
      };

      if (editingProjectId) {
        await api.put(`/portfolio/${editingProjectId}`, payload);
      } else {
        await api.post('/portfolio', payload);
      }

      setForm({
        title: '',
        description: '',
        projectLink: '',
        githubLink: '',
      });

      setEditingProjectId(null);
      setShowForm(false);

      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : editingProjectId
            ? 'Could not update this project.'
            : 'Could not save this project.',
      );
    }
  }

  function startEditingProject(item: PortfolioItem) {
    setForm({
      title: item.title ?? '',
      description: item.description ?? '',
      projectLink: item.projectLink ?? '',
      githubLink: item.githubLink ?? '',
    });

    setEditingProjectId(item.id);
    setShowForm(true);
  }

  function cancelProjectForm() {
    setForm({
      title: '',
      description: '',
      projectLink: '',
      githubLink: '',
    });

    setEditingProjectId(null);
    setShowForm(false);
  }

  function removeProject(id: string) {
    Alert.alert(
      'Delete Project',
      'Are you sure you want to permanently delete this project? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setError('');

              await api.delete(`/portfolio/${id}`);

              setItems((current) =>
                current.filter((item) => item.id !== id),
              );
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : 'Could not remove this project.',
              );
            }
          },
        },
      ],
    );
  }

  if (!loaded) return <Loading />;

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      <View style={styles.container}>
        {/* Top Header & Actions */}
        <View style={styles.topHeader}>
          <Image
            source={require('../../../assets/images/portfolio-logo.png')}
            style={styles.portfolioLogo}
            resizeMode="contain"
          />

          <View style={styles.headerTextContainer}>
            <Text style={[styles.kicker, { color: primaryAccent }]}>
              PORTFOLIO & CAREER CENTER
            </Text>

            <View style={styles.portfolioHeadingWrap}>
              <Text style={[styles.portfolioHeading, { color: colors.text }]}>
                Career Profile
              </Text>

              <Text style={[styles.portfolioSubtitle, { color: colors.muted }]}>
                Showcase your projects, skills, achievements, and career readiness.
              </Text>
            </View>
          </View>
        </View>

        {error ? <Notice>{error}</Notice> : null}

        {/* Action Buttons */}
        <View style={styles.quickActionRow}>
          <Pressable
            onPress={() => setShowPublicModal(true)}
            style={[styles.headerActionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
          >
            <Ionicons name="eye-outline" size={16} color={colors.text} />
            <Text style={[styles.headerActionText, { color: colors.text }]}>View Portfolio</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              if (showForm) {
                cancelProjectForm();
              } else {
                setEditingProjectId(null);
                setForm({
                  title: '',
                  description: '',
                  projectLink: '',
                  githubLink: '',
                });
                setShowForm(true);
              }
}}
            style={[styles.headerActionBtn, { backgroundColor: primaryAccent, borderColor: primaryAccent }]}
          >
            <Ionicons name={showForm ? 'close' : 'add'} size={16} color={isLight ? '#FFFFFF' : colors.primaryText} />
            <Text style={[styles.headerActionText, { color: isLight ? '#FFFFFF' : colors.primaryText }]}>
              {showForm ? 'Close Form' : 'Add Project'}
            </Text>
          </Pressable>
        </View>

        {/* Add Project Form Card */}
        {showForm && (
          <Card>
            <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>
              {editingProjectId ? 'Edit Project' : 'Add New Project'}
            </Text>
            <Field label="Project title *" value={form.title} onChangeText={(title) => setForm({ ...form, title })} placeholder="e.g. Student Management API" />
            <Field label="Description" value={form.description} onChangeText={(description) => setForm({ ...form, description })} multiline placeholder="Architecture, technologies (Spring Boot, SQL, JWT)..." />
            <Field label="Project URL (optional)" value={form.projectLink} onChangeText={(projectLink) => setForm({ ...form, projectLink })} autoCapitalize="none" placeholder="https://..." />
            <Field label="GitHub URL (optional)" value={form.githubLink} onChangeText={(githubLink) => setForm({ ...form, githubLink })} autoCapitalize="none" placeholder="https://github.com/..." />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              {editingProjectId ? (
                <Button
                  title="Cancel"
                  onPress={cancelProjectForm}
                  secondary
                />
              ) : null}

              <Button
                title={editingProjectId ? 'Save Changes' : 'Save Project'}
                onPress={saveProject}
                disabled={!form.title.trim()}
              />
            </View>
          </Card>
        )}

        {/* ── 1. Profile Hero Card ────────────────────────────────────────── */}
        <Card>
          <View style={styles.profileRow}>
              <View
                style={[
                  styles.avatarBig,
                  {
                    backgroundColor: isLight
                      ? '#E8F5E9'
                      : 'rgba(30, 104, 39, 0.25)',
                    borderColor: primaryAccent,
                  },
                ]}
              >
                {user?.profilePicture ? (
                  <Image
                    source={{ uri: user.profilePicture }}
                    style={styles.avatarBigImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={[styles.avatarBigText, { color: primaryAccent }]}>
                    {user?.firstName?.[0] ?? 'S'}
                    {user?.lastName?.[0] ?? 'D'}
                  </Text>
                )}
              </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.profileName, { color: colors.text }]}>{fullName}</Text>
              <Text style={[styles.profileTitle, { color: primaryAccent }]}>Student Developer</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.levelBadge, { backgroundColor: isLight ? '#E8F5E9' : colors.surfaceElevated }]}>
                  <Text style={[styles.levelBadgeText, { color: isLight ? '#1e6827' : colors.text }]}>Level {user?.level ?? 1}</Text>
                </View>
                <View style={[styles.levelBadge, { backgroundColor: isLight ? '#E8F5E9' : colors.surfaceElevated }]}>
                  <Text style={[styles.levelBadgeText, { color: isLight ? '#1e6827' : colors.text }]}>{user?.xp ?? 285} XP</Text>
                </View>
              </View>
            </View>
          </View>

          <Text style={[styles.profileBio, { color: colors.muted }]}>
            Passionate about building scalable backend systems, robust RESTful APIs, and solving real-world problems.
          </Text>

          {/* Social Links & CV buttons */}
          <View style={styles.socialButtonsRow}>
            <Pressable
              onPress={() => setShowLinksModal(true)}
              style={[
                styles.socialPill,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Manage social links"
            >
              <Ionicons
                name="link-outline"
                size={16}
                color={primaryAccent}
              />

              <Text style={[styles.socialPillText, { color: colors.text }]}>
                Social Links
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveCareerTool('resume')}
              style={[
                styles.socialPill,
                {
                  backgroundColor: isLight ? '#E8F5E9' : colors.surfaceElevated,
                  borderColor: isLight ? primaryAccent : colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Open Career Studio"
            >
              <Ionicons
                name="sparkles-outline"
                size={15}
                color={primaryAccent}
              />

              <Text style={[styles.socialPillText, { color: primaryAccent }]}>
                Career Studio
              </Text>
            </Pressable>
          </View>
        </Card>

        {/* ── 2. Featured Projects Section ─────────────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="briefcase" size={18} color={primaryAccent} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured Projects</Text>
          </View>
          <Text style={[styles.countBadge, { color: colors.muted }]}>{items.length} projects</Text>
        </View>

        {items.length === 0 ? (
          <Card>
            <Text style={[styles.emptyNotice, { color: colors.muted }]}>
              No projects added yet. Tap <Text style={{ color: primaryAccent, fontWeight: '700' }}>"Add Project"</Text> above to showcase your work.
            </Text>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id}>
              <View style={styles.projectCardHeader}>
                <Text style={[styles.projectTitle, { color: colors.text }]}>{item.title}</Text>
                <View style={styles.projectActions}>
                  <Pressable
                    onPress={() => startEditingProject(item)}
                    style={styles.projectActionBtn}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${item.title}`}
                  >
                    <Ionicons
                      name="create-outline"
                      size={17}
                      color={primaryAccent}
                    />
                  </Pressable>

                  <Pressable
                    onPress={() => removeProject(item.id)}
                    style={styles.projectActionBtn}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${item.title}`}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={17}
                      color="#ef4444"
                    />
                  </Pressable>
                </View>
              </View>

              {item.description ? (
                <Text style={[styles.projectDesc, { color: colors.muted }]}>{item.description}</Text>
              ) : null}

              <View style={styles.projectLinksGroup}>
                {item.projectLink ? (
                  <Pressable
                    onPress={() => Linking.openURL(item.projectLink!)}
                    style={[styles.linkBtn, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.2)', borderColor: primaryAccent, borderWidth: 1 }]}
                  >
                    <Ionicons name="open-outline" size={13} color={primaryAccent} />
                    <Text style={[styles.linkBtnText, { color: primaryAccent }]}>Live Demo</Text>
                  </Pressable>
                ) : null}

                {item.githubLink ? (
                  <Pressable
                    onPress={() => Linking.openURL(item.githubLink!)}
                    style={[styles.linkBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]}
                  >
                    <Ionicons name="logo-github" size={13} color={colors.text} />
                    <Text style={[styles.linkBtnText, { color: colors.text }]}>Source Code</Text>
                  </Pressable>
                ) : null}
              </View>
            </Card>
          ))
        )}

        {/* ── 3. AI Career Development Studio Grid ─────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="sparkles" size={18} color={primaryAccent} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Career Tools</Text>
          </View>
          <Pressable
            onPress={() => setActiveCareerTool('resume')}
            style={({ pressed }) => [
              styles.openStudioButton,
              {
                borderColor: primaryAccent,
                backgroundColor: isLight
                  ? '#E8F5E9'
                  : colors.surfaceElevated,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open Career Studio"
          >
            <Ionicons
              name="sparkles-outline"
              size={14}
              color={primaryAccent}
            />

            <Text style={[styles.openStudioText, { color: primaryAccent }]}>
              OPEN STUDIO
            </Text>
          </Pressable>
        </View>

        <View style={styles.careerToolsGrid}>
          {CAREER_TOOLS.map((tool) => (
            <Pressable
              key={tool.id}
              onPress={() => setActiveCareerTool(tool.id)}
              style={({ pressed }) => [
                styles.careerToolCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={styles.toolCardTop}>
                <View style={[styles.toolIconWrap, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.2)' }]}>
                  <Ionicons name={tool.icon} size={18} color={primaryAccent} />
                </View>
                <View style={[styles.toolBadge, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.2)' }]}>
                  <Text style={[styles.toolBadgeText, { color: primaryAccent }]}>{tool.badge}</Text>
                </View>
              </View>

              <Text style={[styles.toolTitle, { color: colors.text }]}>{tool.label}</Text>
              <Text style={[styles.toolDesc, { color: colors.muted }]} numberOfLines={2}>
                {tool.desc}
              </Text>

              <View style={styles.toolLaunchRow}>
                <Text style={[styles.toolLaunchText, { color: primaryAccent }]}>Launch Studio</Text>
                <Ionicons name="arrow-forward" size={13} color={primaryAccent} />
              </View>
            </Pressable>
          ))}
        </View>

        {/* ── 4. Technical Skills Section ─────────────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="code-slash" size={18} color={primaryAccent} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Learning Hub Verified Skills</Text>
          </View>
          <Pressable
            onPress={() => setShowSkillModal(true)}
            style={[styles.addSkillBtn, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.2)', borderColor: primaryAccent, borderWidth: 1 }]}
          >
            <Ionicons name="add" size={14} color={primaryAccent} />
            <Text style={[styles.addSkillText, { color: primaryAccent }]}>Custom Skill</Text>
          </Pressable>
        </View>

        <Card>
          <View style={{ gap: 14 }}>
            {hubSkills.filter((h) => h.percent > 0).length > 0 ? (
              hubSkills
                .filter((h) => h.percent > 0)
                .map((skill) => (
                  <View key={skill.id} style={styles.skillItem}>
                    <View style={styles.skillHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="checkmark-circle" size={14} color={primaryAccent} />
                        <Text style={[styles.skillName, { color: colors.text }]}>{skill.name}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 11, color: colors.muted }}>
                          {skill.completedLessons}/{skill.totalLessons}
                        </Text>
                        <Text style={[styles.skillPercent, { color: primaryAccent }]}>{skill.percent}%</Text>
                      </View>
                    </View>
                    <View style={[styles.progressTrack, { backgroundColor: colors.surfaceElevated }]}>
                      <View style={[styles.progressFill, { width: `${Math.max(5, skill.percent)}%`, backgroundColor: primaryAccent }]} />
                    </View>
                  </View>
                ))
            ) : (
              <View style={{ paddingVertical: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'center' }}>
                  No completed Learning Hub lessons yet. Complete curriculum tracks to unlock verified skill bars.
                </Text>
              </View>
            )}

            {manualSkills.length > 0 && (
              <View style={{ paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, gap: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' }}>
                  Custom &amp; Additional Skills
                </Text>
                {manualSkills.map((s) => (
                  <View key={s.id} style={styles.skillItem}>
                    <View style={styles.skillHeader}>
                      <Text style={[styles.skillName, { color: colors.text }]}>{s.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={[styles.skillPercent, { color: primaryAccent }]}>{s.level}%</Text>
                        <Pressable onPress={() => removeSkill(s.id)} hitSlop={6}>
                          <Ionicons name="close-circle-outline" size={16} color={colors.muted} />
                        </Pressable>
                      </View>
                    </View>
                    <View style={[styles.progressTrack, { backgroundColor: colors.surfaceElevated }]}>
                      <View style={[styles.progressFill, { width: `${s.level}%`, backgroundColor: primaryAccent }]} />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </Card>
      </View>

      {/* ── Modals ── */}
      <SocialLinksModal
        visible={showLinksModal}
        onClose={() => setShowLinksModal(false)}
        links={links}
        onSave={saveLinks}
      />

      <SkillModal
        visible={showSkillModal}
        onClose={() => setShowSkillModal(false)}
        onSave={saveSkill}
      />

      <PublicPortfolioModal
        visible={showPublicModal}
        onClose={() => setShowPublicModal(false)}
        user={user}
        items={items}
        skills={effectiveSkills}
        links={links}
      />

      <CareerStudioModal
        visible={activeCareerTool !== null}
        onClose={() => setActiveCareerTool(null)}
        initialTool={activeCareerTool ?? 'resume'}
        user={user}
        skills={effectiveSkills}
        linkedinUrl={links.linkedin}
        savedTargetRole={targetRole}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 40,
  },
  topHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 14,
},
portfolioLogo: {
  width: 64,
  height: 64,
  borderRadius: 16,
},
headerTextContainer: {
  flex: 1,
},
portfolioHeadingWrap: {
  gap: 3,
},

portfolioHeading: {
  fontSize: 24,
  fontWeight: '900',
  letterSpacing: -0.6,
  lineHeight: 29,
},

portfolioSubtitle: {
  fontSize: 13,
  fontWeight: '500',
  lineHeight: 19,
  maxWidth: 320,
},
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  headerActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },

  // Profile Card Styles
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarBig: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBigImage: {
  width: '100%',
  height: '100%',
  borderRadius: 32,
},
  avatarBigText: {
    fontSize: 26,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
  },
  profileTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  profileBio: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  socialButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  socialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  socialPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  socialIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  countBadge: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 0,
  },

  // Project Card Styles
  projectCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  projectTitle: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  projectActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },

projectActionBtn: {
  padding: 6,
},
  projectDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  projectLinksGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  linkBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyNotice: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingVertical: 12,
  },

  // Career Tools Grid
  careerToolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  careerToolCard: {
    width: '48%',
    flexGrow: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 6,
  },
  toolCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  toolIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  toolBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  toolTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  toolDesc: {
    fontSize: 11,
    lineHeight: 15,
    minHeight: 30,
  },
  toolLaunchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  toolLaunchText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Skills Section Styles
  addSkillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addSkillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  skillItem: {
    gap: 6,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  skillName: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  skillPercent: {
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  openStudioButton: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 5,
  paddingHorizontal: 10,
  paddingVertical: 7,
  borderRadius: 10,
  borderWidth: 1,
},

openStudioText: {
  fontSize: 10,
  fontWeight: '800',
  letterSpacing: 0.5,
},
});
