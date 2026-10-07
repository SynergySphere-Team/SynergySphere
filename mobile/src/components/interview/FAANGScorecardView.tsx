import React from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/context/ThemeContext';
import type { FAANGScorecard, HiringRecommendation } from '@/types/interview';

interface FAANGScorecardViewProps {
  scorecard: FAANGScorecard;
  onRetake: () => void;
  onExit: () => void;
}

export function FAANGScorecardView({
  scorecard,
  onRetake,
  onExit,
}: FAANGScorecardViewProps) {
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';

  const recommendationConfig: Record<
    HiringRecommendation,
    { label: string; color: string; bgColor: string; icon: string }
  > = {
    STRONG_HIRE: {
      label: 'STRONG HIRE',
      color: '#059669',
      bgColor: isLight ? '#d1fae5' : '#064e3b',
      icon: 'ribbon',
    },
    HIRE: {
      label: 'HIRE',
      color: '#10b981',
      bgColor: isLight ? '#ecfdf5' : '#065f46',
      icon: 'checkmark-circle',
    },
    LEANING_HIRE: {
      label: 'LEANING HIRE',
      color: '#2563eb',
      bgColor: isLight ? '#dbeafe' : '#1e3a8a',
      icon: 'trending-up',
    },
    LEANING_NO_HIRE: {
      label: 'LEANING NO HIRE',
      color: '#d97706',
      bgColor: isLight ? '#fef3c7' : '#78350f',
      icon: 'alert-circle',
    },
    NO_HIRE: {
      label: 'NO HIRE',
      color: '#dc2626',
      bgColor: isLight ? '#fee2e2' : '#7f1d1d',
      icon: 'close-circle',
    },
  };

  const rec = recommendationConfig[scorecard.recommendation];

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      {/* Header Banner */}
      <View style={[styles.verdictCard, { backgroundColor: rec.bgColor, borderColor: rec.color }]}>
        <View style={styles.verdictTop}>
          <View style={[styles.verdictIconBox, { backgroundColor: `${rec.color}25` }]}>
            <Ionicons name={rec.icon as any} size={28} color={rec.color} />
          </View>
          <View style={styles.verdictTextCol}>
            <Text style={[styles.verdictTag, { color: rec.color }]}>
              HIRING COMMITTEE CONSENSUS
            </Text>
            <Text style={[styles.verdictTitle, { color: rec.color }]}>{rec.label}</Text>
          </View>
          <View style={[styles.scoreBadge, { backgroundColor: colors.surface }]}>
            <Text style={[styles.scoreDigits, { color: rec.color }]}>{scorecard.overallScore}</Text>
            <Text style={[styles.scoreScale, { color: colors.muted }]}>/100</Text>
          </View>
        </View>
        <Text style={[styles.verdictSummary, { color: isLight ? '#1f2937' : '#f3f4f6' }]}>
          {scorecard.summaryVerdict}
        </Text>
      </View>

      {/* Session Metadata */}
      <View style={[styles.metaCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <View style={styles.metaCol}>
          <Text style={[styles.metaLabel, { color: colors.muted }]}>TARGET ROLE</Text>
          <Text style={[styles.metaVal, { color: colors.text }]}>{scorecard.role}</Text>
        </View>
        <View style={styles.metaCol}>
          <Text style={[styles.metaLabel, { color: colors.muted }]}>EVALUATOR</Text>
          <Text style={[styles.metaVal, { color: colors.text }]}>{scorecard.personaName}</Text>
        </View>
        <View style={styles.metaCol}>
          <Text style={[styles.metaLabel, { color: colors.muted }]}>CALIBRATION</Text>
          <Text style={[styles.metaVal, { color: colors.text }]}>{scorecard.difficulty}</Text>
        </View>
      </View>

      {/* Core Competencies Breakdown */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Core Competency Breakdown</Text>
        <View style={styles.competencyList}>
          {Object.entries(scorecard.competencies).map(([key, comp]) => (
            <View key={key} style={styles.compRow}>
              <View style={styles.compHeader}>
                <Text style={[styles.compName, { color: colors.text }]}>{comp.name}</Text>
                <View style={styles.compRatingRow}>
                  <Text style={[styles.compRatingTag, { color: colors.primary }]}>{comp.rating}</Text>
                  <Text style={[styles.compScoreNum, { color: colors.text }]}>{comp.score}%</Text>
                </View>
              </View>

              <View style={[styles.barTrack, { backgroundColor: isLight ? '#e2e8f0' : '#334155' }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${comp.score}%`,
                      backgroundColor:
                        comp.score >= 80 ? '#059669' : comp.score >= 65 ? '#2563eb' : '#d97706',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.compFeedback, { color: colors.muted }]}>{comp.feedback}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 4-Stage Performance History */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Stage-by-Stage Results</Text>
        <View style={styles.stageList}>
          {scorecard.stageBreakdown.map((st, i) => (
            <View key={i} style={[styles.stageItem, { borderColor: colors.border }]}>
              <View style={styles.stageItemTop}>
                <Text style={[styles.stageItemTitle, { color: colors.text }]}>{st.title}</Text>
                <View style={[styles.stageScoreBadge, { backgroundColor: `${colors.primary}15` }]}>
                  <Text style={[styles.stageScoreText, { color: colors.primary }]}>{st.score}%</Text>
                </View>
              </View>
              <Text style={[styles.stageObservation, { color: colors.muted }]}>{st.keyObservation}</Text>
              <View style={styles.stageTimeRow}>
                <Ionicons name="time-outline" size={12} color={colors.muted} />
                <Text style={[styles.stageTimeText, { color: colors.muted }]}>
                  Completed in {Math.round(st.timeSpentSeconds / 60)} min
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Strengths & Growth Areas */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Demonstrated Strengths</Text>
        <View style={styles.bulletList}>
          {scorecard.strengths.map((str, idx) => (
            <View key={idx} style={styles.bulletRow}>
              <Ionicons name="checkmark-circle" size={15} color="#059669" />
              <Text style={[styles.bulletText, { color: colors.text }]}>{str}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 14 }]}>
          Target Areas for Growth
        </Text>
        <View style={styles.bulletList}>
          {scorecard.areasForGrowth.map((area, idx) => (
            <View key={idx} style={styles.bulletRow}>
              <Ionicons name="arrow-forward-circle" size={15} color="#2563eb" />
              <Text style={[styles.bulletText, { color: colors.text }]}>{area}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Hiring Committee Notes */}
      <View style={[styles.notesCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <View style={styles.notesHeader}>
          <Ionicons name="document-text-outline" size={16} color={colors.primary} />
          <Text style={[styles.notesTitle, { color: colors.text }]}>Hiring Committee Synthesis</Text>
        </View>
        <Text style={[styles.notesBody, { color: colors.muted }]}>
          {scorecard.hiringCommitteeNotes}
        </Text>
      </View>

      {/* Bottom Actions */}
      <View style={styles.actionsRow}>
        <Pressable
          onPress={onRetake}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              backgroundColor: isLight ? '#f1f5f9' : '#1e293b',
              borderColor: colors.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Ionicons name="refresh" size={16} color={colors.text} />
          <Text style={[styles.actionBtnText, { color: colors.text }]}>Retake Interview</Text>
        </Pressable>

        <Pressable
          onPress={onExit}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              backgroundColor: colors.primary,
              borderColor: colors.primary,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Ionicons name="checkmark" size={16} color="#ffffff" />
          <Text style={[styles.actionBtnText, { color: '#ffffff' }]}>Exit to Hub</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: 40,
    gap: 12,
  },
  verdictCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  verdictTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  verdictIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verdictTextCol: {
    flex: 1,
    gap: 2,
  },
  verdictTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  verdictTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    elevation: 2,
    flexShrink: 0,
  },
  scoreDigits: {
    fontSize: 20,
    fontWeight: '900',
  },
  scoreScale: {
    fontSize: 11,
    fontWeight: '700',
  },
  verdictSummary: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  metaCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaCol: {
    flex: 1,
    gap: 2,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  competencyList: {
    gap: 12,
  },
  compRow: {
    gap: 4,
  },
  compHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  compName: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  compRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  compRatingTag: {
    fontSize: 11,
    fontWeight: '800',
  },
  compScoreNum: {
    fontSize: 11,
    fontWeight: '700',
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  compFeedback: {
    fontSize: 11,
    lineHeight: 15,
  },
  stageList: {
    gap: 10,
  },
  stageItem: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  stageItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  stageItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  stageScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  stageScoreText: {
    fontSize: 11,
    fontWeight: '800',
  },
  stageObservation: {
    fontSize: 11,
    lineHeight: 15,
  },
  stageTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  stageTimeText: {
    fontSize: 10,
  },
  bulletList: {
    gap: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  notesCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  notesBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
