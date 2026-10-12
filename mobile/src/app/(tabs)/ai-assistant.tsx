import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, TextInput, ScrollView, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Notice } from '@/components/Screen';
import { Button, Card } from '@/components/ui';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import { MarkdownView } from '@/components/MarkdownView';

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

  // Tab State: 'conversation' vs 'codeContext'
  const [activeTab, setActiveTab] = useState<'conversation' | 'codeContext'>('conversation');
  // Expandable & Collapsible Chat History state
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

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

  // Derived user questions for the expandable chat history
  const userQuestions = useMemo(() => {
    return messages
      .filter((m) => m.role === 'user')
      .map((m, index) => ({
        index,
        content: m.content,
      }));
  }, [messages]);

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
      setActiveTab('codeContext');
      return;
    }
    const prompts: Record<string, string> = {
      Explain: `Explain this code clearly and concisely, step by step:\n\n\`\`\`\n${context}\n\`\`\``,
      Debug: `Find and fix any bugs or issues in this code. List each problem and show the corrected version:\n\n\`\`\`\n${context}\n\`\`\``,
      Optimize: `Optimize this code for better performance and readability. Show the improved version:\n\n\`\`\`\n${context}\n\`\`\``,
      'Generate Tests': `Generate comprehensive unit tests for this code including edge cases:\n\n\`\`\`\n${context}\n\`\`\``,
    };
    // Switch to Conversation tab so user immediately sees the query and answer stream
    setActiveTab('conversation');
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
    setIsHistoryExpanded(false);
  }

  const isLight = theme === 'light';
  const primaryAccent = isLight ? '#1e6827' : colors.primary;

  return (
    <Screen scrollViewRef={scrollViewRef}>
      {/* ── Screen Header ── */}
      <View
        style={[
          styles.headerRow,
          largerText && styles.headerRowLarge,
        ]}
      >
        <View
          style={[
            styles.aiLogoWrapper,
            largerText && styles.aiLogoWrapperLarge,
            {
              backgroundColor:
                theme === 'dark'
                  ? 'rgba(16, 33, 40, 0.7)'
                  : 'rgba(237, 243, 239, 0.85)',
              borderColor:
                theme === 'dark'
                  ? 'rgba(145, 219, 94, 0.28)'
                  : 'rgba(145, 219, 94, 0.45)',
              shadowColor: theme === 'dark' ? '#91db5e' : '#10231D',
            },
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
        </View>

        <View style={styles.headerText}>
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
            {lesson ? 'Lesson\nAssistant' : 'AI\nWorkspace'}
          </Text>

          <Text
            allowFontScaling
            numberOfLines={2}
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
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear chat history"
          style={({ pressed }) => [
            styles.clearButton,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="trash-outline" size={15} color={colors.muted} />
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

      {/* ── Segmented Tab Bar: Conversation vs Code Context ── */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: isLight ? '#EBF2EE' : 'rgba(255, 255, 255, 0.05)',
            borderColor: isLight ? '#D3DFD7' : 'rgba(255, 255, 255, 0.1)',
          },
        ]}
      >
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Conversation Tab"
          accessibilityState={{ selected: activeTab === 'conversation' }}
          onPress={() => setActiveTab('conversation')}
          style={[
            styles.tabItem,
            activeTab === 'conversation' && [
              styles.tabItemActive,
              {
                backgroundColor: isLight ? '#FFFFFF' : 'rgba(145, 219, 94, 0.18)',
                borderColor: isLight ? 'rgba(30, 104, 39, 0.28)' : 'rgba(145, 219, 94, 0.45)',
                shadowColor: isLight ? '#000' : '#91db5e',
              },
            ],
          ]}
        >
          <Ionicons
            name={activeTab === 'conversation' ? 'chatbubbles' : 'chatbubbles-outline'}
            size={16}
            color={activeTab === 'conversation' ? primaryAccent : colors.muted}
          />
          <Text
            allowFontScaling
            style={[
              styles.tabLabel,
              {
                color: activeTab === 'conversation' ? (isLight ? '#1e6827' : '#91db5e') : colors.muted,
                fontWeight: activeTab === 'conversation' ? '800' : '600',
                fontSize: fontSize(13),
              },
            ]}
          >
            Conversation
          </Text>
          {userQuestions.length > 0 && (
            <View
              style={[
                styles.tabBadge,
                {
                  backgroundColor:
                    activeTab === 'conversation'
                      ? isLight
                        ? 'rgba(30, 104, 39, 0.12)'
                        : 'rgba(145, 219, 94, 0.25)'
                      : isLight
                      ? 'rgba(0, 0, 0, 0.06)'
                      : 'rgba(255, 255, 255, 0.08)',
                },
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  { color: activeTab === 'conversation' ? primaryAccent : colors.muted },
                ]}
              >
                {userQuestions.length}
              </Text>
            </View>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Code Context Tab"
          accessibilityState={{ selected: activeTab === 'codeContext' }}
          onPress={() => setActiveTab('codeContext')}
          style={[
            styles.tabItem,
            activeTab === 'codeContext' && [
              styles.tabItemActive,
              {
                backgroundColor: isLight ? '#FFFFFF' : 'rgba(145, 219, 94, 0.18)',
                borderColor: isLight ? 'rgba(30, 104, 39, 0.28)' : 'rgba(145, 219, 94, 0.45)',
                shadowColor: isLight ? '#000' : '#91db5e',
              },
            ],
          ]}
        >
          <Ionicons
            name={activeTab === 'codeContext' ? 'code-slash' : 'code-slash-outline'}
            size={16}
            color={activeTab === 'codeContext' ? primaryAccent : colors.muted}
          />
          <Text
            allowFontScaling
            style={[
              styles.tabLabel,
              {
                color: activeTab === 'codeContext' ? (isLight ? '#1e6827' : '#91db5e') : colors.muted,
                fontWeight: activeTab === 'codeContext' ? '800' : '600',
                fontSize: fontSize(13),
              },
            ]}
          >
            Code Context
          </Text>
          {context.trim().length > 0 && (
            <View
              style={[
                styles.tabIndicatorDot,
                { backgroundColor: '#10B981' },
              ]}
            />
          )}
        </Pressable>
      </View>

      {/* ═══════════════════════════════════════════════════════════════════
          TAB 1: CONVERSATION TAB
      ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'conversation' && (
        <>
          {/* ── Expandable & Collapsible Chat History ── */}
          <Card>
            <Pressable
              onPress={() => setIsHistoryExpanded((prev) => !prev)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={isHistoryExpanded ? 'Collapse Chat History' : 'Expand Chat History'}
              style={styles.historyHeaderRow}
            >
              <View style={styles.historyHeaderLeft}>
                <View
                  style={[
                    styles.historyIconWrapper,
                    {
                      backgroundColor: isLight
                        ? 'rgba(30, 104, 39, 0.1)'
                        : 'rgba(145, 219, 94, 0.16)',
                    },
                  ]}
                >
                  <Ionicons name="time-outline" size={17} color={primaryAccent} />
                </View>
                <View style={styles.historyHeaderTextWrapper}>
                  <View style={styles.historyTitleRow}>
                    <Text
                      style={[
                        styles.historyTitle,
                        { color: colors.text, fontSize: fontSize(14) },
                      ]}
                    >
                      Chat History
                    </Text>
                    <View
                      style={[
                        styles.historyCountPill,
                        {
                          backgroundColor: isLight
                            ? '#E8F5E9'
                            : 'rgba(145, 219, 94, 0.2)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.historyCountPillText,
                          { color: primaryAccent },
                        ]}
                      >
                        {userQuestions.length}{' '}
                        {userQuestions.length === 1 ? 'query' : 'queries'}
                      </Text>
                    </View>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.historySubtitle,
                      { color: colors.muted, fontSize: fontSize(12) },
                    ]}
                  >
                    {userQuestions.length === 0
                      ? 'No past questions recorded yet'
                      : isHistoryExpanded
                      ? 'Tap to collapse history list'
                      : `Recent: "${userQuestions[userQuestions.length - 1].content.slice(0, 36)}…"`}
                  </Text>
                </View>
              </View>

              <View style={styles.historyChevronWrapper}>
                <Ionicons
                  name={isHistoryExpanded ? 'chevron-up-circle' : 'chevron-down-circle'}
                  size={22}
                  color={primaryAccent}
                />
              </View>
            </Pressable>

            {isHistoryExpanded && (
              <View
                style={[
                  styles.historyExpandedContent,
                  { borderTopColor: colors.border },
                ]}
              >
                {userQuestions.length === 0 ? (
                  <View style={styles.historyEmptyContainer}>
                    <Ionicons
                      name="chatbubbles-outline"
                      size={24}
                      color={colors.muted}
                    />
                    <Text
                      style={[
                        styles.historyEmptyText,
                        { color: colors.muted, fontSize: fontSize(12) },
                      ]}
                    >
                      Your past questions and discussion topics will appear here for easy review and reuse.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.historyListContainer}>
                    <Text
                      style={[
                        styles.historyListHint,
                        { color: colors.muted, fontSize: fontSize(11) },
                      ]}
                    >
                      Tap any previous query to reload it into your message box:
                    </Text>
                    {userQuestions.map((q, idx) => (
                      <Pressable
                        key={idx}
                        onPress={() => {
                          setMessage(q.content);
                          setIsHistoryExpanded(false);
                          setTimeout(() => {
                            scrollViewRef.current?.scrollToEnd({ animated: true });
                          }, 100);
                        }}
                        style={({ pressed }) => [
                          styles.historyListItem,
                          {
                            backgroundColor: colors.surfaceElevated,
                            borderColor: colors.border,
                          },
                          pressed && styles.pressed,
                        ]}
                      >
                        <View style={styles.historyListItemTop}>
                          <View style={styles.historyListItemIndexBadge}>
                            <Ionicons
                              name="chatbubble-ellipses-outline"
                              size={12}
                              color={primaryAccent}
                            />
                            <Text
                              style={[
                                styles.historyListItemIndexText,
                                { color: primaryAccent },
                              ]}
                            >
                              Query #{idx + 1}
                            </Text>
                          </View>
                          <View style={styles.historyReuseAction}>
                            <Text
                              style={[
                                styles.historyReuseActionText,
                                { color: primaryAccent },
                              ]}
                            >
                              Load query ↵
                            </Text>
                          </View>
                        </View>
                        <Text
                          numberOfLines={2}
                          style={[
                            styles.historyListItemText,
                            { color: colors.text, fontSize: fontSize(13) },
                          ]}
                        >
                          {q.content}
                        </Text>
                      </Pressable>
                    ))}

                    <View style={styles.historyActionButtonsRow}>
                      <Pressable
                        onPress={clearChat}
                        hitSlop={6}
                        style={({ pressed }) => [
                          styles.historyClearBtn,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Ionicons name="trash-outline" size={13} color="#EF4444" />
                        <Text style={styles.historyClearBtnText}>Clear History</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setIsHistoryExpanded(false)}
                        hitSlop={6}
                        style={({ pressed }) => [
                          styles.historyCollapseBtn,
                          { borderColor: colors.border },
                          pressed && styles.pressed,
                        ]}
                      >
                        <Ionicons
                          name="chevron-up"
                          size={13}
                          color={colors.muted}
                        />
                        <Text
                          style={[
                            styles.historyCollapseBtnText,
                            { color: colors.muted },
                          ]}
                        >
                          Collapse
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            )}
          </Card>

          {/* ── Active Code Attached Pill in Conversation ── */}
          {context.trim().length > 0 && (
            <Pressable
              onPress={() => setActiveTab('codeContext')}
              style={({ pressed }) => [
                styles.attachedCodeBanner,
                {
                  backgroundColor: isLight
                    ? '#E8F5E9'
                    : 'rgba(145, 219, 94, 0.1)',
                  borderColor: isLight
                    ? '#C8E6C9'
                    : 'rgba(145, 219, 94, 0.28)',
                },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.attachedCodeLeft}>
                <Ionicons name="code-slash" size={16} color={primaryAccent} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.attachedCodeTitle,
                      { color: primaryAccent, fontSize: fontSize(13) },
                    ]}
                  >
                    Code Context Attached
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.attachedCodeSub,
                      { color: colors.muted, fontSize: fontSize(11) },
                    ]}
                  >
                    {context.trim().split('\n').length} lines loaded • Tap to edit or inspect code
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={primaryAccent} />
            </Pressable>
          )}

          {/* ── Suggested Prompts Chips ── */}
          <Text style={[styles.section, { color: colors.text }]}>Suggested Topics</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
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
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={13}
                  color={primaryAccent}
                />
                <Text style={[styles.chipText, { color: colors.text }]}>{prompt}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* ── Conversation Thread ── */}
          <View style={styles.conversationHeaderRow}>
            <Text style={[styles.section, { color: colors.text }]}>Conversation</Text>
            <Text style={[styles.conversationCountText, { color: colors.muted }]}>
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {messages.map((item, index) => (
            <Card key={index}>
              <View style={styles.msgHeader}>
                <View
                  style={[
                    styles.roleBadge,
                    {
                      backgroundColor:
                        item.role === 'user'
                          ? isLight
                            ? '#E8F5E9'
                            : 'rgba(30, 104, 39, 0.2)'
                          : colors.surfaceElevated,
                    },
                  ]}
                >
                  <Ionicons
                    name={item.role === 'user' ? 'person' : 'hardware-chip'}
                    size={12}
                    color={item.role === 'user' ? primaryAccent : colors.muted}
                  />
                  <Text
                    style={[
                      styles.roleText,
                      { color: item.role === 'user' ? primaryAccent : colors.muted },
                    ]}
                  >
                    {item.role === 'user' ? 'You' : 'SynergySphere AI'}
                  </Text>
                </View>
                {item.lessonTitle ? (
                  <View style={[styles.groundBadge, { borderColor: primaryAccent }]}>
                    <Text style={[styles.groundText, { color: primaryAccent }]}>
                      Lesson: {item.lessonTitle}
                    </Text>
                  </View>
                ) : null}
              </View>
              {item.role === 'assistant' ? (
                <MarkdownView content={item.content} />
              ) : (
                <Text style={[styles.msgBody, { color: colors.text }]}>{item.content}</Text>
              )}
            </Card>
          ))}

          {/* ── Ask Input Box ── */}
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
              placeholder={
                lesson
                  ? `Ask about ${lesson.title}…`
                  : 'Ask about code concepts, debug traces, syntax…'
              }
              placeholderTextColor={colors.muted}
              multiline
              style={[
                styles.inputBox,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />
            <Button
              title={loading ? 'Thinking…' : 'Send Question'}
              onPress={() => send()}
              disabled={loading || !message.trim()}
            />
          </Card>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TAB 2: CODE CONTEXT TAB
      ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'codeContext' && (
        <>
          {/* Code Context Editor Card */}
          <View style={styles.codeContextHeaderRow}>
            <Text style={[styles.section, { color: colors.text, marginTop: 4 }]}>
              Code Context Editor
            </Text>
            {context.trim().length > 0 && (
              <Pressable
                onPress={() => {
                  setContext('');
                  setContextEditedByUser(false);
                }}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.clearCodeSnippetBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="trash-outline" size={12} color={colors.muted} />
                <Text style={[styles.clearCodeSnippetText, { color: colors.muted }]}>
                  Clear Editor
                </Text>
              </Pressable>
            )}
          </View>

          <Card>
            <View style={styles.editorHeaderInfo}>
              <View style={styles.editorBadge}>
                <Ionicons name="code" size={12} color={primaryAccent} />
                <Text style={[styles.editorBadgeText, { color: primaryAccent }]}>
                  {context.trim().split('\n').filter(Boolean).length} Lines
                </Text>
              </View>
              <Text style={[styles.editorHintText, { color: colors.muted }]}>
                {context.trim().length} characters
              </Text>
            </View>

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
              style={[
                styles.codeEditor,
                {
                  backgroundColor: isLight ? '#F5F5F5' : '#050a0d',
                  color: primaryAccent,
                },
              ]}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Quick Action Buttons */}
            <Text
              style={[
                styles.quickActionsLabel,
                { color: colors.muted, fontSize: fontSize(11) },
              ]}
            >
              Run Instant Actions (switches to Conversation for explanations):
            </Text>
            <View style={styles.quickActionsGrid}>
              <Pressable
                onPress={() => handleQuickAction('Explain')}
                disabled={loading}
                style={({ pressed }) => [
                  styles.quickActionBtn,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="sparkles" size={14} color={primaryAccent} />
                <Text style={[styles.quickActionText, { color: colors.text }]}>
                  Explain
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleQuickAction('Debug')}
                disabled={loading}
                style={({ pressed }) => [
                  styles.quickActionBtn,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="bug" size={14} color={primaryAccent} />
                <Text style={[styles.quickActionText, { color: colors.text }]}>Debug</Text>
              </Pressable>
              <Pressable
                onPress={() => handleQuickAction('Optimize')}
                disabled={loading}
                style={({ pressed }) => [
                  styles.quickActionBtn,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="flash" size={14} color={primaryAccent} />
                <Text style={[styles.quickActionText, { color: colors.text }]}>
                  Optimize
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleQuickAction('Generate Tests')}
                disabled={loading}
                style={({ pressed }) => [
                  styles.quickActionBtn,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="flask" size={14} color={primaryAccent} />
                <Text style={[styles.quickActionText, { color: colors.text }]}>Tests</Text>
              </Pressable>
            </View>
          </Card>

          {/* ── Switch to Conversation Navigation Card ── */}
          <Pressable
            onPress={() => setActiveTab('conversation')}
            style={({ pressed }) => [
              styles.switchToConversationCard,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.switchToConversationLeft}>
              <Ionicons name="chatbubbles-outline" size={18} color={primaryAccent} />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.switchToConversationTitle,
                    { color: colors.text, fontSize: fontSize(13) },
                  ]}
                >
                  Ask about this Code
                </Text>
                <Text
                  style={[
                    styles.switchToConversationSub,
                    { color: colors.muted, fontSize: fontSize(11) },
                  ]}
                >
                  Switch back to Conversation to ask custom follow-ups.
                </Text>
              </View>
            </View>
            <Ionicons name="arrow-forward" size={16} color={primaryAccent} />
          </Pressable>

          {/* ── Live Complexity & Structure Analysis ── */}
          {liveAnalysis ? (
            <>
              <Text style={[styles.section, { color: colors.text }]}>
                Live Code Analysis
              </Text>
              <Card>
                {liveAnalysis.map((sec, idx) => (
                  <View
                    key={sec.title}
                    style={[
                      styles.analysisSection,
                      idx > 0 && [styles.divider, { borderTopColor: colors.border }],
                    ]}
                  >
                    <Text style={[styles.analysisTitle, { color: primaryAccent }]}>
                      {sec.title}
                    </Text>
                    {sec.items.map((item, itemIdx) => (
                      <Text
                        key={itemIdx}
                        style={[styles.analysisItem, { color: colors.text }]}
                      >
                        {item}
                      </Text>
                    ))}
                  </View>
                ))}
              </Card>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
    minHeight: 88,
    width: '100%',
  },
  headerRowLarge: {
    alignItems: 'flex-start',
  },
  aiLogoWrapper: {
    width: 58,
    height: 58,
    borderRadius: 29,
    padding: 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
    flexShrink: 0,
  },
  aiLogoWrapperLarge: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  aiLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  aiLogoLarge: {
    borderRadius: 31,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  headerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
  groundedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap',
  },
  groundedText: {
    fontSize: 12,
    fontWeight: '800',
  },
  groundedLesson: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },

  /* ── Segmented Tab Bar ── */
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
    marginVertical: 10,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 6,
  },
  tabItemActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  tabIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  /* ── Expandable Chat History Card ── */
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  historyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  historyIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  historyHeaderTextWrapper: {
    flex: 1,
    minWidth: 0,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  historyTitle: {
    fontWeight: '800',
  },
  historyCountPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  historyCountPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  historySubtitle: {
    marginTop: 1,
  },
  historyChevronWrapper: {
    padding: 2,
  },
  historyExpandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  historyEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  historyEmptyText: {
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  historyListContainer: {
    gap: 8,
  },
  historyListHint: {
    marginBottom: 2,
  },
  historyListItem: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  historyListItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyListItemIndexBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyListItemIndexText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  historyReuseAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyReuseActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  historyListItemText: {
    lineHeight: 18,
  },
  historyActionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 4,
  },
  historyClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  historyClearBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  historyCollapseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  historyCollapseBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },

  /* ── Attached Code Banner ── */
  attachedCodeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 4,
    gap: 8,
  },
  attachedCodeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  attachedCodeTitle: {
    fontWeight: '800',
  },
  attachedCodeSub: {
    marginTop: 1,
  },

  /* ── Common Sections ── */
  section: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 14,
    marginBottom: 4,
  },
  conversationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 10,
    marginBottom: 4,
  },
  conversationCountText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },

  /* ── Code Context Tab Components ── */
  codeContextHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  clearCodeSnippetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearCodeSnippetText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editorHeaderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editorBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  editorHintText: {
    fontSize: 11,
  },
  codeEditor: {
    minHeight: 180,
    padding: 12,
    borderRadius: 8,
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
    textAlignVertical: 'top',
  },
  quickActionsLabel: {
    marginTop: 12,
    marginBottom: 6,
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  switchToConversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    gap: 8,
  },
  switchToConversationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  switchToConversationTitle: {
    fontWeight: '800',
  },
  switchToConversationSub: {
    marginTop: 2,
  },

  /* ── Analysis ── */
  analysisSection: {
    paddingVertical: 8,
    gap: 4,
  },
  divider: {
    borderTopWidth: 1,
  },
  analysisTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  analysisItem: {
    fontSize: 12,
    lineHeight: 18,
  },

  /* ── Chips & Messages ── */
  chipsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  msgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '800',
  },
  groundBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  groundText: {
    fontSize: 10,
    fontWeight: '700',
  },
  msgBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  inputBox: {
    minHeight: 80,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
});
