import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState, Component, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Button, Card, Field } from '@/components/ui';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import { saveCachedResponse } from '@/services/offlineCache';
import type { LectureUpload } from '@/types/api';

const safeStr = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return '';
    }
  }
  return '';
};

const SAMPLE_LECTURES = [
  {
    title: 'Data Structures & Algorithms: Balanced Trees & Hash Maps',
    content: `Data Structures & Algorithms: Balanced Trees & Hash Maps\n\nKey Concepts:\n- Binary Search Trees (BST): A node-based binary tree data structure where each node has at most two children. The left subtree contains only nodes with keys less than the parent's key, and the right subtree contains only nodes with keys greater.\n- Self-Balancing Trees (AVL & Red-Black Trees): Ensure O(log n) time complexity for search, insert, and delete operations by maintaining tree height balance through rotations.\n- Hash Tables: Implement associative arrays using a hash function to map keys to bucket indices. Average case time complexity for lookups, insertions, and deletions is O(1).\n- Collision Resolution Techniques: Chaining (linked lists at each bucket) and Open Addressing (Linear Probing, Quadratic Probing, Double Hashing).\n- Big-O Complexity Comparisons: Array lookup is O(1) by index, O(n) by value. Hash Table lookup is O(1) average, O(n) worst-case. BST lookup is O(log n) balanced, O(n) degenerate.`,
  },
  {
    title: 'Modern Web Architecture: Event Loop & Microservices',
    content: `Modern Web Architecture: Event Loop & Microservices\n\nKey Concepts:\n- Node.js Event Loop: Single-threaded event loop driven by libuv with distinct execution phases: Timers, Pending Callbacks, Idle/Prepare, Poll, Check (setImmediate), and Close callbacks.\n- Microtasks vs Macrotasks: process.nextTick and Promise microtasks execute immediately after the current operation and before the next phase of the event loop.\n- Microservices Architecture: Decentralized software architecture where independently deployable services communicate over HTTP/REST, gRPC, or asynchronous message queues (RabbitMQ, Kafka).\n- Database Sharding & Replication: Horizontal partitioning across multiple database instances to scale read and write throughput while maintaining high availability.\n- Caching Strategies: Cache-aside, Read-Through, Write-Through, and Write-Back patterns utilizing distributed in-memory caches like Redis.`,
  },
];

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackColor?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class LectureErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('LectureToLife render exception caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={{ fontSize: 18, fontWeight: '700', color: this.props.fallbackColor || '#111827', marginTop: 12, textAlign: 'center' }}>
            Study Pack Display Notice
          </Text>
          <Text style={{ fontSize: 13, color: '#6b7280', marginVertical: 8, textAlign: 'center' }}>
            {this.state.error?.message || 'A display issue occurred while rendering this study pack.'}
          </Text>
          <Pressable
            onPress={() => {
              this.setState({ hasError: false, error: null });
              this.props.onReset?.();
            }}
            style={{
              marginTop: 12,
              paddingVertical: 10,
              paddingHorizontal: 20,
              backgroundColor: '#10b981',
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Refresh View</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const asArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (!value) return [];
  if (typeof value === 'object') {
    return Object.values(value as Record<string, T>);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as T[];
      if (parsed && typeof parsed === 'object') return Object.values(parsed) as T[];
    } catch {
      return [];
    }
  }
  return [];
};

export default function LectureToLifeScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { fontSize, largerText } = useAccessibility();

  const [uploads, setUploads] = useState<LectureUpload[]>([]);
  const [selected, setSelected] = useState<LectureUpload | null>(null);
  const [name, setName] = useState('Lecture notes');
  const [content, setContent] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [selectedDocName, setSelectedDocName] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [flipped, setFlipped] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Spaced Repetition (SM-2) Review State
  const [srsDueCards, setSrsDueCards] = useState<
    Array<{
      id: string;
      front: string;
      back: string;
      easeFactor: number;
      intervalDays: number;
      repetitions: number;
      lectureId?: string;
    }>
  >([]);
  const [srsTotalCount, setSrsTotalCount] = useState(0);
  const [srsFlippedId, setSrsFlippedId] = useState<string | null>(null);
  const [srsReviewing, setSrsReviewing] = useState(false);
  const [srsToast, setSrsToast] = useState<string | null>(null);

  const loadSrsDue = useCallback(async () => {
    try {
      const res = await api.get<{
        dueCount: number;
        totalCount: number;
        cards: Array<{
          id: string;
          uploadId?: string | null;
          front: string;
          back: string;
          easeFactor: number;
          intervalDays: number;
          repetitions: number;
          lectureId?: string;
        }>;
      }>('/ai/srs/due');
      if (res && Array.isArray(res.cards)) {
        setSrsDueCards(res.cards);
        setSrsTotalCount(res.totalCount || res.cards.length);
      }
    } catch {
      // ignore if offline
    }
  }, []);

  const handleSrsReview = useCallback(
    async (
      card: { id?: string; front: string; back: string; lectureId?: string },
      quality: 1 | 3 | 4 | 5
    ) => {
      if (srsReviewing) return;
      setSrsReviewing(true);
      try {
        const res = await api.post<{
          xpAwarded: number;
          card: { intervalDays: number; easeFactor: number };
        }>('/ai/srs/review', {
          cardId: card.id,
          front: card.front,
          back: card.back,
          lectureId: card.lectureId || selected?.id,
          quality,
        });
        if (card.id) {
          setSrsDueCards((prev) => prev.filter((c) => c.id !== card.id));
          setSrsFlippedId(null);
        }
        const nextDays = res?.card?.intervalDays ?? 1;
        const xpMsg = res?.xpAwarded ? ` • +${res.xpAwarded} XP!` : '';
        setSrsToast(`Scheduled next review in ${nextDays} day${nextDays === 1 ? '' : 's'}${xpMsg}`);
        setTimeout(() => setSrsToast(null), 3200);
        loadSrsDue();
      } catch {
        setSrsToast('Saved review locally');
        setTimeout(() => setSrsToast(null), 2500);
      } finally {
        setSrsReviewing(false);
      }
    },
    [srsReviewing, selected?.id, loadSrsDue]
  );

  const load = useCallback(async () => {
    try {
      const data = await api.get<LectureUpload[]>('/ai/lecture-to-life');
      const list = Array.isArray(data) ? data : [];
      setUploads(list);
      setSelected((current) => {
        if (list.length === 0) return null;
        if (current && list.some((item) => item.id === current.id)) return current;
        return list[0] || null;
      });
      if (list.length === 0) {
        setSrsDueCards([]);
        setSrsTotalCount(0);
        setSrsFlippedId(null);
        await saveCachedResponse('/ai/srs/due', { dueCount: 0, totalCount: 0, cards: [] });
      } else {
        loadSrsDue();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load study materials.');
    } finally {
      setLoaded(true);
    }
  }, [loadSrsDue]);

  async function clearAllPacks() {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && !window.confirm('Are you sure you want to clear all saved study packs and due flashcards? This cannot be undone.')) {
        return;
      }
      doClearAllPacks();
    } else {
      Alert.alert(
        'Clear Saved Study Packs & Flashcards',
        'Are you sure you want to delete all saved study packs and due flashcards? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Clear All', style: 'destructive', onPress: doClearAllPacks },
        ]
      );
    }
  }

  async function doClearAllPacks() {
    setClearing(true);
    setError('');
    try {
      // Immediately clear both Saved Study Packs and Due for Review flashcards + offline cache
      setUploads([]);
      setSelected(null);
      setSrsDueCards([]);
      setSrsTotalCount(0);
      setSrsFlippedId(null);
      await saveCachedResponse('/ai/lecture-to-life', []);
      await saveCachedResponse('/ai/srs/due', { dueCount: 0, totalCount: 0, cards: [] });
      await api.delete('/ai/lecture-to-life').catch(() => {});
      await api.delete('/ai/srs/due').catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not clear saved study materials.');
    } finally {
      setClearing(false);
    }
  }

  async function deletePack(id: string) {
    setError('');
    try {
      let remainingCount = 0;
      setUploads((current) => {
        const remaining = current.filter((item) => item.id !== id);
        remainingCount = remaining.length;
        if (selected?.id === id) {
          setSelected(remaining[0] || null);
        }
        saveCachedResponse('/ai/lecture-to-life', remaining).catch(() => {});
        return remaining;
      });
      setSrsDueCards((prev) => {
        if (remainingCount === 0) {
          setSrsTotalCount(0);
          setSrsFlippedId(null);
          saveCachedResponse('/ai/srs/due', { dueCount: 0, totalCount: 0, cards: [] }).catch(() => {});
          return [];
        }
        const filtered = prev.filter((c: any) => c.uploadId !== id && c.lectureId !== id && !String(c.cardKey || '').startsWith(`${id}:`));
        saveCachedResponse('/ai/srs/due', { dueCount: filtered.length, totalCount: filtered.length, cards: filtered }).catch(() => {});
        return filtered;
      });
      await api.delete(`/ai/lecture-to-life/${id}`).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete study pack.');
    }
  }

  async function handleDownloadSummary() {
    if (!selected?.summary) return;
    const dateStr = new Date(selected.createdAt).toLocaleDateString();
    const textToShare = `# ${selected.fileName} - Study Summary\n\nGenerated: ${dateStr}\n\n${selected.summary}`;

    if (Platform.OS === 'web') {
      try {
        const blob = new Blob([textToShare], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const safeTitle = (selected.fileName || 'Lecture_Summary').replace(/[^a-zA-Z0-9_-]/g, '_');
        link.download = `${safeTitle}_Summary.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch {
        setError('Failed to download summary.');
      }
    } else {
      try {
        await Share.share({
          title: `${selected.fileName} - Summary`,
          message: textToShare,
        });
      } catch {
        setError('Could not share or download summary.');
      }
    }
  }

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePickDocument() {
    try {
      setError('');
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/msword',
          'application/vnd.ms-powerpoint',
          'text/plain',
          'text/markdown',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const fileName = asset.name || 'Document';
      const lower = fileName.toLowerCase();

      let detectedFormat = 'Document';
      if (lower.endsWith('.pptx') || lower.endsWith('.ppt')) detectedFormat = 'PowerPoint (.pptx)';
      else if (lower.endsWith('.docx') || lower.endsWith('.doc')) detectedFormat = 'Word (.docx)';
      else if (lower.endsWith('.pdf')) detectedFormat = 'PDF (.pdf)';
      else if (lower.endsWith('.txt') || lower.endsWith('.md')) detectedFormat = 'Text file';

      setSelectedDocName(fileName);
      setSelectedDocType(detectedFormat);
      setExtracting(true);

      let base64 = '';
      try {
        base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: 'base64',
        });
      } catch {
        const file = new File(asset.uri);
        base64 = await file.base64();
      }

      const res = await api.post<{ text: string }>('/ai/extract-lecture-text', {
        fileName: asset.name,
        fileType: asset.mimeType || 'application/octet-stream',
        base64,
      });

      if (res && res.text) {
        setContent(res.text);
        setName(asset.name.replace(/\.[^.]+$/, ''));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse document. Please check the file format or paste the text directly.');
    } finally {
      setExtracting(false);
    }
  }

  async function convert() {
    if (content.trim().length < 20) {
      setError('Please provide at least 20 characters of lecture content to generate materials.');
      return;
    }
    setLoading(true);
    try {
      setError('');
      const item = await api.post<LectureUpload>('/ai/lecture-to-life', {
        fileName: name.trim() || 'Lecture notes',
        fileType: selectedDocType || 'text/plain',
        content,
      });
      setUploads((current) => [item, ...current]);
      chooseLecture(item);
      setContent('');
      setSelectedDocName(null);
      setSelectedDocType(null);
      loadSrsDue();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create study materials.');
    } finally {
      setLoading(false);
    }
  }

  function chooseLecture(item: LectureUpload) {
    setSelected(item);
    setFlipped(null);
    setAnswers({});
    setQuizSubmitted(false);
  }

  if (!loaded) return <Loading />;

  const isLight = theme === 'light';
  const brandGreen = isLight ? '#1e6827' : colors.primary;

  const flashcards = asArray<{ front: string; back: string }>(selected?.flashcards);
  const quiz = asArray<{ question: string; options: string[]; answer: number }>(selected?.quiz);
  const projects = asArray<{ title: string; description: string }>(selected?.miniProjects);
  const exercises = asArray<{ title: string; description: string; hint?: string }>(selected?.codingExercises);
  const score = quizSubmitted ? quiz.reduce((total, item, index) => total + Number(answers[index] === item.answer), 0) : null;

  return (
    <LectureErrorBoundary fallbackColor={colors.text} onReset={load}>
      <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      {/* LECTURE TO LIFE HEADER */}
      <View
        style={[
          styles.headerRow,
          largerText && styles.headerRowLarge,
        ]}
      >
        <View
          style={[
            styles.lectureLogoWrapper,
            largerText && styles.lectureLogoWrapperLarge,
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
          <Ionicons
            name="school"
            size={28}
            color={colors.primary}
          />
        </View>

        <View style={styles.headerText}>
          <Text
            allowFontScaling
            numberOfLines={1}
            style={[
              styles.headerTitle,
              {
                color: colors.text,
                fontSize: fontSize(22),
              },
            ]}
          >
            Lecture to Life
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
            Upload lecture slides &amp; documents to generate study cards and quizzes.
          </Text>
        </View>
      </View>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {srsToast ? <Notice tone="success">{srsToast}</Notice> : null}

      {/* Spaced Repetition (SM-2) Active Recall Queue */}
      {srsDueCards.length > 0 && (
        <>
          <View style={styles.sectionHeaderRowBetween}>
            <View style={styles.sectionTitleWithIcon}>
              <Ionicons name="flame" size={18} color="#F59E0B" />
              <Text style={[styles.sectionHeading, { color: colors.text }]}>
                Due for Review ({srsDueCards.length})
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: isLight ? '#FEF3C7' : 'rgba(245, 158, 11, 0.18)',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#D97706' }}>
                  SM-2 • +5 XP
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear all due flashcards and saved study packs"
                onPress={clearAllPacks}
                disabled={clearing}
                style={({ pressed }) => [
                  styles.clearAllBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="trash-outline" size={14} color={colors.danger || '#ef4444'} />
                <Text style={[styles.clearAllBtnText, { color: colors.danger || '#ef4444' }]}>
                  {clearing ? 'Clearing…' : 'Clear'}
                </Text>
              </Pressable>
            </View>
          </View>
          <Card>
            {(() => {
              const currentCard = srsDueCards[0];
              const isCardFlipped = srsFlippedId === currentCard.id;
              return (
                <View style={{ gap: 10 }}>
                  <Pressable
                    onPress={() => setSrsFlippedId(isCardFlipped ? null : currentCard.id)}
                    style={[
                      styles.flashcard,
                      {
                        backgroundColor: isCardFlipped
                          ? isLight
                            ? '#E2F5DA'
                            : colors.primaryDark
                          : colors.surfaceElevated,
                        borderColor: isCardFlipped ? brandGreen : colors.border,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.flashcardLabel, { color: brandGreen }]}>
                        {isCardFlipped ? 'ANSWER' : 'DUE FLASHCARD'}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.muted, fontWeight: '600' }}>
                        Interval: {currentCard.intervalDays}d • EF: {Number(currentCard.easeFactor || 2.5).toFixed(2)}
                      </Text>
                    </View>
                    <Text style={[styles.flashcardText, { color: colors.text }]}>
                      {isCardFlipped ? currentCard.back : currentCard.front}
                    </Text>
                    <Text style={[styles.flashcardHint, { color: colors.muted }]}>
                      {isCardFlipped ? 'Rate your recall below to schedule next review' : 'Tap to reveal answer'}
                    </Text>
                  </Pressable>
                  {isCardFlipped && (
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      {[
                        { label: 'Again (1d)', quality: 1 as const, bg: '#FEE2E2', text: '#DC2626' },
                        { label: 'Hard', quality: 3 as const, bg: '#FEF3C7', text: '#D97706' },
                        { label: 'Good (+5 XP)', quality: 4 as const, bg: '#D1FAE5', text: '#059669' },
                        { label: 'Easy (+5 XP)', quality: 5 as const, bg: '#DBEAFE', text: '#2563EB' },
                      ].map((btn) => (
                        <Pressable
                          key={btn.quality}
                          disabled={srsReviewing}
                          onPress={() => handleSrsReview(currentCard, btn.quality)}
                          style={{
                            flex: 1,
                            minWidth: 74,
                            paddingVertical: 9,
                            paddingHorizontal: 8,
                            borderRadius: 10,
                            backgroundColor: btn.bg,
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 11.5, fontWeight: '800', color: btn.text }}>{btn.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              );
            })()}
          </Card>
        </>
      )}

      {/* Upload and Input Section */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleWithIcon}>
          <Ionicons name="cloud-upload-outline" size={18} color={brandGreen} />
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Upload Lecture Content</Text>
        </View>
      </View>
      <Card>
        {/* Document Upload Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Upload study material document"
          onPress={handlePickDocument}
          disabled={extracting || loading}
          style={({ pressed }) => [
            styles.uploadBtn,
            {
              backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.2)',
              borderColor: brandGreen,
            },
            pressed && styles.pressed,
          ]}
        >
          {extracting ? (
            <View style={styles.uploadBtnContent}>
              <ActivityIndicator color={brandGreen} size="small" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.uploadBtnTitle, { color: colors.text }]}>Extracting document content…</Text>
                <Text style={[styles.uploadBtnSub, { color: colors.muted }]}>Reading slides & text</Text>
              </View>
            </View>
          ) : (
            <View style={styles.uploadBtnContent}>
              <View style={[styles.uploadIconBadge, { backgroundColor: brandGreen }]}>
                <Ionicons name="cloud-upload" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.uploadBtnTitle, { color: colors.text }]}>
                  {selectedDocName ? selectedDocName : 'Upload Study Document'}
                </Text>
                <Text style={[styles.uploadBtnSub, { color: colors.muted }]}>
                  {selectedDocType ? `${selectedDocType} selected` : 'Supports .pptx, .docx, and .pdf files'}
                </Text>
              </View>
              <Ionicons name="folder-open-outline" size={20} color={brandGreen} />
            </View>
          )}
        </Pressable>

        {/* Supported format badges */}
        <View style={styles.formatBadgesRow}>
          <View style={[styles.formatBadge, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.formatBadgeText, { color: brandGreen }]}>.PPTX</Text>
          </View>
          <View style={[styles.formatBadge, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.formatBadgeText, { color: isLight ? '#0284C7' : '#38BDF8' }]}>.DOCX</Text>
          </View>
          <View style={[styles.formatBadge, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.formatBadgeText, { color: isLight ? '#D97706' : '#FBBF24' }]}>.PDF</Text>
          </View>
          <View style={[styles.formatBadge, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.formatBadgeText, { color: colors.muted }]}>.TXT / .MD</Text>
          </View>
        </View>

        {/* Quick Sample Lecture 'Use' Buttons */}
        <View style={styles.sampleLecturesRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use sample algorithms lecture"
            onPress={() => {
              setName(SAMPLE_LECTURES[0].title);
              setContent(SAMPLE_LECTURES[0].content);
              setSelectedDocName('Sample: Algorithms Lecture');
              setSelectedDocType('Computer Science');
              setError('');
            }}
            style={({ pressed }) => [
              styles.sampleBtn,
              { backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.25)', borderColor: brandGreen },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="sparkles" size={13} color={brandGreen} />
            <Text style={[styles.sampleBtnText, { color: brandGreen }]}>Use Sample: Algorithms</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use sample architecture lecture"
            onPress={() => {
              setName(SAMPLE_LECTURES[1].title);
              setContent(SAMPLE_LECTURES[1].content);
              setSelectedDocName('Sample: Architecture Lecture');
              setSelectedDocType('Software Engineering');
              setError('');
            }}
            style={({ pressed }) => [
              styles.sampleBtn,
              { backgroundColor: isLight ? '#E0F2FE' : 'rgba(2, 132, 199, 0.25)', borderColor: isLight ? '#0284C7' : '#38BDF8' },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="code-slash" size={13} color={isLight ? '#0284C7' : '#38BDF8'} />
            <Text style={[styles.sampleBtnText, { color: isLight ? '#0284C7' : '#38BDF8' }]}>Use Sample: Web Architecture</Text>
          </Pressable>
        </View>

        <Field label="Lecture title" value={name} onChangeText={setName} />
        <Field
          label="Lecture text / Extracted content"
          value={content}
          onChangeText={setContent}
          multiline
          placeholder="Upload a document above or paste lecture material here…"
          style={styles.large}
        />
        <Button
          title={loading ? 'Creating study pack…' : 'Generate Study Materials'}
          onPress={convert}
          disabled={loading || extracting || content.trim().length < 20}
        />
      </Card>

      {/* Saved Lectures Selector */}
      {uploads.length ? (
        <>
          <View style={styles.sectionHeaderRowBetween}>
            <View style={styles.sectionTitleWithIcon}>
              <Ionicons name="library-outline" size={18} color={brandGreen} />
              <Text style={[styles.sectionHeading, { color: colors.text }]}>Saved Study Packs ({uploads.length})</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear all saved study packs"
              onPress={clearAllPacks}
              disabled={clearing}
              style={({ pressed }) => [
                styles.clearAllBtn,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="trash-outline" size={14} color={colors.danger || '#ef4444'} />
              <Text style={[styles.clearAllBtnText, { color: colors.danger || '#ef4444' }]}>
                {clearing ? 'Clearing…' : 'Clear Saved'}
              </Text>
            </Pressable>
          </View>
          <Card>
            <View style={styles.savedPacksContainer}>
              {uploads.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.savedPackItemRow,
                    {
                      backgroundColor: selected?.id === item.id ? (isLight ? '#E8F5E9' : colors.primaryDark) : colors.surfaceElevated,
                      borderColor: selected?.id === item.id ? brandGreen : colors.border,
                    },
                  ]}
                >
                  <Pressable
                    style={styles.savedPackSelectPressable}
                    onPress={() => chooseLecture(item)}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.savedPackTitle,
                        { color: colors.text, fontWeight: selected?.id === item.id ? '700' : '500' },
                      ]}
                    >
                      {item.fileName}
                    </Text>
                    <Text style={[styles.savedPackDate, { color: colors.muted }]}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </Pressable>
                  <Pressable
                    hitSlop={8}
                    onPress={() => deletePack(item.id)}
                    style={styles.deletePackBtn}
                    accessibilityLabel={`Delete ${item.fileName}`}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.muted} />
                  </Pressable>
                </View>
              ))}
            </View>
          </Card>
        </>
      ) : null}

      {/* Selected Lecture Study Materials */}
      {selected ? (
        <>
          {/* Summary Heading Outside Card */}
          <View style={styles.sectionHeaderRowBetween}>
            <View style={styles.sectionTitleWithIcon}>
              <Ionicons name="reader-outline" size={18} color={brandGreen} />
              <Text style={[styles.sectionHeading, { color: colors.text }]}>Summary — {selected.fileName}</Text>
            </View>
            {selected.summary ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Download summary"
                onPress={handleDownloadSummary}
                style={({ pressed }) => [
                  styles.downloadSummaryBtn,
                  { borderColor: brandGreen, backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.2)' },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="download-outline" size={15} color={brandGreen} />
                <Text style={[styles.downloadSummaryBtnText, { color: brandGreen }]}>Download</Text>
              </Pressable>
            ) : null}
          </View>
          <Card>
            <Text style={[styles.copy, { color: colors.muted }]}>{safeStr(selected.summary)}</Text>
            {selected.summary ? (
              <View style={styles.summaryActionsRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Use in AI Assistant"
                  onPress={() => {
                    router.push({
                      pathname: '/(tabs)/ai-assistant',
                      params: {
                        prompt: `I am studying "${safeStr(selected.fileName)}". Here is my study summary:\n\n${safeStr(selected.summary)}\n\nPlease explain the core concepts in detail, provide 3 practice interview questions with answers, and highlight common exam traps.`,
                        autoAsk: 'true',
                      },
                    });
                  }}
                  style={({ pressed }) => [
                    styles.useActionBtn,
                    { backgroundColor: brandGreen },
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="chatbubbles" size={15} color="#FFFFFF" />
                  <Text style={styles.useActionBtnText}>Use in AI Assistant</Text>
                </Pressable>
              </View>
            ) : null}
          </Card>

          {/* Flashcards Heading Outside Card */}
          {flashcards.length ? (
            <>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleWithIcon}>
                  <Ionicons name="card-outline" size={18} color={brandGreen} />
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>Flashcards ({flashcards.length})</Text>
                </View>
              </View>
              <Card>
                <Text style={[styles.help, { color: colors.muted }]}>Tap a card to reveal its answer.</Text>
                {flashcards.map((card, index) => {
                  const isFlipped = flipped === index;
                  return (
                    <View key={index} style={{ gap: 8 }}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Flip flashcard ${index + 1}`}
                        onPress={() => setFlipped(isFlipped ? null : index)}
                        style={({ pressed }) => [
                          styles.flashcard,
                          {
                            backgroundColor: isFlipped ? (isLight ? '#E2F5DA' : colors.primaryDark) : colors.surfaceElevated,
                            borderColor: isFlipped ? brandGreen : colors.border,
                          },
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={[styles.flashcardLabel, { color: brandGreen }]}>
                          {isFlipped ? 'ANSWER' : `CARD ${index + 1}`}
                        </Text>
                        <Text style={[styles.flashcardText, { color: colors.text }]}>
                          {isFlipped ? safeStr(card.back) : safeStr(card.front)}
                        </Text>
                        <Text style={[styles.flashcardHint, { color: colors.muted }]}>
                          {isFlipped ? 'Tap to see the question • Rate recall below' : 'Tap to reveal answer'}
                        </Text>
                      </Pressable>
                      {isFlipped && (
                        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                          {[
                            { label: 'Again', quality: 1 as const, bg: '#FEE2E2', text: '#DC2626' },
                            { label: 'Hard', quality: 3 as const, bg: '#FEF3C7', text: '#D97706' },
                            { label: 'Good (+5 XP)', quality: 4 as const, bg: '#D1FAE5', text: '#059669' },
                            { label: 'Easy (+5 XP)', quality: 5 as const, bg: '#DBEAFE', text: '#2563EB' },
                          ].map((btn) => (
                            <Pressable
                              key={btn.quality}
                              disabled={srsReviewing}
                              onPress={() =>
                                handleSrsReview(
                                  { front: safeStr(card.front), back: safeStr(card.back), lectureId: selected?.id },
                                  btn.quality
                                )
                              }
                              style={{
                                flex: 1,
                                minWidth: 68,
                                paddingVertical: 7,
                                paddingHorizontal: 6,
                                borderRadius: 8,
                                backgroundColor: btn.bg,
                                alignItems: 'center',
                              }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: '800', color: btn.text }}>{btn.label}</Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </Card>
            </>
          ) : null}

          {/* Graded Quiz Heading Outside Card */}
          {quiz.length ? (
            <>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleWithIcon}>
                  <Ionicons name="help-circle-outline" size={18} color={brandGreen} />
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>Graded Quiz ({quiz.length} Questions)</Text>
                </View>
              </View>
              <Card>
                <Text style={[styles.help, { color: colors.muted }]}>
                  Choose one answer for each question, then submit to check your work.
                </Text>
                {quiz.map((item, questionIndex) => {
                  const safeOptions = Array.isArray(item?.options)
                    ? item.options.map(safeStr)
                    : (item?.options && typeof item.options === 'object'
                        ? Object.values(item.options as Record<string, unknown>).map(safeStr)
                        : []);
                  return (
                    <View key={questionIndex} style={styles.question}>
                      <Text style={[styles.questionText, { color: colors.text }]}>
                        {questionIndex + 1}. {safeStr(item?.question || 'Review Question')}
                      </Text>
                      {safeOptions.map((option, optionIndex) => {
                      const chosen = answers[questionIndex] === optionIndex;
                      const isCorrect = item.answer === optionIndex;
                      return (
                        <Pressable
                          key={optionIndex}
                          disabled={quizSubmitted}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: chosen, disabled: quizSubmitted }}
                          onPress={() => setAnswers((current) => ({ ...current, [questionIndex]: optionIndex }))}
                          style={({ pressed }) => [
                            styles.option,
                            {
                              backgroundColor: colors.surfaceElevated,
                              borderColor: colors.border,
                            },
                            chosen && {
                              borderColor: brandGreen,
                              backgroundColor: isLight ? '#E8F5E9' : colors.primaryDark,
                            },
                            quizSubmitted &&
                              isCorrect && {
                                borderColor: brandGreen,
                                backgroundColor: isLight ? '#E2F5DA' : colors.primaryDark,
                              },
                            quizSubmitted &&
                              chosen &&
                              !isCorrect && {
                                borderColor: colors.danger,
                                backgroundColor: isLight ? '#FDE8E8' : '#421d24',
                              },
                            pressed && !quizSubmitted && styles.pressed,
                          ]}
                        >
                          <View
                            style={[
                              styles.radio,
                              { borderColor: colors.muted },
                              chosen && { borderColor: brandGreen },
                            ]}
                          >
                            {chosen ? <View style={[styles.radioDot, { backgroundColor: brandGreen }]} /> : null}
                          </View>
                          <Text
                            style={[
                              styles.optionText,
                              { color: colors.text },
                              quizSubmitted && isCorrect && { color: brandGreen, fontWeight: '700' },
                            ]}
                          >
                            {option}
                          </Text>
                          {quizSubmitted && (isCorrect || chosen) ? (
                            <Text
                              style={[
                                styles.result,
                                { color: isCorrect ? brandGreen : colors.danger },
                              ]}
                            >
                              {isCorrect ? 'Correct' : 'Incorrect'}
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                );
              })}
                <Button
                  title={quizSubmitted ? `Score: ${score ?? 0}/${quiz.length} · Try again` : 'Submit quiz'}
                  onPress={() => (quizSubmitted ? (setAnswers({}), setQuizSubmitted(false)) : setQuizSubmitted(true))}
                  disabled={!quizSubmitted && Object.keys(answers).length !== quiz.length}
                />
              </Card>
            </>
          ) : null}

          {/* Mini Projects Heading Outside Card */}
          {projects.length ? (
            <>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleWithIcon}>
                  <Ionicons name="construct-outline" size={18} color={brandGreen} />
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>Mini Projects ({projects.length})</Text>
                </View>
              </View>
              <Card>
                {projects.map((item, index) => (
                  <View key={index} style={styles.projectItem}>
                    <Text style={[styles.projectTitle, { color: colors.text }]}>• {safeStr(item.title)}</Text>
                    <Text style={[styles.copy, { color: colors.muted }]}>{safeStr(item.description)}</Text>
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          {/* Coding Exercises Heading Outside Card */}
          {exercises.length ? (
            <>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleWithIcon}>
                  <Ionicons name="code-working-outline" size={18} color={brandGreen} />
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>Coding Exercises ({exercises.length})</Text>
                </View>
              </View>
              <Card>
                {exercises.map((item, index) => (
                  <View key={index} style={styles.exerciseItem}>
                    <Text style={[styles.projectTitle, { color: colors.text }]}>
                      {index + 1}. {safeStr(item.title)}
                    </Text>
                    <Text style={[styles.copy, { color: colors.muted }]}>{safeStr(item.description)}</Text>
                    {item.hint ? (
                      <Text style={[styles.exerciseHint, { color: brandGreen }]}>
                        💡 Hint: {safeStr(item.hint)}
                      </Text>
                    ) : null}
                    <View style={styles.exerciseActionsRow}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Use ${safeStr(item.title)} in Coding Studio`}
                        onPress={() => {
                          router.push({
                            pathname: '/(tabs)/coding',
                            params: {
                              challengeTitle: safeStr(item.title),
                              challengeDescription: `${safeStr(item.description)}${item.hint ? `\n\nHint: ${safeStr(item.hint)}` : ''}`,
                              language: 'JavaScript',
                              starterCode: `// ${safeStr(item.title)}\n// ${safeStr(item.description)}\n\nfunction solution() {\n  // Implement your solution here\n}\n`,
                            },
                          });
                        }}
                        style={({ pressed }) => [
                          styles.useExerciseBtn,
                          {
                            backgroundColor: isLight ? '#E8F5E9' : 'rgba(30, 104, 39, 0.25)',
                            borderColor: brandGreen,
                          },
                          pressed && styles.pressed,
                        ]}
                      >
                        <Ionicons name="code-working" size={14} color={brandGreen} />
                        <Text style={[styles.useExerciseBtnText, { color: brandGreen }]}>
                          Use in Coding Studio
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Ask AI about ${safeStr(item.title)}`}
                        onPress={() => {
                          router.push({
                            pathname: '/(tabs)/ai-assistant',
                            params: {
                              challengeTitle: safeStr(item.title),
                              challengeDescription: safeStr(item.description),
                              language: 'javascript',
                              code: `// ${safeStr(item.title)}\n// Practice exercise from lecture\n`,
                              autoAsk: 'true',
                            },
                          });
                        }}
                        style={({ pressed }) => [
                          styles.useExerciseBtn,
                          {
                            backgroundColor: isLight ? '#E0F2FE' : 'rgba(2, 132, 199, 0.25)',
                            borderColor: isLight ? '#0284C7' : '#38BDF8',
                          },
                          pressed && styles.pressed,
                        ]}
                      >
                        <Ionicons name="help-buoy-outline" size={14} color={isLight ? '#0284C7' : '#38BDF8'} />
                        <Text style={[styles.useExerciseBtnText, { color: isLight ? '#0284C7' : '#38BDF8' }]}>
                          Ask AI Hints
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </Card>
            </>
          ) : null}
        </>
      ) : null}
      </Screen>
    </LectureErrorBoundary>
  );
}

const styles = StyleSheet.create({
  uploadBtn: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  uploadBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  uploadIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtnTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  uploadBtnSub: {
    fontSize: 12,
    marginTop: 2,
  },
  formatBadgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  formatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  formatBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  large: { minHeight: 160, textAlignVertical: 'top', paddingTop: 12 },
  title: { fontSize: 17, fontWeight: '800' },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  copy: { lineHeight: 21, fontSize: 13 },
  help: { fontSize: 13, lineHeight: 19 },
  flashcard: { minHeight: 120, justifyContent: 'center', gap: 6, padding: 16, borderWidth: 1, borderRadius: 14, marginTop: 8 },
  flashcardLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.7 },
  flashcardText: { fontSize: 16, fontWeight: '700', lineHeight: 23 },
  flashcardHint: { fontSize: 11 },
  question: { gap: 8, paddingTop: 10 },
  questionText: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  option: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, borderWidth: 1 },
  radio: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  radioDot: { width: 8, height: 8, borderRadius: 4 },
  optionText: { flex: 1, fontSize: 13, lineHeight: 18 },
  result: { fontSize: 12, fontWeight: '800' },
  savedPacksContainer: { gap: 8, marginTop: 4 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionHeaderRowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  clearAllBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  downloadSummaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  downloadSummaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  savedPackItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  savedPackSelectPressable: {
    flex: 1,
    gap: 2,
  },
  savedPackTitle: {
    fontSize: 14,
  },
  savedPackDate: {
    fontSize: 11,
  },
  deletePackBtn: {
    padding: 6,
    borderRadius: 6,
  },
  projectItem: { marginTop: 8, gap: 4 },
  projectTitle: { fontSize: 14, fontWeight: '700' },
  exerciseItem: { marginTop: 10, gap: 4 },
  exerciseHint: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  sampleLecturesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  sampleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  sampleBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  summaryActionsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  useActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9,
  },
  useActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  exerciseActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  useExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  useExerciseBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  pressed: { opacity: 0.75 },
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
  lectureLogoWrapper: {
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
  lectureLogoWrapperLarge: {
    width: 66,
    height: 66,
    borderRadius: 33,
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
});
