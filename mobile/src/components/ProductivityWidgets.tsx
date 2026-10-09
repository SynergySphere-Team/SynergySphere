import { useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text as RNText,
  View,
  type TextProps,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Card } from '@/components/ui';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useTheme } from '@/context/ThemeContext';
import type { ProductivityStats, WeeklyFocusDay } from '@/types/api';

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                             */
/* -------------------------------------------------------------------------- */

function Text({ style, ...props }: TextProps) {
  const { largerText, fontSize } = useAccessibility();
  const flattened = StyleSheet.flatten(style);
  const baseFontSize = typeof flattened?.fontSize === 'number' ? flattened.fontSize : 14;
  const baseLineHeight = typeof flattened?.lineHeight === 'number' ? flattened.lineHeight : undefined;

  return (
    <RNText
      {...props}
      allowFontScaling
      style={[
        style,
        largerText && {
          fontSize: fontSize(baseFontSize),
          lineHeight: baseLineHeight !== undefined ? fontSize(baseLineHeight) : undefined,
        },
      ]}
    />
  );
}

export function formatFocusMinutes(total: number): string {
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

/* -------------------------------------------------------------------------- */
/* Today summary + daily goal                                                 */
/* -------------------------------------------------------------------------- */

export function TodaySummary({
  stats,
  goalMinutes,
  onCycleGoal,
  accent,
}: {
  stats: ProductivityStats | null;
  goalMinutes: number;
  onCycleGoal: () => void;
  accent: string;
}) {
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';

  const focusMinutes = stats?.focusMinutesToday ?? 0;
  const goalProgress = Math.min(1, goalMinutes > 0 ? focusMinutes / goalMinutes : 0);
  const goalReached = focusMinutes >= goalMinutes;

  const tiles: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[] = [
    { icon: 'time-outline', label: 'Focused', value: formatFocusMinutes(focusMinutes) },
    { icon: 'checkmark-done-outline', label: 'Done', value: String(stats?.tasksCompletedToday ?? 0) },
    { icon: 'flame-outline', label: 'Sessions', value: String(stats?.focusSessionsToday ?? 0) },
    {
      icon: 'leaf-outline',
      label: 'Wellness',
      value: stats?.wellnessScore != null ? String(stats.wellnessScore) : '—',
    },
  ];

  return (
    <Card>
      <View style={styles.cardHeaderRow}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Today</Text>
        <Text style={[styles.cardCaption, { color: colors.muted }]}>
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
        </Text>
      </View>

      <View style={styles.tilesRow}>
        {tiles.map((tile) => (
          <View
            key={tile.label}
            style={[
              styles.tile,
              {
                backgroundColor: isLight ? '#F4F8F5' : colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
            accessible
            accessibilityLabel={`${tile.label}: ${tile.value}`}
          >
            <Ionicons name={tile.icon} size={16} color={accent} />
            <Text style={[styles.tileValue, { color: colors.text }]} numberOfLines={1}>
              {tile.value}
            </Text>
            <Text style={[styles.tileLabel, { color: colors.muted }]} numberOfLines={1}>
              {tile.label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.goalHeader}>
        <Text style={[styles.goalLabel, { color: colors.text }]}>
          {goalReached ? 'Daily focus goal reached!' : 'Daily focus goal'}
        </Text>
        <Pressable
          onPress={onCycleGoal}
          accessibilityRole="button"
          accessibilityLabel={`Daily focus goal ${goalMinutes} minutes. Tap to change.`}
          hitSlop={8}
          style={({ pressed }) => [
            styles.goalChip,
            { borderColor: colors.border, backgroundColor: isLight ? '#FFFFFF' : colors.surfaceElevated },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.goalChipText, { color: colors.text }]}>
            {formatFocusMinutes(focusMinutes)} / {formatFocusMinutes(goalMinutes)}
          </Text>
          <Ionicons name="swap-vertical" size={12} color={colors.muted} />
        </Pressable>
      </View>

      <View
        style={[styles.goalTrack, { backgroundColor: isLight ? '#E5ECE8' : colors.border }]}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: goalMinutes, now: Math.min(focusMinutes, goalMinutes) }}
      >
        <View style={[styles.goalFill, { width: `${goalProgress * 100}%`, backgroundColor: accent }]} />
      </View>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Tick-based progress ring (no SVG dependency)                               */
/* -------------------------------------------------------------------------- */

const RING_TICKS = 60;

export function ProgressRing({
  size,
  progress,
  activeColor,
  trackColor,
  innerColor,
  children,
}: {
  size: number;
  progress: number;
  activeColor: string;
  trackColor: string;
  innerColor: string;
  children?: ReactNode;
}) {
  const tickLength = Math.round(size * 0.075);
  const tickWidth = Math.max(3, Math.round(size * 0.018));
  const activeTicks = Math.round(Math.max(0, Math.min(1, progress)) * RING_TICKS);
  const innerSize = size - tickLength * 2 - 16;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: RING_TICKS }, (_, index) => (
        <View
          key={index}
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${(index * 360) / RING_TICKS}deg` }] }]}
        >
          <View
            style={{
              alignSelf: 'center',
              width: tickWidth,
              height: tickLength,
              borderRadius: tickWidth,
              backgroundColor: index < activeTicks ? activeColor : trackColor,
            }}
          />
        </View>
      ))}
      <View
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          backgroundColor: innerColor,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 12,
        }}
      >
        {children}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Weekly insights                                                            */
/* -------------------------------------------------------------------------- */

const CHART_HEIGHT = 96;

export function WeeklyInsights({
  weeklyFocus,
  streak,
  accent,
}: {
  weeklyFocus: WeeklyFocusDay[];
  streak: number;
  accent: string;
}) {
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';

  const total = weeklyFocus.reduce((sum, day) => sum + day.minutes, 0);
  const activeDays = weeklyFocus.filter((day) => day.minutes > 0).length;
  const max = Math.max(1, ...weeklyFocus.map((day) => day.minutes));
  const todayIndex = weeklyFocus.length - 1;

  return (
    <Card>
      <View style={styles.cardHeaderRow}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>This Week</Text>
        <View
          style={[
            styles.streakPill,
            { backgroundColor: streak > 0 ? (isLight ? '#FFF4E5' : 'rgba(245,158,11,0.15)') : colors.surfaceElevated },
          ]}
        >
          <Text style={[styles.streakText, { color: streak > 0 ? '#D97706' : colors.muted }]}>
            {streak > 0 ? `${streak}-day streak` : 'No streak yet'}
          </Text>
        </View>
      </View>

      <View style={styles.weekSummaryRow}>
        <View style={styles.weekSummaryItem}>
          <Text style={[styles.weekSummaryValue, { color: colors.text }]}>{formatFocusMinutes(total)}</Text>
          <Text style={[styles.weekSummaryLabel, { color: colors.muted }]}>Total focus</Text>
        </View>
        <View style={styles.weekSummaryItem}>
          <Text style={[styles.weekSummaryValue, { color: colors.text }]}>
            {formatFocusMinutes(Math.round(total / 7))}
          </Text>
          <Text style={[styles.weekSummaryLabel, { color: colors.muted }]}>Daily avg</Text>
        </View>
        <View style={styles.weekSummaryItem}>
          <Text style={[styles.weekSummaryValue, { color: colors.text }]}>{activeDays}/7</Text>
          <Text style={[styles.weekSummaryLabel, { color: colors.muted }]}>Active days</Text>
        </View>
      </View>

      <View style={styles.chartRow} accessibilityLabel={`Focus minutes for the last 7 days, ${total} minutes total`}>
        {weeklyFocus.map((day, index) => {
          const height = day.minutes > 0 ? Math.max(6, (day.minutes / max) * CHART_HEIGHT) : 4;
          const isToday = index === todayIndex;
          return (
            <View key={day.date} style={styles.chartColumn}>
              <Text style={[styles.chartValue, { color: day.minutes > 0 ? colors.text : 'transparent' }]}>
                {day.minutes > 0 ? day.minutes : '0'}
              </Text>
              <View style={[styles.chartBarTrack, { height: CHART_HEIGHT }]}>
                <View
                  style={[
                    styles.chartBar,
                    {
                      height,
                      backgroundColor: day.minutes > 0 ? accent : isLight ? '#E5ECE8' : colors.border,
                      opacity: isToday || day.minutes === 0 ? 1 : 0.6,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.chartLabel,
                  { color: isToday ? accent : colors.muted, fontWeight: isToday ? '800' : '600' },
                ]}
              >
                {isToday ? 'Today' : day.label}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Learning log                                                               */
/* -------------------------------------------------------------------------- */

const LEARNING_PREVIEW_COUNT = 3;

export function LearningLog({ items, accent }: { items: ProductivityStats['learnedTasks']; accent: string }) {
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';
  const [expanded, setExpanded] = useState(false);

  const notes = items.filter((item) => item.learnedNote && item.learnedNote.trim());
  const visible = expanded ? notes : notes.slice(0, LEARNING_PREVIEW_COUNT);

  return (
    <Card>
      <View style={styles.cardHeaderRow}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Learning Log</Text>
        <Text style={[styles.cardCaption, { color: colors.muted }]}>
          {notes.length} {notes.length === 1 ? 'note' : 'notes'}
        </Text>
      </View>

      {notes.length === 0 ? (
        <View style={styles.logEmpty}>
          <Ionicons name="bulb-outline" size={22} color={colors.muted} />
          <Text style={[styles.logEmptyText, { color: colors.muted }]}>
            Complete a task and add a “What did you learn?” note to build your log.
          </Text>
        </View>
      ) : (
        <View style={styles.logList}>
          {visible.map((item) => (
            <View
              key={item.id}
              style={[
                styles.logItem,
                { borderLeftColor: accent, backgroundColor: isLight ? '#F7FAF8' : colors.surfaceElevated },
              ]}
            >
              <View style={styles.logItemHeader}>
                <Text style={[styles.logItemTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.updatedAt ? (
                  <Text style={[styles.logItemDate, { color: colors.muted }]}>
                    {new Date(item.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.logItemNote, { color: colors.muted }]}>{item.learnedNote}</Text>
            </View>
          ))}

          {notes.length > LEARNING_PREVIEW_COUNT ? (
            <Pressable
              onPress={() => setExpanded((value) => !value)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.logToggle, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.logToggleText, { color: accent }]}>
                {expanded ? 'Show less' : `Show all ${notes.length}`}
              </Text>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={accent} />
            </Pressable>
          ) : null}
        </View>
      )}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Swipeable task row                                                         */
/* -------------------------------------------------------------------------- */

export function SwipeableTaskRow({
  children,
  isDone,
  onComplete,
  onReopen,
  onDelete,
}: {
  children: ReactNode;
  isDone: boolean;
  onComplete: () => void;
  onReopen: () => void;
  onDelete: () => void;
}) {
  const { colors, theme } = useTheme();
  const accent = theme === 'light' ? '#00875A' : colors.primary;

  if (Platform.OS === 'web') {
    return <>{children}</>;
  }

  return (
    <ReanimatedSwipeable
      friction={2}
      leftThreshold={60}
      rightThreshold={60}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={(_progress, _translation, methods) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isDone ? 'Reopen task' : 'Mark task done'}
          onPress={() => {
            methods.close();
            if (isDone) onReopen();
            else onComplete();
          }}
          style={[styles.swipeAction, styles.swipeActionLeft, { backgroundColor: isDone ? colors.muted : accent }]}
        >
          <Ionicons name={isDone ? 'refresh' : 'checkmark-circle'} size={22} color="#FFFFFF" />
          <RNText style={styles.swipeActionText}>{isDone ? 'Reopen' : 'Done'}</RNText>
        </Pressable>
      )}
      renderRightActions={(_progress, _translation, methods) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete task"
          onPress={() => {
            methods.close();
            onDelete();
          }}
          style={[styles.swipeAction, styles.swipeActionRight, { backgroundColor: colors.danger }]}
        >
          <Ionicons name="trash" size={20} color="#FFFFFF" />
          <RNText style={styles.swipeActionText}>Delete</RNText>
        </Pressable>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    flexShrink: 1,
  },
  cardCaption: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 0,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tile: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  tileValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  goalLabel: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  goalChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  goalTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  goalFill: {
    height: '100%',
    borderRadius: 5,
  },
  streakPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '800',
  },
  weekSummaryRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  weekSummaryItem: {
    flex: 1,
    gap: 2,
  },
  weekSummaryValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  weekSummaryLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  chartValue: {
    fontSize: 10,
    fontWeight: '700',
  },
  chartBarTrack: {
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  chartBar: {
    width: '70%',
    maxWidth: 28,
    borderRadius: 6,
  },
  chartLabel: {
    fontSize: 10,
  },
  logEmpty: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  logEmptyText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 280,
  },
  logList: {
    gap: 10,
  },
  logItem: {
    borderLeftWidth: 3,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  logItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  logItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  logItemDate: {
    fontSize: 11,
    fontWeight: '600',
  },
  logItemNote: {
    fontSize: 13,
    lineHeight: 18,
  },
  logToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  logToggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  swipeAction: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  swipeActionLeft: {
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    marginRight: -14,
    paddingRight: 14,
  },
  swipeActionRight: {
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    marginLeft: -14,
    paddingLeft: 14,
  },
  swipeActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
