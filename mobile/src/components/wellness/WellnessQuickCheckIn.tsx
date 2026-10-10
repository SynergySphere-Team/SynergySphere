import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Card, Button, Field } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import {
  STRESS_ANCHORS,
  MOOD_ANCHORS,
  ENERGY_ANCHORS,
  SLEEP_PRESETS,
  WATER_PRESETS,
  WATER_STEP,
  GRATITUDE_PROMPT_PRESETS,
} from '@/constants/wellnessData';

export interface QuickPulseData {
  stress: number;
  mood: number;
  energy: number;
}

export interface DetailedCheckInData extends QuickPulseData {
  moduleId: string;
  taskTitle: string;
  markTaskDone: boolean;
  sleepHours: number;
  waterLitres: number;
  selectedTags: string[];
  gratitudeWin: string;
  notes: string;
}

interface WellnessQuickCheckInProps {
  onSaveQuick: (data: QuickPulseData) => Promise<void> | void;
  onSaveDetailed: (data: DetailedCheckInData) => Promise<void> | void;
  saving: boolean;
  accent: string;
}

const MODULES = [
  { id: 'PRODUCTIVITY', label: 'Tasks & Sprints' },
  { id: 'INTERVIEW_PREP', label: 'Mock Interviews' },
  { id: 'LEARNING_HUB', label: 'Curriculum & Hub' },
  { id: 'COMMUNITY', label: 'Community Collab' },
];

const FOCUS_TAGS = [
  '#flow-state',
  '#deep-debug',
  '#refactor-clarity',
  '#algorithm-focus',
  '#peer-review',
  '#mental-fatigue',
  '#burnout-recovery',
];

