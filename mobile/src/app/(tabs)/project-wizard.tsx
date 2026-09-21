import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Notice } from '@/components/Screen';
import { Button, Card, Field, Heading } from '@/components/ui';
import { github } from '@/services/github';
import { api } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';

type Wizard = {
  category: string;
  language: string;
  license: 'MIT' | 'GPL-3.0' | 'Apache-2.0' | 'NONE';
  visibility: 'public' | 'private';
  starterTemplate: 'WEB_APP' | 'MOBILE_APP' | 'DATA_ANALYSIS' | 'DOCUMENTATION' | 'IOT';
  problem: string;
  audience: string;
  goal: string;
};

const initial: Wizard = {
  category: 'Eco Tourism',
  language: 'TypeScript',
  license: 'MIT',
  visibility: 'public',
  starterTemplate: 'WEB_APP',
  problem: '',
  audience: '',
  goal: '',
};

const STEPS = ['Category', 'Technology', 'License', 'Visibility', 'Starter', 'Purpose', 'Review'] as const;

const CATEGORY_ITEMS: { value: string; label: string; icon: any; desc: string }[] = [
  { value: 'Personal Project', label: 'Personal Project', icon: 'person-outline', desc: 'Hobby apps, personal utilities, portfolios & custom tools' },
  { value: 'Developer Tools', label: 'Developer Tool', icon: 'code-slash-outline', desc: 'Libraries, CLI tools, scripts & templates' },
  { value: 'Eco Tourism', label: 'Eco Tourism', icon: 'leaf-outline', desc: 'Sustainable travel & conservation' },
  { value: 'Green Infrastructure', label: 'Green Tech', icon: 'hardware-chip-outline', desc: 'Renewables, smart energy & clean systems' },
  { value: 'Sustainability', label: 'Sustainability', icon: 'earth-outline', desc: 'Ecological solutions & zero-waste' },
  { value: 'Other', label: 'Other / Custom', icon: 'bulb-outline', desc: 'Whatever project you want for yourself or personal things' },
];

const LANGUAGE_ITEMS: { value: string; label: string; icon: any; color: string }[] = [
  { value: 'TypeScript', label: 'TypeScript', icon: 'logo-javascript', color: '#3178c6' },
  { value: 'Python', label: 'Python', icon: 'logo-python', color: '#3572A5' },
  { value: 'Java', label: 'Java', icon: 'cafe-outline', color: '#b07219' },
  { value: 'Kotlin', label: 'Kotlin', icon: 'phone-portrait-outline', color: '#A97BFF' },
  { value: 'Swift', label: 'Swift', icon: 'logo-apple', color: '#F05138' },
  { value: 'Other', label: 'Other', icon: 'code-slash-outline', color: '#7f929a' },
];

const LICENSE_ITEMS: { value: Wizard['license']; label: string; desc: string; icon: any }[] = [
  { value: 'MIT', label: 'MIT', desc: 'Highly permissive, open to everyone', icon: 'shield-checkmark-outline' },
  { value: 'Apache-2.0', label: 'Apache 2.0', desc: 'Permissive with patent protection', icon: 'shield-outline' },
  { value: 'GPL-3.0', label: 'GPL 3.0', desc: 'Copyleft; derivative work must stay open', icon: 'lock-open-outline' },
  { value: 'NONE', label: 'No License', desc: 'Standard copyright reserved', icon: 'close-circle-outline' },
];

const VISIBILITY_ITEMS: { value: Wizard['visibility']; label: string; desc: string; icon: any }[] = [
  { value: 'public', label: 'Public Repository', desc: 'Anyone can browse, fork, and request to contribute', icon: 'globe-outline' },
  { value: 'private', label: 'Private Repository', desc: 'Only you and approved collaborators have access', icon: 'lock-closed-outline' },
];

const STARTER_ITEMS: { value: Wizard['starterTemplate']; label: string; desc: string; icon: any }[] = [
  { value: 'WEB_APP', label: 'Web Application', desc: 'Frontend or full-stack web project scaffold', icon: 'desktop-outline' },
  { value: 'MOBILE_APP', label: 'Mobile App', desc: 'iOS & Android cross-platform template', icon: 'phone-portrait-outline' },
  { value: 'DATA_ANALYSIS', label: 'Data & Analytics', desc: 'Data processing, notebooks & models', icon: 'analytics-outline' },
  { value: 'DOCUMENTATION', label: 'Documentation Hub', desc: 'Knowledge base & markdown guides', icon: 'book-outline' },
  { value: 'IOT', label: 'IoT & Embedded', desc: 'Hardware sensors, telemetry & edge', icon: 'hardware-chip-outline' },
];

