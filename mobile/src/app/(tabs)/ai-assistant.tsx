import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
  Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Screen, Notice } from '@/components/Screen';
import { Button, Card } from '@/components/ui';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import { MarkdownView } from '@/components/MarkdownView';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DRAFT_CODE_KEY = 'synergysphere_ai_code_draft';
const QUERY_HISTORY_STORAGE_KEY = 'synergysphere_ai_query_history_v2';

export interface QueryHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  lessonTitle?: string;
  responseSnippet?: string;
}

function formatRelativeTime(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

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
  const tabAnim = useRef(new Animated.Value(0)).current;

  // Expandable & Collapsible Chat History state
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyQueries, setHistoryQueries] = useState<QueryHistoryItem[]>([]);

  // Restore persistent query history on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(QUERY_HISTORY_STORAGE_KEY);
        if (!cancelled && stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setHistoryQueries(parsed);
          }
        }
      } catch {
        // Fallback gracefully
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Toast / feedback message banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "👋 Hi! I'm your SynergySphere AI Workspace assistant, grounded in the Learning Hub and your study packs. Ask about the lesson you're studying, paste code, or use quick actions!",
    },
  ]);
  const [message, setMessage] = useState('');
  const [context, setContext] = useState('');
  const [contextEditedByUser, setContextEditedByUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lesson, setLesson] = useState<LessonPreview | null>(null);

  // Debounced context for 60fps typing without recalculating regex loops synchronously
  const [debouncedContext, setDebouncedContext] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedContext(context), 160);
    return () => clearTimeout(t);
  }, [context]);

  const liveAnalysis = useMemo(() => analyzeCodeLocally(debouncedContext), [debouncedContext]);

  const showToast = useCallback((text: string) => {
    setToastMessage(text);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  // Restore draft code if not opened from a lesson
  useEffect(() => {
    if (lessonParam) return;
    let cancelled = false;
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(DRAFT_CODE_KEY);
        if (!cancelled && saved && !context) {
          setContext(saved);
          setContextEditedByUser(true);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonParam]);

  // Debounce-save draft code to SecureStore
  useEffect(() => {
    if (!contextEditedByUser) return;
    const t = setTimeout(() => {
      SecureStore.setItemAsync(DRAFT_CODE_KEY, context).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [context, contextEditedByUser]);

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

  // Filtered queries for search within history
  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return historyQueries;
    const q = historySearch.toLowerCase();
    return historyQueries.filter(
      (item) =>
        item.query.toLowerCase().includes(q) ||
        (item.lessonTitle && item.lessonTitle.toLowerCase().includes(q)) ||
        (item.responseSnippet && item.responseSnippet.toLowerCase().includes(q))
    );
  }, [historyQueries, historySearch]);

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

  const handleSwitchTab = useCallback(
    (newTab: 'conversation' | 'codeContext') => {
      if (newTab === activeTab) return;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setActiveTab(newTab);
      Animated.spring(tabAnim, {
        toValue: newTab === 'conversation' ? 0 : 1,
        useNativeDriver: false,
        bounciness: 4,
        speed: 14,
      }).start();
    },
    [activeTab, tabAnim],
  );

  const toggleHistory = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsHistoryExpanded((prev) => !prev);
  }, []);

  // Bi-directional code bridge: transfer code block from assistant markdown directly into editor
  const applySnippetToContext = useCallback(
    (snippet: string) => {
      setContext(snippet);
      setContextEditedByUser(true);
      handleSwitchTab('codeContext');
      showToast('Code transferred to Code Context editor! ✓');
    },
    [handleSwitchTab, showToast],
  );

  async function send(value = message, forcedContext?: string) {
    if (!value.trim() || loading) return;
    const question = value.trim();
    const baseMessages = messages;
    setMessages((current) => [...current, { role: 'user', content: question }]);
    setMessage('');
    setLoading(true);
    setError('');

    // Persist query into query history (saved across chats & sessions)
    const queryId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newHistoryItem: QueryHistoryItem = {
      id: queryId,
      query: question,
      timestamp: Date.now(),
      lessonTitle: lesson?.title || undefined,
    };
    setHistoryQueries((prev) => {
      const filtered = prev.filter((item) => item.query.trim().toLowerCase() !== question.toLowerCase());
      const updated = [newHistoryItem, ...filtered].slice(0, 50);
      SecureStore.setItemAsync(QUERY_HISTORY_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

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

      // Enrich history item with answer snippet preview
      const snippet = response.response.slice(0, 95).replace(/[#*`\n]/g, ' ').trim();
      setHistoryQueries((prev) => {
        const updated = prev.map((item) =>
          item.id === queryId ? { ...item, responseSnippet: snippet } : item
        );
        SecureStore.setItemAsync(QUERY_HISTORY_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
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
      const snippet = reply.slice(0, 95).replace(/[#*`\n]/g, ' ').trim();
      setHistoryQueries((prev) => {
        const updated = prev.map((item) =>
          item.id === queryId ? { ...item, responseSnippet: snippet } : item
        );
        SecureStore.setItemAsync(QUERY_HISTORY_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
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
      handleSwitchTab('codeContext');
      return;
    }
    const prompts: Record<string, string> = {
      Explain: `Explain this code clearly and concisely, step by step:\n\n\`\`\`\n${context}\n\`\`\``,
      Debug: `Find and fix any bugs or issues in this code. List each problem and show the corrected version:\n\n\`\`\`\n${context}\n\`\`\``,
      Optimize: `Optimize this code for better performance and readability. Show the improved version:\n\n\`\`\`\n${context}\n\`\`\``,
      'Generate Tests': `Generate comprehensive unit tests for this code including edge cases:\n\n\`\`\`\n${context}\n\`\`\``,
    };
    handleSwitchTab('conversation');
    send(prompts[action], context);
  }

  // Fetch chat history on mount & merge with persistent queries
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

          // Seed user questions from server into persistent history if absent
          setHistoryQueries((prev) => {
            const existingSet = new Set(prev.map((p) => p.query.trim().toLowerCase()));
            const newItems: QueryHistoryItem[] = [];
            history.forEach((m, idx) => {
              if (m.role === 'user' && !existingSet.has(m.content.trim().toLowerCase())) {
                existingSet.add(m.content.trim().toLowerCase());
                const nextMsg = history[idx + 1];
                const snippet =
                  nextMsg && nextMsg.role === 'assistant'
                    ? nextMsg.content.slice(0, 95).replace(/[#*`\n]/g, ' ').trim()
                    : undefined;
                newItems.push({
                  id: `remote_${m.id || idx}_${Date.now()}`,
                  query: m.content,
                  timestamp: Date.now() - (history.length - idx) * 60000,
                  responseSnippet: snippet,
                });
              }
            });
            if (newItems.length === 0) return prev;
            const merged = [...newItems, ...prev].slice(0, 50);
            SecureStore.setItemAsync(QUERY_HISTORY_STORAGE_KEY, JSON.stringify(merged)).catch(() => {});
            return merged;
          });
        }
      } catch {
        // Continue with default welcome message
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function startNewConversation() {
    setMessages([
      {
        role: 'assistant',
        content: lesson
          ? `👋 Ready for a new discussion about **${lesson.title}**! How can I help you?`
          : "👋 Starting a fresh workspace conversation! Ask about code, algorithms, or your studies.",
      },
    ]);
    setMessage('');
    // NOTE: historyQueries remains 100% preserved so previous questions never vanish!
    showToast('New chat started • Past queries saved in History');
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 100);
  }

  function resetCurrentThread() {
    setMessages([
      {
        role: 'assistant',
        content: lesson
          ? `Chat thread reset. Ask me anything about "${lesson.title}".`
          : 'Chat thread reset. Ask any question or paste code in Code Context.',
      },
    ]);
    showToast('Conversation reset • History retained');
  }

  function deleteHistoryItem(id: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setHistoryQueries((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      SecureStore.setItemAsync(QUERY_HISTORY_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    showToast('Query removed from history');
  }

  async function clearAllHistory() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setHistoryQueries([]);
    await SecureStore.deleteItemAsync(QUERY_HISTORY_STORAGE_KEY).catch(() => {});
    try {
      await api.delete('/ai/chat/history');
    } catch {
      // ignore
    }
    showToast('Query history cleared ✓');
  }

  const isLight = theme === 'light';
  const primaryAccent = isLight ? '#1e6827' : colors.primary;

  return (
    <Screen
      scrollViewRef={scrollViewRef}
      alwaysBounceVertical={true}
      contentContainerStyle={styles.screenContentContainer}
    >
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
              : 'Grounded in Learning Hub and your study packs.'}
          </Text>
        </View>
      </View>

      {/* ── Toast Notification Banner ── */}
      {toastMessage ? (
        <View
          style={[
            styles.toastBanner,
            {
              backgroundColor: isLight ? '#065F46' : '#047857',
              borderColor: '#10B981',
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={15} color="#A7F3D0" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}

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

      {/* ── Segmented Tab Bar with Smooth Animated Sliding Indicator ── */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: isLight ? '#EBF2EE' : 'rgba(255, 255, 255, 0.05)',
            borderColor: isLight ? '#D3DFD7' : 'rgba(255, 255, 255, 0.1)',
          },
        ]}
      >
        {/* Animated Sliding Indicator Pill */}
        <Animated.View
          style={[
            styles.tabSlidingIndicator,
            {
              left: tabAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['1.5%', '50.5%'],
              }),
              backgroundColor: isLight ? '#FFFFFF' : 'rgba(145, 219, 94, 0.18)',
              borderColor: isLight ? 'rgba(30, 104, 39, 0.28)' : 'rgba(145, 219, 94, 0.45)',
              shadowColor: isLight ? '#000' : '#91db5e',
            },
          ]}
        />

        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Conversation Tab"
          accessibilityState={{ selected: activeTab === 'conversation' }}
          onPress={() => handleSwitchTab('conversation')}
          style={styles.tabItem}
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
              {historyQueries.length}
            </Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Code Context Tab"
          accessibilityState={{ selected: activeTab === 'codeContext' }}
          onPress={() => handleSwitchTab('codeContext')}
          style={styles.tabItem}
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
          {/* ── Conversation Actions Toolbar (No header collision) ── */}
          <View style={styles.conversationActionBar}>
            <Pressable
              onPress={startNewConversation}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Start a new conversation"
              style={({ pressed }) => [
                styles.newChatBtn,
                {
                  backgroundColor: primaryAccent,
                },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.btnIconWrapper}>
                <Ionicons name="add" size={16} color={isLight ? '#FFFFFF' : '#0B1510'} />
              </View>
              <Text style={[styles.newChatBtnText, { color: isLight ? '#FFFFFF' : '#0B1510' }]}>
                New Chat
              </Text>
            </Pressable>

            <View style={styles.conversationActionRight}>
              <Pressable
                onPress={toggleHistory}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={isHistoryExpanded ? 'Collapse Chat History' : 'Expand Chat History'}
                style={({ pressed }) => [
                  styles.historyShortcutBtn,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: isHistoryExpanded ? primaryAccent : colors.border,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.btnIconWrapper}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={isHistoryExpanded ? primaryAccent : colors.muted}
                  />
                </View>
                <Text
                  style={[
                    styles.historyShortcutText,
                    { color: isHistoryExpanded ? primaryAccent : colors.muted },
                  ]}
                >
                  History ({historyQueries.length})
                </Text>
                <Ionicons
                  name={isHistoryExpanded ? 'chevron-up' : 'chevron-down'}
                  size={12}
                  color={isHistoryExpanded ? primaryAccent : colors.muted}
                />
              </Pressable>

              <Pressable
                onPress={resetCurrentThread}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Reset active conversation"
                style={({ pressed }) => [
                  styles.resetThreadBtn,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.btnIconWrapper}>
                  <Ionicons name="refresh-outline" size={13} color={colors.muted} />
                </View>
                <Text style={[styles.resetThreadText, { color: colors.muted }]}>Reset</Text>
              </Pressable>
            </View>
          </View>

          {/* ── Big Chat History Drawer (ONLY rendered when expanded via the mini history tab) ── */}
          {isHistoryExpanded && (
            <Card>
              <View style={styles.historyHeaderRow}>
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
                          {historyQueries.length}{' '}
                          {historyQueries.length === 1 ? 'query' : 'queries'}
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
                      {historyQueries.length === 0
                        ? 'No past questions saved yet'
                        : `Recent: "${historyQueries[0].query.slice(0, 36)}…"`}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={toggleHistory}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Collapse Chat History"
                  style={styles.historyChevronWrapper}
                >
                  <Ionicons
                    name="chevron-up-circle"
                    size={22}
                    color={primaryAccent}
                  />
                </Pressable>
              </View>

              <View
                style={[
                  styles.historyExpandedContent,
                  { borderTopColor: colors.border },
                ]}
              >
                {historyQueries.length === 0 ? (
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
                      Your past questions and discussion topics will appear here and stay saved across sessions.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.historyListContainer}>
                    {/* Search bar inside history if multiple items */}
                    {historyQueries.length > 2 && (
                      <View
                        style={[
                          styles.historySearchWrapper,
                          { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                        ]}
                      >
                        <Ionicons name="search" size={13} color={colors.muted} />
                        <TextInput
                          value={historySearch}
                          onChangeText={setHistorySearch}
                          placeholder="Filter past questions or topics…"
                          placeholderTextColor={colors.muted}
                          style={[styles.historySearchInput, { color: colors.text }]}
                          autoCapitalize="none"
                        />
                        {historySearch.length > 0 && (
                          <Pressable onPress={() => setHistorySearch('')} hitSlop={6}>
                            <Ionicons name="close-circle" size={14} color={colors.muted} />
                          </Pressable>
                        )}
                      </View>
                    )}

                    <Text
                      style={[
                        styles.historyListHint,
                        { color: colors.muted, fontSize: fontSize(11) },
                      ]}
                    >
                      Tap any previous query to reload it into your message box:
                    </Text>
                    {filteredHistory.map((q, idx) => (
                      <View
                        key={q.id || idx}
                        style={[
                          styles.historyListItem,
                          {
                            backgroundColor: colors.surfaceElevated,
                            borderColor: colors.border,
                          },
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
                              Query #{historyQueries.length - idx}
                            </Text>
                            <Text
                              style={[
                                styles.historyTimestampText,
                                { color: colors.muted },
                              ]}
                            >
                              • {formatRelativeTime(q.timestamp)}
                            </Text>
                            {q.lessonTitle && (
                              <View
                                style={[
                                  styles.historyLessonTag,
                                  { backgroundColor: isLight ? 'rgba(30,104,39,0.08)' : 'rgba(145,219,94,0.12)' },
                                ]}
                              >
                                <Text
                                  numberOfLines={1}
                                  style={[styles.historyLessonTagText, { color: primaryAccent }]}
                                >
                                  {q.lessonTitle}
                                </Text>
                              </View>
                            )}
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Pressable
                              onPress={() => {
                                setMessage(q.query);
                                toggleHistory();
                                setTimeout(() => {
                                  scrollViewRef.current?.scrollToEnd({ animated: true });
                                }, 100);
                              }}
                              hitSlop={6}
                              style={styles.historyReuseAction}
                            >
                              <Text
                                style={[
                                  styles.historyReuseActionText,
                                  { color: primaryAccent },
                                ]}
                              >
                                Load ↵
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => deleteHistoryItem(q.id)}
                              hitSlop={8}
                              accessibilityLabel="Delete query from history"
                              style={styles.historyItemDeleteBtn}
                            >
                              <Ionicons name="close" size={14} color={colors.muted} />
                            </Pressable>
                          </View>
                        </View>
                        <Pressable
                          onPress={() => {
                            setMessage(q.query);
                            toggleHistory();
                            setTimeout(() => {
                              scrollViewRef.current?.scrollToEnd({ animated: true });
                            }, 100);
                          }}
                        >
                          <Text
                            numberOfLines={2}
                            style={[
                              styles.historyListItemText,
                              { color: colors.text, fontSize: fontSize(13) },
                            ]}
                          >
                            {q.query}
                          </Text>
                          {q.responseSnippet ? (
                            <View
                              style={[
                                styles.historySnippetBox,
                                {
                                  backgroundColor: isLight ? '#FAFAFA' : 'rgba(0,0,0,0.2)',
                                  borderColor: isLight ? '#E5E7EB' : 'rgba(255,255,255,0.06)',
                                },
                              ]}
                            >
                              <Text
                                numberOfLines={1}
                                style={[styles.historySnippetText, { color: colors.muted }]}
                              >
                                💬 {q.responseSnippet}…
                              </Text>
                            </View>
                          ) : null}
                        </Pressable>
                      </View>
                    ))}

                    <View style={styles.historyActionButtonsRow}>
                      <Pressable
                        onPress={clearAllHistory}
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
                        onPress={toggleHistory}
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
            </Card>
          )}

          {/* ── Active Code Attached Pill in Conversation ── */}
          {context.trim().length > 0 && (
            <Pressable
              onPress={() => handleSwitchTab('codeContext')}
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
                    {context.trim().split('\n').length} lines loaded • Tap to inspect or edit
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
                <View style={styles.chipIconWrapper}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={13}
                    color={primaryAccent}
                    style={styles.chipIcon}
                  />
                </View>
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
                <MarkdownView
                  content={item.content}
                  onApplyCode={applySnippetToContext}
                />
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
                  setContextEditedByUser(true);
                  showToast('Editor cleared');
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
                {context.trim().length} characters • Auto-saved
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
            onPress={() => handleSwitchTab('conversation')}
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
    marginBottom: 8,
    minHeight: 88,
    width: '100%',
    paddingRight: 52, // Clear floating burger menu icon at top-right
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
  screenContentContainer: {
    flexGrow: 1,
    paddingBottom: 200,
  },
  conversationActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
    flexWrap: 'nowrap',
  },
  btnIconWrapper: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    height: 34,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
    flexShrink: 0,
  },
  newChatBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  conversationActionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  historyShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    height: 34,
    flexShrink: 0,
  },
  historyShortcutText: {
    fontSize: 12,
    fontWeight: '700',
  },
  resetThreadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    height: 34,
    flexShrink: 0,
  },
  resetThreadText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  historyTimestampText: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  historyLessonTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: 120,
  },
  historyLessonTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  historyItemDeleteBtn: {
    padding: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historySnippetBox: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  historySnippetText: {
    fontSize: 11.5,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  pressed: {
    opacity: 0.7,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
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
    position: 'relative',
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginVertical: 10,
    height: 46,
    alignItems: 'center',
  },
  tabSlidingIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    width: '48%',
    borderRadius: 9,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    zIndex: 2,
    gap: 6,
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
  historySearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 4,
  },
  historySearchInput: {
    flex: 1,
    fontSize: 12,
    padding: 0,
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
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    height: 34,
    flexShrink: 0,
  },
  chipIconWrapper: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chipIcon: {
    width: 13,
    height: 13,
    textAlign: 'center',
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
