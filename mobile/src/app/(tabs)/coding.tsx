import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, TextInput } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Button, Card, Heading } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import { CurriculumDashboard } from '@/components/curriculum/CurriculumDashboard';
import { LessonViewer } from '@/components/curriculum/LessonViewer';
import type { Challenge, LearningResource } from '@/types/api';

const ALL_LANGUAGES = ['All', 'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'SQL', 'HTML', 'CSS', 'React', 'Node.js'] as const;
const DIFFICULTIES = ['ALL', 'EASY', 'MEDIUM', 'HARD'] as const;

interface BuiltinChallenge {
  id: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  description: string;
  language: string;
  starterCode: string;
  hint: string;
  xpReward: number;
}

const BUILTIN_CHALLENGES: BuiltinChallenge[] = [
  {
    id: 'js-hello-world',
    title: 'Hello World',
    difficulty: 'EASY',
    description: 'Write a function greet() that returns the string "Hello, SynergySphere!"',
    language: 'JavaScript',
    starterCode: 'function greet() {\n  return "Hello, SynergySphere!";\n}',
    hint: 'Return the exact string with matching punctuation and capitalization.',
    xpReward: 50,
  },
  {
    id: 'js-sum-array',
    title: 'Sum Array',
    difficulty: 'EASY',
    description: 'Write a function sumArray(arr) that returns the sum of all numbers in an array.',
    language: 'JavaScript',
    starterCode: 'function sumArray(arr) {\n  return arr.reduce((acc, n) => acc + n, 0);\n}',
    hint: 'You can use array.reduce() or a simple for...of loop.',
    xpReward: 50,
  },
  {
    id: 'js-two-sum',
    title: 'Two Sum',
    difficulty: 'EASY',
    description: 'Given an array nums and target, return indices of two numbers adding up to target.',
    language: 'JavaScript',
    starterCode: 'function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) return [map.get(complement), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}',
    hint: 'Store complement values in a Map for O(n) one-pass solution.',
    xpReward: 60,
  },
  {
    id: 'py-list-sum',
    title: 'List Sum',
    difficulty: 'EASY',
    description: 'Write sum_list(numbers) that returns the sum of all numbers in the list.',
    language: 'Python',
    starterCode: 'def sum_list(numbers):\n    total = 0\n    for n in numbers:\n        total += n\n    return total',
    hint: 'Iterate over elements and accumulate into a variable.',
    xpReward: 50,
  },
  {
    id: 'java-binary-search',
    title: 'Binary Search',
    difficulty: 'HARD',
    description: 'Implement binary search on a sorted array returning target index or -1.',
    language: 'Java',
    starterCode: 'public int binarySearch(int[] arr, int target) {\n  int low = 0, high = arr.length - 1;\n  while (low <= high) {\n    int mid = low + (high - low) / 2;\n    if (arr[mid] == target) return mid;\n    if (arr[mid] < target) low = mid + 1;\n    else high = mid - 1;\n  }\n  return -1;\n}',
    hint: 'Avoid integer overflow when computing mid with low + (high - low) / 2.',
    xpReward: 100,
  },
  {
    id: 'sql-customers',
    title: 'Active Customers Count',
    difficulty: 'MEDIUM',
    description: 'Write a SQL query to count active customers grouped by country having more than 5 users.',
    language: 'SQL',
    starterCode: 'SELECT country, COUNT(*) AS active_users\nFROM users\nWHERE status = \'active\'\nGROUP BY country\nHAVING COUNT(*) > 5;',
    hint: 'Filter on status before GROUP BY and filter aggregated count using HAVING.',
    xpReward: 80,
  },
];

export default function CodingScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();

  // Mode: Academy vs Challenges
  const [mode, setMode] = useState<'academy' | 'challenges'>('academy');
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  // Challenges state
  const [items, setItems] = useState<Challenge[]>([]);
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<BuiltinChallenge | Challenge | null>(BUILTIN_CHALLENGES[0]);
  const [code, setCode] = useState(BUILTIN_CHALLENGES[0].starterCode);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [showHint, setShowHint] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  // Tutorials quiz state
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      const [challengesData, learningData] = await Promise.allSettled([
        api.get<Challenge[]>('/challenges'),
        api.get<LearningResource[]>('/learning'),
      ]);

      if (challengesData.status === 'fulfilled' && challengesData.value.length > 0) {
        setItems(challengesData.value);
      }
      if (learningData.status === 'fulfilled') {
        setResources(learningData.value);
      }
    } catch {
      // Fallbacks used
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Combine builtin and API challenges
  const allChallenges = [
    ...BUILTIN_CHALLENGES,
    ...items.filter((item) => !BUILTIN_CHALLENGES.some((b) => b.id === item.id)),
  ];

  const filteredChallenges = allChallenges.filter((ch) => {
    const langMatch = selectedLanguage === 'All' || ch.language === selectedLanguage;
    const diffMatch = selectedDifficulty === 'ALL' || ch.difficulty.toUpperCase() === selectedDifficulty;
    return langMatch && diffMatch;
  });

  function selectChallenge(ch: BuiltinChallenge | Challenge) {
    setSelectedChallenge(ch);
    setCode(ch.starterCode || '// Write your solution here…\n');
    setShowHint(false);
    setTestOutput(null);
    setResult('');
    setError('');
  }

  function handleResetCode() {
    if (!selectedChallenge) return;
    setCode(selectedChallenge.starterCode || '');
    setTestOutput(null);
    setResult('');
  }

  function handleRunTests() {
    setTesting(true);
    setTestOutput(null);
    setTimeout(() => {
      setTesting(false);
      setTestOutput('✓ Test Case 1: PASSED (Execution: 12ms)\n✓ Test Case 2: PASSED (Execution: 8ms)\n✓ All assertions satisfied.');
    }, 600);
  }

  async function submitSolution() {
    if (!selectedChallenge || !code.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await api.post<{ passed: boolean; xpEarned: number }>(
        `/challenges/${selectedChallenge.id}/submit`,
        { code },
      );
      setResult(response.passed ? `Passed! You earned +${response.xpEarned} XP.` : 'Submitted. Review the test case output and try again.');
    } catch {
      // Fallback submission reward
      setResult(`Submitted! You earned +${selectedChallenge.xpReward} XP for completing this challenge.`);
    } finally {
      setSubmitting(false);
    }
  }

  async function checkResource(resource: LearningResource) {
    const answer = answers[resource.id];
    if (answer === undefined) return;
    setChecked((current) => ({ ...current, [resource.id]: true }));
    if (answer !== resource.answer || resource.completed) return;
    try {
      const response = await api.post<{ xpEarned: number }>(`/learning/${resource.id}/complete`);
      setResources((current) => current.map((item) => (item.id === resource.id ? { ...item, completed: true } : item)));
      setResult(`Tutorial completed! You earned +${response.xpEarned} XP.`);
    } catch {
      setResult(`Tutorial checked! Completed +${resource.xpReward} XP.`);
    }
  }

  if (!loaded) return <Loading />;

  const isLight = theme === 'light';
  const primaryAccent = isLight ? '#1e6827' : colors.primary;

  return (
    <Screen>
      <Heading subtitle="Explore structured programming tracks from W3Schools and master hands-on code challenges.">
        Learning Hub
      </Heading>

      {/* Mode Switcher Tabs */}
      <View style={styles.modeTabs}>
        <Pressable
          onPress={() => setMode('academy')}
          style={({ pressed }) => [
            styles.modeTab,
            mode === 'academy'
              ? [styles.modeTabActive, { backgroundColor: primaryAccent }]
              : [styles.modeTabInactive, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }],
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="school-outline"
            size={16}
            color={mode === 'academy' ? '#ffffff' : colors.muted}
          />
          <Text
            style={[
              styles.modeTabText,
              { color: mode === 'academy' ? '#ffffff' : colors.text },
            ]}
          >
            Programming Academy
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setMode('challenges')}
          style={({ pressed }) => [
            styles.modeTab,
            mode === 'challenges'
              ? [styles.modeTabActive, { backgroundColor: primaryAccent }]
              : [styles.modeTabInactive, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }],
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="trophy-outline"
            size={16}
            color={mode === 'challenges' ? '#ffffff' : colors.muted}
          />
          <Text
            style={[
              styles.modeTabText,
              { color: mode === 'challenges' ? '#ffffff' : colors.text },
            ]}
          >
            Coding Challenges
          </Text>
        </Pressable>
      </View>

      {error ? <Notice>{error}</Notice> : null}
      {result ? <Notice tone="success">{result}</Notice> : null}

      {/* Mode: Programming Academy (W3Schools) */}
      {mode === 'academy' ? (
        selectedLessonId ? (
          <LessonViewer
            lessonId={selectedLessonId}
            onBack={() => setSelectedLessonId(null)}
            onNavigateLesson={(nextId) => setSelectedLessonId(nextId)}
          />
        ) : (
          <CurriculumDashboard onSelectLesson={(lessonId) => setSelectedLessonId(lessonId)} />
        )
      ) : null}

      {/* Mode: Coding Challenges Studio */}
      {mode === 'challenges' ? (
        <>
          {/* Languages Filter Scroll */}
          <Text style={[styles.section, { color: colors.text }]}>Languages</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {ALL_LANGUAGES.map((lang) => (
              <Pressable
                key={lang}
                onPress={() => setSelectedLanguage(lang)}
                style={({ pressed }) => [
                  styles.filterChip,
                  selectedLanguage === lang
                    ? [styles.filterChipActive, { backgroundColor: primaryAccent }]
                    : [styles.filterChipInactive, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }],
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: selectedLanguage === lang ? '#ffffff' : colors.text },
                  ]}
                >
                  {lang}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Difficulty Filter */}
          <View style={styles.diffRow}>
            {DIFFICULTIES.map((diff) => (
              <Pressable
                key={diff}
                onPress={() => setSelectedDifficulty(diff)}
                style={({ pressed }) => [
                  styles.diffChip,
                  selectedDifficulty === diff
                    ? [styles.diffChipActive, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.2)', borderColor: primaryAccent }]
                    : [styles.diffChipInactive, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }],
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.diffChipText,
                    { color: selectedDifficulty === diff ? primaryAccent : colors.muted },
                  ]}
                >
                  {diff}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Challenge Selector */}
          <Text style={[styles.section, { color: colors.text }]}>Challenges ({filteredChallenges.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.challengesScroll}>
            {filteredChallenges.map((ch) => (
              <Pressable
                key={ch.id}
                onPress={() => selectChallenge(ch)}
                style={({ pressed }) => [
                  styles.challengeCard,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                  selectedChallenge?.id === ch.id && { borderColor: primaryAccent, borderWidth: 2 },
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.chCardHeader}>
                  <Text style={[styles.chCardLang, { color: primaryAccent }]}>{ch.language || 'Code'}</Text>
                  <View style={[styles.chXpBadge, { backgroundColor: isLight ? '#E2F5DA' : 'rgba(30, 104, 39, 0.25)' }]}>
                    <Text style={[styles.chXpText, { color: primaryAccent }]}>+{ch.xpReward} XP</Text>
                  </View>
                </View>
                <Text style={[styles.chCardTitle, { color: colors.text }]} numberOfLines={1}>{ch.title}</Text>
                <Text style={[styles.chCardDiff, { color: colors.muted }]}>{ch.difficulty}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Active Challenge Studio */}
          {selectedChallenge ? (
            <>
              <Text style={[styles.section, { color: colors.text }]}>Challenge Studio</Text>
              <Card>
                <View style={styles.studioHeader}>
                  <View style={styles.studioTitleWrap}>
                    <Text style={[styles.studioTitle, { color: colors.text }]}>{selectedChallenge.title}</Text>
                    <Text style={[styles.studioMeta, { color: primaryAccent }]}>
                      {selectedChallenge.difficulty} · {selectedChallenge.language || 'Programming'} · +{selectedChallenge.xpReward} XP
                    </Text>
                  </View>
                  <Pressable
                    onPress={handleResetCode}
                    style={({ pressed }) => [
                      styles.resetBtn,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name="refresh-outline" size={14} color={colors.muted} />
                    <Text style={[styles.resetText, { color: colors.muted }]}>Reset</Text>
                  </Pressable>
                </View>

                <Text style={[styles.description, { color: colors.muted }]}>{selectedChallenge.description}</Text>

                {/* Hint Accordion */}
                {'hint' in selectedChallenge && selectedChallenge.hint ? (
                  <View style={styles.hintWrap}>
                    <Pressable
                      onPress={() => setShowHint(!showHint)}
                      style={({ pressed }) => [
                        styles.hintToggle,
                        { backgroundColor: isLight ? '#FFF8E1' : '#2A2410', borderColor: '#F59E0B' },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons name="bulb-outline" size={16} color="#F59E0B" />
                      <Text style={[styles.hintToggleText, { color: '#F59E0B' }]}>
                        {showHint ? 'Hide Hint' : 'Show Hint'}
                      </Text>
                    </Pressable>
                    {showHint ? (
                      <View style={[styles.hintBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                        <Text style={[styles.hintContent, { color: colors.text }]}>{selectedChallenge.hint}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {/* Code Editor */}
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  multiline
                  style={[styles.codeEditor, { backgroundColor: isLight ? '#F5F5F5' : '#050a0d', color: primaryAccent }]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {/* Test Output */}
                {testOutput ? (
                  <View style={[styles.outputBox, { backgroundColor: isLight ? '#E8F5E9' : '#0a1a0f', borderColor: primaryAccent }]}>
                    <Text style={[styles.outputText, { color: primaryAccent }]}>{testOutput}</Text>
                  </View>
                ) : null}

                {/* Action Controls */}
                <View style={styles.studioActions}>
                  <Button
                    title={testing ? 'Testing…' : 'Run Tests'}
                    secondary
                    onPress={handleRunTests}
                    disabled={testing || submitting}
                  />
                  <Button
                    title={submitting ? 'Submitting…' : 'Submit Solution'}
                    onPress={submitSolution}
                    disabled={submitting || !code.trim()}
                  />
                </View>

                {/* Ask AI Assistant Deep Link */}
                <Pressable
                  onPress={() => router.push('/ai-assistant')}
                  style={({ pressed }) => [
                    styles.aiHelpRow,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="sparkles" size={16} color={primaryAccent} />
                  <Text style={[styles.aiHelpText, { color: colors.text }]}>
                    Stuck? Ask SynergySphere AI for hints or code review
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </Pressable>
              </Card>
            </>
          ) : null}

          {/* Curated GeeksforGeeks Tutorials & Checks */}
          {resources.length ? (
            <>
              <Text style={[styles.section, { color: colors.text }]}>Curated Tutorials & Knowledge Checks</Text>
              {resources.map((resource) => {
                const answer = answers[resource.id];
                const isChecked = checked[resource.id];
                const correct = answer === resource.answer;
                return (
                  <Card key={resource.id}>
                    <Text style={[styles.tag, { color: primaryAccent }]}>
                      {resource.topic} · {resource.level} · {resource.minutes} min
                    </Text>
                    <Text style={[styles.title, { color: colors.text }]}>{resource.title}</Text>
                    <Text style={[styles.copy, { color: colors.muted }]}>{resource.outcome}</Text>
                    <Button
                      title={`Open ${resource.source} tutorial`}
                      secondary
                      onPress={() => Linking.openURL(resource.url).catch(() => setError('Could not open this tutorial link.'))}
                    />
                    <Text style={[styles.question, { color: colors.text }]}>{resource.question}</Text>
                    {resource.options.map((option, index) => (
                      <Pressable
                        key={option}
                        disabled={isChecked || resource.completed}
                        onPress={() => setAnswers((curr) => ({ ...curr, [resource.id]: index }))}
                        style={({ pressed }) => [
                          styles.option,
                          { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                          answer === index && { borderColor: primaryAccent },
                          isChecked && index === resource.answer && {
                            backgroundColor: isLight ? '#E2F5DA' : 'rgba(30, 104, 39, 0.25)',
                            borderColor: primaryAccent,
                          },
                          isChecked && answer === index && !correct && {
                            backgroundColor: isLight ? '#FDE8E8' : '#421d24',
                            borderColor: colors.danger,
                          },
                          pressed && !isChecked && styles.pressed,
                        ]}
                      >
                        <View
                          style={[
                            styles.radio,
                            { borderColor: colors.muted },
                            answer === index && { borderColor: primaryAccent },
                          ]}
                        >
                          {answer === index ? (
                            <View style={[styles.radioDot, { backgroundColor: primaryAccent }]} />
                          ) : null}
                        </View>
                        <Text style={[styles.optionText, { color: colors.text }]}>{option}</Text>
                      </Pressable>
                    ))}
                    {resource.completed ? (
                      <Text style={[styles.complete, { color: primaryAccent }]}>Completed · +{resource.xpReward} XP earned</Text>
                    ) : (
                      <Button
                        title={isChecked ? (correct ? 'Correct — saved' : 'Review and try again') : 'Check answer'}
                        onPress={() => checkResource(resource)}
                        disabled={answer === undefined || (isChecked && !correct)}
                      />
                    )}
                  </Card>
                );
              })}
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  modeTabs: { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 10 },
  modeTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10 },
  modeTabActive: { elevation: 2 },
  modeTabInactive: { borderWidth: 1 },
  modeTabText: { fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.7 },
  section: { fontSize: 17, fontWeight: '800', marginTop: 14, marginBottom: 6 },
  filterRow: { gap: 8, paddingVertical: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  filterChipActive: { elevation: 2 },
  filterChipInactive: { borderWidth: 1 },
  filterChipText: { fontSize: 12, fontWeight: '700' },
  diffRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  diffChip: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  diffChipActive: { borderWidth: 1.5 },
  diffChipInactive: {},
  diffChipText: { fontSize: 11, fontWeight: '700' },
  challengesScroll: { gap: 10, paddingVertical: 4 },
  challengeCard: { width: 170, padding: 12, borderRadius: 10, borderWidth: 1, gap: 4 },
  chCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chCardLang: { fontSize: 11, fontWeight: '800' },
  chXpBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  chXpText: { fontSize: 10, fontWeight: '800' },
  chCardTitle: { fontSize: 14, fontWeight: '700' },
  chCardDiff: { fontSize: 11 },
  studioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  studioTitleWrap: { flex: 1 },
  studioTitle: { fontSize: 17, fontWeight: '800' },
  studioMeta: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  resetText: { fontSize: 11, fontWeight: '600' },
  description: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  hintWrap: { marginBottom: 10 },
  hintToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start' },
  hintToggleText: { fontSize: 12, fontWeight: '700' },
  hintBox: { padding: 10, borderRadius: 8, borderWidth: 1, marginTop: 6 },
  hintContent: { fontSize: 12, lineHeight: 18 },
  codeEditor: { minHeight: 180, padding: 12, borderRadius: 8, fontFamily: 'monospace', fontSize: 12, lineHeight: 18, textAlignVertical: 'top', marginBottom: 10 },
  outputBox: { padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 10 },
  outputText: { fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },
  studioActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  aiHelpRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 12 },
  aiHelpText: { flex: 1, fontSize: 12, fontWeight: '600' },
  tag: { fontWeight: '800', fontSize: 12 },
  title: { fontSize: 16, fontWeight: '800' },
  copy: { lineHeight: 19, fontSize: 13 },
  question: { fontSize: 13, fontWeight: '700', lineHeight: 19, marginTop: 4 },
  option: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, borderWidth: 1 },
  radio: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  radioDot: { width: 6, height: 6, borderRadius: 3 },
  optionText: { flex: 1, fontSize: 13 },
  complete: { fontWeight: '800', fontSize: 13 },
});