export function WellnessQuickCheckIn({
  onSaveQuick,
  onSaveDetailed,
  saving,
  accent,
}: WellnessQuickCheckInProps) {
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';

  // Mode: 'quick' (10-second pulse) vs 'detailed' (full multi-dimensional log)
  const [mode, setMode] = useState<'quick' | 'detailed'>('quick');

  // Core metrics
  const [stress, setStress] = useState(5);
  const [mood, setMood] = useState(6);
  const [energy, setEnergy] = useState(6);

  // Detailed fields
  const [moduleId, setModuleId] = useState('PRODUCTIVITY');
  const [taskTitle, setTaskTitle] = useState('');
  const [markTaskDone, setMarkTaskDone] = useState(false);
  const [sleepHours, setSleepHours] = useState(7.5);
  const [waterLitres, setWaterLitres] = useState(2.0);
  const [selectedTags, setSelectedTags] = useState<string[]>(['#flow-state']);
  const [gratitudeWin, setGratitudeWin] = useState('');
  const [notes, setNotes] = useState('');

  const handleQuickSubmit = () => {
    onSaveQuick({ stress, mood, energy });
  };

  const handleDetailedSubmit = () => {
    onSaveDetailed({
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
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const stressAnchor = STRESS_ANCHORS[stress] || STRESS_ANCHORS[5];
  const moodAnchor = MOOD_ANCHORS[mood] || MOOD_ANCHORS[6];
  const energyAnchor = ENERGY_ANCHORS[energy] || ENERGY_ANCHORS[6];

  return (
    <Card>
      {/* Mode Switcher Banner */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Daily Check-In</Text>
          <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
            {mode === 'quick' ? '10-Second Quick Pulse' : 'Deep Reflection Log'}
          </Text>
        </View>

        <View
          style={[
            styles.modePillContainer,
            { backgroundColor: isLight ? '#E8EEEC' : colors.surfaceElevated, borderColor: colors.border },
          ]}
        >
          <Pressable
            onPress={() => setMode('quick')}
            style={[
              styles.modeBtn,
              mode === 'quick' && [
                styles.modeBtnActive,
                { backgroundColor: isLight ? '#FFFFFF' : colors.surface },
              ],
            ]}
          >
            <Ionicons
              name="flash"
              size={13}
              color={mode === 'quick' ? accent : colors.muted}
            />
            <Text
              style={[
                styles.modeBtnText,
                { color: mode === 'quick' ? colors.text : colors.muted },
              ]}
            >
              Quick
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setMode('detailed')}
            style={[
              styles.modeBtn,
              mode === 'detailed' && [
                styles.modeBtnActive,
                { backgroundColor: isLight ? '#FFFFFF' : colors.surface },
              ],
            ]}
          >
            <Ionicons
              name="journal"
              size={13}
              color={mode === 'detailed' ? accent : colors.muted}
            />
            <Text
              style={[
                styles.modeBtnText,
                { color: mode === 'detailed' ? colors.text : colors.muted },
              ]}
            >
              Deep
            </Text>
          </Pressable>
        </View>
      </View>

      {/* CORE 3 SLIDERS (Always visible in both modes) */}
      <View style={styles.scalesContainer}>
        {/* 1. Stress */}
        <View style={styles.scaleItem}>
          <View style={styles.scaleHeader}>
            <Text style={[styles.scaleTitle, { color: colors.text }]}>
              Stress Level: <Text style={{ color: stressAnchor.color, fontWeight: '800' }}>{stress}/10</Text>
            </Text>
            <View style={[styles.anchorBadge, { backgroundColor: `${stressAnchor.color}18`, borderColor: stressAnchor.color }]}>
              <Text style={[styles.anchorBadgeText, { color: stressAnchor.color }]}>{stressAnchor.label}</Text>
            </View>
          </View>

          <View style={styles.scaleRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
              const selected = stress === val;
              return (
                <Pressable
                  key={val}
                  onPress={() => setStress(val)}
                  style={[
                    styles.scalePill,
                    selected
                      ? { backgroundColor: stressAnchor.color, borderColor: stressAnchor.color }
                      : { borderColor: isLight ? '#E2E8F0' : 'rgba(255,255,255,0.1)' },
                  ]}
                >
                  <Text style={[styles.scalePillText, { color: selected ? '#FFFFFF' : colors.text }]}>
                    {val}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 2. Mood */}
        <View style={styles.scaleItem}>
          <View style={styles.scaleHeader}>
            <Text style={[styles.scaleTitle, { color: colors.text }]}>
              Mood State: <Text style={{ color: moodAnchor.color, fontWeight: '800' }}>{mood}/10</Text>
            </Text>
            <View style={[styles.anchorBadge, { backgroundColor: `${moodAnchor.color}18`, borderColor: moodAnchor.color }]}>
              <Text style={[styles.anchorBadgeText, { color: moodAnchor.color }]}>{moodAnchor.label}</Text>
            </View>
          </View>

          <View style={styles.scaleRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
              const selected = mood === val;
              return (
                <Pressable
                  key={val}
                  onPress={() => setMood(val)}
                  style={[
                    styles.scalePill,
                    selected
                      ? { backgroundColor: moodAnchor.color, borderColor: moodAnchor.color }
                      : { borderColor: isLight ? '#E2E8F0' : 'rgba(255,255,255,0.1)' },
                  ]}
                >
                  <Text style={[styles.scalePillText, { color: selected ? '#FFFFFF' : colors.text }]}>
                    {val}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 3. Energy */}
        <View style={styles.scaleItem}>
          <View style={styles.scaleHeader}>
            <Text style={[styles.scaleTitle, { color: colors.text }]}>
              Energy & Focus: <Text style={{ color: energyAnchor.color, fontWeight: '800' }}>{energy}/10</Text>
            </Text>
            <View style={[styles.anchorBadge, { backgroundColor: `${energyAnchor.color}18`, borderColor: energyAnchor.color }]}>
              <Text style={[styles.anchorBadgeText, { color: energyAnchor.color }]}>{energyAnchor.label}</Text>
            </View>
          </View>

          <View style={styles.scaleRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
              const selected = energy === val;
              return (
                <Pressable
                  key={val}
                  onPress={() => setEnergy(val)}
                  style={[
                    styles.scalePill,
                    selected
                      ? { backgroundColor: energyAnchor.color, borderColor: energyAnchor.color }
                      : { borderColor: isLight ? '#E2E8F0' : 'rgba(255,255,255,0.1)' },
                  ]}
                >
                  <Text style={[styles.scalePillText, { color: selected ? '#FFFFFF' : colors.text }]}>
                    {val}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* QUICK MODE SUBMIT BUTTON */}
      {mode === 'quick' && (
        <View style={styles.quickSubmitSection}>
          <Button
            title={saving ? 'Recording Pulse…' : 'Record Check-In (+15 XP)'}
            onPress={handleQuickSubmit}
            disabled={saving}
          />
          <Pressable
            onPress={() => setMode('detailed')}
            style={styles.expandPrompt}
          >
            <Text style={[styles.expandPromptText, { color: accent }]}>
              Add sleep, hydration & reflection notes →
            </Text>
          </Pressable>
        </View>
      )}

      {/* DETAILED MODE ADDITIONAL FIELDS */}
      {mode === 'detailed' && (
        <View style={styles.detailedSection}>
          {/* Module Selector */}
          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Active Workspace</Text>
            <View style={styles.moduleRow}>
              {MODULES.map((m) => {
                const selected = moduleId === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setModuleId(m.id)}
                    style={[
                      styles.modulePill,
                      {
                        backgroundColor: selected ? (isLight ? '#E8F5E9' : 'rgba(145,219,94,0.18)') : colors.surface,
                        borderColor: selected ? accent : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.moduleText, { color: selected ? accent : colors.muted }]}>
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Linked Task Input */}
          <View style={styles.fieldBlock}>
            <Field
              label="Linked Task or Goal (Optional)"
              value={taskTitle}
              onChangeText={setTaskTitle}
              placeholder="e.g. Refactor API contracts, Debug race condition..."
            />
            {taskTitle.trim() ? (
              <Pressable
                onPress={() => setMarkTaskDone(!markTaskDone)}
                style={styles.taskDoneCheckbox}
              >
                <Ionicons
                  name={markTaskDone ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={markTaskDone ? accent : colors.muted}
                />
                <Text style={[styles.taskDoneText, { color: colors.text }]}>
                  Mark task as completed with this check-in (+10 XP)
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* Sleep & Water Tracker */}
          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Sleep & Hydration</Text>
            
            {/* Sleep Presets */}
            <View style={styles.microTrackerRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.microTrackerSub, { color: colors.muted }]}>
                  Sleep: <Text style={{ color: colors.text, fontWeight: '700' }}>{sleepHours}h</Text>
                </Text>
                <View style={styles.presetChipRow}>
                  {SLEEP_PRESETS.map((hrs) => (
                    <Pressable
                      key={hrs}
                      onPress={() => setSleepHours(hrs)}
                      style={[
                        styles.chip,
                        sleepHours === hrs && { backgroundColor: accent, borderColor: accent },
                        { borderColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: sleepHours === hrs ? '#FFF' : colors.text }]}>
                        {hrs}h
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Water Presets */}
              <View style={{ flex: 1 }}>
                <Text style={[styles.microTrackerSub, { color: colors.muted }]}>
                  Water: <Text style={{ color: colors.text, fontWeight: '700' }}>{waterLitres.toFixed(1)}L</Text>
                </Text>
                <View style={styles.presetChipRow}>
                  {WATER_PRESETS.map((litres) => (
                    <Pressable
                      key={litres}
                      onPress={() => setWaterLitres(litres)}
                      style={[
                        styles.chip,
                        waterLitres === litres && { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
                        { borderColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: waterLitres === litres ? '#FFF' : colors.text }]}>
                        {litres}L
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Focus Tags */}
          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>State of Mind Tags</Text>
            <View style={styles.tagsRow}>
              {FOCUS_TAGS.map((tag) => {
                const selected = selectedTags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    style={[
                      styles.tagPill,
                      selected && { backgroundColor: isLight ? '#E8F5E9' : 'rgba(145,219,94,0.18)', borderColor: accent },
                      { borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.tagText, { color: selected ? accent : colors.muted }]}>
                      {tag}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Gratitude & Reflections */}
          <View style={styles.fieldBlock}>
            <Field
              label="One Win or Gratitude"
              value={gratitudeWin}
              onChangeText={setGratitudeWin}
              placeholder="What went well today?"
            />
            <View style={styles.presetChipRow}>
              {GRATITUDE_PROMPT_PRESETS.slice(0, 3).map((prompt, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => setGratitudeWin(gratitudeWin === prompt ? '' : prompt)}
                  style={[styles.chip, { borderColor: colors.border }]}
                >
                  <Text numberOfLines={1} style={[styles.chipText, { color: colors.muted, maxWidth: 110 }]}>
                    {prompt}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Field
              label="Notes & Context"
              value={notes}
              onChangeText={setNotes}
              placeholder="Any stressors, blockers, or breakthroughs..."
              multiline
            />
          </View>

          <Button
            title={saving ? 'Saving Reflection…' : 'Save Complete Check-In (+25 XP)'}
            onPress={handleDetailedSubmit}
            disabled={saving}
          />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  modePillContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  modeBtnActive: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scalesContainer: {
    gap: 16,
  },
  scaleItem: {
    gap: 8,
  },
  scaleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scaleTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  anchorBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  anchorBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  scaleRow: {
    flexDirection: 'row',
    gap: 4,
    width: '100%',
  },
  scalePill: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scalePillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  quickSubmitSection: {
    marginTop: 18,
    gap: 10,
  },
  expandPrompt: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  expandPromptText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailedSection: {
    marginTop: 18,
    gap: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    paddingTop: 16,
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  moduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modulePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  moduleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  taskDoneCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  taskDoneText: {
    fontSize: 12,
    fontWeight: '600',
  },
  microTrackerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  microTrackerSub: {
    fontSize: 11,
    marginBottom: 6,
  },
  presetChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
