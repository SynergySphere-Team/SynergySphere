import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Button, Card, Field, Heading } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import { CurriculumDashboard } from '@/components/curriculum/CurriculumDashboard';
import { LessonViewer } from '@/components/curriculum/LessonViewer';
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

  // Mode switcher: 'curriculum' (W3Schools academy) vs 'notes' (personal lecture notes)
  const [viewMode, setViewMode] = useState<'curriculum' | 'notes'>('curriculum');
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  // Existing Lecture notes state
  const [uploads, setUploads] = useState<LectureUpload[]>([]);
  const [selected, setSelected] = useState<LectureUpload | null>(null);
  const [name, setName] = useState('Lecture notes');
  const [content, setContent] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  async function convert() {
    if (content.trim().length < 20) return;
    setLoading(true);
    try {
      setError('');
      const item = await api.post<LectureUpload>('/ai/lecture-to-life', {
        fileName: name.trim() || 'Lecture notes',
        fileType: 'text/plain',
        content,
      });
      setUploads((current) => [item, ...current]);
      chooseLecture(item);
      setContent('');
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
  const score = quizSubmitted ? quiz.reduce((total, item, index) => total + Number(answers[index] === item.answer), 0) : null;

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      {/* Top Mode Switcher Bar */}
      <View style={[styles.modeSwitcher, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: viewMode === 'curriculum' }}
          onPress={() => {
            setViewMode('curriculum');
          }}
          style={[
            styles.modeBtn,
            viewMode === 'curriculum' && [styles.modeBtnActive, { backgroundColor: colors.primary }],
          ]}
        >
          <Ionicons
            name="code-slash"
            size={16}
            color={viewMode === 'curriculum' ? colors.primaryText : colors.text}
          />
          <Text
            style={[
              styles.modeBtnText,
              { color: viewMode === 'curriculum' ? colors.primaryText : colors.text },
            ]}
          >
            Programming
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: viewMode === 'notes' }}
          onPress={() => {
            setViewMode('notes');
          }}
          style={[
            styles.modeBtn,
            viewMode === 'notes' && [styles.modeBtnActive, { backgroundColor: colors.primary }],
          ]}
        >
          <Ionicons
            name="document-text"
            size={16}
            color={viewMode === 'notes' ? colors.primaryText : colors.text}
          />
          <Text
            style={[
              styles.modeBtnText,
              { color: viewMode === 'notes' ? colors.primaryText : colors.text },
            ]}
          >
            Lecture Notes
          </Text>
        </Pressable>
      </View>

      {/* ----------------- MODE 1: PROGRAMMING CURRICULUM ----------------- */}
      {viewMode === 'curriculum' ? (
        activeLessonId ? (
          <LessonViewer
            lessonId={activeLessonId}
            onBack={() => setActiveLessonId(null)}
            onNavigateLesson={(id) => setActiveLessonId(id)}
          />
        ) : (
          <CurriculumDashboard
            onSelectLesson={(lessonId) => setActiveLessonId(lessonId)}
          />
        )
      ) : (
        /* ----------------- MODE 2: PERSONAL LECTURE NOTES ----------------- */
        <>
          <Heading subtitle="Paste lecture material to create study tools you can actively use.">
            My Lecture Notes
          </Heading>
          {error ? <Notice>{error}</Notice> : null}
          <Card>
            <Field label="Lecture title" value={name} onChangeText={setName} />
            <Field
              label="Lecture text"
              value={content}
              onChangeText={setContent}
              multiline
              placeholder="Paste at least a few sentences from your lecture…"
              style={styles.large}
            />
            <Button
              title={loading ? 'Creating materials…' : 'Create study materials'}
              onPress={convert}
              disabled={loading || content.trim().length < 20}
            />
          </Card>
          {uploads.length ? (
            <Card>
              <Text style={[styles.title, { color: colors.text }]}>Saved lectures</Text>
              {uploads.map((item) => (
                <Button key={item.id} title={item.fileName} secondary={selected?.id !== item.id} onPress={() => chooseLecture(item)} />
              ))}
            </Card>
          ) : null}
          {selected ? (
            <>
              <Card>
                <Text style={[styles.title, { color: colors.text }]}>Summary</Text>
                <Text style={[styles.copy, { color: colors.muted }]}>{selected.summary}</Text>
              </Card>
              <Card>
                <Text style={[styles.title, { color: colors.text }]}>Flashcards</Text>
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
              <Card>
                <Text style={[styles.title, { color: colors.text }]}>Quiz</Text>
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
                {quiz.length ? (
                  <Button
                    title={quizSubmitted ? `Score: ${score}/${quiz.length} · Try again` : 'Submit quiz'}
                    onPress={() => (quizSubmitted ? (setAnswers({}), setQuizSubmitted(false)) : setQuizSubmitted(true))}
                    disabled={!quizSubmitted && Object.keys(answers).length !== quiz.length}
                  />
                ) : (
                  <Text style={[styles.copy, { color: colors.muted }]}>No quiz questions were generated for this lecture.</Text>
                )}
              </Card>
              <Card>
                <Text style={[styles.title, { color: colors.text }]}>Mini projects</Text>
                {projects.map((item, index) => (
                  <Text key={index} style={[styles.copy, { color: colors.muted }]}>
                    • {item.title}: {item.description}
                  </Text>
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
  modeSwitcher: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 6,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 40,
    borderRadius: 10,
  },
  modeBtnActive: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  large: { minHeight: 180, textAlignVertical: 'top', paddingTop: 12 },
  title: { fontSize: 17, fontWeight: '800' },
  copy: { lineHeight: 21, fontSize: 13 },
  help: { fontSize: 13, lineHeight: 19 },
  flashcard: { minHeight: 132, justifyContent: 'center', gap: 8, padding: 16, borderWidth: 1, borderRadius: 14 },
  flashcardLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.7 },
  flashcardText: { fontSize: 18, fontWeight: '700', lineHeight: 25 },
  flashcardHint: { fontSize: 12 },
  question: { gap: 8, paddingTop: 8 },
  questionText: { fontSize: 15, fontWeight: '700', lineHeight: 21 },
  option: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: 10, borderWidth: 1 },
  radio: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  radioDot: { width: 8, height: 8, borderRadius: 4 },
  optionText: { flex: 1, fontSize: 14, lineHeight: 19 },
  result: { fontSize: 12, fontWeight: '800' },
  pressed: { opacity: 0.7 },
});
