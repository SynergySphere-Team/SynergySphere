import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/context/ThemeContext';
import type { PortfolioItem, User } from '@/types/api';

// ── Social Links Modal ────────────────────────────────────────────────────────
interface SocialLinksModalProps {
  visible: boolean;
  onClose: () => void;
  links: { github: string; linkedin: string };
  onSave: (links: { github: string; linkedin: string }) => void;
}

export function SocialLinksModal({ visible, onClose, links, onSave }: SocialLinksModalProps) {
  const { colors } = useTheme();
  const [form, setForm] = useState(links);

  React.useEffect(() => {
    setForm(links);
  }, [links]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.backdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Social & Portfolio Links</Text>
              <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <Text style={[styles.modalDesc, { color: colors.muted }]}>
              Set your public developer profiles for recruiters and collaborators.
            </Text>

            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>GITHUB PROFILE OR USERNAME</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <Ionicons name="logo-github" size={18} color={colors.muted} style={styles.inputIcon} />
                <TextInput
                  value={form.github}
                  onChangeText={(text) => setForm({ ...form, github: text })}
                  placeholder="username or https://github.com/..."
                  placeholderTextColor={colors.placeholderText}
                  autoCapitalize="none"
                  style={[styles.input, { color: colors.text }]}
                />
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>LINKEDIN PROFILE URL</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <Ionicons name="logo-linkedin" size={18} color="#0077b5" style={styles.inputIcon} />
                <TextInput
                  value={form.linkedin}
                  onChangeText={(text) => setForm({ ...form, linkedin: text })}
                  placeholder="https://linkedin.com/in/username"
                  placeholderTextColor={colors.placeholderText}
                  autoCapitalize="none"
                  style={[styles.input, { color: colors.text }]}
                />
              </View>
            </View>

            <View style={styles.btnRow}>
              <Pressable
                onPress={() => {
                  onSave(form);
                  onClose();
                }}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.primaryBtnText, { color: colors.primaryText }]}>Save Links</Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Add/Edit Skill Modal ───────────────────────────────────────────────────────
interface SkillModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, level: number) => void;
}