export default function ProjectWizardScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Wizard>(initial);
  const [customCategory, setCustomCategory] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    github
      .connection()
      .then((value) => {
        if (!value.connected) router.replace('/github-connect?returnTo=/project-wizard' as never);
      })
      .catch(() => router.replace('/github-connect?returnTo=/project-wizard' as never));
  }, [router]);

  async function create() {
    setCreating(true);
    setError('');
    try {
      const payload = {
        ...form,
        category: customCategory.trim() ? customCategory.trim() : form.category,
      };
      const result = await api.post<{ project: { id: string } }>('/github/projects', payload);
      router.replace({ pathname: '/project-detail', params: { projectId: result.project.id } } as never);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not create the GitHub repository.';
      setError(message);
      if (/connect github/i.test(message)) {
        router.push('/github-connect?returnTo=/project-wizard' as never);
      }
    } finally {
      setCreating(false);
    }
  }

  const problemValid = form.problem.trim().length >= 20;
  const audienceValid = form.audience.trim().length >= 2;
  const goalValid = form.goal.trim().length >= 20;
  const canNext = step !== 5 || (problemValid && audienceValid && goalValid);

  const progressPercent = `${Math.round(((step + 1) / STEPS.length) * 100)}%`;

  return (
    <Screen>
      {/* Top Back Navigation Bar */}
      <View style={styles.topNavRow}>
        <Pressable
          style={[styles.backNavButton, { backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }]}
          onPress={() => {
            if (step > 0) {
              setStep(step - 1);
            } else if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/community' as never);
            }
          }}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
          <Text style={[styles.backNavText, { color: colors.text }]}>
            {step > 0 ? 'Previous Step' : 'Community'}
          </Text>
        </Pressable>
      </View>

      <Heading subtitle={`Step ${step + 1} of ${STEPS.length} · ${STEPS[step]}`}>
        Create a community project
      </Heading>

      {/* Progress Bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <View style={[styles.progressFill, { width: progressPercent as any, backgroundColor: colors.primary }]} />
      </View>

      {error ? <Notice>{error}</Notice> : null}

      {/* Step 0: Category Selection */}
      {step === 0 && (
        <View style={styles.gridContainer}>
          <Text style={[styles.stepQuestion, { color: colors.text }]}>What kind of project are you creating?</Text>
          <Text style={[styles.helperSub, { color: colors.muted, marginBottom: 8 }]}>
            Build whatever you want—personal tools, hobby apps, student projects, developer utilities, or green tech initiatives.
          </Text>
          <View style={styles.tileGrid}>
            {CATEGORY_ITEMS.map((item) => {
              const selected = form.category === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setForm({ ...form, category: item.value })}
                  style={({ pressed }) => [
                    styles.selectionTile,
                    {
                      backgroundColor: selected ? colors.surfaceElevated : colors.surface,
                      borderColor: selected ? colors.primary : colors.border,
                      borderWidth: selected ? 2 : 1,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.tileHeader}>
                    <View style={[styles.tileIconCircle, { backgroundColor: selected ? colors.primaryDark : colors.surfaceElevated }]}>
                      <Ionicons name={item.icon} size={18} color={selected ? colors.primary : colors.muted} />
                    </View>
                    {selected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                  </View>
                  <Text style={[styles.tileTitle, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[styles.tileDesc, { color: colors.muted }]}>{item.desc}</Text>
                </Pressable>
              );
            })}
          </View>

          {(form.category === 'Other' || form.category === 'Personal Project' || customCategory.length > 0) && (
            <View style={{ marginTop: 14 }}>
              <Field
                label="Custom Category / Topic (Optional)"
                placeholder="e.g. Daily Workout Tracker, Budget App, Music Player, Portfolio..."
                value={customCategory}
                onChangeText={setCustomCategory}
              />
            </View>
          )}
        </View>
      )}

      {/* Step 1: Technology / Language */}
      {step === 1 && (
        <View style={styles.gridContainer}>
          <Text style={[styles.stepQuestion, { color: colors.text }]}>What is the primary language or stack?</Text>
          <View style={styles.tileGrid}>
            {LANGUAGE_ITEMS.map((item) => {
              const selected = form.language === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setForm({ ...form, language: item.value })}
                  style={({ pressed }) => [
                    styles.selectionTile,
                    {
                      backgroundColor: selected ? colors.surfaceElevated : colors.surface,
                      borderColor: selected ? colors.primary : colors.border,
                      borderWidth: selected ? 2 : 1,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.tileHeader}>
                    <View style={[styles.tileIconCircle, { backgroundColor: colors.surfaceElevated }]}>
                      <Ionicons name={item.icon} size={18} color={item.color} />
                    </View>
                    {selected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                  </View>
                  <Text style={[styles.tileTitle, { color: colors.text }]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Step 2: License Selection */}
      {step === 2 && (
        <View style={styles.gridContainer}>
          <Text style={[styles.stepQuestion, { color: colors.text }]}>Choose an open-source license</Text>
          <View style={styles.verticalList}>
            {LICENSE_ITEMS.map((item) => {
              const selected = form.license === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setForm({ ...form, license: item.value })}
                  style={({ pressed }) => [
                    styles.listCard,
                    {
                      backgroundColor: selected ? colors.surfaceElevated : colors.surface,
                      borderColor: selected ? colors.primary : colors.border,
                      borderWidth: selected ? 2 : 1,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.tileIconCircle, { backgroundColor: selected ? colors.primaryDark : colors.surfaceElevated }]}>
                    <Ionicons name={item.icon} size={18} color={selected ? colors.primary : colors.muted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tileTitle, { color: colors.text }]}>{item.label}</Text>
                    <Text style={[styles.tileDesc, { color: colors.muted }]}>{item.desc}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Step 3: Visibility */}
      {step === 3 && (
        <View style={styles.gridContainer}>
          <Text style={[styles.stepQuestion, { color: colors.text }]}>Who can see this repository?</Text>
          <View style={styles.verticalList}>
            {VISIBILITY_ITEMS.map((item) => {
              const selected = form.visibility === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setForm({ ...form, visibility: item.value })}
                  style={({ pressed }) => [
                    styles.listCard,
                    {
                      backgroundColor: selected ? colors.surfaceElevated : colors.surface,
                      borderColor: selected ? colors.primary : colors.border,
                      borderWidth: selected ? 2 : 1,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.tileIconCircle, { backgroundColor: selected ? colors.primaryDark : colors.surfaceElevated }]}>
                    <Ionicons name={item.icon} size={20} color={selected ? colors.primary : colors.muted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tileTitle, { color: colors.text }]}>{item.label}</Text>
                    <Text style={[styles.tileDesc, { color: colors.muted }]}>{item.desc}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Step 4: Starter Template */}
      {step === 4 && (
        <View style={styles.gridContainer}>
          <Text style={[styles.stepQuestion, { color: colors.text }]}>Which starting point should AI prepare?</Text>
          <View style={styles.verticalList}>
            {STARTER_ITEMS.map((item) => {
              const selected = form.starterTemplate === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setForm({ ...form, starterTemplate: item.value })}
                  style={({ pressed }) => [
                    styles.listCard,
                    {
                      backgroundColor: selected ? colors.surfaceElevated : colors.surface,
                      borderColor: selected ? colors.primary : colors.border,
                      borderWidth: selected ? 2 : 1,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.tileIconCircle, { backgroundColor: selected ? colors.primaryDark : colors.surfaceElevated }]}>
                    <Ionicons name={item.icon} size={18} color={selected ? colors.primary : colors.muted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tileTitle, { color: colors.text }]}>{item.label}</Text>
                    <Text style={[styles.tileDesc, { color: colors.muted }]}>{item.desc}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Step 5: Purpose & Story */}
      {step === 5 && (
        <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.stepQuestion, { color: colors.text }]}>Tell the project story</Text>
          <Text style={[styles.helperSub, { color: colors.muted }]}>
            AI will synthesize these details into your official README, roadmap, and starter issues.
          </Text>

          <View style={styles.inputBlock}>
            <Field
              label="What problem does this project solve?"
              value={form.problem}
              onChangeText={(problem) => setForm({ ...form, problem })}
              placeholder="e.g. University dining halls discard surplus meals daily with no real-time coordination."
              multiline
              numberOfLines={3}
            />
            <Text style={[styles.counterText, { color: problemValid ? colors.primary : colors.muted }]}>
              {form.problem.trim().length} / 20 characters minimum
            </Text>
          </View>

          <View style={styles.inputBlock}>
            <Field
              label="Who is this project built for?"
              value={form.audience}
              onChangeText={(audience) => setForm({ ...form, audience })}
              placeholder="e.g. Campus cafeteria managers and local volunteer food shelters."
              multiline
              numberOfLines={2}
            />
            <Text style={[styles.counterText, { color: audienceValid ? colors.primary : colors.muted }]}>
              {form.audience.trim().length} / 2 characters minimum
            </Text>
          </View>

          <View style={styles.inputBlock}>
            <Field
              label="Describe the primary goal in 2–3 sentences"
              value={form.goal}
              onChangeText={(goal) => setForm({ ...form, goal })}
              placeholder="e.g. Build an automated dashboard to measure daily surplus food and notify partner food banks for immediate collection."
              multiline
              numberOfLines={3}
            />
            <Text style={[styles.counterText, { color: goalValid ? colors.primary : colors.muted }]}>
              {form.goal.trim().length} / 20 characters minimum
            </Text>
          </View>
        </View>
      )}

      {/* Step 6: Review & Submit */}
      {step === 6 && (
        <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.reviewHeader}>
            <Ionicons name="sparkles" size={24} color={colors.primary} />
            <Text style={[styles.stepQuestion, { color: colors.text }]}>Ready to create on GitHub?</Text>
          </View>
          <Text style={[styles.helperSub, { color: colors.muted }]}>
            SynergySphere will create a genuine repository on your GitHub account, commit the AI scaffold, and set up your Good First Issues.
          </Text>

          <View style={[styles.receiptBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            {[
              ['Category', form.category],
              ['Technology', form.language],
              ['License', form.license],
              ['Visibility', form.visibility === 'public' ? 'Public' : 'Private'],
              ['Starter Template', form.starterTemplate.replace('_', ' ')],
              ['Problem', form.problem],
              ['Audience', form.audience],
              ['Core Goal', form.goal],
            ].map(([label, value]) => (
              <View key={label} style={styles.receiptRow}>
                <Text style={[styles.receiptLabel, { color: colors.muted }]}>{label}</Text>
                <Text style={[styles.receiptValue, { color: colors.text }]}>{value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Action Navigation Bar */}
      <View style={styles.actionBar}>
        {step > 0 && (
          <Pressable
            disabled={creating}
            style={({ pressed }) => [
              styles.navBtn,
              { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              pressed && styles.pressed,
            ]}
            onPress={() => setStep(step - 1)}
          >
            <Ionicons name="arrow-back" size={16} color={colors.text} />
            <Text style={[styles.navBtnText, { color: colors.text }]}>Back</Text>
          </Pressable>
        )}

        {step < STEPS.length - 1 ? (
          <Pressable
            disabled={!canNext}
            style={({ pressed }) => [
              styles.navBtn,
              styles.navBtnPrimary,
              {
                backgroundColor: canNext ? colors.primary : colors.surfaceElevated,
                borderColor: canNext ? colors.primary : colors.border,
                opacity: canNext ? 1 : 0.6,
              },
              pressed && canNext && styles.pressed,
            ]}
            onPress={() => setStep(step + 1)}
          >
            <Text
              style={[
                styles.navBtnText,
                { color: canNext ? colors.primaryText : colors.muted, fontWeight: '800' },
              ]}
            >
              Continue
            </Text>
            <Ionicons
              name="arrow-forward"
              size={16}
              color={canNext ? colors.primaryText : colors.muted}
            />
          </Pressable>
        ) : (
          <Pressable
            disabled={creating}
            style={({ pressed }) => [
              styles.navBtn,
              styles.navBtnPrimary,
              { backgroundColor: colors.primary, borderColor: colors.primary },
              pressed && !creating && styles.pressed,
            ]}
            onPress={create}
          >
            {creating ? (
              <>
                <ActivityIndicator size="small" color={colors.primaryText} />
                <Text style={[styles.navBtnText, { color: colors.primaryText, fontWeight: '800' }]}>
                  Scaffolding repository...
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="logo-github" size={18} color={colors.primaryText} />
                <Text style={[styles.navBtnText, { color: colors.primaryText, fontWeight: '800' }]}>
                  Create GitHub Repository
                </Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressTrack: {
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  gridContainer: {
    gap: 12,
  },
  stepQuestion: {
    fontSize: 17,
    fontWeight: '800',
  },
  helperSub: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: -4,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  selectionTile: {
    width: '48%',
    borderRadius: 14,
    padding: 14,
    gap: 6,
    minHeight: 100,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  tileDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  verticalList: {
    gap: 8,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 14,
  },
  formCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
  },
  inputBlock: {
    gap: 4,
  },
  counterText: {
    fontSize: 11,
    fontWeight: '600',
    alignSelf: 'flex-end',
  },
  reviewCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  receiptBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  receiptRow: {
    gap: 2,
    paddingVertical: 2,
  },
  receiptLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  receiptValue: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  navBtnPrimary: {
    flex: 2,
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
  topNavRow: {
    marginBottom: 10,
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

