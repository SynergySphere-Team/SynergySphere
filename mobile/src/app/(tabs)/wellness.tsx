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
  GRATITUDE_PROMPT_PRESETS,
  generateDynamicTaskDeconstruction,
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
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Time Range for Trends
  const [timeRange, setTimeRange] = useState<TimeRange>('30D');
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);

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

  // 4-7-8 Breathing Timer Effect
  useEffect(() => {
    if (!isBreathingActive) return;
    const interval = setInterval(() => {
      setBreathSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;
        if (breathPhase === 'Inhale') {
          setBreathPhase('Hold');
          return 7;
        } else if (breathPhase === 'Hold') {
          setBreathPhase('Exhale');
          return 8;
        } else {
          setBreathPhase('Inhale');
          setBreathCycles((c) => c + 1);
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

  if (!loaded) return <Loading />;

  const currentStreak = insights?.streak?.current || 0;
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
          />
          <Text
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
          />
          <Text
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
            <Ionicons name="flame" size={22} color="#f97316" />
            <View>
              <Text style={[styles.streakTitle, { color: colors.text }]}>
                {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'} Streak
              </Text>
              <Text style={[styles.streakSubtitle, { color: colors.muted }]}>
                {currentStreak < 3
                  ? `${3 - currentStreak} days to "Mindful Coder" badge (+25 XP)`
                  : currentStreak < 7
                  ? `${7 - currentStreak} days to "Balance Master" badge (+50 XP)`
                  : 'Milestone streak achieved! Keep it going!'}
              </Text>
            </View>
          </View>

          <View style={[styles.xpChip, { backgroundColor: isLight ? '#e6f4ea' : 'rgba(145,219,94,0.15)' }]}>
            <Text style={[styles.xpChipText, { color: isLight ? '#1e6827' : colors.primary }]}>
              +15 XP Daily
            </Text>
          </View>
        </View>

        {/* Milestone Badges Pills */}
        <View style={styles.milestoneRow}>
          {[
            { days: 3, name: 'Mindful Coder', achieved: currentStreak >= 3 },
            { days: 7, name: 'Balance Master', achieved: currentStreak >= 7 },
            { days: 14, name: 'Peak Resilience', achieved: currentStreak >= 14 },
          ].map((m) => (
            <View
              key={m.name}
              style={[
                styles.milestonePill,
                {
                  backgroundColor: m.achieved
                    ? isLight ? '#e2f5da' : 'rgba(34,197,94,0.18)'
                    : isLight ? '#f1f5f3' : 'rgba(255,255,255,0.06)',
                  borderColor: m.achieved ? '#22c55e' : 'rgba(255,255,255,0.12)',
                },
              ]}
            >
              <Ionicons
                name={m.achieved ? 'checkmark-circle' : 'shield-outline'}
                size={12}
                color={m.achieved ? '#22c55e' : colors.muted}
              />
              <Text
                style={[
                  styles.milestonePillText,
                  { color: m.achieved ? (isLight ? '#15803d' : '#4ade80') : colors.muted },
                ]}
              >
                {m.name}
              </Text>
            </View>
          ))}
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
                />
                <Text style={[styles.checkboxText, { color: colors.text }]}>
                  Mark task as completed (DONE) (+10 XP)
                </Text>
              </Pressable>
            ) : null}

            {/* Rating Controls */}
            <View style={styles.ratingSection}>
              <View style={styles.ratingRow}>
                <Text style={[styles.ratingLabel, { color: colors.text }]}>Stress: <Text style={{ color: '#f472b6', fontWeight: '800' }}>{stress}/10</Text></Text>
                <View style={styles.ratingButtons}>
                  {[1, 3, 5, 7, 9].map((val) => (
                    <Pressable
                      key={val}
                      onPress={() => setStress(val)}
                      style={[
                        styles.ratingButton,
                        stress === val && { backgroundColor: '#f472b6', borderColor: '#f472b6' },
                      ]}
                    >
                      <Text style={[styles.ratingButtonText, { color: stress === val ? '#fff' : colors.text }]}>
                        {val}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.ratingRow}>
                <Text style={[styles.ratingLabel, { color: colors.text }]}>Mood: <Text style={{ color: '#c084fc', fontWeight: '800' }}>{mood}/10</Text></Text>
                <View style={styles.ratingButtons}>
                  {[1, 3, 5, 7, 9].map((val) => (
                    <Pressable
                      key={val}
                      onPress={() => setMood(val)}
                      style={[
                        styles.ratingButton,
                        mood === val && { backgroundColor: '#c084fc', borderColor: '#c084fc' },
                      ]}
                    >
                      <Text style={[styles.ratingButtonText, { color: mood === val ? '#fff' : colors.text }]}>
                        {val}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.ratingRow}>
                <Text style={[styles.ratingLabel, { color: colors.text }]}>Energy: <Text style={{ color: '#2dd4bf', fontWeight: '800' }}>{energy}/10</Text></Text>
                <View style={styles.ratingButtons}>
                  {[1, 3, 5, 7, 9].map((val) => (
                    <Pressable
                      key={val}
                      onPress={() => setEnergy(val)}
                      style={[
                        styles.ratingButton,
                        energy === val && { backgroundColor: '#2dd4bf', borderColor: '#2dd4bf' },
                      ]}
                    >
                      <Text style={[styles.ratingButtonText, { color: energy === val ? '#052e2b' : colors.text }]}>
                        {val}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            {/* Micro-Trackers: Sleep & Water */}
            <View style={styles.microTrackersRow}>
              {/* Sleep Tracker */}
              <View style={[styles.microCard, { backgroundColor: isLight ? '#f1f5f3' : 'rgba(255,255,255,0.04)', borderColor: colors.border }]}>
                <View style={styles.microHeader}>
                  <Ionicons name="moon" size={13} color="#c084fc" />
                  <Text style={[styles.microTitle, { color: colors.text }]}>Sleep: {sleepHours}h</Text>
                </View>
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
                </View>
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

            {/* Quick Mood Tags */}
            <Text style={[styles.sectionSubtitle, { color: colors.muted, marginTop: 8 }]}>
              Focus &amp; Mood Keywords
            </Text>
            <View style={styles.tagWrap}>
              {MOOD_TAG_OPTIONS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    style={[
                      styles.tagPill,
                      {
                        borderColor: active ? colors.primary : 'rgba(255,255,255,0.12)',
                        backgroundColor: active
                          ? isLight ? '#e6f4ea' : 'rgba(145,219,94,0.15)'
                          : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagPillText,
                        { color: active ? (isLight ? '#1e6827' : colors.primary) : colors.muted },
                      ]}
                    >
                      {tag}
                    </Text>
                  </Pressable>
                );
              })}
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

          {/* AI Burnout Risk Meter */}
          <Card>
            <View style={styles.burnoutHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons
                  name={burnoutRisk.level === 'CRITICAL' ? 'flame' : burnoutRisk.level === 'MODERATE' ? 'warning' : 'shield-checkmark'}
                  size={16}
                  color={burnoutRisk.color}
                />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Predictive Burnout Risk</Text>
              </View>
              <View
                style={[
                  styles.riskBadge,
                  { backgroundColor: `${burnoutRisk.color}20`, borderColor: burnoutRisk.color },
                ]}
              >
                <Text style={[styles.riskBadgeText, { color: burnoutRisk.color }]}>
                  {burnoutRisk.label} ({burnoutRisk.score}%)
                </Text>
              </View>
            </View>

            <Text style={[styles.burnoutDesc, { color: colors.muted }]}>
              {burnoutRisk.description}
            </Text>

            {/* Triggers list */}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="sparkles" size={16} color="#06b6d4" />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Task &amp; Workflow Optimizer</Text>
                </View>
                {isHighStrain ? (
                  <View style={[styles.strainBadge, { backgroundColor: 'rgba(244,114,182,0.2)' }]}>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="leaf" size={16} color="#f472b6" />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Quick Resets &amp; Micro-Tools</Text>
              </View>
              <Ionicons
                name={resetSectionOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.muted}
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

          {/* Visual Trend Bars */}
          <Card>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Wellness Trajectory ({filteredEntries.length} entries)
            </Text>
            <Text style={[styles.resetHelper, { color: colors.muted, marginBottom: 12 }]}>
              Tap any entry to inspect scores and linked task context
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 6 }}>
              {filteredEntries.map((entry, idx) => {
                const isSelected = selectedHistoryIndex === idx;
                return (
                  <TouchableOpacity
                    key={entry.id}
                    onPress={() => setSelectedHistoryIndex(isSelected ? null : idx)}
                    style={[
                      styles.chartColumn,
                      isSelected && { borderColor: colors.primary, backgroundColor: 'rgba(255,255,255,0.06)' },
                    ]}
                  >
                    {/* Bar visualization */}
                    <View style={styles.barStack}>
                      <View
                        style={[
                          styles.singleBar,
                          { height: entry.stressLevel * 8, backgroundColor: '#f472b6' },
                        ]}
                      />
                      <View
                        style={[
                          styles.singleBar,
                          { height: entry.mood * 8, backgroundColor: '#c084fc' },
                        ]}
                      />
                      <View
                        style={[
                          styles.singleBar,
                          { height: entry.energyLevel * 8, backgroundColor: '#2dd4bf' },
                        ]}
                      />
                    </View>

                    <Text style={[styles.chartDate, { color: colors.muted }]}>
                      {new Date(entry.date).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Selected Entry Tooltip Detail */}
            {selectedHistoryIndex !== null && filteredEntries[selectedHistoryIndex] ? (
              <View style={[styles.selectedDetailBox, { borderColor: colors.border, backgroundColor: isLight ? '#f8faf9' : 'rgba(255,255,255,0.04)' }]}>
                {(() => {
                  const item = filteredEntries[selectedHistoryIndex];
                  return (
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontWeight: '700', color: colors.text, fontSize: 13 }}>
                          {new Date(item.date).toLocaleDateString()}
                        </Text>
                        <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>
                          {item.moduleId}
                        </Text>
                      </View>
                      <Text style={{ color: colors.text, fontSize: 12, marginTop: 4 }}>
                        Stress: <Text style={{ color: '#f472b6', fontWeight: '800' }}>{item.stressLevel}</Text> · Mood:{' '}
                        <Text style={{ color: '#c084fc', fontWeight: '800' }}>{item.mood}</Text> · Energy:{' '}
                        <Text style={{ color: '#2dd4bf', fontWeight: '800' }}>{item.energyLevel}</Text>
                      </Text>
                      {(item.linkedTaskTitle || item.taskTitle) ? (
                        <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                          Task: {item.linkedTaskTitle || item.taskTitle}
                        </Text>
                      ) : null}
                      {item.notes ? (
                        <Text style={{ color: colors.muted, fontSize: 11, fontStyle: 'italic', marginTop: 2 }}>
                          &ldquo;{item.notes}&rdquo;
                        </Text>
                      ) : null}
                    </View>
                  );
                })()}
              </View>
            ) : null}
          </Card>

          {/* Academic vs. Wellness Correlation Heatmap */}
          <Card>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Academic vs. Wellness Heatmap
            </Text>
            <Text style={[styles.resetHelper, { color: colors.muted, marginBottom: 10 }]}>
              Net Strain = Avg Stress − Avg Energy. Highlights high-friction modules vs. flow triggers.
            </Text>

            {WELLNESS_MODULES.map((mod) => {
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
                        : colors.border,
                      backgroundColor: isHighStrainMod
                        ? isLight ? '#fdf2f8' : 'rgba(244,114,182,0.06)'
                        : isFlowMod
                        ? isLight ? '#f0fdf4' : 'rgba(34,197,94,0.06)'
                        : 'transparent',
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
          </Card>
        </>
      )}

      {/* RECENT CHECK-IN HISTORY (Bottom of Screen) */}
      <Text style={[styles.historyHeader, { color: colors.text }]}>Recent Activity Logs</Text>
      {entries.slice(0, 7).map((entry) => (
        <Card key={entry.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[styles.date, { color: colors.primary }]}>
              {new Date(entry.date).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
              {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {entry.moduleId && (
              <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>
                {entry.moduleId.replace('_', ' ')}
              </Text>
            )}
          </View>

          {(entry.linkedTaskTitle || entry.taskTitle) ? (
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 4 }}>
              ✓ {entry.linkedTaskTitle || entry.taskTitle}
            </Text>
          ) : null}

          <View style={styles.entryMetricsRow}>
            <Text style={[styles.entryPill, { color: '#f472b6', backgroundColor: 'rgba(244,114,182,0.1)' }]}>
              Stress: {entry.stressLevel}
            </Text>
            <Text style={[styles.entryPill, { color: '#c084fc', backgroundColor: 'rgba(192,132,252,0.1)' }]}>
              Mood: {entry.mood}
            </Text>
            <Text style={[styles.entryPill, { color: '#2dd4bf', backgroundColor: 'rgba(45,212,191,0.1)' }]}>
              Energy: {entry.energyLevel}
            </Text>
            {entry.sleepHours != null ? (
              <Text style={[styles.entryPill, { color: colors.muted, backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                🌙 {entry.sleepHours}h
              </Text>
            ) : null}
          </View>

          {entry.tags && entry.tags.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              {entry.tags.map((t) => (
                <Text key={t} style={{ fontSize: 10, color: colors.muted, fontStyle: 'italic' }}>
                  {t}
                </Text>
              ))}
            </View>
          ) : null}

          {entry.gratitude ? (
            <Text style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>
              ✨ Win: {entry.gratitude}
            </Text>
          ) : null}

          {entry.notes ? (
            <Text style={[styles.summary, { color: colors.muted, marginTop: 4 }]}>
              {entry.notes}
            </Text>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakCountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  streakSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  xpChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  xpChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  milestoneRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  milestonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  milestonePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  subtleBadge: {
    fontSize: 11,
    fontWeight: '700',
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
  },
  moduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  moduleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moduleButtonText: {
    fontSize: 11,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 6,
  },
  checkboxText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ratingSection: {
    gap: 10,
    marginVertical: 8,
  },
  ratingRow: {
    gap: 4,
  },
  ratingLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  ratingButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  ratingButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  ratingButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  microTrackersRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  microCard: {
    flex: 1,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  microHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  microTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
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
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  tagPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  burnoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskBadge: {
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
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  triggerText: {
    fontSize: 12,
    flex: 1,
  },
  optimizerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strainBadge: {
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
  },
  subToolTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  subToolTabText: {
    fontSize: 10,
    fontWeight: '700',
  },
  breathingContainer: {
    alignItems: 'center',
    paddingVertical: 8,
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
  },
  pomodoroContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  pomoClock: {
    fontSize: 32,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 4,
  },
  gratitudeContainer: {
    paddingVertical: 4,
  },
  gratitudePillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  gratitudePill: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  gratitudePillText: {
    fontSize: 11,
  },
  timeRangeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeRangeButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  timeBtn: {
    paddingHorizontal: 10,
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
  },
  avgBox: {
    alignItems: 'center',
  },
  avgVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  avgLbl: {
    fontSize: 10,
    marginTop: 1,
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
    height: 80,
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
  },
  heatmapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
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
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  historyHeader: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 4,
  },
  date: {
    fontWeight: '700',
    fontSize: 12,
  },
  entryMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  entryPill: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  summary: {
    fontSize: 12,
    lineHeight: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    paddingRight: 42,
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
  },
  wellnessLogoLarge: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  headerText: {
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
});
