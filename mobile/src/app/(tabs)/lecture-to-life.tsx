import { useCallback, useEffect, useState } from 'react';
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
import type { LectureUpload } from '@/types/api';

const asArray = <T,>(value: T[] | string | null | undefined): T[] =>
  Array.isArray(value)
    ? value
    : (() => {
        try {
          return JSON.parse(value || '[]');
        } catch {
          return [];
        }
      })();

export default function LectureToLifeScreen() {
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

  const load = useCallback(async () => {
    try {
      const data = await api.get<LectureUpload[]>('/ai/lecture-to-life');
      setUploads(data);
      setSelected((current) => current || data[0] || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load study materials.');
    } finally {
      setLoaded(true);
    }
  }, []);

  async function clearAllPacks() {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && !window.confirm('Are you sure you want to clear all saved study packs? This cannot be undone.')) {
        return;
      }
      doClearAllPacks();
    } else {
      Alert.alert(
        'Clear Saved Study Packs',
        'Are you sure you want to delete all saved study sessions? This cannot be undone.',
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
      await api.delete('/ai/lecture-to-life');
      setUploads([]);
      setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not clear saved study materials.');
    } finally {
      setClearing(false);
    }
  }

  async function deletePack(id: string) {
    setError('');
    try {
      await api.delete(`/ai/lecture-to-life/${id}`);
      setUploads((current) => {
        const remaining = current.filter((item) => item.id !== id);
        if (selected?.id === id) {
          setSelected(remaining[0] || null);
        }
        return remaining;
      });
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
            style={[
              styles.headerTitle,
              {
                color: colors.text,
                fontSize: fontSize(24),
              },
            ]}
          >
            Lecture{'\n'}to Life
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
            <Text style={[styles.copy, { color: colors.muted }]}>{selected.summary}</Text>
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
                    <Pressable
                      key={index}
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
                        {isFlipped ? card.back : card.front}
                      </Text>
                      <Text style={[styles.flashcardHint, { color: colors.muted }]}>
                        {isFlipped ? 'Tap to see the question' : 'Tap to reveal answer'}
                      </Text>
                    </Pressable>
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
                {quiz.map((item, questionIndex) => (
                  <View key={questionIndex} style={styles.question}>
                    <Text style={[styles.questionText, { color: colors.text }]}>
                      {questionIndex + 1}. {item.question}
                    </Text>
                    {item.options.map((option, optionIndex) => {
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
                ))}
                <Button
                  title={quizSubmitted ? `Score: ${score}/${quiz.length} · Try again` : 'Submit quiz'}
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
                    <Text style={[styles.projectTitle, { color: colors.text }]}>• {item.title}</Text>
                    <Text style={[styles.copy, { color: colors.muted }]}>{item.description}</Text>
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
                      {index + 1}. {item.title}
                    </Text>
                    <Text style={[styles.copy, { color: colors.muted }]}>{item.description}</Text>
                    {item.hint ? (
                      <Text style={[styles.exerciseHint, { color: brandGreen }]}>
                        💡 Hint: {item.hint}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </Card>
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
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
