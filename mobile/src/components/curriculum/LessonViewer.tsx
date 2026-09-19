import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import { CodeBlock } from './CodeBlock';
import type { LessonDetail } from '@/types/curriculum';

interface LessonViewerProps {
  lessonId: string;
  onBack: () => void;
  onNavigateLesson: (nextLessonId: string) => void;
}

export function LessonViewer({
  lessonId,
  onBack,
  onNavigateLesson,
}: LessonViewerProps) {
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';
  const router = useRouter();

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingProgress, setUpdatingProgress] = useState(false);
  const [xpBanner, setXpBanner] = useState<string | null>(null);
  const lessonRequestId = useRef(0);

  const fetchLesson = useCallback(async (id: string) => {
    const requestId = ++lessonRequestId.current;
    setLoading(true);
    setXpBanner(null);
    try {
      const data = await api.get<LessonDetail>(`/curriculum/lessons/${id}`);
      if (requestId !== lessonRequestId.current) return;
      setLesson(data);
    } catch {
      // Handle error
    } finally {
      if (requestId === lessonRequestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLesson(lessonId);
  }, [lessonId, fetchLesson]);

  async function handleToggleComplete() {
    if (!lesson) return;
    setUpdatingProgress(true);
    const newStatus = !lesson.completed;
    try {
      const res = await api.post<{ completed: boolean; xpEarned: number }>(
        `/curriculum/lessons/${lesson.id}/progress`,
        { completed: newStatus },
      );
      setLesson((prev) => (prev ? { ...prev, completed: res.completed } : null));
      if (res.xpEarned > 0) {
        setXpBanner(`🎉 Awesome! You earned +${res.xpEarned} XP for completing this lesson.`);
      }
    } catch {
      // Handle error
    } finally {
      setUpdatingProgress(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>
          Loading lesson material…
        </Text>
      </View>
    );
  }

  if (!lesson) {
    return (
      <View style={styles.centerContainer}>
        <Text style={[styles.errorText, { color: colors.danger }]}>
          Could not load this lesson.
        </Text>
        <Pressable onPress={onBack} style={[styles.backBtn, { backgroundColor: colors.primary }]}>
          <Text style={{ color: colors.primaryText, fontWeight: '700' }}>Back to Curriculum</Text>
        </Pressable>
      </View>
    );
  }

  const examples = lesson.content.examples || [];
  const concepts = lesson.content.keyConcepts || [];
  const objectives = lesson.learningObjectives || [];
  const rules = lesson.content.rules || [];
  const commonMistakes = lesson.content.commonMistakes || [];
  const related = lesson.content.relatedConcepts || [];

  return (
    <View style={styles.container}>
      {/* 1. Top Navigation & Breadcrumbs */}
      <View style={styles.navBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to curriculum"
          onPress={onBack}
          style={({ pressed }) => [
            styles.navBackBtn,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="arrow-back" size={16} color={colors.text} />
          <Text style={[styles.navBackText, { color: colors.text }]}>
            {lesson.subjectName}
          </Text>
        </Pressable>

        {/* Compact Breadcrumbs */}
        <Text style={[styles.breadcrumbText, { color: colors.muted }]} numberOfLines={1}>
          LectureToLife › {lesson.subjectName} › {lesson.moduleName}
        </Text>
      </View>

      {/* XP Toast Notification Banner */}
      {xpBanner ? (
        <View style={[styles.xpBanner, { backgroundColor: isLight ? '#e8f5e9' : '#064e3b', borderColor: isLight ? '#a5d6a7' : '#059669' }]}>
          <Text style={[styles.xpBannerText, { color: isLight ? '#1b5e20' : '#ecfdf5' }]}>
            {xpBanner}
          </Text>
        </View>
      ) : null}

      {/* 2. Lesson Title Card */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.titleBadgeRow}>
          <View
            style={[
              styles.diffBadge,
              {
                backgroundColor:
                  lesson.difficulty === 'Beginner'
                    ? isLight ? '#dcfce7' : '#064e3b'
                    : lesson.difficulty === 'Intermediate'
                    ? isLight ? '#fef3c7' : '#78350f'
                    : isLight ? '#fee2e2' : '#7f1d1d',
              },
            ]}
          >
            <Text
              style={[
                styles.diffBadgeText,
                {
                  color:
                    lesson.difficulty === 'Beginner'
                      ? isLight ? '#166534' : '#34d399'
                      : lesson.difficulty === 'Intermediate'
                      ? isLight ? '#b45309' : '#fcd34d'
                      : isLight ? '#b91c1c' : '#fca5a5',
                },
              ]}
            >
              {lesson.difficulty}
            </Text>
          </View>

          {lesson.completed ? (
            <View style={styles.completedTag}>
              <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
              <Text style={styles.completedTagText}>Completed</Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.lessonHeading, { color: colors.text }]}>
          {lesson.title}
        </Text>
        <Text style={[styles.overviewText, { color: colors.muted }]}>
          {lesson.overview}
        </Text>

        {/* Ask AI about this lesson → opens AI Workspace grounded on this lesson */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ask AI about this lesson"
          onPress={() =>
            router.push({
              pathname: '/(tabs)/ai-assistant',
              params: { lesson: lesson.id },
            })
          }
          style={({ pressed }) => [
            styles.askAiBtn,
            { borderColor: colors.primary },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Ionicons name="chatbubbles-outline" size={15} color={colors.primary} />
          <Text style={[styles.askAiBtnText, { color: colors.primary }]}>
            Ask AI about this lesson
          </Text>
        </Pressable>
      </View>

      {/* 3. Learning Objectives */}
      {objectives.length > 0 ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="flag-outline" size={17} color={isLight ? '#0284c7' : colors.primary} />
            <Text style={[styles.sectionHeading, { color: colors.text }]}>
              LEARNING OBJECTIVES
            </Text>
          </View>
          <View style={styles.objectivesList}>
            {objectives.map((obj, i) => (
              <View key={i} style={styles.bulletRow}>
                <Ionicons name="checkmark-sharp" size={15} color={isLight ? '#16a34a' : '#4ade80'} style={{ marginTop: 2 }} />
                <Text style={[styles.bulletText, { color: colors.text }]}>{obj}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* 4. Key Concepts & Terminology */}
      {concepts.length > 0 ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="book-outline" size={17} color={isLight ? '#0284c7' : colors.primary} />
            <Text style={[styles.sectionHeading, { color: colors.text }]}>
              KEY CONCEPTS & DEFINITIONS
            </Text>
          </View>
          <View style={styles.conceptsList}>
            {concepts.map((c, i) => (
              <View
                key={i}
                style={[
                  styles.conceptItem,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.conceptTitle, { color: isLight ? '#0369a1' : colors.primary }]}>
                  {c.title}
                </Text>
                <Text style={[styles.conceptDef, { color: colors.text }]}>
                  {c.definition}
                </Text>
                {c.purpose ? (
                  <Text style={[styles.conceptPurpose, { color: colors.muted }]}>
                    Purpose: {c.purpose}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* 5. Clear Explanation */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.sectionHeadingRow}>
          <Ionicons name="bulb-outline" size={17} color={isLight ? '#0284c7' : colors.primary} />
          <Text style={[styles.sectionHeading, { color: colors.text }]}>
            EXPLANATION
          </Text>
        </View>
        <Text style={[styles.explanationBody, { color: colors.text }]}>
          {lesson.content.explanation}
        </Text>
      </View>

      {/* 6. Syntax Reference (if present) */}
      {lesson.content.syntax && lesson.content.syntax.length > 0 ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="code-slash-outline" size={17} color={isLight ? '#0284c7' : colors.primary} />
            <Text style={[styles.sectionHeading, { color: colors.text }]}>
              SYNTAX
            </Text>
          </View>
          {lesson.content.syntax.map((s, i) => (
            <View
              key={i}
              style={[
                styles.syntaxBox,
                { backgroundColor: isLight ? '#f1f5f9' : '#0f172a', borderColor: colors.border },
              ]}
            >
              <Text style={[styles.syntaxText, { color: isLight ? '#0f172a' : '#38bdf8' }]}>
                {s}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* 7. Programming Examples with Monospace & Run Code */}
      {examples.length > 0 ? (
        <View style={styles.examplesSection}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="terminal-outline" size={17} color={isLight ? '#0284c7' : colors.primary} />
            <Text style={[styles.sectionHeading, { color: colors.text }]}>
              CODE EXAMPLES & PRACTICE
            </Text>
          </View>

          {examples.map((ex, i) => (
            <CodeBlock
              key={i}
              title={ex.title}
              language={ex.language || lesson.subjectId}
              code={ex.code}
              explanation={ex.explanation}
            />
          ))}
        </View>
      ) : null}

      {(lesson.content.exercise || lesson.content.quiz || lesson.content.challenge) ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="fitness-outline" size={17} color={isLight ? '#0284c7' : colors.primary} />
            <Text style={[styles.sectionHeading, { color: colors.text }]}>APPLY THIS LESSON</Text>
          </View>
          {lesson.content.exercise ? (
            <View style={styles.practiceItem}>
              <Text style={[styles.practiceLabel, { color: colors.text }]}>Exercise</Text>
              <Text style={[styles.bulletText, { color: colors.text }]}>{lesson.content.exercise.prompt}</Text>
              <Text style={[styles.practiceSuccess, { color: colors.muted }]}>Success: {lesson.content.exercise.successCriteria}</Text>
            </View>
          ) : null}
          {lesson.content.challenge ? (
            <View style={[styles.practiceItem, { borderTopColor: colors.border }]}>
              <Text style={[styles.practiceLabel, { color: colors.text }]}>Challenge</Text>
              <Text style={[styles.bulletText, { color: colors.text }]}>{lesson.content.challenge.prompt}</Text>
              <Text style={[styles.practiceSuccess, { color: colors.muted }]}>Success: {lesson.content.challenge.successCriteria}</Text>
            </View>
          ) : null}
          {lesson.content.quiz ? (
            <View style={[styles.practiceItem, { borderTopColor: colors.border }]}>
              <Text style={[styles.practiceLabel, { color: colors.text }]}>Check your understanding</Text>
              <Text style={[styles.bulletText, { color: colors.text }]}>{lesson.content.quiz.question}</Text>
              <Text style={[styles.practiceSuccess, { color: isLight ? '#0284c7' : colors.primary }]}>Answer: {lesson.content.quiz.answer}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* 8. Quick Revision & Rules */}
      {(rules.length > 0 || commonMistakes.length > 0) ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="clipboard-outline" size={17} color={isLight ? '#0284c7' : colors.primary} />
            <Text style={[styles.sectionHeading, { color: colors.text }]}>
              QUICK REVISION & BEST PRACTICES
            </Text>
          </View>

          {rules.length > 0 ? (
            <View style={styles.rulesList}>
              <Text style={[styles.subSectionTitle, { color: colors.muted }]}>Important Rules:</Text>
              {rules.map((rule, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Ionicons name="shield-checkmark-outline" size={14} color={isLight ? '#1e6827' : '#22c55e'} style={{ marginTop: 2 }} />
                  <Text style={[styles.bulletText, { color: colors.text }]}>{rule}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {commonMistakes.length > 0 ? (
            <View style={[styles.rulesList, { marginTop: 8 }]}>
              <Text style={[styles.subSectionTitle, { color: colors.danger }]}>Common Mistakes:</Text>
              {commonMistakes.map((mistake, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Ionicons name="alert-circle-outline" size={14} color={colors.danger} style={{ marginTop: 2 }} />
                  <Text style={[styles.bulletText, { color: colors.text }]}>{mistake}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* 9. Related Lessons */}
      {related.length > 0 ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>
            RELATED LESSONS
          </Text>
          <View style={styles.relatedChips}>
            {related.map((item, i) => (
              <View
                key={i}
                style={[
                  styles.relatedChip,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                ]}
              >
                <Ionicons name="link-outline" size={13} color={colors.primary} />
                <Text style={[styles.relatedChipText, { color: colors.text }]}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* 10. W3Schools Source Reference & Attribution */}
      <View style={[styles.attributionCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <View style={styles.attributionRow}>
          <Ionicons name="information-circle-outline" size={18} color={colors.muted} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.attributionTitle, { color: colors.text }]}>
              W3Schools Educational Source
            </Text>
            <Text style={[styles.attributionMeta, { color: colors.muted }]}>
              Original lesson: {lesson.title} · Retrieved: {lesson.attribution.retrievedAt}
            </Text>
            <Text style={[styles.attributionUrl, { color: isLight ? '#0284c7' : colors.primary }]}>
              {lesson.attribution.primaryUrl}
            </Text>
          </View>
        </View>
        <Text style={[styles.attributionNote, { color: colors.muted }]}>
          {lesson.attribution.licenseNote}
        </Text>
      </View>

      {/* 11. Bottom Action / Navigation Bar */}
      <View style={styles.footerNav}>
        {/* Previous Button */}
        <Pressable
          disabled={!lesson.previousLesson}
          onPress={() => lesson.previousLesson && onNavigateLesson(lesson.previousLesson.id)}
          style={({ pressed }) => [
            styles.navPageBtn,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              opacity: lesson.previousLesson ? 1 : 0.4,
            },
            pressed && lesson.previousLesson && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="arrow-back" size={15} color={colors.text} />
          <Text style={[styles.navPageBtnText, { color: colors.text }]} numberOfLines={1}>
            {lesson.previousLesson ? lesson.previousLesson.title : 'First Lesson'}
          </Text>
        </Pressable>

        {/* Mark Complete Button */}
        <Pressable
          disabled={updatingProgress}
          onPress={handleToggleComplete}
          style={({ pressed }) => [
            styles.completeBtn,
            {
              backgroundColor: lesson.completed ? (isLight ? '#166534' : '#15803d') : colors.primary,
            },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Ionicons
            name={lesson.completed ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={18}
            color={colors.primaryText}
          />
          <Text style={[styles.completeBtnText, { color: colors.primaryText }]}>
            {lesson.completed ? 'Completed ✓' : 'Mark Complete'}
          </Text>
        </Pressable>

        {/* Next Button */}
        <Pressable
          disabled={!lesson.nextLesson}
          onPress={() => lesson.nextLesson && onNavigateLesson(lesson.nextLesson.id)}
          style={({ pressed }) => [
            styles.navPageBtn,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              opacity: lesson.nextLesson ? 1 : 0.4,
            },
            pressed && lesson.nextLesson && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.navPageBtnText, { color: colors.text }]} numberOfLines={1}>
            {lesson.nextLesson ? lesson.nextLesson.title : 'Complete'}
          </Text>
          <Ionicons name="arrow-forward" size={15} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  centerContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '700',
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  navBackText: {
    fontSize: 13,
    fontWeight: '700',
  },
  breadcrumbText: {
    fontSize: 12,
    flex: 1,
  },
  xpBanner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  xpBannerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  diffBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  completedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22c55e',
  },
  lessonHeading: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  overviewText: {
    fontSize: 14,
    lineHeight: 21,
  },
  askAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
  },
  askAiBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 2,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  objectivesList: {
    gap: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  conceptsList: {
    gap: 8,
  },
  conceptItem: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  conceptTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  conceptDef: {
    fontSize: 13,
    lineHeight: 18,
  },
  conceptPurpose: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  explanationBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  syntaxBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  syntaxText: {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: '600',
  },
  examplesSection: {
    gap: 8,
  },
  rulesList: {
    gap: 6,
  },
  subSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  practiceItem: {
    gap: 5,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  practiceLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  practiceSuccess: {
    fontSize: 12,
    lineHeight: 18,
  },
  relatedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  relatedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  relatedChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  attributionCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  attributionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  attributionTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  attributionMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  attributionUrl: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  attributionNote: {
    fontSize: 11,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  footerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    paddingBottom: 24,
  },
  navPageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 46,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  navPageBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  completeBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  completeBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