export function SkillModal({ visible, onClose, onSave }: SkillModalProps) {
  const { colors } = useTheme();
  const [skillName, setSkillName] = useState('');
  const [skillLevel, setSkillLevel] = useState(75);

  const presets = [60, 75, 85, 90, 95];

  function handleSave() {
    if (!skillName.trim()) return;
    onSave(skillName.trim(), skillLevel);
    setSkillName('');
    setSkillLevel(75);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.backdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Technical Skill</Text>
              <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>SKILL NAME</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <TextInput
                  value={skillName}
                  onChangeText={setSkillName}
                  placeholder="e.g. Docker, TypeScript, AWS, PostgreSQL"
                  placeholderTextColor={colors.placeholderText}
                  style={[styles.input, { color: colors.text }]}
                />
              </View>
            </View>

          <View style={styles.fieldWrap}>
            <View style={styles.levelHeader}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>PROFICIENCY LEVEL</Text>
              <Text style={[styles.levelValue, { color: colors.primary }]}>{skillLevel}%</Text>
            </View>

            {/* Stepper controls */}
            <View style={styles.stepperRow}>
              <Pressable
                onPress={() => setSkillLevel((prev) => Math.max(10, prev - 5))}
                style={[styles.stepBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              >
                <Ionicons name="remove" size={18} color={colors.text} />
              </Pressable>

              <View style={styles.progressBarWrapper}>
                <View style={[styles.progressBarTrack, { backgroundColor: colors.surfaceElevated }]}>
                  <View style={[styles.progressBarFill, { width: `${skillLevel}%`, backgroundColor: colors.primary }]} />
                </View>
              </View>

              <Pressable
                onPress={() => setSkillLevel((prev) => Math.min(100, prev + 5))}
                style={[styles.stepBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              >
                <Ionicons name="add" size={18} color={colors.text} />
              </Pressable>
            </View>

            {/* Quick preset chips */}
            <View style={styles.presetChips}>
              {presets.map((val) => (
                <Pressable
                  key={val}
                  onPress={() => setSkillLevel(val)}
                  style={[
                    styles.chip,
                    {
                      borderColor: skillLevel === val ? colors.primary : colors.border,
                      backgroundColor: skillLevel === val ? `${colors.primary}20` : colors.surfaceElevated,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: skillLevel === val ? colors.primary : colors.muted },
                    ]}
                  >
                    {val}%
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.btnRow}>
            <Pressable
              onPress={handleSave}
              disabled={!skillName.trim()}
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.primary, opacity: !skillName.trim() ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.primaryBtnText, { color: colors.primaryText }]}>Add Skill</Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);
}

// ── Public Portfolio Preview Modal ─────────────────────────────────────────────
interface PublicPortfolioModalProps {
  visible: boolean;
  onClose: () => void;
  user: User | null;
  items: PortfolioItem[];
  skills: [string, number][];
  links: { github: string; linkedin: string };
}

export function PublicPortfolioModal({
  visible,
  onClose,
  user,
  items,
  skills,
  links,
}: PublicPortfolioModalProps) {
  const { colors } = useTheme();
  const fullName = `${user?.firstName ?? 'Student'} ${user?.lastName ?? 'Developer'}`;

  async function handleShare() {
    const summary = `${fullName} — Developer Portfolio\nSkills: ${skills
      .map(([s, v]) => `${s} (${v}%)`)
      .join(', ')}\n\nFeatured Projects:\n${items
      .map((p) => `• ${p.title}${p.projectLink ? ` (${p.projectLink})` : ''}`)
      .join('\n')}\n\nVerified Level ${user?.level ?? 1} (${user?.xp ?? 0} XP)\nVerified Credentials: https://synergysphere.com/u/${user?.id || 'demo'}`;

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(summary);
      alert('Portfolio summary copied to clipboard!');
    } else {
      await Share.share({ message: summary, title: `${fullName} Developer Portfolio` });
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.previewSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.previewHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
            <View>
              <Text style={[styles.badge, { color: colors.primary }]}>PUBLIC PORTFOLIO PREVIEW</Text>
              <Text style={[styles.previewTitle, { color: colors.text }]}>{fullName}</Text>
            </View>
            <View style={styles.previewHeaderActions}>
              <Pressable onPress={handleShare} style={[styles.iconBtn, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="share-social" size={18} color={colors.primary} />
              </Pressable>
              <Pressable onPress={onClose} style={[styles.iconBtn, { backgroundColor: colors.surfaceElevated }]}>
                <Ionicons name="close" size={18} color={colors.text} />
              </Pressable>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.previewScroll} showsVerticalScrollIndicator={false}>
            {/* Bio Card */}
            <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: `${colors.primary}25`, borderColor: colors.primary }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {user?.firstName?.[0] ?? 'S'}{user?.lastName?.[0] ?? 'D'}
                </Text>
              </View>
              <Text style={[styles.cardName, { color: colors.text }]}>{fullName}</Text>
              <Text style={[styles.cardRole, { color: colors.primary }]}>
                Student Developer · Backend & Full-Stack
              </Text>
              <Text style={[styles.cardBio, { color: colors.muted }]}>
                Passionate about building scalable backend systems, robust RESTful APIs, and solving real-world problems.
              </Text>
              <View style={[styles.pillRow, { marginTop: 8 }]}>
                <View style={[styles.statBadge, { backgroundColor: colors.surfaceElevated }]}>
                  <Text style={[styles.statBadgeText, { color: colors.text }]}>Level {user?.level ?? 1}</Text>
                </View>
                <View style={[styles.statBadge, { backgroundColor: colors.surfaceElevated }]}>
                  <Text style={[styles.statBadgeText, { color: colors.text }]}>{user?.xp ?? 0} XP</Text>
                </View>
                {links.github ? (
                  <View style={[styles.statBadge, { backgroundColor: colors.surfaceElevated }]}>
                    <Ionicons name="logo-github" size={12} color={colors.muted} />
                    <Text style={[styles.statBadgeText, { color: colors.text }]}>GitHub</Text>
                  </View>
                ) : null}
                {links.linkedin ? (
                  <View style={[styles.statBadge, { backgroundColor: colors.surfaceElevated }]}>
                    <Ionicons name="logo-linkedin" size={12} color="#0077b5" />
                    <Text style={[styles.statBadgeText, { color: colors.text }]}>LinkedIn</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Technical Skills */}
            <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>Technical Proficiencies</Text>
              <View style={{ gap: 10, marginTop: 8 }}>
                {skills.map(([skill, val]) => (
                  <View key={skill}>
                    <View style={styles.skillHeaderRow}>
                      <Text style={[styles.skillName, { color: colors.text }]}>{skill}</Text>
                      <Text style={[styles.skillPercent, { color: colors.primary }]}>{val}%</Text>
                    </View>
                    <View style={[styles.progressBarTrack, { backgroundColor: colors.surfaceElevated, height: 6 }]}>
                      <View style={[styles.progressBarFill, { width: `${val}%`, backgroundColor: colors.primary }]} />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Featured Projects */}
            <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>Featured Software Projects</Text>
              {items.length === 0 ? (
                <Text style={[styles.emptyNotice, { color: colors.muted }]}>No projects added yet.</Text>
              ) : (
                items.map((item) => (
                  <View key={item.id} style={[styles.projectBlock, { borderLeftColor: colors.primary, backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[styles.projectTitle, { color: colors.text }]}>{item.title}</Text>
                    {item.description ? (
                      <Text style={[styles.projectDesc, { color: colors.muted }]}>{item.description}</Text>
                    ) : null}
                    <View style={styles.projectLinksRow}>
                      {item.projectLink ? (
                        <Text style={[styles.linkBadge, { color: colors.primary }]}>🔗 Live Demo</Text>
                      ) : null}
                      {item.githubLink ? (
                        <Text style={[styles.linkBadge, { color: colors.primary }]}>💻 GitHub Source</Text>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  stepBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarWrapper: {
    flex: 1,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  presetChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  primaryBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Public Preview Styles
  previewSheet: {
    width: '100%',
    maxWidth: 500,
    height: '90%',
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  previewHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  previewScroll: {
    padding: 16,
    gap: 14,
  },
  previewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
  },
  cardName: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  cardRole: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardBio: {
    fontSize: 12,
    lineHeight: 18,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
  },
  skillHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  skillName: {
    fontSize: 12,
    fontWeight: '600',
  },
  skillPercent: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyNotice: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  projectBlock: {
    borderLeftWidth: 3,
    borderRadius: 8,
    padding: 10,
    gap: 4,
    marginTop: 6,
  },
  projectTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  projectDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  projectLinksRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  linkBadge: {
    fontSize: 11,
    fontWeight: '700',
  },
});
