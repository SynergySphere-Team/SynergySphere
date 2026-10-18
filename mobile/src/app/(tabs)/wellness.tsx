import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Platform,
  Image,
  Vibration,
  TextInput,
  Modal,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen, Loading, Notice } from '@/components/Screen';
import { Button, Card, Field } from '@/components/ui';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import type { WellnessEntry, WellnessInsights } from '@/types/api';
import { ZenBreathingModal } from '@/components/wellness/ZenBreathingModal';
import {
  WellnessQuickCheckIn,
  type QuickPulseData,
  type DetailedCheckInData,
} from '@/components/wellness/WellnessQuickCheckIn';
import { BurnoutActionCard } from '@/components/wellness/BurnoutActionCard';
import {
  WELLNESS_MODULES,
  MOOD_TAG_CATEGORIES,
  STRESS_ANCHORS,
  MOOD_ANCHORS,
  ENERGY_ANCHORS,
  SLEEP_PRESETS,
  WATER_PRESETS,
  WATER_STEP,
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
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { fontSize, largerText } = useAccessibility();
  const isLight = theme === 'light';

  // Zen 4-7-8 Breathing Modal state
  const [zenModalOpen, setZenModalOpen] = useState(false);

  // Navigation tab: 'checkin' | 'trends'
  const [activeTab, setActiveTab] = useState<ActiveTab>('checkin');

  // Multi-step Check-in Navigation: 1: Mind & Focus | 2: Physical & Rest | 3: Reflection
  const [checkInStep, setCheckInStep] = useState<1 | 2 | 3>(1);

  const [moduleId, setModuleId] = useState('PRODUCTIVITY');
  const [taskTitle, setTaskTitle] = useState('');
  const [markTaskDone, setMarkTaskDone] = useState(false);
  const [stress, setStress] = useState(5);
  const [mood, setMood] = useState(6);
  const [energy, setEnergy] = useState(6);
  const [sleepHours, setSleepHours] = useState(7.5);
  const [sleepInputText, setSleepInputText] = useState('7.5');
  const [waterLitres, setWaterLitres] = useState(2.0);
  const [waterInputText, setWaterInputText] = useState('2.0');
  const [selectedTags, setSelectedTags] = useState<string[]>(['#flow-state']);
  const [gratitudeWin, setGratitudeWin] = useState('');
  const [notes, setNotes] = useState('');

  // Accordion state for past logged sessions
  const [isSessionListExpanded, setIsSessionListExpanded] = useState(false);

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

  // Banner Action Modals
  const [recoveryPlanModalVisible, setRecoveryPlanModalVisible] = useState(false);
  const [breakModalVisible, setBreakModalVisible] = useState(false);
  const [breakSecondsLeft, setBreakSecondsLeft] = useState(900); // 15 mins
  const [isBreakRunning, setIsBreakRunning] = useState(false);
  const [debriefModalVisible, setDebriefModalVisible] = useState(false);

  // Global unmount cleanup: ensure any active vibration stops immediately
  useEffect(() => {
    return () => {
      try {
        Vibration.cancel();
      } catch {}
    };
  }, []);

  // 4-7-8 Breathing Timer Effect with gentle non-looping pulse cues
  useEffect(() => {
    if (!isBreathingActive) {
      try {
        Vibration.cancel();
      } catch {}
      return;
    }
    const interval = setInterval(() => {
      setBreathSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;
        if (breathPhase === 'Inhale') {
          setBreathPhase('Hold');
          try {
            Vibration.vibrate(12);
          } catch {}
          return 7;
        } else if (breathPhase === 'Hold') {
          setBreathPhase('Exhale');
          try {
            Vibration.vibrate(12);
          } catch {}
          return 8;
        } else {
          setBreathPhase('Inhale');
          setBreathCycles((c) => c + 1);
          try {
            Vibration.vibrate(12);
          } catch {}
          return 4;
        }
      });
    }, 1000);
    return () => {
      clearInterval(interval);
      try {
        Vibration.cancel();
      } catch {}
    };
  }, [isBreathingActive, breathPhase]);

  // Break Countdown Timer Effect
  useEffect(() => {
    if (!isBreakRunning) return;
    const interval = setInterval(() => {
      setBreakSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsBreakRunning(false);
          try {
            Vibration.vibrate(20);
          } catch {}
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isBreakRunning]);

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

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  // Two-way numeric data binding for sleep and water inputs
  const updateSleep = (val: number) => {
    const rounded = Math.round(val * 10) / 10;
    const clamped = Math.min(14, Math.max(0, rounded));
    setSleepHours(clamped);
    setSleepInputText(clamped.toString());
  };

  const handleSleepTextChange = (text: string) => {
    setSleepInputText(text);
    const parsed = parseFloat(text);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 24) {
      setSleepHours(Math.round(parsed * 10) / 10);
    }
  };

  const handleSleepBlur = () => {
    setSleepInputText(sleepHours.toString());
  };

  const updateWater = (val: number) => {
    const rounded = Math.round(val * 100) / 100;
    const clamped = Math.min(15, Math.max(0, rounded));
    setWaterLitres(clamped);
    setWaterInputText(clamped.toString());
  };

  const handleWaterTextChange = (text: string) => {
    setWaterInputText(text);
    const parsed = parseFloat(text);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 20) {
      setWaterLitres(Math.round(parsed * 100) / 100);
    }
  };

  const handleWaterBlur = () => {
    setWaterInputText(waterLitres.toString());
  };

  // 10-Second Quick Pulse Save
  async function handleQuickSave(data: QuickPulseData) {
    setStress(data.stress);
    setMood(data.mood);
    setEnergy(data.energy);
    try {
      setSaving(true);
      setError('');
      setSavedMessage('');

      const res = await api.post<{ xpAwarded?: number; streak?: number }>('/wellness', {
        stressLevel: data.stress,
        mood: data.mood,
        energyLevel: data.energy,
        moduleId,
      });

      const xpEarned = res?.xpAwarded ?? 15;
      const streak = res?.streak ?? (insights?.streak?.current ? insights.streak.current + 1 : 1);
      setSavedMessage(`Check-in recorded! +${xpEarned} XP awarded. Streak: ${streak} days.`);

      await load();
      setTimeout(() => setSavedMessage(''), 6000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save check-in.');
    } finally {
      setSaving(false);
    }
  }

  // Detailed Reflection Save
  async function handleDetailedSave(data: DetailedCheckInData) {
    setStress(data.stress);
    setMood(data.mood);
    setEnergy(data.energy);
    setModuleId(data.moduleId);
    setTaskTitle(data.taskTitle);
    setMarkTaskDone(data.markTaskDone);
    setSleepHours(data.sleepHours);
    setWaterLitres(data.waterLitres);
    setSelectedTags(data.selectedTags);
    setGratitudeWin(data.gratitudeWin);
    setNotes(data.notes);
    try {
      setSaving(true);
      setError('');
      setSavedMessage('');

      const res = await api.post<{ xpAwarded?: number; streak?: number }>('/wellness', {
        stressLevel: data.stress,
        mood: data.mood,
        energyLevel: data.energy,
        moduleId: data.moduleId,
        sleepHours: data.sleepHours,
        waterIntake: data.waterLitres,
        tags: data.selectedTags,
        ...(data.taskTitle.trim()
          ? {
              taskTitle: data.taskTitle.trim(),
              taskStatus: data.markTaskDone ? 'DONE' : 'IN_PROGRESS',
            }
          : {}),
        ...(data.notes.trim() ? { notes: data.notes.trim() } : {}),
        ...(data.gratitudeWin.trim() ? { gratitude: data.gratitudeWin.trim() } : {}),
      });

      const xpEarned = res?.xpAwarded ?? 25;
      const streak = res?.streak ?? (insights?.streak?.current ? insights.streak.current + 1 : 1);
      setSavedMessage(`Detailed reflection saved! +${xpEarned} XP awarded. Streak: ${streak} days.`);

      await load();
      setTimeout(() => setSavedMessage(''), 6000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save check-in.');
    } finally {
      setSaving(false);
    }
  }

  // Legacy save fallback
  async function save() {
    await handleDetailedSave({
      stress,
      mood,
      energy,
      moduleId,
      taskTitle,
      markTaskDone,
      sleepHours,
      waterLitres,
      selectedTags,
      gratitudeWin,
      notes,
    });
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
        waterIntake: waterLitres,
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

  const clusteredSessions: ClusteredSession[] = useMemo(() => {
    return clusterWellnessEntries(entries, 45);
  }, [entries]);

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

  const setRatingWithHaptic = (setter: (v: number) => void, val: number) => {
    setter(val);
  };

  const liveStrain = stress - energy;
  const isHighStrainSpike = liveStrain >= 2 || stress >= 7 || burnoutRisk.level === 'CRITICAL';

  const handleScheduleBreak = () => {
    try {
      Vibration.vibrate(10);
    } catch {}
    setBreakModalVisible(true);
    setIsBreakRunning(true);
    setBreakSecondsLeft(900);
    setInterventionNotice('🌿 15-minute screen-free break started.');
    setTimeout(() => setInterventionNotice(''), 5000);
  };

  const handleLaunchBreathing = () => {
    try {
      Vibration.vibrate(10);
    } catch {}
    setZenModalOpen(true);
  };

  const handleLaunchTasksDecompression = () => {
    router.push('/(tabs)/tasks' as never);
  };

  const handleGenerateRecoveryPlan = () => {
    try {
      Vibration.vibrate(10);
    } catch {}
    setRecoveryPlanModalVisible(true);
  };

  const handleDebriefSession = () => {
    try {
      Vibration.vibrate(10);
    } catch {}
    setDebriefModalVisible(true);
  };

  if (!loaded) return <Loading />;

  const isHighStrain = stress > 6 || energy < 5;

  const renderSessionCardBody = (session: ClusteredSession, isMulti: boolean) => {
    const isExpanded = !!expandedClusterIds[session.id];
    const isHighStrainSession = session.netStrain >= 1.5;
    const isFlowSession = session.netStrain <= -1.0;

    return (
      <View style={{ width: '100%' }}>
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
                backgroundColor: isHighStrainSession
                  ? 'rgba(244,114,182,0.15)'
                  : isFlowSession
                  ? 'rgba(34,197,94,0.15)'
                  : 'rgba(255,255,255,0.08)',
              },
            ]}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '700',
                color: isHighStrainSession ? '#f472b6' : isFlowSession ? '#22c55e' : colors.muted,
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
              💧 {session.waterIntake}L
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
      </View>
    );
  };

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={handleRefresh}
      disableSwipeBack={isBreathingActive || isPomoRunning}
    >
      {/* WELLNESS HEADER */}
      <View
        style={[
          styles.headerRow,
          largerText && styles.headerRowLarge,
        ]}
      >
        <View
          style={[
            styles.wellnessLogoWrapper,
            largerText && styles.wellnessLogoWrapperLarge,
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
            source={require('../../../assets/images/wellness-logo.png')}
            style={[
              styles.wellnessLogo,
              largerText && styles.wellnessLogoLarge,
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
            SynergySphere{'\n'}Wellness
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
            Track mental bandwidth, prevent burnout &amp; optimize tasks.
          </Text>
        </View>

        <Pressable
          onPress={() => setZenModalOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Start Zen Breathing"
          style={[
            styles.headerZenBadge,
            {
              backgroundColor: isLight ? '#E8F5E9' : 'rgba(52, 211, 153, 0.15)',
              borderColor: isLight ? '#B7DFC3' : 'rgba(52, 211, 153, 0.3)',
            },
          ]}
        >
          <Ionicons name="leaf" size={13} color={isLight ? '#166534' : '#34D399'} />
          <Text style={[styles.headerZenBadgeText, { color: isLight ? '#166534' : '#34D399' }]}>Zen</Text>
        </Pressable>
      </View>

      {error ? <Notice>{error}</Notice> : null}
      {savedMessage ? <Notice tone="success">{savedMessage}</Notice> : null}
      {interventionNotice ? <Notice tone="success">{interventionNotice}</Notice> : null}

      {/* Top Navigation Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <Pressable
          onPress={() => setActiveTab('checkin')}
          style={[
            styles.tabButton,
            activeTab === 'checkin' && { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 },
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
              { color: activeTab === 'checkin' ? colors.text : colors.muted, fontWeight: activeTab === 'checkin' ? '800' : '600' },
            ]}
          >
            Check-In &amp; AI Coach
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('trends')}
          style={[
            styles.tabButton,
            activeTab === 'trends' && { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 },
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
              { color: activeTab === 'trends' ? colors.text : colors.muted, fontWeight: activeTab === 'trends' ? '800' : '600' },
            ]}
          >
            Trends &amp; Heatmap
          </Text>
        </Pressable>
      </View>

      {/* Gamification Streak & Milestone Banner */}
      <View style={[styles.sectionHeaderRow, { marginTop: 4 }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Resilience &amp; Daily Streak
        </Text>
        <Text style={[styles.sectionCaption, { color: colors.muted }]}>
          {currentStreak}d streak
        </Text>
      </View>
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
          {/* Enhanced Dual-Mode Check-In Form */}
          <WellnessQuickCheckIn
            onSaveQuick={handleQuickSave}
            onSaveDetailed={handleDetailedSave}
            saving={saving}
            accent={isLight ? '#1e6827' : colors.primary}
          />

          {/* Strain & Burnout Guard */}
          <BurnoutActionCard
            stress={stress}
            energy={energy}
            onLaunchBreathing={handleLaunchBreathing}
            onLaunchTasksDecompression={handleLaunchTasksDecompression}
            onScheduleBreak={handleScheduleBreak}
          />


          {/* AI Task & Workflow Optimizer (Appears when task is specified) */}
          {taskDeconstruction ? (
            <>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                  <Ionicons name="sparkles" size={18} color="#06b6d4" style={{ flexShrink: 0 }} />
                  <Text style={[styles.sectionTitle, { color: colors.text, flex: 1 }]} numberOfLines={1}>Focus Decomposition</Text>
                </View>
                {isHighStrain ? (
                  <View style={[styles.strainBadge, { backgroundColor: 'rgba(244,114,182,0.2)', flexShrink: 0 }]}>
                    <Text style={{ color: '#f472b6', fontSize: 10, fontWeight: '700' }}>High Strain</Text>
                  </View>
                ) : null}
              </View>
              <Card>

                <Text style={[styles.optimizerAdvice, { color: colors.text }]}>
                  {taskDeconstruction.actionableAdvice}
                </Text>

                {/* Subtasks */}
                <Text style={[styles.sectionSubtitle, { color: colors.muted, marginTop: 10 }]}>
                  Actionable Focus Slices
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
                      Curated Resources
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
            </>
          ) : null}

          {/* Quick Resets Collapsible Card */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Quick Resets &amp; Micro-Tools
            </Text>
          </View>
          <Card>
            <Pressable
              onPress={() => setResetSectionOpen(!resetSectionOpen)}
              style={styles.cardHeaderRow}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, marginRight: 8 }}>
                <Ionicons name="leaf" size={18} color="#f472b6" style={{ flexShrink: 0 }} />
                <Text style={[styles.cardTitle, { color: colors.text, flex: 1 }]} numberOfLines={1}>
                  {activeResetTool === 'breathing' ? '4-7-8 Breathing Guide' : activeResetTool === 'pomodoro' ? '5-Min Decompression' : 'Gratitude Win Anchoring'}
                </Text>
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

                {/* Gratitude Win */}
                {activeResetTool === 'gratitude' ? (
                  <View style={styles.gratitudeContainer}>
                    <Text style={[styles.resetHelper, { color: colors.muted }]}>
                      Celebrate a micro-win to anchor positive momentum:
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
          <View style={[styles.sectionHeaderRow, { marginTop: 4 }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Timeframe &amp; Averages
            </Text>
          </View>
          <Card>
            <View style={styles.timeRangeBar}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Range Filter</Text>
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
                    {Number(insights.averages.stress ?? 0).toFixed(1)}
                  </Text>
                  <Text style={[styles.avgLbl, { color: colors.muted }]}>Avg Stress</Text>
                </View>
                <View style={styles.avgBox}>
                  <Text style={[styles.avgVal, { color: '#c084fc' }]}>
                    {Number(insights.averages.mood ?? 0).toFixed(1)}
                  </Text>
                  <Text style={[styles.avgLbl, { color: colors.muted }]}>Avg Mood</Text>
                </View>
                <View style={styles.avgBox}>
                  <Text style={[styles.avgVal, { color: '#2dd4bf' }]}>
                    {Number(insights.averages.energy ?? 0).toFixed(1)}
                  </Text>
                  <Text style={[styles.avgLbl, { color: colors.muted }]}>Avg Energy</Text>
                </View>
              </View>
            ) : null}
          </Card>

          {/* Visual Trend Bars with Step 3 Baseline Equilibrium Line & Interactive Touch Tooltip */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Wellness Trajectory ({filteredEntries.length} entries)
            </Text>
          </View>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, width: '100%', marginBottom: 4 }}>
              <Text style={[styles.sectionSubtitle, { color: colors.muted, marginBottom: 0 }]}>
                Stress / Mood / Energy Dynamics
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
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Academic vs. Wellness Heatmap
            </Text>
            <View style={[styles.heatBadge, { backgroundColor: isLight ? '#f1f5f3' : 'rgba(255,255,255,0.08)' }]}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>
                {activeModules.length} Active Modules
              </Text>
            </View>
          </View>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, width: '100%', marginBottom: 4 }}>
              <Text style={[styles.sectionSubtitle, { color: colors.muted, marginBottom: 0 }]}>
                Strain By Subject / Module
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
              const avgStress = Number(stats?.avgStress ?? 0) || 0;
              const avgEnergy = Number(stats?.avgEnergy ?? 0) || 0;
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

      {/* RECENT CHECK-IN HISTORY AS ACCORDION & LATEST SESSION SUMMARY */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.text, flex: 1, minWidth: 0 }]} numberOfLines={1}>
          Recent Activity Logs ({clusteredSessions.length})
        </Text>
        <View style={[styles.clusteringBadge, { backgroundColor: isLight ? '#f1f5f3' : 'rgba(255,255,255,0.08)' }]}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.muted }}>
            45m Clustered
          </Text>
        </View>
      </View>

      {clusteredSessions.length === 0 ? (
        <Card>
          <View style={{ alignItems: 'center', paddingVertical: 18, gap: 6 }}>
            <Ionicons name="calendar-outline" size={32} color={colors.muted} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>No Logged Sessions Yet</Text>
            <Text style={{ fontSize: 11, color: colors.muted, textAlign: 'center' }}>
              Complete your first check-in above to track your strain, mood, and focus momentum.
            </Text>
          </View>
        </Card>
      ) : (
        <>
          {/* Latest Session Card (Always visible summary) */}
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={[styles.latestSessionBadge, { backgroundColor: isLight ? '#e6f4ea' : 'rgba(145,219,94,0.15)' }]}>
                <Ionicons name="sparkles" size={11} color={isLight ? '#1e6827' : colors.primary} />
                <Text style={[styles.latestSessionBadgeText, { color: isLight ? '#1e6827' : colors.primary }]}>
                  Latest Session
                </Text>
              </View>
              <Text style={{ fontSize: 10, color: colors.muted }}>
                {new Date(clusteredSessions[0].startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </Text>
            </View>
            {renderSessionCardBody(clusteredSessions[0], clusteredSessions[0].entryCount > 1)}
          </Card>

          {/* Expandable Accordion for Previous Sessions */}
          {clusteredSessions.length > 1 ? (
            <Card>
              <Pressable
                onPress={() => setIsSessionListExpanded(!isSessionListExpanded)}
                style={styles.accordionHeaderRow}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <Ionicons name="archive-outline" size={18} color={colors.primary} />
                  <Text style={[styles.accordionTitle, { color: colors.text, flex: 1 }]} numberOfLines={1}>
                    {isSessionListExpanded ? 'Collapse Past Sessions' : `View Logged Sessions (${clusteredSessions.length - 1} earlier)`}
                  </Text>
                  <View style={[styles.accordionCountPill, { backgroundColor: isLight ? '#f1f5f3' : 'rgba(255,255,255,0.08)' }]}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.primary }}>
                      +{clusteredSessions.length - 1}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={isSessionListExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.muted}
                />
              </Pressable>

              {isSessionListExpanded ? (
                <View style={{ marginTop: 12, gap: 12 }}>
                  {clusteredSessions.slice(1, 10).map((session) => (
                    <View
                      key={session.id}
                      style={[
                        styles.pastSessionSubCard,
                        {
                          borderColor: isLight ? '#E5E7EB' : 'rgba(255,255,255,0.08)',
                          backgroundColor: isLight ? '#f8faf9' : 'rgba(255,255,255,0.02)',
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.muted }}>
                          {new Date(session.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                      {renderSessionCardBody(session, session.entryCount > 1)}
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>
          ) : null}
        </>
      )}

      {/* DEVELOPER INTEGRATIONS & AUTOMATED ZERO-FRICTION HOOKS */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Developer Integrations
        </Text>
      </View>
      <Card>
        <Pressable
          onPress={() => setDevHooksOpen(!devHooksOpen)}
          style={styles.cardHeaderRow}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, marginRight: 8 }}>
            <Ionicons name="git-branch" size={18} color="#3b82f6" style={{ flexShrink: 0 }} />
            <Text style={[styles.cardTitle, { color: colors.text, flex: 1 }]} numberOfLines={1}>
              Automated Telemetry &amp; Git Hooks
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
            {/* Git Post-Commit Hook */}
            <View style={[styles.hookCard, { borderColor: isLight ? '#E5E7EB' : colors.border, backgroundColor: isLight ? '#f8faf9' : 'rgba(255,255,255,0.03)' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="terminal" size={15} color="#10b981" />
                <Text style={[styles.hookTitle, { color: colors.text }]}>Git Post-Commit Hook</Text>
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

            {/* VS Code / IDE Extension */}
            <View style={[styles.hookCard, { borderColor: isLight ? '#E5E7EB' : colors.border, backgroundColor: isLight ? '#f8faf9' : 'rgba(255,255,255,0.03)' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="code-slash" size={15} color="#3b82f6" />
                <Text style={[styles.hookTitle, { color: colors.text }]}>IDE Pacing Extension</Text>
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

            {/* CI/CD Build Failures Hook */}
            <View style={[styles.hookCard, { borderColor: isLight ? '#E5E7EB' : colors.border, backgroundColor: isLight ? '#f8faf9' : 'rgba(255,255,255,0.03)' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="cloud-upload" size={15} color="#f59e0b" />
                <Text style={[styles.hookTitle, { color: colors.text }]}>CI/CD Failure Webhook</Text>
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

      {/* ─── 1. Burnout Recovery Plan Modal ─── */}
      <Modal
        visible={recoveryPlanModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setRecoveryPlanModalVisible(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={modalStyles.headerRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={[modalStyles.iconBadge, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
                  <Ionicons name="flash" size={20} color="#3b82f6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[modalStyles.title, { color: colors.text }]}>Burnout Recovery Plan</Text>
                  <Text style={[modalStyles.subtitle, { color: colors.muted }]}>
                    {burnoutRisk.label} Risk · Strain Index: {burnoutRisk.score}%
                  </Text>
                </View>
              </View>
              <Pressable onPress={() => setRecoveryPlanModalVisible(false)} hitSlop={10}>
                <Ionicons name="close-circle" size={26} color={colors.muted} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 12, paddingVertical: 8 }}>
                {/* Protocol Overview Banner */}
                <View style={[modalStyles.bannerBox, { backgroundColor: isLight ? '#eff6ff' : 'rgba(59,130,246,0.1)', borderColor: '#3b82f6' }]}>
                  <Text style={[modalStyles.bannerTitle, { color: isLight ? '#1e40af' : '#60a5fa' }]}>
                    Active Recovery Protocol
                  </Text>
                  <Text style={[modalStyles.bannerCopy, { color: colors.text }]}>
                    {burnoutRisk.score >= 65
                      ? 'High cognitive exhaustion detected. Prioritize neuro-recovery: disengage from high-context debugging and reset nervous system.'
                      : 'Moderate strain accumulation. Implement pacing boundaries to prevent progression to acute burnout.'}
                  </Text>
                </View>

                {/* Phase 1 */}
                <View style={[modalStyles.phaseCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  <View style={modalStyles.phaseHeader}>
                    <Ionicons name="eye-outline" size={16} color="#8b5cf6" />
                    <Text style={[modalStyles.phaseTitle, { color: colors.text }]}>Phase 1: Immediate Decompression (Next 2h)</Text>
                  </View>
                  <Text style={[modalStyles.phaseItem, { color: colors.muted }]}>• Step away from IDE screens for 15 minutes.</Text>
                  <Text style={[modalStyles.phaseItem, { color: colors.muted }]}>• 20-20-20 visual rest rule: focus at a 20-ft distance.</Text>
                  <Text style={[modalStyles.phaseItem, { color: colors.muted }]}>• Mute non-critical Slack and notification pings.</Text>
                </View>

                {/* Phase 2 */}
                <View style={[modalStyles.phaseCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  <View style={modalStyles.phaseHeader}>
                    <Ionicons name="git-branch-outline" size={16} color="#10b981" />
                    <Text style={[modalStyles.phaseTitle, { color: colors.text }]}>Phase 2: Workload & Task Triage (Today)</Text>
                  </View>
                  <Text style={[modalStyles.phaseItem, { color: colors.muted }]}>• Low-friction task mode: document contracts, write test cases.</Text>
                  <Text style={[modalStyles.phaseItem, { color: colors.muted }]}>• Postpone architectural re-writes and major schema migrations.</Text>
                  <Text style={[modalStyles.phaseItem, { color: colors.muted }]}>• Single-thread: run 25-minute Pomodoro sprints with strict 5m pauses.</Text>
                </View>

                {/* Phase 3 */}
                <View style={[modalStyles.phaseCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  <View style={modalStyles.phaseHeader}>
                    <Ionicons name="moon-outline" size={16} color="#3b82f6" />
                    <Text style={[modalStyles.phaseTitle, { color: colors.text }]}>Phase 3: Circadian Rest & Sleep Target</Text>
                  </View>
                  <Text style={[modalStyles.phaseItem, { color: colors.muted }]}>• Target 8.0 hours minimum recovery sleep tonight.</Text>
                  <Text style={[modalStyles.phaseItem, { color: colors.muted }]}>• Digital sunset: close laptops 45 minutes before sleep.</Text>
                  <Text style={[modalStyles.phaseItem, { color: colors.muted }]}>• Hydration goal: 2.5 Litres of water across the day.</Text>
                </View>
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={{ paddingTop: 14, gap: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
              <Button
                title="Apply Recovery Targets to Today"
                onPress={() => {
                  setStress(3);
                  setEnergy(6);
                  setSleepHours(8.0);
                  setWaterLitres(2.5);
                  setNotes((prev) => (prev ? `${prev}\n\n[Applied Burnout Recovery Protocol]` : '[Applied Burnout Recovery Protocol: Low-friction tasks & circadian sleep prioritization]'));
                  setRecoveryPlanModalVisible(false);
                  setInterventionNotice('✅ Recovery Plan targets applied to today\'s check-in.');
                  setTimeout(() => setInterventionNotice(''), 6000);
                }}
              />
              <Button
                title="Dismiss"
                secondary
                onPress={() => setRecoveryPlanModalVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── 2. 15-Minute Screen-Free Break Modal ─── */}
      <Modal
        visible={breakModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setBreakModalVisible(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={modalStyles.headerRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[modalStyles.iconBadge, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                  <Ionicons name="cafe" size={20} color="#10b981" />
                </View>
                <View>
                  <Text style={[modalStyles.title, { color: colors.text }]}>Screen-Free Break</Text>
                  <Text style={[modalStyles.subtitle, { color: colors.muted }]}>Rest your eyes and reset cognitive focus</Text>
                </View>
              </View>
              <Pressable onPress={() => setBreakModalVisible(false)} hitSlop={10}>
                <Ionicons name="close-circle" size={26} color={colors.muted} />
              </Pressable>
            </View>

            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={{ fontSize: 44, fontWeight: '900', color: '#10b981', fontVariant: ['tabular-nums'] }}>
                {Math.floor(breakSecondsLeft / 60).toString().padStart(2, '0')}:{(breakSecondsLeft % 60).toString().padStart(2, '0')}
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
                {isBreakRunning ? 'Break in progress · Keep screens away' : 'Break paused'}
              </Text>
            </View>

            <View style={{ gap: 8, paddingBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#10b981" />
                <Text style={{ fontSize: 12, color: colors.text }}>Stand up, stretch your neck and shoulders</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#10b981" />
                <Text style={{ fontSize: 12, color: colors.text }}>Drink a glass of cool water</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#10b981" />
                <Text style={{ fontSize: 12, color: colors.text }}>Look out the window at daylight</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title={isBreakRunning ? 'Pause' : 'Resume'}
                  secondary
                  onPress={() => setIsBreakRunning(!isBreakRunning)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Finish Break"
                  onPress={() => {
                    setIsBreakRunning(false);
                    setBreakModalVisible(false);
                    setInterventionNotice('🎉 15m break completed! Rested focus achieved.');
                    setTimeout(() => setInterventionNotice(''), 5000);
                  }}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── 3. Session Debrief Modal ─── */}
      <Modal
        visible={debriefModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDebriefModalVisible(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={modalStyles.headerRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[modalStyles.iconBadge, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                  <Ionicons name="chatbubbles" size={20} color="#f59e0b" />
                </View>
                <View>
                  <Text style={[modalStyles.title, { color: colors.text }]}>Session Debrief</Text>
                  <Text style={[modalStyles.subtitle, { color: colors.muted }]}>Unpack blockers and capture key learnings</Text>
                </View>
              </View>
              <Pressable onPress={() => setDebriefModalVisible(false)} hitSlop={10}>
                <Ionicons name="close-circle" size={26} color={colors.muted} />
              </Pressable>
            </View>

            <View style={{ paddingVertical: 12, gap: 10 }}>
              <Text style={{ fontSize: 12, color: colors.muted }}>
                Debrief notes are automatically saved into your daily wellness log for retrospectives.
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={5}
                placeholder="What was the main technical friction or breakthrough in this coding sprint?"
                placeholderTextColor={colors.muted}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceElevated,
                  color: colors.text,
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 13,
                  minHeight: 110,
                  textAlignVertical: 'top',
                }}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10, paddingTop: 10 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Cancel"
                  secondary
                  onPress={() => setDebriefModalVisible(false)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Save Debrief"
                  onPress={() => {
                    setDebriefModalVisible(false);
                    setInterventionNotice('📝 Debrief note saved into check-in.');
                    setTimeout(() => setInterventionNotice(''), 5000);
                  }}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 4-7-8 Zen Breathing Modal */}
      <ZenBreathingModal
        visible={zenModalOpen}
        onClose={() => setZenModalOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerZenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 0,
  },
  headerZenBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 10,
    paddingHorizontal: 2,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionCaption: {
    fontSize: 12,
    fontWeight: '600',
  },
  stepIndicatorContainer: {
    marginBottom: 14,
    width: '100%',
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  stepTitleText: {
    fontSize: 14,
    fontWeight: '800',
  },
  stepProgressBarTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
    marginBottom: 10,
  },
  stepProgressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  stepDotsRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
  },
  stepDotBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 0,
  },
  stepDotCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepDotNumber: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  stepDotLabel: {
    fontSize: 10.5,
    flexShrink: 1,
  },
  stepNavigationRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    width: '100%',
  },
  metricInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    gap: 2,
  },
  metricTextInput: {
    fontSize: 12,
    fontWeight: '800',
    minWidth: 32,
    textAlign: 'center',
    paddingVertical: 0,
  },
  metricUnitLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  checkInPreviewCard: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    gap: 3,
  },
  previewCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  previewMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  accordionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  accordionCountPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    flexShrink: 0,
  },
  latestSessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  latestSessionBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  pastSessionSubCard: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginTop: 10,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    minWidth: 0,
  },
  tabText: {
    fontSize: 13,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
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
    alignItems: 'flex-start',
    marginBottom: 8,
    width: '100%',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subtleBadge: {
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
    fontSize: 13.5,
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
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 0,
  },
  scaleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  anchorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
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
    fontSize: 11,
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
    fontSize: 12.5,
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
    fontSize: 12,
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
    fontSize: 13,
    lineHeight: 18,
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
    fontSize: 12.5,
    fontWeight: '800',
  },
  strainAlertSub: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
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
    padding: 9,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
  },
  interventionBtnTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  interventionBtnDesc: {
    fontSize: 10.5,
  },
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    width: '100%',
  },
  triggerText: {
    fontSize: 12.5,
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
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    fontWeight: '500',
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
    fontSize: 13,
    fontWeight: '700',
  },
  subtaskRationale: {
    fontSize: 11,
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
    fontSize: 10.5,
    fontWeight: '700',
    color: '#06b6d4',
  },
  resourceTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  resourceDesc: {
    fontSize: 12,
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
    fontSize: 13.5,
    fontWeight: '700',
  },
  hookDesc: {
    fontSize: 12,
    lineHeight: 17,
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
    fontSize: 11,
    color: '#38bdf8',
    lineHeight: 15,
  },
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
  wellnessLogoWrapper: {
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
  wellnessLogoWrapperLarge: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  wellnessLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  wellnessLogoLarge: {
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
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  bannerBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  bannerCopy: {
    fontSize: 12,
    lineHeight: 17,
  },
  phaseCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  phaseTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  phaseItem: {
    fontSize: 12,
    lineHeight: 18,
  },
});

