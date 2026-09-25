import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import type { User } from '@/types/api';

export type CareerToolId = 'resume' | 'cv' | 'linkedin' | 'jobs';

export const CAREER_TOOLS = [
  {
    id: 'resume' as CareerToolId,
    label: 'Resume Builder',
    icon: 'document-text' as keyof typeof Ionicons.glyphMap,
    desc: 'Generate an ATS-optimized, modern 1-page software engineer resume',
    badge: 'ATS Ready',
  },
  {
    id: 'cv' as CareerToolId,
    label: 'CV Generator',
    icon: 'layers' as keyof typeof Ionicons.glyphMap,
    desc: 'Create an in-depth academic & technical Curriculum Vitae',
    badge: 'Academic & Tech',
  },
  {
    id: 'linkedin' as CareerToolId,
    label: 'LinkedIn Optimizer',
    icon: 'logo-linkedin' as keyof typeof Ionicons.glyphMap,
    desc: 'Optimized headlines, About narrative, and recruiter keyword tags',
    badge: 'Recruiter Ready',
  },
  {
    id: 'jobs' as CareerToolId,
    label: 'Job Match',
    icon: 'briefcase' as keyof typeof Ionicons.glyphMap,
    desc: 'Matched job roles with salary estimates, missing skills & 1-click search',
    badge: 'Live Matches',
  },
] as const;

export const PRESET_ROLES = [
  'Junior Backend Developer (Java / Spring)',
  'Junior Full-Stack Software Engineer',
  'Junior Software Engineer (General)',
  'Backend API Engineer',
  'Junior React / Frontend Developer',
  'Junior Data / SQL Developer',
  'Software Engineering Intern',
];

interface CareerStudioModalProps {
  visible: boolean;
  onClose: () => void;
  initialTool?: CareerToolId;
  user: User | null;
  skills: [string, number][];
  linkedinUrl?: string;
}

