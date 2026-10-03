import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  TouchableOpacity,
  Platform,
  Image,
  Vibration,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Button, Card, Field } from '@/components/ui';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import type { WellnessEntry, WellnessInsights } from '@/types/api';
import {
  WELLNESS_MODULES,
  MOOD_TAG_OPTIONS,
  MOOD_TAG_CATEGORIES,
  STRESS_ANCHORS,
  MOOD_ANCHORS,
  ENERGY_ANCHORS,
  SLEEP_PRESETS,
  WATER_PRESETS,
  WELLNESS_MILESTONES,
  GRATITUDE_PROMPT_PRESETS,
  generateDynamicTaskDeconstruction,
  clusterWellnessEntries,
  ClusteredSession,
  TaskDeconstruction,
} from '@/constants/wellnessData';

type ActiveTab = 'checkin' | 'trends';
type TimeRange = '7D' | '30D' | 'SEMESTER';

export default function WellnessScreen() {
  const { colors, theme } = useTheme();
  const { fontSize, largerText } = useAccessibility();
  const isLight = theme === 'light';

  // Navigation tab: 'checkin' | 'trends'
  const [activeTab, setActiveTab] = useState<ActiveTab>('checkin');

  // Check-In Form State
  const [moduleId, setModuleId] = useState('PRODUCTIVITY');
  const [taskTitle, setTaskTitle] = useState('');
  const [markTaskDone, setMarkTaskDone] = useState(false);
  const [stress, setStress] = useState(5);
  const [mood, setMood] = useState(6);
  const [energy, setEnergy] = useState(6);
  const [sleepHours, setSleepHours] = useState(7.5);
  const [waterGlasses, setWaterGlasses] = useState(6);
  const [selectedTags, setSelectedTags] = useState<string[]>(['#flow-state']);
  const [gratitudeWin, setGratitudeWin] = useState('');
  const [notes, setNotes] = useState('');

  // Status & Data
  const [entries, setEntries] = useState<WellnessEntry[]>([]);
  const [insights, setInsights] = useState<WellnessInsights | null>(null);
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [interventionNotice, setInterventionNotice] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Time Range & Drawer States for Trends & Heatmap
  const [timeRange, setTimeRange] = useState<TimeRange>('30D');
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);
  const [inactiveModulesOpen, setInactiveModulesOpen] = useState(false);
  const [expandedClusterIds, setExpandedClusterIds] = useState<Record<string, boolean>>({});
  const [devHooksOpen, setDevHooksOpen] = useState(false);

  // Quick Resets Tool States
  const [resetSectionOpen, setResetSectionOpen] = useState(true);
  const [activeResetTool, setActiveResetTool] = useState<'breathing' | 'pomodoro' | 'gratitude'>('breathing');

  // 4-7-8 Breathing State
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [breathSecondsLeft, setBreathSecondsLeft] = useState(4);
  const [breathCycles, setBreathCycles] = useState(0);

  // Pomodoro Decompression State
  const [pomoSeconds, setPomoSeconds] = useState(300);
  const [isPomoRunning, setIsPomoRunning] = useState(false);

  // Task Optimizer Completed Subtasks
  const [completedSubtasks, setCompletedSubtasks] = useState<Record<string, boolean>>({});

  // Proactive Triggers Checklist State
  const [checkedTriggers, setCheckedTriggers] = useState<Record<number, boolean>>({});

  // 4-7-8 Breathing Timer Effect with Haptic Vibration Guidance
  useEffect(() => {
    if (!isBreathingActive) return;
    const interval = setInterval(() => {
      setBreathSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;
        if (breathPhase === 'Inhale') {
          setBreathPhase('Hold');
          try {
            Vibration.vibrate([0, 30, 80, 30]);
          } catch {}
          return 7;
        } else if (breathPhase === 'Hold') {
          setBreathPhase('Exhale');
          try {
            Vibration.vibrate(120);
          } catch {}
          return 8;
        } else {
          setBreathPhase('Inhale');
          setBreathCycles((c) => c + 1);
          try {
            Vibration.vibrate(40);
          } catch {}
          return 4;
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isBreathingActive, breathPhase]);

  // Pomodoro Timer Effect
  useEffect(() => {
    if (!isPomoRunning) return;
    const interval = setInterval(() => {
      setPomoSeconds((prev) => {
        if (prev <= 1) {
          setIsPomoRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPomoRunning]);

  const load = useCallback(async () => {
    try {
      const [entryData, insightData] = await Promise.all([
        api.get<WellnessEntry[]>('/wellness'),
        api.get<WellnessInsights>('/wellness/insights'),
      ]);
      setEntries(entryData || []);
      setInsights(insightData || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load wellness history.');
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

  // Open resource in browser
  const openExternalResource = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Linking.openURL(url).catch(() => {});
    }
  };

  // Toggle mood tag
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  // Save check-in
  async function save() {
    try {
      setSaving(true);
      setError('');
      setSavedMessage('');

      const res = await api.post<{ xpAwarded?: number; streak?: number }>('/wellness', {
        stressLevel: stress,
        mood,
        energyLevel: energy,
        moduleId,
        sleepHours,
        waterIntake: waterGlasses,
        tags: selectedTags,
        ...(taskTitle.trim()
          ? {
              taskTitle: taskTitle.trim(),
              taskStatus: markTaskDone ? 'DONE' : 'IN_PROGRESS',
            }
          : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(gratitudeWin.trim() ? { gratitude: gratitudeWin.trim() } : {}),
      });

      setNotes('');
      setGratitudeWin('');
      setTaskTitle('');
      setMarkTaskDone(false);

      const xpEarned = res?.xpAwarded ?? (markTaskDone ? 25 : 15);
      const streak = res?.streak ?? (insights?.streak?.current ? insights.streak.current + 1 : 1);
      setSavedMessage(`Check-in saved! +${xpEarned} XP awarded. 🔥 Streak: ${streak} days.`);

      await load();
      setTimeout(() => setSavedMessage(''), 6000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save check-in.');
    } finally {
      setSaving(false);
    }
  }

  // Quick Gratitude Log
  const logQuickGratitude = async (win: string) => {
    setGratitudeWin(win);
    try {
      await api.post('/wellness', {
        stressLevel: stress,
        mood,
        energyLevel: energy,
        moduleId,
        notes: `Quick Win: ${win}`,
        gratitude: win,
        sleepHours,
        waterIntake: waterGlasses,
        tags: selectedTags,
      });
      setSavedMessage(`Win logged! +15 XP awarded.`);
      await load();
      setTimeout(() => setSavedMessage(''), 4000);
    } catch {}
  };

  // Dynamic Task Deconstruction
  const taskDeconstruction: TaskDeconstruction | null = useMemo(() => {
    if (!taskTitle.trim()) return null;
    return generateDynamicTaskDeconstruction(taskTitle.trim(), stress, energy);
  }, [taskTitle, stress, energy]);

  // Derived Burnout Risk
  const burnoutRisk = useMemo(() => {
    if (insights?.burnoutRisk) return insights.burnoutRisk;
    const score = Math.round((stress / 10) * 55 + ((10 - energy) / 10) * 45);
    const isCrit = score >= 67;
    const isMod = score >= 35;
    return {
      score,
      level: (isCrit ? 'CRITICAL' : isMod ? 'MODERATE' : 'LOW') as 'LOW' | 'MODERATE' | 'CRITICAL',
      label: isCrit ? 'Critical Risk' : isMod ? 'Moderate Risk' : 'Low Risk',
      color: isCrit ? '#ff7676' : isMod ? '#f7c65a' : '#91db5e',
      description: isCrit
        ? 'High cognitive strain detected. Pacing adjustments recommended.'
        : isMod
        ? 'Moderate cognitive load. Watch out for extended debugging blocks.'
        : 'Optimal mental equilibrium and strong developer momentum.',
      triggers: isCrit
        ? [
            'Schedule a 15-minute screen-free rest now.',
            'Move non-urgent deadlines to tomorrow.',
            'Use the 4-7-8 Breathing Guide in Quick Resets.',
          ]
        : isMod
        ? [
            'Break oversized tasks into 25-minute Pomodoros.',
            'Hydrate and aim for 7+ hours of sleep tonight.',
          ]
        : ['Steady pacing. Maintain current hydration and Pomodoro rhythms.'],
    };
  }, [insights, stress, energy]);

  // Filtered History for Trends
  const filteredEntries = useMemo(() => {
    if (!entries || entries.length === 0) return [];
    const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (timeRange === '7D') return sorted.slice(-7);
    if (timeRange === '30D') return sorted.slice(-30);
    return sorted;
  }, [entries, timeRange]);

  // Step 2: Cluster micro-logs into cohesive session cards (45-min window)
  const clusteredSessions: ClusteredSession[] = useMemo(() => {
    return clusterWellnessEntries(entries, 45);
  }, [entries]);

  // Step 3: Partition modules into active vs inactive (0 checks)
  const { activeModules, inactiveModules } = useMemo(() => {
    const active: typeof WELLNESS_MODULES = [];
    const inactive: typeof WELLNESS_MODULES = [];
    WELLNESS_MODULES.forEach((mod) => {
      const count = insights?.moduleBreakdown?.[mod.id]?.count ?? 0;
      if (count > 0) active.push(mod);
      else inactive.push(mod);
    });
    return { activeModules: active, inactiveModules: inactive };
  }, [insights]);

  // Step 5: Gamification Streak Progress toward next milestone
  const currentStreak = insights?.streak?.current || 0;
  const milestoneProgress = useMemo(() => {
    if (currentStreak < 3) {
      return {
        targetName: 'Mindful Coder',
        targetDays: 3,
        bonusXp: 25,
        percent: Math.min(100, Math.round((currentStreak / 3) * 100)),
        remaining: 3 - currentStreak,
      };
    }
    if (currentStreak < 7) {
      return {
        targetName: 'Balance Master',
        targetDays: 7,
        bonusXp: 50,
        percent: Math.min(100, Math.round(((currentStreak - 3) / 4) * 100)),
        remaining: 7 - currentStreak,
      };
    }
    return {
      targetName: 'Peak Resilience',
      targetDays: 14,
      bonusXp: 100,
      percent: Math.min(100, Math.round((Math.min(currentStreak, 14) / 14) * 100)),
      remaining: Math.max(0, 14 - currentStreak),
    };
  }, [currentStreak]);

  // Step 1: Haptic rating handler
  const setRatingWithHaptic = (setter: (v: number) => void, val: number) => {
    setter(val);
    try {
      Vibration.vibrate(15);
    } catch {}
  };

  // Step 4: Contextual 1-Tap Interventions
  const liveStrain = stress - energy;
  const isHighStrainSpike = liveStrain >= 2 || stress >= 7 || burnoutRisk.level === 'CRITICAL';

  const handleScheduleBreak = () => {
    try {
      Vibration.vibrate([0, 50, 100, 50]);
    } catch {}
    setInterventionNotice('🌿 15-minute screen-free break scheduled. Step away from your IDE.');
    setTimeout(() => setInterventionNotice(''), 6000);
  };

  const handleLaunchBreathing = () => {
    setActiveTab('checkin');
    setResetSectionOpen(true);
    setActiveResetTool('breathing');
    setIsBreathingActive(true);
    setBreathPhase('Inhale');
    setBreathSecondsLeft(4);
    try {
      Vibration.vibrate(40);
    } catch {}
    setInterventionNotice('🫁 4-7-8 Breathing activated with haptic pulse cues.');
    setTimeout(() => setInterventionNotice(''), 5000);
  };

  const handleGenerateRecoveryPlan = () => {
    if (!taskTitle.trim()) {
      setTaskTitle('Refactor & Document Function Contracts');
    }
    setStress(4);
    setEnergy(6);
    setInterventionNotice('⚡ Recovery Plan engaged: Low-friction docstrings & linting mode activated.');
    setTimeout(() => setInterventionNotice(''), 6000);
  };

  const handleDebriefSession = () => {
    setNotes((prev) => (prev ? prev : 'Session debrief: cognitive friction around blocker; stepping back to review approach.'));
    setInterventionNotice('📝 Debrief note primed in form below. Add takeaways and tap Log Check-in.');
    setTimeout(() => setInterventionNotice(''), 6000);
  };

  if (!loaded) return <Loading />;

  const isHighStrain = stress > 6 || energy < 5;

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      {/* WELLNESS HEADER */}
      <View
        style={[
          styles.headerRow,
          largerText && styles.headerRowLarge,
        ]}
      >
        <Image
          source={require('../../../assets/images/wellness-logo.png')}
          style={[
            styles.wellnessLogo,
            largerText && styles.wellnessLogoLarge,
          ]}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />

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
            Wellness OS
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
            Track mental bandwidth, prevent burnout & optimize tasks.
          </Text>
        </View>
      </View>

      {error ? <Notice>{error}</Notice> : null}
      {savedMessage ? <Notice tone="success">{savedMessage}</Notice> : null}
      {interventionNotice ? <Notice tone="success">{interventionNotice}</Notice> : null}

      {/* Top Navigation Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setActiveTab('checkin')}
          style={[
            styles.tabButton,
            activeTab === 'checkin' && { backgroundColor: isLight ? '#e6f4ea' : 'rgba(145,219,94,0.18)', borderColor: colors.primary },
          ]}
        >
          <Ionicons
            name="heart"
            size={14}
            color={activeTab === 'checkin' ? colors.primary : colors.muted}
            style={{ flexShrink: 0 }}
          />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={[
              styles.tabText,
              { color: activeTab === 'checkin' ? (isLight ? '#1e6827' : colors.primary) : colors.muted },
            ]}
          >
            Check-In &amp; AI Coach
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('trends')}
          style={[
            styles.tabButton,
            activeTab === 'trends' && { backgroundColor: isLight ? '#e6f4ea' : 'rgba(145,219,94,0.18)', borderColor: colors.primary },
          ]}
        >
          <Ionicons
            name="analytics"
            size={14}
            color={activeTab === 'trends' ? colors.primary : colors.muted}
            style={{ flexShrink: 0 }}
          />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={[
              styles.tabText,
              { color: activeTab === 'trends' ? (isLight ? '#1e6827' : colors.primary) : colors.muted },
            ]}
          >
            Trends &amp; Heatmap
          </Text>
        </Pressable>
      </View>

      {/* Gamification Streak & Milestone Banner */}
      <Card>
        <View style={styles.streakHeader}>
          <View style={styles.streakCountBox}>
            <Ionicons name="flame" size={24} color="#f97316" style={styles.streakIcon} />
            <View style={styles.streakTextContainer}>
              <Text style={[styles.streakTitle, { color: colors.text }]} numberOfLines={1}>
                {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'} Streak
              </Text>
              <Text style={[styles.streakSubtitle, { color: colors.muted }]} numberOfLines={2}>
                {milestoneProgress.remaining > 0
                  ? `${milestoneProgress.remaining} days to "${milestoneProgress.targetName}" badge (+${milestoneProgress.bonusXp} XP)`
                  : `Milestone "${milestoneProgress.targetName}" achieved! Keep pushing!`}
              </Text>
            </View>
          </View>

          <View style={[styles.xpChip, { backgroundColor: isLight ? '#e6f4ea' : 'rgba(145,219,94,0.15)' }]}>
            <Text style={[styles.xpChipText, { color: isLight ? '#1e6827' : colors.primary }]} numberOfLines={1}>
              +15 XP Daily
            </Text>
          </View>
        </View>

        {/* Milestone Progress Bar */}
        <View style={styles.progressBarSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 }}>
            <Text style={[styles.progressLabel, { color: colors.muted, flex: 1, minWidth: 0 }]} numberOfLines={1}>
              Next Badge: {milestoneProgress.targetName} ({milestoneProgress.targetDays} Days)
            </Text>
            <Text style={[styles.progressPercent, { color: isLight ? '#1e6827' : colors.primary, flexShrink: 0 }]}>
              {milestoneProgress.percent}%
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: isLight ? '#E5E7EB' : 'rgba(255,255,255,0.1)' }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${milestoneProgress.percent}%`,
                  backgroundColor: isLight ? '#00875A' : colors.primary,
                },
              ]}
            />
          </View>
        </View>

        {/* Milestone Badges Pills */}
        <View style={styles.milestoneRow}>
          {WELLNESS_MILESTONES.map((m) => {
            const achieved = currentStreak >= m.days;
            return (
              <View
                key={m.name}
                style={[
                  styles.milestonePill,
                  {
                    backgroundColor: achieved
                      ? isLight ? '#e2f5da' : 'rgba(34,197,94,0.18)'
                      : isLight ? '#f1f5f3' : 'rgba(255,255,255,0.06)',
                    borderColor: achieved ? '#22c55e' : 'rgba(255,255,255,0.12)',
                  },
                ]}
              >
                <Ionicons
                  name={achieved ? 'checkmark-circle' : 'lock-closed'}
                  size={12}
                  color={achieved ? '#22c55e' : colors.muted}
                />
                <Text
                  style={[
                    styles.milestonePillText,
                    { color: achieved ? (isLight ? '#15803d' : '#4ade80') : colors.muted },
                  ]}
                >
                  {m.name} ({m.days}d)
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      {/* TAB 1: CHECK-IN & AI COACH */}
      {activeTab === 'checkin' ? (
        <>
          {/* Main Daily Check-In Form */}
          <Card>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>1. Daily Wellness Log</Text>
              <Text style={[styles.subtleBadge, { color: colors.primary }]}>Step 1 of 2</Text>
            </View>

            {/* Module Picker */}
            <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>Linked SynergySphere Module</Text>
            <View style={styles.moduleGrid}>
              {WELLNESS_MODULES.map((m) => {
                const isSelected = moduleId === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setModuleId(m.id)}
                    style={[
                      styles.moduleButton,
                      {
                        borderColor: isSelected ? m.color : 'rgba(255,255,255,0.1)',
                        backgroundColor: isSelected ? 'rgba(255,255,255,0.1)' : 'transparent',
                      },
                    ]}
                  >
                    <View style={[styles.moduleDot, { backgroundColor: m.color }]} />
                    <Text
                      style={[
                        styles.moduleButtonText,
                        { color: isSelected ? colors.text : colors.muted, fontWeight: isSelected ? '700' : '500' },
                      ]}
                    >
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Task Input */}
            <Field
              label="Active Task or Blocker (optional)"
              value={taskTitle}
              onChangeText={setTaskTitle}
              placeholder="e.g. Debugging Spring Security, LeetCode Binary Search..."
            />

            {taskTitle.trim().length > 0 ? (
              <Pressable
                onPress={() => setMarkTaskDone(!markTaskDone)}
                style={styles.checkboxRow}
              >
                <Ionicons
                  name={markTaskDone ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={markTaskDone ? colors.primary : colors.muted}
                  style={{ flexShrink: 0 }}
                />
                <Text style={[styles.checkboxText, { color: colors.text }]}>
                  Mark task as completed (DONE) (+10 XP)
                </Text>
              </Pressable>
            ) : null}

            {/* Rating Controls: Step 1 Labeled 1-10 Scale with Dynamic Semantic Anchors & Haptics */}
            <View style={styles.ratingSection}>
              {/* Stress 1-10 Scale */}
              {(() => {
                const anchor = STRESS_ANCHORS[stress] || STRESS_ANCHORS[5];
                return (
                  <View style={styles.scaleContainer}>
                    <View style={styles.scaleLabelRow}>
                      <Text style={[styles.ratingLabel, { color: colors.text }]}>
                        Stress Level: <Text style={{ color: '#f472b6', fontWeight: '800' }}>{stress}/10</Text>
                      </Text>
                      <View style={[styles.scaleValueBadge, { backgroundColor: `${anchor.color}20`, borderColor: anchor.color }]}>
                        <Text style={[styles.scaleValueBadgeText, { color: anchor.color }]}>
                          {anchor.label}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.scaleButtonsRow}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                        const isSelected = stress === val;
                        return (
                          <Pressable
                            key={val}
                            onPress={() => setRatingWithHaptic(setStress, val)}
                            style={[
                              styles.scaleBtn,
                              isSelected
                                ? { backgroundColor: '#f472b6', borderColor: '#f472b6' }
                                : { borderColor: isLight ? '#E5E7EB' : 'rgba(255,255,255,0.12)' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.scaleBtnText,
                                { color: isSelected ? '#ffffff' : colors.text },
                              ]}
                            >
                              {val}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {/* Semantic Anchor Description */}
                    <View style={[styles.anchorCard, { borderColor: isLight ? '#E5E7EB' : 'rgba(255,255,255,0.08)' }]}>
                      <View style={[styles.anchorDot, { backgroundColor: anchor.color }]} />
                      <Text style={[styles.anchorDescText, { color: colors.muted }]}>
                        {anchor.desc}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              {/* Mood 1-10 Scale */}
              {(() => {
                const anchor = MOOD_ANCHORS[mood] || MOOD_ANCHORS[6];
                return (
                  <View style={styles.scaleContainer}>
                    <View style={styles.scaleLabelRow}>
                      <Text style={[styles.ratingLabel, { color: colors.text }]}>
                        Mood / Outlook: <Text style={{ color: '#c084fc', fontWeight: '800' }}>{mood}/10</Text>
                      </Text>
                      <View style={[styles.scaleValueBadge, { backgroundColor: `${anchor.color}20`, borderColor: anchor.color }]}>
                        <Text style={[styles.scaleValueBadgeText, { color: anchor.color }]}>
                          {anchor.label}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.scaleButtonsRow}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                        const isSelected = mood === val;
                        return (
                          <Pressable
                            key={val}
                            onPress={() => setRatingWithHaptic(setMood, val)}
                            style={[
                              styles.scaleBtn,
                              isSelected
                                ? { backgroundColor: '#c084fc', borderColor: '#c084fc' }
                                : { borderColor: isLight ? '#E5E7EB' : 'rgba(255,255,255,0.12)' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.scaleBtnText,
                                { color: isSelected ? '#ffffff' : colors.text },
                              ]}
                            >
                              {val}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <View style={[styles.anchorCard, { borderColor: isLight ? '#E5E7EB' : 'rgba(255,255,255,0.08)' }]}>
                      <View style={[styles.anchorDot, { backgroundColor: anchor.color }]} />
                      <Text style={[styles.anchorDescText, { color: colors.muted }]}>
                        {anchor.desc}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              {/* Energy 1-10 Scale */}
              {(() => {
                const anchor = ENERGY_ANCHORS[energy] || ENERGY_ANCHORS[6];
                return (
                  <View style={styles.scaleContainer}>
                    <View style={styles.scaleLabelRow}>
                      <Text style={[styles.ratingLabel, { color: colors.text }]}>
                        Energy / Vitality: <Text style={{ color: '#2dd4bf', fontWeight: '800' }}>{energy}/10</Text>
                      </Text>
                      <View style={[styles.scaleValueBadge, { backgroundColor: `${anchor.color}20`, borderColor: anchor.color }]}>
                        <Text style={[styles.scaleValueBadgeText, { color: anchor.color }]}>
                          {anchor.label}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.scaleButtonsRow}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                        const isSelected = energy === val;
                        return (
                          <Pressable
                            key={val}
                            onPress={() => setRatingWithHaptic(setEnergy, val)}
                            style={[
                              styles.scaleBtn,
                              isSelected
                                ? { backgroundColor: '#2dd4bf', borderColor: '#2dd4bf' }
                                : { borderColor: isLight ? '#E5E7EB' : 'rgba(255,255,255,0.12)' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.scaleBtnText,
                                { color: isSelected ? '#042f2e' : colors.text },
                              ]}
                            >
                              {val}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <View style={[styles.anchorCard, { borderColor: isLight ? '#E5E7EB' : 'rgba(255,255,255,0.08)' }]}>
                      <View style={[styles.anchorDot, { backgroundColor: anchor.color }]} />
                      <Text style={[styles.anchorDescText, { color: colors.muted }]}>
                        {anchor.desc}
                      </Text>
                    </View>
                  </View>
                );
              })()}
            </View>

            {/* Micro-Trackers: Sleep & Water with One-Tap Presets */}
            <View style={styles.microTrackersRow}>
              {/* Sleep Tracker */}
              <View style={[styles.microCard, { backgroundColor: isLight ? '#f1f5f3' : 'rgba(255,255,255,0.04)', borderColor: colors.border }]}>
                <View style={styles.microHeader}>
                  <Ionicons name="moon" size={13} color="#c084fc" />
                  <Text style={[styles.microTitle, { color: colors.text }]}>Sleep: {sleepHours}h</Text>
                  <Text style={{ fontSize: 9, color: colors.muted, marginLeft: 'auto' }}>
                    {sleepHours < 6 ? 'Deprived' : sleepHours < 7.5 ? 'Moderate' : 'Optimal'}
                  </Text>
                </View>

                {/* Presets Row */}
                <View style={styles.quickPresetRow}>
                  {SLEEP_PRESETS.map((hrs) => {
                    const active = sleepHours === hrs;
                    return (
                      <Pressable
                        key={hrs}
                        onPress={() => {
                          setSleepHours(hrs);
                          try { Vibration.vibrate(15); } catch {}
                        }}
                        style={[
                          styles.presetChip,
                          active && { backgroundColor: isLight ? '#e9d5ff' : 'rgba(192,132,252,0.25)', borderColor: '#c084fc' },
                        ]}
                      >
                        <Text style={[styles.presetChipText, { color: active ? (isLight ? '#7e22ce' : '#e9d5ff') : colors.muted }]}>
                          {hrs}h
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Stepper Row */}
                <View style={styles.stepperRow}>
                  <Pressable
                    onPress={() => setSleepHours((s) => Math.max(3, Number((s - 0.5).toFixed(1))))}
                    style={styles.stepBtn}
                  >
                    <Ionicons name="remove" size={14} color={colors.text} />
                  </Pressable>
                  <Text style={[styles.stepperValue, { color: '#c084fc' }]}>{sleepHours} hrs</Text>
                  <Pressable
                    onPress={() => setSleepHours((s) => Math.min(14, Number((s + 0.5).toFixed(1))))}
                    style={styles.stepBtn}
                  >
                    <Ionicons name="add" size={14} color={colors.text} />
                  </Pressable>
                </View>
              </View>

              {/* Water Tracker */}
              <View style={[styles.microCard, { backgroundColor: isLight ? '#f1f5f3' : 'rgba(255,255,255,0.04)', borderColor: colors.border }]}>
                <View style={styles.microHeader}>
                  <Ionicons name="water" size={13} color="#2dd4bf" />
                  <Text style={[styles.microTitle, { color: colors.text }]}>Water: {waterGlasses}💧</Text>
                  <Text style={{ fontSize: 9, color: colors.muted, marginLeft: 'auto' }}>
                    {waterGlasses < 4 ? 'Low' : waterGlasses < 8 ? 'Moderate' : 'Hydrated'}
                  </Text>
                </View>

                {/* Presets Row */}
                <View style={styles.quickPresetRow}>
                  {WATER_PRESETS.map((gls) => {
                    const active = waterGlasses === gls;
                    return (
                      <Pressable
                        key={gls}
                        onPress={() => {
                          setWaterGlasses(gls);
                          try { Vibration.vibrate(15); } catch {}
                        }}
                        style={[
                          styles.presetChip,
                          active && { backgroundColor: isLight ? '#ccfbf1' : 'rgba(45,212,191,0.25)', borderColor: '#2dd4bf' },
                        ]}
                      >
                        <Text style={[styles.presetChipText, { color: active ? (isLight ? '#0f766e' : '#99f6e4') : colors.muted }]}>
                          {gls}
                        </Text>
                      </Pressable>
                    );
                  })}
                  <Pressable
                    onPress={() => {
                      setWaterGlasses((w) => Math.min(20, w + 1));
                      try { Vibration.vibrate(15); } catch {}
                    }}
                    style={styles.boosterChip}
                  >
                    <Text style={styles.boosterChipText}>+1💧</Text>
                  </Pressable>
                </View>

                {/* Stepper Row */}
                <View style={styles.stepperRow}>
                  <Pressable
                    onPress={() => setWaterGlasses((w) => Math.max(0, w - 1))}
                    style={styles.stepBtn}
                  >
                    <Ionicons name="remove" size={14} color={colors.text} />
                  </Pressable>
                  <Text style={[styles.stepperValue, { color: '#2dd4bf' }]}>{waterGlasses} gls</Text>
                  <Pressable
                    onPress={() => setWaterGlasses((w) => Math.min(20, w + 1))}
                    style={styles.stepBtn}
                  >
                    <Ionicons name="add" size={14} color={colors.text} />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Categorized Focus & Mood Keywords */}
            <Text style={[styles.sectionSubtitle, { color: colors.muted, marginTop: 12 }]}>
              Focus &amp; Mood Context (Categorized)
            </Text>
            <View style={{ gap: 8, marginBottom: 8 }}>
              {MOOD_TAG_CATEGORIES.map((cat) => (
                <View key={cat.category} style={styles.tagCategoryBlock}>
                  <View style={styles.tagCategoryHeader}>
                    <Ionicons name={cat.icon as any} size={11} color={cat.color} />
                    <Text style={[styles.tagCategoryTitle, { color: cat.color }]}>{cat.category}</Text>
                  </View>
                  <View style={styles.categoryPillWrap}>
                    {cat.tags.map((tag) => {
                      const active = selectedTags.includes(tag);
                      return (
                        <Pressable
                          key={tag}
                          onPress={() => {
                            toggleTag(tag);
                            try { Vibration.vibrate(15); } catch {}
                          }}
                          style={[
                            styles.categoryTagPill,
                            active && {
                              backgroundColor: `${cat.color}25`,
                              borderColor: cat.color,
                            },
                            !active && { borderColor: isLight ? '#E5E7EB' : 'rgba(255,255,255,0.12)' },
                          ]}
                        >
                          {active ? (
                            <Ionicons name="checkmark" size={11} color={cat.color} style={{ marginRight: 2 }} />
                          ) : null}
                          <Text
                            style={[
                              styles.categoryTagPillText,
                              {
                                color: active ? (isLight ? cat.color : '#ffffff') : colors.muted,
                                fontWeight: active ? '700' : '500',
                              },
                            ]}
                          >
                            {tag}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>

            {/* Notes */}
            <Field
              label="Session Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="What went well or what challenges did you face today?"
            />

            <Button
              title={saving ? 'Logging...' : 'Log Wellness Check-in (+15 XP)'}
              disabled={saving}
              onPress={save}
            />
          </Card>

          {/* AI Burnout Risk Meter: Step 4 Active Actionable Tool & 1-Tap Interventions */}
          <Card>
            <View style={styles.burnoutHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, marginRight: 8 }}>
                <Ionicons
                  name={burnoutRisk.level === 'CRITICAL' ? 'flame' : burnoutRisk.level === 'MODERATE' ? 'warning' : 'shield-checkmark'}
                  size={16}
                  color={burnoutRisk.color}
                  style={{ flexShrink: 0 }}
                />
                <Text style={[styles.cardTitle, { color: colors.text, flex: 1 }]} numberOfLines={1}>Predictive Burnout Risk</Text>
              </View>
              <View
                style={[
                  styles.riskBadge,
                  { backgroundColor: `${burnoutRisk.color}20`, borderColor: burnoutRisk.color },
                ]}
              >
                <Text style={[styles.riskBadgeText, { color: burnoutRisk.color }]} numberOfLines={1}>
                  {burnoutRisk.label} ({burnoutRisk.score}%)
                </Text>
              </View>
            </View>

            <Text style={[styles.burnoutDesc, { color: colors.muted }]}>
              {burnoutRisk.description}
            </Text>

            {/* Real-Time Strain Spike Alert */}
            {isHighStrainSpike ? (
              <View style={[styles.strainAlertBanner, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444' }]}>
                <Ionicons name="alert-circle" size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.strainAlertTitle, { color: '#ef4444' }]}>
                    Cognitive Strain Spike ({liveStrain > 0 ? `+${liveStrain}` : liveStrain} Net Strain)
                  </Text>
                  <Text style={[styles.strainAlertSub, { color: colors.text }]}>
                    Stress ({stress}/10) is exceeding Energy ({energy}/10). Risk of debugging tunnel-vision. Trigger an intervention below:
                  </Text>
                </View>
              </View>
            ) : null}

            {/* 1-Tap Contextual Interventions */}
            <Text style={[styles.sectionSubtitle, { color: colors.muted, marginTop: 10 }]}>
              Contextual Interventions (1-Tap):
            </Text>
            <View style={styles.interventionGrid}>
              <Pressable
                onPress={handleScheduleBreak}
                style={[styles.interventionBtn, { borderColor: '#10b981', backgroundColor: isLight ? '#f0fdf4' : 'rgba(16,185,129,0.1)' }]}
              >
                <Ionicons name="cafe" size={16} color="#10b981" />
                <Text style={[styles.interventionBtnTitle, { color: isLight ? '#065f46' : '#34d399' }]} numberOfLines={1}>15m Break</Text>
                <Text style={[styles.interventionBtnDesc, { color: colors.muted }]} numberOfLines={1}>Screen-free rest</Text>
              </Pressable>

              <Pressable
                onPress={handleLaunchBreathing}
                style={[styles.interventionBtn, { borderColor: '#8b5cf6', backgroundColor: isLight ? '#f5f3ff' : 'rgba(139,92,246,0.1)' }]}
              >
                <Ionicons name="pulse" size={16} color="#8b5cf6" />
                <Text style={[styles.interventionBtnTitle, { color: isLight ? '#5b21b6' : '#a78bfa' }]} numberOfLines={1}>4-7-8 Breath</Text>
                <Text style={[styles.interventionBtnDesc, { color: colors.muted }]} numberOfLines={1}>Haptic breath pacing</Text>
              </Pressable>

              <Pressable
                onPress={handleGenerateRecoveryPlan}
                style={[styles.interventionBtn, { borderColor: '#3b82f6', backgroundColor: isLight ? '#eff6ff' : 'rgba(59,130,246,0.1)' }]}
              >
                <Ionicons name="flash" size={16} color="#3b82f6" />
                <Text style={[styles.interventionBtnTitle, { color: isLight ? '#1e40af' : '#60a5fa' }]} numberOfLines={1}>Recovery Plan</Text>
                <Text style={[styles.interventionBtnDesc, { color: colors.muted }]} numberOfLines={1}>Low-friction docs</Text>
              </Pressable>

              <Pressable
                onPress={handleDebriefSession}
                style={[styles.interventionBtn, { borderColor: '#f59e0b', backgroundColor: isLight ? '#fffbeb' : 'rgba(245,158,11,0.1)' }]}
              >
                <Ionicons name="chatbubbles" size={16} color="#f59e0b" />
                <Text style={[styles.interventionBtnTitle, { color: isLight ? '#92400e' : '#fbbf24' }]} numberOfLines={1}>Debrief</Text>
                <Text style={[styles.interventionBtnDesc, { color: colors.muted }]} numberOfLines={1}>Log takeaways</Text>
              </Pressable>
            </View>

            {/* Triggers Checklist */}
            <Text style={[styles.sectionSubtitle, { color: colors.muted, marginTop: 12 }]}>
              Proactive Recovery Checklist:
            </Text>
            {burnoutRisk.triggers.map((trigger, idx) => {
              const isChecked = !!checkedTriggers[idx];
              return (
                <Pressable
                  key={idx}
                  onPress={() => setCheckedTriggers((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                  style={styles.triggerRow}
                >
                  <Ionicons
                    name={isChecked ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={isChecked ? '#22c55e' : colors.muted}
                  />
                  <Text
                    style={[
                      styles.triggerText,
                      {
                        color: isChecked ? colors.muted : colors.text,
                        textDecorationLine: isChecked ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    {trigger}
                  </Text>
                </Pressable>
              );
            })}
          </Card>


          {/* AI Task & Workflow Optimizer (Appears when task is specified) */}
          {taskDeconstruction ? (
            <Card>
              <View style={styles.optimizerHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, marginRight: 8 }}>
                  <Ionicons name="sparkles" size={16} color="#06b6d4" style={{ flexShrink: 0 }} />
                  <Text style={[styles.cardTitle, { color: colors.text, flex: 1 }]} numberOfLines={1}>Task &amp; Workflow Optimizer</Text>
                </View>
                {isHighStrain ? (
                  <View style={[styles.strainBadge, { backgroundColor: 'rgba(244,114,182,0.2)', flexShrink: 0 }]}>
                    <Text style={{ color: '#f472b6', fontSize: 10, fontWeight: '700' }}>High Strain</Text>
                  </View>
                ) : null}
              </View>

              <Text style={[styles.optimizerAdvice, { color: colors.text }]}>
                {taskDeconstruction.actionableAdvice}
              </Text>

              {/* Subtasks */}
              <Text style={[styles.sectionSubtitle, { color: colors.muted, marginTop: 10 }]}>
                Low-Friction 25m Pomodoro Slices:
              </Text>
              {taskDeconstruction.subtasks.map((sub, i) => {
                const done = !!completedSubtasks[sub.id];
                return (
                  <Pressable
                    key={sub.id}
                    onPress={() => setCompletedSubtasks((prev) => ({ ...prev, [sub.id]: !prev[sub.id] }))}
                    style={[
                      styles.subtaskItem,
                      {
                        backgroundColor: done
                          ? isLight ? '#f1f5f3' : 'rgba(34,197,94,0.08)'
                          : isLight ? '#ffffff' : 'rgba(255,255,255,0.04)',
                        borderColor: done ? '#22c55e' : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={done ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={done ? '#22c55e' : colors.muted}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.subtaskTitle,
                          {
                            color: done ? colors.muted : colors.text,
                            textDecorationLine: done ? 'line-through' : 'none',
                          },
                        ]}
                      >
                        {i + 1}. {sub.title} ({sub.durationMinutes}m)
                      </Text>
                      <Text style={[styles.subtaskRationale, { color: colors.muted }]}>
                        {sub.rationale}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}

              {/* Curated External Resources */}
              {taskDeconstruction.curatedResources.length > 0 ? (
                <>
                  <Text style={[styles.sectionSubtitle, { color: colors.muted, marginTop: 12 }]}>
                    Curated Guides for Your Blocker:
                  </Text>
                  {taskDeconstruction.curatedResources.map((res) => (
                    <TouchableOpacity
                      key={res.id}
                      onPress={() => openExternalResource(res.url)}
                      style={[styles.resourceCard, { borderColor: colors.border }]}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.resourceBadge}>{res.badge}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={{ fontSize: 11, color: '#06b6d4', fontWeight: '700' }}>Open ↗</Text>
                        </View>
                      </View>
                      <Text style={[styles.resourceTitle, { color: colors.text }]}>{res.title}</Text>
                      <Text style={[styles.resourceDesc, { color: colors.muted }]}>{res.description}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              ) : null}
            </Card>
          ) : null}

          {/* Quick Resets Collapsible Card */}
          <Card>
            <Pressable
              onPress={() => setResetSectionOpen(!resetSectionOpen)}
              style={styles.cardHeaderRow}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, marginRight: 8 }}>
                <Ionicons name="leaf" size={16} color="#f472b6" style={{ flexShrink: 0 }} />
                <Text style={[styles.cardTitle, { color: colors.text, flex: 1 }]} numberOfLines={1}>Quick Resets &amp; Micro-Tools</Text>
              </View>
              <Ionicons
                name={resetSectionOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.muted}
                style={{ flexShrink: 0 }}
              />
            </Pressable>

            {resetSectionOpen ? (
              <View style={{ marginTop: 10 }}>
                {/* Micro Tool Tabs */}
                <View style={styles.subToolTabs}>
                  {[
                    { id: 'breathing', label: '4-7-8 Breathing' },
                    { id: 'pomodoro', label: '5-Min Decompress' },
                    { id: 'gratitude', label: 'Gratitude Win' },
                  ].map((t) => (
                    <Pressable
                      key={t.id}
                      onPress={() => setActiveResetTool(t.id as any)}
                      style={[
                        styles.subToolTab,
                        activeResetTool === t.id && {
                          backgroundColor: isLight ? '#f1f5f3' : 'rgba(255,255,255,0.1)',
                          borderColor: colors.primary,
                        },
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                        style={[
                          styles.subToolTabText,
                          { color: activeResetTool === t.id ? colors.primary : colors.muted },
                        ]}
                      >
                        {t.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* 1. 4-7-8 Breathing */}
                {activeResetTool === 'breathing' ? (
                  <View style={styles.breathingContainer}>
                    <Text style={[styles.resetHelper, { color: colors.muted }]}>
                      Inhale quietly (4s) • Hold breath (7s) • Exhale mouth (8s)
                    </Text>

                    <View
                      style={[
                        styles.breathCircle,
                        {
                          borderColor:
                            breathPhase === 'Inhale'
                              ? '#f472b6'
                              : breathPhase === 'Hold'
                              ? '#c084fc'
                              : '#2dd4bf',
                        },
                      ]}
                    >
                      <Text style={[styles.breathPhaseText, { color: colors.muted }]}>{breathPhase}</Text>
                      <Text style={[styles.breathSecondsText, { color: colors.text }]}>{breathSecondsLeft}s</Text>
                      <Text style={[styles.breathCycleText, { color: colors.muted }]}>Cycle {breathCycles + 1}</Text>
                    </View>

                    <View style={styles.actionBtnRow}>
                      <Button
                        title={isBreathingActive ? 'Pause Breathing' : 'Start 4-7-8 Guide'}
                        onPress={() => setIsBreathingActive(!isBreathingActive)}
                      />
                      <Button
                        title="Reset"
                        secondary
                        onPress={() => {
                          setIsBreathingActive(false);
                          setBreathPhase('Inhale');
                          setBreathSecondsLeft(4);
                        }}
                      />
                    </View>
                  </View>
                ) : null}

                {/* 2. Pomodoro Decompression */}
                {activeResetTool === 'pomodoro' ? (
                  <View style={styles.pomodoroContainer}>
                    <Text style={[styles.pomoClock, { color: '#2dd4bf' }]}>
                      {Math.floor(pomoSeconds / 60)}:{(pomoSeconds % 60).toString().padStart(2, '0')}
                    </Text>
                    <Text style={[styles.resetHelper, { color: colors.muted }]}>
                      5-minute cognitive rest to dissipate cortisol and reset working memory.
                    </Text>
                    <View style={styles.actionBtnRow}>
                      <Button
                        title={isPomoRunning ? 'Pause' : 'Start 5-Min Rest'}
                        onPress={() => setIsPomoRunning(!isPomoRunning)}
                      />
                      <Button
                        title="Reset"
                        secondary
                        onPress={() => {
                          setIsPomoRunning(false);
                          setPomoSeconds(300);
                        }}
                      />
                    </View>
                  </View>
                ) : null}

                {/* 3. Gratitude Win */}
                {activeResetTool === 'gratitude' ? (
                  <View style={styles.gratitudeContainer}>
                    <Text style={[styles.resetHelper, { color: colors.muted }]}>
                      Tap 1 micro-win to anchor positive momentum before signing off:
                    </Text>
                    <View style={styles.gratitudePillWrap}>
                      {GRATITUDE_PROMPT_PRESETS.map((preset, i) => (
                        <Pressable
                          key={i}
                          onPress={() => logQuickGratitude(preset)}
                          style={[styles.gratitudePill, { borderColor: colors.border }]}
                        >
                          <Text style={[styles.gratitudePillText, { color: colors.text }]}>{preset}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}
          </Card>
        </>
      ) : (
        /* TAB 2: TRENDS & CORRELATION HEATMAP */
        <>
          {/* Time Range Filter */}
          <Card>
            <View style={styles.timeRangeBar}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Timeframe:</Text>
              <View style={styles.timeRangeButtons}>
                {(['7D', '30D', 'SEMESTER'] as TimeRange[]).map((tr) => (
                  <Pressable
                    key={tr}
                    onPress={() => setTimeRange(tr)}
                    style={[
                      styles.timeBtn,
                      timeRange === tr && {
                        backgroundColor: isLight ? '#e6f4ea' : 'rgba(145,219,94,0.2)',
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.timeBtnText,
                        { color: timeRange === tr ? (isLight ? '#1e6827' : colors.primary) : colors.muted },
                      ]}
                    >
                      {tr === '7D' ? '7 Days' : tr === '30D' ? '30 Days' : 'Semester'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Averages Summary */}
            {insights?.averages ? (
              <View style={styles.averagesRow}>
                <View style={styles.avgBox}>
                  <Text style={[styles.avgVal, { color: '#f472b6' }]}>
                    {insights.averages.stress.toFixed(1)}
                  </Text>
                  <Text style={[styles.avgLbl, { color: colors.muted }]}>Avg Stress</Text>
                </View>
                <View style={styles.avgBox}>
                  <Text style={[styles.avgVal, { color: '#c084fc' }]}>
                    {insights.averages.mood.toFixed(1)}
                  </Text>
                  <Text style={[styles.avgLbl, { color: colors.muted }]}>Avg Mood</Text>
                </View>
                <View style={styles.avgBox}>
                  <Text style={[styles.avgVal, { color: '#2dd4bf' }]}>
                    {insights.averages.energy.toFixed(1)}
                  </Text>
                  <Text style={[styles.avgLbl, { color: colors.muted }]}>Avg Energy</Text>
                </View>
              </View>
            ) : null}
          </Card>

          {/* Visual Trend Bars with Step 3 Baseline Equilibrium Line & Interactive Touch Tooltip */}
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, width: '100%' }}>
              <Text style={[styles.cardTitle, { color: colors.text, flex: 1, minWidth: 0 }]} numberOfLines={1}>
                Wellness Trajectory ({filteredEntries.length} entries)
              </Text>
              <View style={[styles.trendLegend, { borderColor: isLight ? '#E5E7EB' : 'rgba(255,255,255,0.1)' }]}>
                <View style={[styles.legendDot, { backgroundColor: '#f472b6' }]} />
                <Text style={[styles.legendText, { color: colors.muted }]}>S</Text>
                <View style={[styles.legendDot, { backgroundColor: '#c084fc' }]} />
                <Text style={[styles.legendText, { color: colors.muted }]}>M</Text>
                <View style={[styles.legendDot, { backgroundColor: '#2dd4bf' }]} />
                <Text style={[styles.legendText, { color: colors.muted }]}>E</Text>
              </View>
            </View>

            <Text style={[styles.resetHelper, { color: colors.muted, textAlign: 'left', marginTop: 4, marginBottom: 12 }]}>
              Tap any bar to inspect exact net strain, linked tasks, and session context.
            </Text>

            <View style={styles.chartContainer}>
              {/* Equilibrium Baseline Line (Score 5.0 = 45px out of 90px height) */}
              <View style={styles.equilibriumLineContainer} pointerEvents="none">
                <View style={[styles.equilibriumDashedLine, { borderColor: isLight ? '#CBD5E1' : 'rgba(255,255,255,0.2)' }]} />
                <Text style={[styles.equilibriumLabel, { color: colors.muted }]}>Equilibrium 5.0</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 6 }}>
                {filteredEntries.map((entry, idx) => {
                  const isSelected = selectedHistoryIndex === idx;
                  const itemNet = (entry.stressLevel || 0) - (entry.energyLevel || 0);
                  return (
                    <TouchableOpacity
                      key={entry.id}
                      onPress={() => setSelectedHistoryIndex(isSelected ? null : idx)}
                      style={[
                        styles.chartColumn,
                        isSelected && { borderColor: colors.primary, backgroundColor: isLight ? '#e6f4ea' : 'rgba(145,219,94,0.12)' },
                      ]}
                    >
                      {/* Bar visualization */}
                      <View style={styles.barStack}>
                        <View
                          style={[
                            styles.singleBar,
                            { height: Math.max(6, entry.stressLevel * 9), backgroundColor: '#f472b6' },
                          ]}
                        />
                        <View
                          style={[
                            styles.singleBar,
                            { height: Math.max(6, entry.mood * 9), backgroundColor: '#c084fc' },
                          ]}
                        />
                        <View
                          style={[
                            styles.singleBar,
                            { height: Math.max(6, entry.energyLevel * 9), backgroundColor: '#2dd4bf' },
                          ]}
                        />
                      </View>

                      <Text style={[styles.chartDate, { color: isSelected ? colors.primary : colors.muted }]}>
                        {new Date(entry.date).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}
                      </Text>
                      <Text style={{ fontSize: 8, fontWeight: '700', color: itemNet > 0 ? '#f472b6' : '#22c55e' }}>
                        {itemNet > 0 ? `+${itemNet}` : itemNet}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Selected Entry Tooltip Detail */}
            {selectedHistoryIndex !== null && filteredEntries[selectedHistoryIndex] ? (
              <View style={[styles.selectedDetailBox, { borderColor: colors.primary, backgroundColor: isLight ? '#f0fdf4' : 'rgba(34,197,94,0.06)' }]}>
                {(() => {
                  const item = filteredEntries[selectedHistoryIndex];
                  const itemNet = (item.stressLevel || 0) - (item.energyLevel || 0);
                  const isSpike = itemNet >= 2;
                  const isFlow = itemNet <= -1;
                  return (
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontWeight: '800', color: colors.text, fontSize: 13 }}>
                          {new Date(item.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>
                            {item.moduleId}
                          </Text>
                          <View
                            style={[
                              styles.heatBadge,
                              { backgroundColor: isSpike ? 'rgba(244,114,182,0.2)' : isFlow ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)' },
                            ]}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '700', color: isSpike ? '#f472b6' : isFlow ? '#22c55e' : colors.muted }}>
                              {isSpike ? 'High Strain Spike' : isFlow ? 'Flow Momentum' : 'Equilibrium'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <Text style={{ color: colors.text, fontSize: 12, marginTop: 4 }}>
                        Stress: <Text style={{ color: '#f472b6', fontWeight: '800' }}>{item.stressLevel}/10</Text> · Mood:{' '}
                        <Text style={{ color: '#c084fc', fontWeight: '800' }}>{item.mood}/10</Text> · Energy:{' '}
                        <Text style={{ color: '#2dd4bf', fontWeight: '800' }}>{item.energyLevel}/10</Text> · Net Strain:{' '}
                        <Text style={{ fontWeight: '800', color: itemNet > 0 ? '#f472b6' : '#22c55e' }}>
                          {itemNet > 0 ? `+${itemNet}` : itemNet}
                        </Text>
                      </Text>

                      {(item.linkedTaskTitle || item.taskTitle) ? (
                        <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 4 }}>
                          Linked Task: {item.linkedTaskTitle || item.taskTitle}
                        </Text>
                      ) : null}

                      {item.tags && item.tags.length > 0 ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {item.tags.map((t) => (
                            <Text key={t} style={{ fontSize: 10, color: colors.muted, fontStyle: 'italic' }}>
                              {t}
                            </Text>
                          ))}
                        </View>
                      ) : null}

                      {item.notes ? (
                        <Text style={{ color: colors.muted, fontSize: 11, fontStyle: 'italic', marginTop: 3 }}>
                          &ldquo;{item.notes}&rdquo;
                        </Text>
                      ) : null}
                    </View>
                  );
                })()}
              </View>
            ) : null}
          </Card>

          {/* Academic vs. Wellness Correlation Heatmap: Step 3 Filter Active & Collapse Inactive */}
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, width: '100%' }}>
              <Text style={[styles.cardTitle, { color: colors.text, flex: 1, minWidth: 0 }]} numberOfLines={1}>
                Academic vs. Wellness Heatmap
              </Text>
              <View style={[styles.heatBadge, { backgroundColor: isLight ? '#f1f5f3' : 'rgba(255,255,255,0.08)' }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>
                  {activeModules.length} Active Modules
                </Text>
              </View>
            </View>

            <Text style={[styles.resetHelper, { color: colors.muted, textAlign: 'left', marginTop: 4, marginBottom: 10 }]}>
              Net Strain = Avg Stress − Avg Energy. Green indicates flow triggers; coral/red indicates cognitive friction.
            </Text>

            {/* Active Modules List */}
            {activeModules.map((mod) => {
              const stats = insights?.moduleBreakdown?.[mod.id];
              const avgStress = stats ? stats.avgStress : 0;
              const avgEnergy = stats ? stats.avgEnergy : 0;
              const netStrain = Number((avgStress - avgEnergy).toFixed(1));
              const count = stats ? stats.count : 0;

              const isHighStrainMod = avgStress >= 6.0 || netStrain > 0.8;
              const isFlowMod = avgEnergy >= 6.5 && netStrain <= -0.5;

              return (
                <View
                  key={mod.id}
                  style={[
                    styles.heatmapRow,
                    {
                      borderColor: isHighStrainMod
                        ? 'rgba(244,114,182,0.4)'
                        : isFlowMod
                        ? 'rgba(34,197,94,0.4)'
                        : isLight ? '#E5E7EB' : colors.border,
                      backgroundColor: isHighStrainMod
                        ? isLight ? '#fdf2f8' : 'rgba(244,114,182,0.06)'
                        : isFlowMod
                        ? isLight ? '#f0fdf4' : 'rgba(34,197,94,0.06)'
                        : 'transparent',
                    },
                  ]}
                >
                  <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <View style={[styles.moduleDot, { backgroundColor: mod.color }]} />
                      <Text style={[styles.heatmapLabel, { color: colors.text }]}>{mod.label}</Text>
                      <Text style={[styles.heatmapCount, { color: colors.muted }]}>({count} checks)</Text>
                    </View>
                    <Text style={[styles.heatmapScores, { color: colors.muted }]}>
                      Stress: {avgStress.toFixed(1)} · Energy: {avgEnergy.toFixed(1)} · Strain:{' '}
                      <Text style={{ fontWeight: '800', color: netStrain > 0 ? '#f472b6' : '#22c55e' }}>
                        {netStrain > 0 ? `+${netStrain}` : netStrain}
                      </Text>
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.heatBadge,
                      {
                        backgroundColor: isHighStrainMod
                          ? 'rgba(244,114,182,0.2)'
                          : isFlowMod
                          ? 'rgba(34,197,94,0.2)'
                          : 'rgba(255,255,255,0.08)',
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color: isHighStrainMod ? '#f472b6' : isFlowMod ? '#22c55e' : colors.muted,
                      }}
                    >
                      {isHighStrainMod ? 'High Strain' : isFlowMod ? 'Flow Trigger' : 'Balanced'}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Collapsible Inactive Modules Drawer (0 Activity) */}
            {inactiveModules.length > 0 ? (
              <View style={[styles.inactiveDrawerBox, { borderColor: isLight ? '#E5E7EB' : 'rgba(255,255,255,0.1)' }]}>
                <Pressable
                  onPress={() => setInactiveModulesOpen(!inactiveModulesOpen)}
                  style={styles.inactiveDrawerHeader}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, marginRight: 8 }}>
                    <Ionicons name="file-tray-full-outline" size={14} color={colors.muted} style={{ flexShrink: 0 }} />
                    <Text style={[styles.inactiveDrawerTitle, { color: colors.muted, flex: 1 }]} numberOfLines={1}>
                      Inactive Modules ({inactiveModules.length} with 0 logs)
                    </Text>
                  </View>
                  <Ionicons
                    name={inactiveModulesOpen ? 'chevron-up' : 'chevron-down'}
                    size={15}
                    color={colors.muted}
                    style={{ flexShrink: 0 }}
                  />
                </Pressable>

                {inactiveModulesOpen ? (
                  <View style={styles.inactiveModulesList}>
                    {inactiveModules.map((mod) => (
                      <View key={mod.id} style={[styles.inactiveModuleChip, { borderColor: isLight ? '#E5E7EB' : 'rgba(255,255,255,0.08)' }]}>
                        <View style={[styles.moduleDot, { backgroundColor: mod.color, opacity: 0.4 }]} />
                        <Text style={[styles.inactiveModuleText, { color: colors.muted }]}>{mod.label}</Text>
                        <Text style={{ fontSize: 9, color: colors.muted, marginLeft: 'auto' }}>0 checks</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </Card>
        </>
      )}

      {/* STEP 2: RECENT CHECK-IN HISTORY AS COHESIVE SESSION SUMMARIES */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 6, gap: 8, width: '100%' }}>
        <Text style={[styles.historyHeader, { color: colors.text, flex: 1, minWidth: 0 }]} numberOfLines={1}>
          Session Activity Stream ({clusteredSessions.length})
        </Text>
        <View style={[styles.clusteringBadge, { backgroundColor: isLight ? '#f1f5f3' : 'rgba(255,255,255,0.08)' }]}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.muted }}>
            45m Window Clustered
          </Text>
        </View>
      </View>

      {clusteredSessions.slice(0, 6).map((session) => {
        const isMulti = session.entryCount > 1;
        const isExpanded = !!expandedClusterIds[session.id];
        const isHighStrain = session.netStrain >= 1.5;
        const isFlow = session.netStrain <= -1.0;

        return (
          <Card key={session.id}>
            <View style={styles.sessionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, marginRight: 8 }}>
                <Ionicons
                  name={isMulti ? 'layers' : 'time-outline'}
                  size={15}
                  color={colors.primary}
                  style={{ flexShrink: 0 }}
                />
                <Text style={[styles.sessionTitle, { color: colors.text, flex: 1 }]} numberOfLines={1}>
                  {isMulti ? `Session Summary (${session.entryCount} Check-ins)` : 'Single Check-in'}
                </Text>
              </View>
              <Text style={[styles.sessionTime, { color: colors.muted, flexShrink: 0 }]}>
                {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {isMulti ? ` – ${new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 }}>
              <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>
                Module: {session.primaryModuleId.replace('_', ' ')}
              </Text>
              <View
                style={[
                  styles.strainPill,
                  {
                    backgroundColor: isHighStrain
                      ? 'rgba(244,114,182,0.15)'
                      : isFlow
                      ? 'rgba(34,197,94,0.15)'
                      : 'rgba(255,255,255,0.08)',
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: isHighStrain ? '#f472b6' : isFlow ? '#22c55e' : colors.muted,
                  }}
                >
                  Strain: {session.netStrain > 0 ? `+${session.netStrain}` : session.netStrain}
                </Text>
              </View>
            </View>

            {/* Averages Row */}
            <View style={styles.entryMetricsRow}>
              <Text style={[styles.entryPill, { color: '#f472b6', backgroundColor: 'rgba(244,114,182,0.1)' }]}>
                {isMulti ? 'Avg Stress' : 'Stress'}: {session.avgStress}
              </Text>
              <Text style={[styles.entryPill, { color: '#c084fc', backgroundColor: 'rgba(192,132,252,0.1)' }]}>
                {isMulti ? 'Avg Mood' : 'Mood'}: {session.avgMood}
              </Text>
              <Text style={[styles.entryPill, { color: '#2dd4bf', backgroundColor: 'rgba(45,212,191,0.1)' }]}>
                {isMulti ? 'Avg Energy' : 'Energy'}: {session.avgEnergy}
              </Text>
              {session.sleepHours != null ? (
                <Text style={[styles.entryPill, { color: colors.muted, backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                  🌙 {session.sleepHours}h
                </Text>
              ) : null}
              {session.waterIntake != null ? (
                <Text style={[styles.entryPill, { color: colors.muted, backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                  💧 {session.waterIntake}
                </Text>
              ) : null}
            </View>

            {/* Tasks in this session */}
            {session.taskTitles.length > 0 ? (
              <View style={{ marginTop: 6 }}>
                {session.taskTitles.map((t, idx) => (
                  <Text key={idx} style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                    ✓ {t}
                  </Text>
                ))}
              </View>
            ) : null}

            {/* Cumulative Tags */}
            {session.allTags.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                {session.allTags.map((t) => (
                  <Text key={t} style={{ fontSize: 10, color: colors.muted, fontStyle: 'italic' }}>
                    {t}
                  </Text>
                ))}
              </View>
            ) : null}

            {/* Wins */}
            {session.gratitudeWins.length > 0 ? (
              <View style={{ marginTop: 4 }}>
                {session.gratitudeWins.map((w, idx) => (
                  <Text key={idx} style={{ fontSize: 11, color: '#f59e0b' }}>
                    ✨ Win: {w}
                  </Text>
                ))}
              </View>
            ) : null}

            {/* Notes */}
            {session.notes.length > 0 ? (
              <View style={{ marginTop: 4 }}>
                {session.notes.map((n, idx) => (
                  <Text key={idx} style={[styles.summary, { color: colors.muted }]}>
                    &ldquo;{n}&rdquo;
                  </Text>
                ))}
              </View>
            ) : null}

            {/* Multi-entry Expandable micro-events */}
            {isMulti ? (
              <View style={{ marginTop: 8 }}>
                <Pressable
                  onPress={() =>
                    setExpandedClusterIds((prev) => ({
                      ...prev,
                      [session.id]: !prev[session.id],
                    }))
                  }
                  style={styles.microEventsToggle}
                >
                  <Text style={[styles.microEventsToggleText, { color: colors.primary }]}>
                    {isExpanded ? 'Hide raw micro-events' : `Inspect ${session.entryCount} raw micro-logs`}
                  </Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={colors.primary}
                  />
                </Pressable>

                {isExpanded ? (
                  <View style={styles.clusterSubEntries}>
                    {session.entries.map((micro, mIdx) => (
                      <View key={micro.id || mIdx} style={styles.clusterMicroRow}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 11, color: colors.muted, fontWeight: '700' }}>
                            #{mIdx + 1} · {new Date(micro.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.text }}>
                            S:<Text style={{ color: '#f472b6' }}>{micro.stressLevel}</Text> · M:<Text style={{ color: '#c084fc' }}>{micro.mood}</Text> · E:<Text style={{ color: '#2dd4bf' }}>{micro.energyLevel}</Text>
                          </Text>
                        </View>
                        {micro.notes ? (
                          <Text style={{ fontSize: 10, color: colors.muted, fontStyle: 'italic', marginTop: 2 }}>
                            {micro.notes}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </Card>
        );
      })}

      {/* STEP 5: DEVELOPER INTEGRATIONS & AUTOMATED ZERO-FRICTION HOOKS */}
      <Card>
        <Pressable
          onPress={() => setDevHooksOpen(!devHooksOpen)}
          style={styles.cardHeaderRow}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, marginRight: 8 }}>
            <Ionicons name="git-branch" size={16} color="#3b82f6" style={{ flexShrink: 0 }} />
            <Text style={[styles.cardTitle, { color: colors.text, flex: 1 }]} numberOfLines={1}>
              Developer Integrations &amp; Automated Hooks
            </Text>
          </View>
          <Ionicons
            name={devHooksOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.muted}
            style={{ flexShrink: 0 }}
          />
        </Pressable>

        <Text style={[styles.resetHelper, { color: colors.muted, textAlign: 'left', marginBottom: devHooksOpen ? 8 : 0 }]}>
          Zero-friction telemetry triggers: automate wellness prompts on git commits, failing test runs, and late-night coding sprints.
        </Text>

        {devHooksOpen ? (
          <View style={{ marginTop: 8, gap: 10 }}>
            {/* 1. Git Post-Commit Hook */}
            <View style={[styles.hookCard, { borderColor: isLight ? '#E5E7EB' : colors.border, backgroundColor: isLight ? '#f8faf9' : 'rgba(255,255,255,0.03)' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="terminal" size={14} color="#10b981" />
                <Text style={[styles.hookTitle, { color: colors.text }]}>1. Git Post-Commit Pacing Hook</Text>
              </View>
              <Text style={[styles.hookDesc, { color: colors.muted }]}>
                Triggers a micro check-in prompt when &gt;5 commits occur in 1 hour or during late-night hours (after 10 PM).
              </Text>
              <View style={styles.codeSnippet}>
                <Text style={styles.codeText}>
                  {`# .git/hooks/post-commit\ncurl -X POST https://synergy-sphere.app/api/wellness/hook \\\n  -H "Authorization: Bearer $DEV_TOKEN" \\\n  -d '{"trigger": "GIT_COMMIT_BURST", "commitsInWindow": 5}'`}
                </Text>
              </View>
            </View>

            {/* 2. VS Code / IDE Extension */}
            <View style={[styles.hookCard, { borderColor: isLight ? '#E5E7EB' : colors.border, backgroundColor: isLight ? '#f8faf9' : 'rgba(255,255,255,0.03)' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="code-slash" size={14} color="#3b82f6" />
                <Text style={[styles.hookTitle, { color: colors.text }]}>2. VS Code &amp; JetBrains Pacing Extension</Text>
              </View>
              <Text style={[styles.hookDesc, { color: colors.muted }]}>
                Monitors debug sessions exceeding 45 minutes and 3+ consecutive test failures, activating 4-7-8 breathing cues in your status bar.
              </Text>
              <View style={styles.codeSnippet}>
                <Text style={styles.codeText}>
                  {`// settings.json\n"synergysphere.wellness.autoPrompt": true,\n"synergysphere.wellness.maxDebugSessionMins": 45,\n"synergysphere.wellness.hapticAlerts": true`}
                </Text>
              </View>
            </View>

            {/* 3. CI/CD Build Failures Hook */}
            <View style={[styles.hookCard, { borderColor: isLight ? '#E5E7EB' : colors.border, backgroundColor: isLight ? '#f8faf9' : 'rgba(255,255,255,0.03)' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="cloud-upload" size={14} color="#f59e0b" />
                <Text style={[styles.hookTitle, { color: colors.text }]}>3. CI/CD GitHub Actions Webhook</Text>
              </View>
              <Text style={[styles.hookDesc, { color: colors.muted }]}>
                Automatically pauses reminders and suggests a 5-minute decompress when broken builds trigger syntax frustration.
              </Text>
              <View style={styles.codeSnippet}>
                <Text style={styles.codeText}>
                  {`- name: Notify SynergySphere Wellness\n  if: failure()\n  run: npx synergysphere-cli log-strain --source=ci-fail`}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </Card>

    </Screen>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    width: '100%',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minWidth: 0,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 1,
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    width: '100%',
  },
  streakCountBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    minWidth: 0,
  },
  streakIcon: {
    marginTop: 2,
    flexShrink: 0,
  },
  streakTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  streakTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  streakSubtitle: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  xpChip: {
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  xpChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressBarSection: {
    marginVertical: 8,
    width: '100%',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  milestoneRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    flexWrap: 'wrap',
    width: '100%',
  },
  milestonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: '100%',
  },
  milestonePillText: {
    fontSize: 10,
    fontWeight: '700',
    flexShrink: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  subtleBadge: {
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 0,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
    width: '100%',
  },
  moduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: '100%',
  },
  moduleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  moduleButtonText: {
    fontSize: 11,
    flexShrink: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 6,
    width: '100%',
  },
  checkboxText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 0,
  },
  ratingSection: {
    gap: 12,
    marginVertical: 8,
    width: '100%',
  },
  ratingRow: {
    gap: 4,
  },
  ratingLabel: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
  },
  scaleContainer: {
    gap: 4,
    width: '100%',
  },
  scaleLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  scaleValueBadge: {
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  scaleValueBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  scaleButtonsRow: {
    flexDirection: 'row',
    gap: 4,
    marginVertical: 2,
    width: '100%',
  },
  scaleBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 0,
  },
  scaleBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  anchorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    width: '100%',
  },
  anchorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  anchorDescText: {
    fontSize: 10,
    flex: 1,
    minWidth: 0,
  },
  microTrackersRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    width: '100%',
  },
  microCard: {
    flex: 1,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
    minWidth: 0,
  },
  microHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  microTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  quickPresetRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
    marginVertical: 4,
    width: '100%',
  },
  presetChip: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  presetChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  boosterChip: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2dd4bf',
    backgroundColor: 'rgba(45,212,191,0.1)',
  },
  boosterChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2dd4bf',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    width: '100%',
  },
  stepBtn: {
    padding: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  stepperValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  tagCategoryBlock: {
    gap: 4,
    width: '100%',
  },
  tagCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagCategoryTitle: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryPillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    width: '100%',
  },
  categoryTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: '100%',
  },
  categoryTagPillText: {
    fontSize: 11,
    flexShrink: 1,
  },
  burnoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  riskBadge: {
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  burnoutDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginVertical: 6,
  },
  strainAlertBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 8,
    width: '100%',
  },
  strainAlertTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  strainAlertSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  interventionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    marginBottom: 8,
    width: '100%',
  },
  interventionBtn: {
    flex: 1,
    minWidth: '46%',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
  },
  interventionBtnTitle: {
    fontSize: 11,
    fontWeight: '800',
  },
  interventionBtnDesc: {
    fontSize: 9,
  },
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    width: '100%',
  },
  triggerText: {
    fontSize: 12,
    flex: 1,
    minWidth: 0,
  },
  optimizerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  strainBadge: {
    flexShrink: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  optimizerAdvice: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
    fontWeight: '600',
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
    width: '100%',
  },
  subtaskTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  subtaskRationale: {
    fontSize: 10,
    marginTop: 2,
  },
  resourceCard: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
    width: '100%',
  },
  resourceBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#06b6d4',
  },
  resourceTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  resourceDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  subToolTabs: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    width: '100%',
  },
  subToolTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minWidth: 0,
  },
  subToolTabText: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  breathingContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    width: '100%',
  },
  resetHelper: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
  },
  breathCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  breathPhaseText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  breathSecondsText: {
    fontSize: 24,
    fontWeight: '900',
  },
  breathCycleText: {
    fontSize: 9,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pomodoroContainer: {
    alignItems: 'center',
    paddingVertical: 10,
    width: '100%',
  },
  pomoClock: {
    fontSize: 32,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 4,
  },
  gratitudeContainer: {
    paddingVertical: 4,
    width: '100%',
  },
  gratitudePillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    width: '100%',
  },
  gratitudePill: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: '100%',
  },
  gratitudePillText: {
    fontSize: 11,
    flexShrink: 1,
  },
  timeRangeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  timeRangeButtons: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
  },
  timeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  timeBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  averagesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    width: '100%',
  },
  avgBox: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  avgVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  avgLbl: {
    fontSize: 10,
    marginTop: 1,
  },
  trendLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 0,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  legendText: {
    fontSize: 9,
    fontWeight: '700',
    marginRight: 2,
  },
  chartContainer: {
    position: 'relative',
    marginTop: 4,
    width: '100%',
    overflow: 'hidden',
  },
  equilibriumLineContainer: {
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  equilibriumDashedLine: {
    flex: 1,
    height: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  equilibriumLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginLeft: 6,
    flexShrink: 0,
  },
  chartColumn: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    marginRight: 6,
  },
  barStack: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 90,
  },
  singleBar: {
    width: 6,
    borderRadius: 3,
  },
  chartDate: {
    fontSize: 9,
    marginTop: 4,
    fontWeight: '600',
  },
  selectedDetailBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    width: '100%',
  },
  heatmapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
    gap: 8,
    width: '100%',
  },
  heatmapLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  heatmapCount: {
    fontSize: 10,
  },
  heatmapScores: {
    fontSize: 10,
    marginTop: 2,
  },
  heatBadge: {
    flexShrink: 0,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  inactiveDrawerBox: {
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  inactiveDrawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    gap: 8,
    width: '100%',
  },
  inactiveDrawerTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  inactiveModulesList: {
    paddingHorizontal: 10,
    paddingBottom: 8,
    gap: 4,
    width: '100%',
  },
  inactiveModuleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    width: '100%',
  },
  inactiveModuleText: {
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
  },
  historyHeader: {
    fontSize: 15,
    fontWeight: '800',
  },
  clusteringBadge: {
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  sessionTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  sessionTime: {
    fontSize: 11,
  },
  strainPill: {
    flexShrink: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  entryMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    width: '100%',
  },
  entryPill: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: '100%',
  },
  summary: {
    fontSize: 12,
    lineHeight: 16,
  },
  microEventsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  microEventsToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  clusterSubEntries: {
    marginTop: 4,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(145,219,94,0.3)',
    gap: 6,
    width: '100%',
  },
  clusterMicroRow: {
    paddingVertical: 3,
    width: '100%',
  },
  hookCard: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    width: '100%',
  },
  hookTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  hookDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  codeSnippet: {
    backgroundColor: '#1e293b',
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
    width: '100%',
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    color: '#38bdf8',
    lineHeight: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    paddingRight: 42,
    width: '100%',
  },
  headerRowLarge: {
    alignItems: 'flex-start',
  },
  wellnessLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    flexShrink: 0,
  },
  wellnessLogoLarge: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
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
});

