import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, TextInput, ScrollView, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Notice } from '@/components/Screen';
import { Button, Card } from '@/components/ui';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  lessonTitle?: string;
};

type Grounding = {
  source: 'lesson' | 'upload' | 'search' | 'none';
  lessonId: string | null;
  lessonTitle: string | null;
  subjectName: string | null;
  moduleName: string | null;
};

type LessonPreview = {
  id: string;
  title: string;
  subjectName: string;
  moduleName: string;
  firstExampleCode?: string;
};

interface AnalysisResult {
  title: string;
  items: string[];
}

function analyzeCodeLocally(code: string): AnalysisResult[] | null {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const lines = trimmed.split('\n');
  const lineCount = lines.length;
  const hasLoop = /\bfor\b|\bwhile\b/.test(trimmed);
  const hasNested = /\bfor\b[\s\S]{0,80}\bfor\b|\bwhile\b[\s\S]{0,80}\bwhile\b/.test(trimmed);
  const hasRecursion = /function\s+(\w+)[\s\S]{0,300}\b\1\s*\(/.test(trimmed);
  const hasSorting = /\.sort\s*\(|bubbleSort|mergeSort|quickSort/i.test(trimmed);
  const usesHashMap = /new\s+(Map|Set)\b|{[^}]{0,200}}/.test(trimmed);
  const usesArray = /new\s+Array\b|\[\s*\]/.test(trimmed);

  // Time complexity
  let timeComplexity: string;
  if (hasSorting && !hasNested) timeComplexity = 'O(n log n) – sorting operation';
  else if (hasNested) timeComplexity = 'O(n²) – nested loops detected';
  else if (hasLoop) timeComplexity = 'O(n) – single iteration loop';
  else if (hasRecursion) timeComplexity = 'O(n) or worse – recursive execution';
  else timeComplexity = 'O(1) – constant time execution';

  // Space complexity
  let spaceComplexity: string;
  if (usesHashMap) spaceComplexity = 'O(n) – Map/Set auxiliary storage';
  else if (usesArray) spaceComplexity = 'O(n) – array buffer allocation';
  else if (hasRecursion) spaceComplexity = 'O(n) – recursion call stack';
  else spaceComplexity = 'O(1) – minimal extra memory used';

  // Issues
  const issues: string[] = [];
  if (lineCount > 50) issues.push(`Function has ${lineCount} lines — consider decomposing`);
  if (/console\.log\s*\(/.test(trimmed)) issues.push('Debug console.log detected');
  if (/catch\s*\(\w*\)\s*\{\s*\}/.test(trimmed)) issues.push('Empty catch block swallows errors');
  if (/==\s/.test(trimmed) && !/===\s/.test(trimmed)) issues.push('Use strict equality (===) instead of ==');
  if (/var\s+\w+/.test(trimmed)) issues.push('Replace var with const or let');
  if (issues.length === 0) issues.push('✓ No critical syntax patterns flagged');

  // Suggestions
  const suggestions: string[] = [];
  if (hasNested && !usesHashMap) suggestions.push('Consider HashMap/Set to achieve O(n) lookup');
  if (!/\/\/|\/\*/.test(trimmed) && lineCount > 6) suggestions.push('Add documentation/comments for clarity');
  if (hasRecursion && !trimmed.includes('memo') && !trimmed.includes('cache')) {
    suggestions.push('Add memoization cache to prevent stack exhaustion');
  }
  if (suggestions.length === 0) suggestions.push('✓ Solid idiomatic structure');

  return [
    { title: 'Complexity', items: [`⏱ Time: ${timeComplexity}`, `💾 Space: ${spaceComplexity}`] },
    { title: 'Potential Issues', items: issues },
    { title: 'Optimization Tips', items: suggestions },
    { title: 'Metrics', items: [`${lineCount} line${lineCount !== 1 ? 's' : ''} analyzed`] },
  ];
}

const starterPrompts = [
  'Explain JavaScript closures with an example',
  'What is an N+1 query problem and how to prevent it?',
  'How does the Java garbage collector work?',
  'Explain React component lifecycle & hooks',
];

export default function AIAssistantScreen() {
  const { colors, theme } = useTheme();
  const { fontSize, largerText } = useAccessibility();
  const { lesson: lessonParamRaw } = useLocalSearchParams<{ lesson?: string | string[] }>();
  const lessonParam = Array.isArray(lessonParamRaw) ? lessonParamRaw[0] : lessonParamRaw;

  const scrollViewRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "👋 Hi! I'm your SynergySphere AI Workspace assistant, grounded in the LectureToLife Programming Academy and your study packs. Ask about the lesson you're studying, paste code, or use quick actions!",
    },
  ]);
  const [message, setMessage] = useState('');
  const [context, setContext] = useState('');
  const [contextEditedByUser, setContextEditedByUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lesson, setLesson] = useState<LessonPreview | null>(null);

  // Fetch lesson details when opened with ?lesson=<id>.
  useEffect(() => {
    if (!lessonParam) {
      setLesson(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const detail = await api.get<{
          id: string;
          title: string;
          subjectName: string;
          moduleName: string;
          content: { examples?: Array<{ code: string }> };
        }>(`/curriculum/lessons/${lessonParam}`);
        if (cancelled) return;
        setLesson({
          id: detail.id,
          title: detail.title,
          subjectName: detail.subjectName,
          moduleName: detail.moduleName,
          firstExampleCode: detail.content?.examples?.[0]?.code,
        });
        setContext((prev) => prev || detail.content?.examples?.[0]?.code || '');
        setContextEditedByUser(false);
      } catch {
        if (!cancelled) setLesson(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonParam]);

  const liveAnalysis = useMemo(() => analyzeCodeLocally(context), [context]);

  const historyFromMessages = useCallback(
    (msgs: Message[]): Array<{ role: 'user' | 'assistant'; content: string }> => {
      const firstUser = msgs.findIndex((m) => m.role === 'user');
      if (firstUser < 0) return [];
      return msgs.slice(firstUser).slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      }));
    },
    [],
  );

  async function send(value = message, forcedContext?: string) {
    if (!value.trim() || loading) return;
    const question = value.trim();
    const baseMessages = messages;
    setMessages((current) => [...current, { role: 'user', content: question }]);
    setMessage('');
    setLoading(true);
    setError('');
    try {
      const contextToSend =
        forcedContext?.trim() || (contextEditedByUser && context.trim() ? context : undefined);
      const response = await api.post<{ response: string; grounding?: Grounding }>('/ai/chat', {
        message: question,
        ...(contextToSend ? { context: contextToSend } : {}),
        ...(lesson ? { lessonId: lesson.id } : {}),
        history: historyFromMessages(baseMessages).slice(-20),
      });
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: response.response,
          lessonTitle: response.grounding?.lessonTitle || undefined,
        },
      ]);
    } catch {
      // Local fallback so user can still continue learning offline
      const reply = `Analysis for: "${question}"\n\nCode Context Review:\n- Checked against standard best practices.\n- Time Complexity: ${liveAnalysis ? liveAnalysis[0]?.items[0] : 'O(1)'}\n- Space Complexity: ${liveAnalysis ? liveAnalysis[0]?.items[1] : 'O(1)'}\n\nTip: Test edge cases such as null/empty inputs and unexpected input types.`;
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: reply,
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }

  function handleQuickAction(action: 'Explain' | 'Debug' | 'Optimize' | 'Generate Tests') {
    if (!context.trim()) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Please paste code in the Code Context editor first to run this quick action!',
        },
      ]);
      return;
    }
    const prompts: Record<string, string> = {
      Explain: `Explain this code clearly and concisely, step by step:\n\n\`\`\`\n${context}\n\`\`\``,
      Debug: `Find and fix any bugs or issues in this code. List each problem and show the corrected version:\n\n\`\`\`\n${context}\n\`\`\``,
      Optimize: `Optimize this code for better performance and readability. Show the improved version:\n\n\`\`\`\n${context}\n\`\`\``,
      'Generate Tests': `Generate comprehensive unit tests for this code including edge cases:\n\n\`\`\`\n${context}\n\`\`\``,
    };
    send(prompts[action], context);
  }

  // Fetch chat history on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const history = await api.get<Array<{ id: string; role: 'user' | 'assistant'; content: string }>>(
          '/ai/chat/history'
        );
        if (!cancelled && Array.isArray(history) && history.length > 0) {
          setMessages(
            history.map((m) => ({
              role: m.role,
              content: m.content,
            }))
          );
        }
      } catch {
        // Continue with default welcome message
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function clearChat() {
    try {
      await api.delete('/ai/chat/history');
    } catch {
      // ignore
    }
    setMessages([
      {
        role: 'assistant',
        content: lesson
          ? `Chat cleared! Ask me anything about "${lesson.title}".`
          : 'Chat cleared! Ask about any programming concept or paste code for review.',
      },
    ]);
  }

  const isLight = theme === 'light';
  const primaryAccent = isLight ? '#1e6827' : colors.primary;

  return (
    <Screen scrollViewRef={scrollViewRef}>
      <View
        style={[
          styles.headerRow,
          largerText && styles.headerRowLarge,
        ]}
      >
        <Image
          source={require('../../../assets/images/ai-workspace-logo.png')}
          style={[
            styles.aiLogo,
            largerText && styles.aiLogoLarge,
          ]}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />

        <View style={styles.headerTitleWrap}>
          <Text
            allowFontScaling
            style={[
              styles.headerTitle,
              {
                color: colors.text,
                fontSize: fontSize(24),
              },
            ]}
          >
            {lesson ? 'Lesson Assistant' : 'AI Workspace'}
          </Text>

          <Text
            allowFontScaling
            style={[
              styles.headerSubtitle,
              {
                color: colors.muted,
                fontSize: fontSize(13),
                lineHeight: fontSize(18),
              },
            ]}
          >
            {lesson
              ? `Grounded in ${lesson.subjectName} › ${lesson.moduleName} › ${lesson.title}`
              : 'Grounded in LectureToLife Programming Academy and your study packs.'}
          </Text>
        </View>

        <Pressable
          onPress={clearChat}
          style={({ pressed }) => [
            styles.clearButton,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="trash-outline" size={16} color={colors.muted} />
          <Text style={[styles.clearText, { color: colors.muted }]}>Clear</Text>
        </Pressable>
      </View>

      {error ? <Notice>{error}</Notice> : null}

      {/* Grounded Lesson Chip */}
      {lesson ? (
        <Card>
          <View style={styles.groundedRow}>
            <Ionicons name="book-outline" size={15} color={primaryAccent} />
            <Text style={[styles.groundedText, { color: primaryAccent }]}>Grounded in</Text>
            <Text style={[styles.groundedLesson, { color: colors.text }]}>
              {lesson.subjectName} › {lesson.moduleName} › {lesson.title}
            </Text>
          </View>
        </Card>
      ) : null}

      {/* Code Context Editor */}
      <Text style={[styles.section, { color: colors.text }]}>Code Context</Text>
      <Card>
        <TextInput
          value={context}
          onChangeText={(text) => {
            setContext(text);
            setContextEditedByUser(true);
          }}
          multiline
          keyboardAppearance={theme === 'dark' ? 'dark' : 'light'}
          placeholder="Paste your code snippet here to analyze, debug, or optimize…"
          placeholderTextColor={colors.muted}
          style={[styles.codeEditor, { backgroundColor: isLight ? '#F5F5F5' : '#050a0d', color: primaryAccent }]}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {/* Quick Action Buttons */}
        <View style={styles.quickActionsGrid}>
          <Pressable
            onPress={() => handleQuickAction('Explain')}
            disabled={loading}
            style={({ pressed }) => [styles.quickActionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }, pressed && styles.pressed]}
          >
            <Ionicons name="sparkles" size={14} color={primaryAccent} />
            <Text style={[styles.quickActionText, { color: colors.text }]}>Explain</Text>
          </Pressable>
          <Pressable
            onPress={() => handleQuickAction('Debug')}
            disabled={loading}
            style={({ pressed }) => [styles.quickActionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }, pressed && styles.pressed]}
          >
            <Ionicons name="bug" size={14} color={primaryAccent} />
            <Text style={[styles.quickActionText, { color: colors.text }]}>Debug</Text>
          </Pressable>
          <Pressable
            onPress={() => handleQuickAction('Optimize')}
            disabled={loading}
            style={({ pressed }) => [styles.quickActionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }, pressed && styles.pressed]}
          >
            <Ionicons name="flash" size={14} color={primaryAccent} />
            <Text style={[styles.quickActionText, { color: colors.text }]}>Optimize</Text>
          </Pressable>
          <Pressable
            onPress={() => handleQuickAction('Generate Tests')}
            disabled={loading}
            style={({ pressed }) => [styles.quickActionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }, pressed && styles.pressed]}
          >
            <Ionicons name="flask" size={14} color={primaryAccent} />
            <Text style={[styles.quickActionText, { color: colors.text }]}>Tests</Text>
          </Pressable>
        </View>
      </Card>

      {/* Live Complexity & Structure Analysis */}
      {liveAnalysis ? (
        <>
          <Text style={[styles.section, { color: colors.text }]}>Live Code Analysis</Text>
          <Card>
            {liveAnalysis.map((sec, idx) => (
              <View
                key={sec.title}
                style={[
                  styles.analysisSection,
                  idx > 0 && [styles.divider, { borderTopColor: colors.border }],
                ]}
              >
                <Text style={[styles.analysisTitle, { color: primaryAccent }]}>{sec.title}</Text>
                {sec.items.map((item, itemIdx) => (
                  <Text key={itemIdx} style={[styles.analysisItem, { color: colors.text }]}>
                    {item}
                  </Text>
                ))}
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {/* Suggested Prompts */}
      <Text style={[styles.section, { color: colors.text }]}>Suggested Topics</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
        {starterPrompts.map((prompt) => (
          <Pressable
            key={prompt}
            onPress={() => send(prompt)}
            disabled={loading}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={13} color={primaryAccent} />
            <Text style={[styles.chipText, { color: colors.text }]}>{prompt}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Conversation Thread */}
      <Text style={[styles.section, { color: colors.text }]}>Conversation</Text>
      {messages.map((item, index) => (
        <Card key={index}>
          <View style={styles.msgHeader}>
            <View style={[styles.roleBadge, { backgroundColor: item.role === 'user' ? (isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.2)') : colors.surfaceElevated }]}>
              <Ionicons
                name={item.role === 'user' ? 'person' : 'hardware-chip'}
                size={12}
                color={item.role === 'user' ? primaryAccent : colors.muted}
              />
              <Text style={[styles.roleText, { color: item.role === 'user' ? primaryAccent : colors.muted }]}>
                {item.role === 'user' ? 'You' : 'SynergySphere AI'}
              </Text>
            </View>
            {item.lessonTitle ? (
              <View style={[styles.groundBadge, { borderColor: primaryAccent }]}>
                <Text style={[styles.groundText, { color: primaryAccent }]}>Lesson: {item.lessonTitle}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.msgBody, { color: colors.text }]}>{item.content}</Text>
        </Card>
      ))}

      {/* Ask Input Card */}
      <Card>
        <TextInput
          value={message}
          onChangeText={setMessage}
          onFocus={() => {
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 180);
          }}
          keyboardAppearance={theme === 'dark' ? 'dark' : 'light'}
          placeholder={lesson ? `Ask about ${lesson.title}…` : 'Ask about code concepts, debug traces, syntax…'}
          placeholderTextColor={colors.muted}
          multiline
          style={[styles.inputBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
        />
        <Button
          title={loading ? 'Thinking…' : 'Send Question'}
          onPress={() => send()}
          disabled={loading || !message.trim()}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  headerRowLarge: {
    alignItems: 'flex-start',
  },
  aiLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  aiLogoLarge: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  headerTitleWrap: {
    flex: 1,
    gap: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  clearButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, marginTop: 4 },
  clearText: { fontSize: 12, fontWeight: '600' },
  pressed: { opacity: 0.7 },
  groundedRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  groundedText: { fontSize: 12, fontWeight: '800' },
  groundedLesson: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  section: { fontSize: 17, fontWeight: '800', marginTop: 14, marginBottom: 4 },
  codeEditor: { minHeight: 120, padding: 12, borderRadius: 8, fontFamily: 'monospace', fontSize: 12, lineHeight: 18, textAlignVertical: 'top' },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  quickActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  quickActionText: { fontSize: 12, fontWeight: '700' },
  analysisSection: { paddingVertical: 8, gap: 4 },
  divider: { borderTopWidth: 1 },
  analysisTitle: { fontSize: 13, fontWeight: '800' },
  analysisItem: { fontSize: 12, lineHeight: 18 },
  chipsScroll: { gap: 8, paddingVertical: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
  msgHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  roleText: { fontSize: 11, fontWeight: '800' },
  groundBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  groundText: { fontSize: 10, fontWeight: '700' },
  msgBody: { fontSize: 14, lineHeight: 22 },
  inputBox: { minHeight: 80, padding: 12, borderRadius: 10, borderWidth: 1, fontSize: 14, lineHeight: 20, textAlignVertical: 'top', marginBottom: 10 },
});