export function CareerStudioModal({
  visible,
  onClose,
  initialTool = 'resume',
  user,
  skills,
  linkedinUrl,
}: CareerStudioModalProps) {
  const { colors } = useTheme();
  const [activeTool, setActiveTool] = useState<CareerToolId>(initialTool);
  const [targetRole, setTargetRole] = useState(PRESET_ROLES[0]);
  const [loading, setLoading] = useState(false);
  const [outputs, setOutputs] = useState<Record<string, string>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live jobs state
  const [jobsData, setJobsData] = useState<{
    role: string;
    location: string;
    configured: boolean;
    source: string;
    jobs: {
      id: string;
      title: string;
      company: string;
      location: string;
      postedAt: string;
      salary?: string;
      url: string;
      matchPercent: number;
      matchingSkills: string[];
      missingSkills: string[];
    }[];
    searchLinks: {
      linkedin: string;
      indeed: string;
      googleJobs: string;
    };
  } | null>(null);

  const fullName = `${user?.firstName ?? 'Student'} ${user?.lastName ?? 'Developer'}`;
  const skillsSummary = skills.map(([name, pct]) => `${name} (${pct}%)`).join(', ');

  useEffect(() => {
    if (visible && initialTool) {
      setActiveTool(initialTool);
    }
  }, [visible, initialTool]);

  useEffect(() => {
    if (visible) {
      if (activeTool === 'jobs') {
        void fetchLiveJobs(targetRole);
      } else {
        const cacheKey = `${activeTool}_${targetRole}`;
        if (!outputs[cacheKey]) {
          void fetchCareerContent(activeTool, targetRole);
        }
      }
    }
  }, [visible, activeTool, targetRole]);

  async function fetchLiveJobs(role: string) {
    setLoading(true);
    try {
      const res = await api.get<{
        role: string;
        location: string;
        configured: boolean;
        source: string;
        jobs: any[];
        searchLinks: { linkedin: string; indeed: string; googleJobs: string };
      }>(`/portfolio/jobs?role=${encodeURIComponent(role)}`);
      setJobsData(res);
    } catch (e) {
      console.warn('Jobs fetch error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCareerContent(toolId: CareerToolId, role: string) {
    if (toolId === 'jobs') return;
    setLoading(true);
    try {
      const res = await api.post<{ content: string; tool: string; targetRole: string }>(
        '/portfolio/career-tools',
        {
          tool: toolId,
          targetRole: role,
          skills,
        }
      );
      if (res?.content) {
        setOutputs((prev) => ({
          ...prev,
          [`${toolId}_${role}`]: res.content,
          [toolId]: res.content,
        }));
      }
    } catch (e) {
      console.warn('Career tool generation error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(key: string, text: string) {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    } else {
      await Share.share({ message: text });
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  }

  async function handleShare(title: string, text: string) {
    await Share.share({ message: text, title });
  }

  const currentOutput = outputs[`${activeTool}_${targetRole}`] || outputs[activeTool] || '';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Top Bar */}
          <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.sparkleIcon, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="sparkles" size={16} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Career Studio</Text>
                <Text style={[styles.headerSubtitle, { color: colors.muted }]}>Tailored for {fullName}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons name="close" size={18} color={colors.text} />
            </Pressable>
          </View>

          {/* Tool Switcher Pills */}
          <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
              {CAREER_TOOLS.map((t) => {
                const isActive = activeTool === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setActiveTool(t.id)}
                    style={[
                      styles.tabPill,
                      {
                        backgroundColor: isActive ? colors.primary : colors.surfaceElevated,
                        borderColor: isActive ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={t.icon}
                      size={14}
                      color={isActive ? colors.primaryText : colors.muted}
                    />
                    <Text
                      style={[
                        styles.tabPillText,
                        { color: isActive ? colors.primaryText : colors.text },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Role Selector Toolbar */}
          <View style={[styles.roleBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Text style={[styles.roleLabel, { color: colors.muted }]}>TARGET ROLE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleChips}>
              {PRESET_ROLES.map((r) => {
                const isSelected = targetRole === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setTargetRole(r)}
                    style={[
                      styles.roleChip,
                      {
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? `${colors.primary}20` : colors.surfaceElevated,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        { color: isSelected ? colors.primary : colors.muted },
                      ]}
                    >
                      {r}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Action Toolbar */}
          <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>
            <Pressable
              onPress={() => fetchCareerContent(activeTool, targetRole)}
              disabled={loading || activeTool === 'jobs'}
              style={[
                styles.actionBtn,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border, opacity: activeTool === 'jobs' ? 0.5 : 1 },
              ]}
            >
              <Ionicons name="refresh" size={14} color={colors.text} />
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Regenerate</Text>
            </Pressable>

            {currentOutput && activeTool !== 'jobs' ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => handleCopy('main_output', currentOutput)}
                  style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                >
                  <Ionicons
                    name={copiedKey === 'main_output' ? 'checkmark' : 'copy-outline'}
                    size={14}
                    color={colors.primaryText}
                  />
                  <Text style={[styles.actionBtnText, { color: colors.primaryText }]}>
                    {copiedKey === 'main_output' ? 'Copied!' : 'Copy'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleShare(`${fullName} — ${CAREER_TOOLS.find((t) => t.id === activeTool)?.label}`, currentOutput)}
                  style={[styles.actionBtn, { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }]}
                >
                  <Ionicons name="share-outline" size={14} color={colors.primary} />
                  <Text style={[styles.actionBtnText, { color: colors.primary }]}>Share</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {/* Main Content Body */}
          <ScrollView contentContainerStyle={styles.contentScroll} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingTitle, { color: colors.text }]}>
                  Generating {CAREER_TOOLS.find((t) => t.id === activeTool)?.label}…
                </Text>
                <Text style={[styles.loadingDesc, { color: colors.muted }]}>
                  Analyzing your {skills.length} competencies and projects for {targetRole}
                </Text>
              </View>
            ) : activeTool === 'jobs' ? (
              /* ── Job Match Intelligence ────────────────────────────────────────── */
              <View style={{ gap: 14 }}>
                <View style={[styles.intelCard, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}40` }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="sparkles" size={16} color={colors.primary} />
                    <Text style={[styles.intelTitle, { color: colors.text }]}>Live Job Match Intelligence</Text>
                  </View>
                  <Text style={[styles.intelDesc, { color: colors.muted }]}>
                    Computed from your verified skills: <Text style={{ color: colors.text, fontWeight: '700' }}>{skillsSummary}</Text>.
                  </Text>
                </View>

                {!jobsData?.configured && (
                  <View style={[styles.intelCard, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="information-circle-outline" size={16} color="#f59e0b" />
                      <Text style={[styles.intelTitle, { color: '#f59e0b' }]}>Live Aggregator Notice</Text>
                    </View>
                    <Text style={[styles.intelDesc, { color: colors.muted }]}>
                      Configure ADZUNA_APP_ID & ADZUNA_APP_KEY in backend/.env for real-time listings. In the meantime, use targeted 1-click hiring queries below.
                    </Text>
                    {jobsData?.searchLinks && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                        <Pressable
                          onPress={() => Linking.openURL(jobsData.searchLinks.linkedin)}
                          style={[styles.searchBtn, { backgroundColor: 'rgba(0, 119, 181, 0.2)' }]}
                        >
                          <Ionicons name="logo-linkedin" size={13} color="#0077b5" />
                          <Text style={[styles.searchBtnText, { color: '#38bdf8' }]}>LinkedIn Jobs</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => Linking.openURL(jobsData.searchLinks.indeed)}
                          style={[styles.searchBtn, { backgroundColor: colors.surfaceElevated }]}
                        >
                          <Ionicons name="search" size={13} color={colors.text} />
                          <Text style={[styles.searchBtnText, { color: colors.text }]}>Indeed</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => Linking.openURL(jobsData.searchLinks.googleJobs)}
                          style={[styles.searchBtn, { backgroundColor: colors.surfaceElevated }]}
                        >
                          <Ionicons name="globe-outline" size={13} color={colors.text} />
                          <Text style={[styles.searchBtnText, { color: colors.text }]}>Google Jobs</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                )}

                {jobsData?.jobs && jobsData.jobs.map((job) => (
                  <View key={job.id} style={[styles.jobCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.jobTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.jobTitle, { color: colors.text }]}>{job.title}</Text>
                        <Text style={[styles.jobDesc, { color: colors.muted, marginTop: 2 }]}>
                          {job.company} · {job.location}
                        </Text>
                      </View>
                      <View style={[styles.matchBadge, { backgroundColor: `${colors.primary}20` }]}>
                        <Text style={[styles.matchBadgeText, { color: colors.primary }]}>{job.matchPercent}% Match</Text>
                      </View>
                    </View>

                    {/* Matching & Next Skills */}
                    {job.matchingSkills && job.matchingSkills.length > 0 && (
                      <View style={styles.skillBadgeGroup}>
                        <Text style={[styles.skillGroupLabel, { color: colors.muted }]}>Matching:</Text>
                        {job.matchingSkills.map((s) => (
                          <View key={s} style={[styles.skillTag, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                            <Text style={[styles.skillTagText, { color: '#10b981' }]}>✓ {s}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {job.missingSkills && job.missingSkills.length > 0 && (
                      <View style={styles.skillBadgeGroup}>
                        <Text style={[styles.skillGroupLabel, { color: colors.muted }]}>Next:</Text>
                        {job.missingSkills.map((s) => (
                          <View key={s} style={[styles.skillTag, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                            <Text style={[styles.skillTagText, { color: '#f59e0b' }]}>+ {s}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {job.salary && (
                      <Text style={[styles.jobSalary, { color: colors.text }]}>
                        Est. Salary: <Text style={{ color: colors.primary, fontWeight: '800' }}>{job.salary}</Text>
                      </Text>
                    )}

                    {/* Apply & Search Buttons */}
                    <View style={[styles.jobSearchRow, { borderTopColor: colors.border }]}>
                      <Pressable
                        onPress={() => Linking.openURL(job.url)}
                        style={[styles.searchBtn, { backgroundColor: colors.primary }]}
                      >
                        <Ionicons name="open-outline" size={13} color={colors.primaryText} />
                        <Text style={[styles.searchBtnText, { color: colors.primaryText, fontWeight: '700' }]}>View Listing</Text>
                      </Pressable>

                      {jobsData?.searchLinks && (
                        <Pressable
                          onPress={() => Linking.openURL(jobsData.searchLinks.linkedin)}
                          style={[styles.searchBtn, { backgroundColor: 'rgba(0, 119, 181, 0.15)' }]}
                        >
                          <Ionicons name="logo-linkedin" size={13} color="#0077b5" />
                          <Text style={[styles.searchBtnText, { color: '#38bdf8' }]}>LinkedIn</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ) : activeTool === 'linkedin' ? (
              /* ── LinkedIn Optimizer ────────────────────────────────────────────── */
              <View style={{ gap: 18 }}>
                {/* Headlines */}
                <View>
                  <Text style={[styles.subSectionTitle, { color: colors.text }]}>
                    1. High-Converting LinkedIn Headlines
                  </Text>
                  <View style={{ gap: 10, marginTop: 8 }}>
                    {[
                      {
                        type: 'Impact & Stack (Recruiter Favorite)',
                        text: `${fullName} | ${targetRole} | Java • Spring Boot • SQL • React | Building Scalable, High-Performance Software Solutions`,
                      },
                      {
                        type: 'Value Proposition & Architecture',
                        text: `Aspiring Software Engineer specializing in Robust Backend Systems, Clean Architecture & Modern Web Applications | Java & React Enthusiast`,
                      },
                      {
                        type: 'Student / Graduate Fast-Track',
                        text: `Computer Science Developer | Passionate about Backend APIs, Microservices & Data-Driven Platforms | Seeking Software Engineering Roles`,
                      },
                    ].map((item, idx) => (
                      <View key={idx} style={[styles.headlineCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={[styles.headlineType, { color: colors.primary }]}>{item.type}</Text>
                          <Text style={[styles.headlineText, { color: colors.text }]}>{item.text}</Text>
                        </View>
                        <Pressable
                          onPress={() => handleCopy(`hl_${idx}`, item.text)}
                          style={[styles.smallCopyBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                        >
                          <Ionicons
                            name={copiedKey === `hl_${idx}` ? 'checkmark' : 'copy-outline'}
                            size={14}
                            color={copiedKey === `hl_${idx}` ? colors.primary : colors.muted}
                          />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>

                {/* About Story */}
                <View>
                  <View style={styles.aboutHeader}>
                    <Text style={[styles.subSectionTitle, { color: colors.text }]}>
                      2. High-Impact "About" Narrative
                    </Text>
                    <Pressable
                      onPress={() =>
                        handleCopy(
                          'about',
                          `Hello! I'm a software developer with a relentless curiosity for how scalable systems work behind the scenes.\n\nMy primary technical focus is backend engineering with Java and Spring Boot, complemented by deep hands-on experience in SQL databases, RESTful API design, and modern React interfaces. I believe that great software isn't just about making things work—it's about writing clean, maintainable, and well-tested code that solves genuine real-world problems.\n\nWhat I Bring to the Table:\n• Backend Architecture: Designing robust REST APIs, secure authentication (JWT), and modular business logic.\n• Database Design: Crafting normalized PostgreSQL/MySQL schemas, indexing for performance, and managing complex queries.\n• Full-Stack Fluency: Bridging frontend and backend seamlessly with React and modern web tooling.\n• Growth Mindset: Constantly leveling up through technical challenges on SynergySphere, building side projects, and reading architecture case studies.\n\nI am currently looking to connect with engineering leaders, technical recruiters, and fellow developers. Let's talk tech, collaborate on open-source, or explore software engineering roles!`
                        )
                      }
                      style={[styles.smallCopyBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                    >
                      <Ionicons
                        name={copiedKey === 'about' ? 'checkmark' : 'copy-outline'}
                        size={14}
                        color={copiedKey === 'about' ? colors.primary : colors.muted}
                      />
                      <Text style={[styles.smallCopyBtnText, { color: copiedKey === 'about' ? colors.primary : colors.text }]}>
                        {copiedKey === 'about' ? 'Copied' : 'Copy'}
                      </Text>
                    </Pressable>
                  </View>

                  <View style={[styles.aboutCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.aboutBody, { color: colors.text }]}>
                      Hello! I'm a software developer with a relentless curiosity for how scalable systems work behind the scenes.{'\n\n'}
                      My primary technical focus is backend engineering with <Text style={{ fontWeight: '700' }}>Java and Spring Boot</Text>, complemented by deep hands-on experience in <Text style={{ fontWeight: '700' }}>SQL databases, RESTful API design, and modern React interfaces</Text>.{'\n\n'}
                      <Text style={{ fontWeight: '700' }}>What I Bring to the Table:</Text>{'\n'}
                      • <Text style={{ fontWeight: '600' }}>Backend Architecture:</Text> Designing robust REST APIs, secure authentication (JWT), and modular business logic.{'\n'}
                      • <Text style={{ fontWeight: '600' }}>Database Design:</Text> Crafting normalized PostgreSQL schemas and optimizing complex queries.{'\n'}
                      • <Text style={{ fontWeight: '600' }}>Growth Mindset:</Text> Leveling up via SynergySphere verified projects.
                    </Text>
                  </View>
                </View>

                {/* Recruiter Keywords */}
                <View>
                  <Text style={[styles.subSectionTitle, { color: colors.text }]}>
                    3. Top 10 Recruiter Search Keywords
                  </Text>
                  <View style={styles.keywordGrid}>
                    {[
                      'Java',
                      'Spring Boot',
                      'REST APIs',
                      'PostgreSQL / SQL',
                      'React.js',
                      'Object-Oriented Programming (OOP)',
                      'Git & GitHub',
                      'Database Design',
                      'SDLC',
                      'Data Structures & Algorithms',
                    ].map((kw) => (
                      <Pressable
                        key={kw}
                        onPress={() => handleCopy(`kw_${kw}`, kw)}
                        style={[
                          styles.keywordChip,
                          {
                            backgroundColor: copiedKey === `kw_${kw}` ? `${colors.primary}30` : colors.surfaceElevated,
                            borderColor: copiedKey === `kw_${kw}` ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.keywordText, { color: copiedKey === `kw_${kw}` ? colors.primary : colors.text }]}>
                          {copiedKey === `kw_${kw}` ? '✓ Copied' : `+ ${kw}`}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Go to LinkedIn action */}
                <Pressable
                  onPress={() => Linking.openURL(linkedinUrl?.startsWith('http') ? linkedinUrl : 'https://www.linkedin.com')}
                  style={[styles.linkedInActionBtn, { backgroundColor: '#0077b5' }]}
                >
                  <Ionicons name="logo-linkedin" size={18} color="#fff" />
                  <Text style={styles.linkedInActionText}>Go to LinkedIn Profile</Text>
                </Pressable>
              </View>
            ) : (
              /* ── Formatted Document Output (Resume / CV) ───────────────────────── */
              <View style={[styles.docCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {currentOutput ? (
                  <Text style={[styles.docText, { color: colors.text }]}>{currentOutput}</Text>
                ) : (
                  <View style={styles.emptyDoc}>
                    <Ionicons name="document-text-outline" size={40} color={colors.muted} />
                    <Text style={[styles.emptyDocText, { color: colors.muted }]}>
                      Tap "Regenerate" above to create your custom {activeTool === 'resume' ? 'ATS Resume' : 'Technical CV'} for {targetRole}.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="ribbon-outline" size={16} color={colors.primary} />
              <Text style={[styles.footerText, { color: colors.muted }]}>Tailored for {targetRole}</Text>
            </View>
            <Pressable onPress={onClose} style={[styles.doneBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={[styles.doneBtnText, { color: colors.text }]}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    height: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sparkleIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    borderBottomWidth: 1,
  },
  tabScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  roleBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 6,
  },
  roleLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  roleChips: {
    gap: 8,
  },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  contentScroll: {
    padding: 16,
    paddingBottom: 30,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  loadingDesc: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 280,
  },
  intelCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  intelTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  intelDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  jobCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  jobTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  jobTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  matchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  jobDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  skillBadgeGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
  },
  skillGroupLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  skillTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  skillTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  jobSalary: {
    fontSize: 12,
    marginTop: 2,
  },
  jobSearchRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  searchBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // LinkedIn Styles
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  headlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  headlineType: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headlineText: {
    fontSize: 12,
    lineHeight: 16,
  },
  smallCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  smallCopyBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  aboutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aboutCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 8,
  },
  aboutBody: {
    fontSize: 12,
    lineHeight: 19,
  },
  keywordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  keywordChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  keywordText: {
    fontSize: 11,
    fontWeight: '700',
  },
  linkedInActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: 12,
    marginTop: 4,
  },
  linkedInActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },

  // Document Preview Styles
  docCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    minHeight: 300,
  },
  docText: {
    fontSize: 12,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  emptyDoc: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyDocText: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 260,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  doneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  doneBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
