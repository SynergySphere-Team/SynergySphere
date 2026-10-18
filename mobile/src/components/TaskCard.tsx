import {
  Pressable,
  StyleSheet,
  Text as RNText,
  View,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useTheme } from '@/context/ThemeContext';
import { Button, Field } from '@/components/ui';
import type { Task } from '@/types/api';

export interface TaskCardAction {
  label: string;
  onPress: () => void | Promise<void>;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
}

export interface TaskCardProps {
  task: Task;
  status?: Task['status'] | string;
  actions?: TaskCardAction[];
  onUpdateStatus?: (task: Task, newStatus: Task['status']) => void | Promise<void>;
  onAdvance?: (task: Task) => void | Promise<void>;
  onDelete?: (task: Task) => void | Promise<void>;
  learnedNote?: string;
  onChangeLearnedNote?: (value: string) => void;
  onSaveLearnedNote?: () => void | Promise<void>;
  isFocusTarget?: boolean;
  style?: StyleProp<ViewStyle>;
}

export type DueState = 'overdue' | 'today' | 'soon' | 'later';

export function getDueInfo(dueDate: string | null | undefined): { state: DueState; label: string } | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return null;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfDue = new Date(due);
  startOfDue.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((startOfDue.getTime() - startOfToday.getTime()) / 86_400_000);

  if (dayDiff < 0) {
    return { state: 'overdue', label: dayDiff === -1 ? 'Overdue · yesterday' : `Overdue · ${Math.abs(dayDiff)}d` };
  }
  if (dayDiff === 0) return { state: 'today', label: 'Due today' };
  if (dayDiff === 1) return { state: 'soon', label: 'Due tomorrow' };
  if (dayDiff < 7) {
    return { state: 'soon', label: `Due ${due.toLocaleDateString(undefined, { weekday: 'short' })}` };
  }
  return { state: 'later', label: `Due ${due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` };
}

function formatMinutes(total: number): string {
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function Text({ style, ...props }: TextProps) {
  const { largerText, fontSize } = useAccessibility();

  const flattenedStyle = StyleSheet.flatten(style);

  const baseFontSize =
    typeof flattenedStyle?.fontSize === 'number'
      ? flattenedStyle.fontSize
      : 14;

  const baseLineHeight =
    typeof flattenedStyle?.lineHeight === 'number'
      ? flattenedStyle.lineHeight
      : undefined;

  return (
    <RNText
      {...props}
      allowFontScaling
      style={[
        style,
        largerText && {
          fontSize: fontSize(baseFontSize),
          lineHeight:
            baseLineHeight !== undefined
              ? fontSize(baseLineHeight)
              : undefined,
        },
      ]}
    />
  );
}

export function TaskCard({
  task,
  status,
  actions,
  onUpdateStatus,
  onAdvance,
  onDelete,
  learnedNote,
  onChangeLearnedNote,
  onSaveLearnedNote,
  isFocusTarget,
  style,
}: TaskCardProps) {
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';
  const brandGreen = isLight ? '#00875A' : colors.primary;

  const currentStatus = status || task.status;
  const isDone = currentStatus === 'DONE';
  const isInProgress = currentStatus === 'IN_PROGRESS';
  const isTodo = currentStatus === 'TODO';

  const effectiveActions: TaskCardAction[] = actions ?? (() => {
    if (!onUpdateStatus) return [];

    if (isTodo) {
      return [
        {
          label: 'Start',
          onPress: () => onUpdateStatus(task, 'IN_PROGRESS'),
          secondary: true,
        },
        {
          label: 'Done',
          onPress: () => onUpdateStatus(task, 'DONE'),
          secondary: true,
        },
      ];
    }

    if (isInProgress) {
      const acts: TaskCardAction[] = [
        {
          label: 'Done',
          onPress: () => onUpdateStatus(task, 'DONE'),
          secondary: true,
        },
      ];
      if (onAdvance) {
        acts.push({
          label: 'Advance',
          onPress: () => onAdvance(task),
          secondary: true,
        });
      }
      return acts;
    }

    if (isDone) {
      const acts: TaskCardAction[] = [
        {
          label: 'Reopen',
          onPress: () => onUpdateStatus(task, 'TODO'),
          secondary: true,
        },
      ];
      if (onDelete) {
        acts.push({
          label: 'Delete',
          onPress: () => onDelete(task),
          danger: true,
          secondary: true,
        });
      }
      return acts;
    }

    return [
      {
        label: 'Done',
        onPress: () => onUpdateStatus(task, 'DONE'),
        secondary: true,
      },
    ];
  })();

  const statusLabel = currentStatus === 'REVIEW' ? 'IN REVIEW' : currentStatus.replace('_', ' ');
  const dueInfo = isDone ? null : getDueInfo(task.dueDate);
  const dueColor =
    dueInfo?.state === 'overdue'
      ? colors.danger
      : dueInfo?.state === 'today'
      ? '#D97706'
      : colors.muted;
  const timeSpent = task.timeSpentMinutes ?? 0;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isLight ? '#F9FBFA' : colors.surfaceElevated,
          borderColor: isFocusTarget ? brandGreen : colors.border,
          borderWidth: isFocusTarget ? 1.5 : 1,
        },
        style,
      ]}
    >
      {/* Status label (top-left), badges & delete icon (top-right) */}
      <View style={styles.statusRow}>
        <Text
          style={[
            styles.taskStatus,
            {
              color: isDone ? colors.completedTitle : brandGreen,
            },
          ]}
        >
          {statusLabel}
        </Text>
        <View style={styles.badgeRow}>
          {isFocusTarget ? (
            <View style={[styles.badge, { backgroundColor: isLight ? '#E8F5E9' : 'rgba(145,219,94,0.15)' }]}>
              <Ionicons name="flame" size={11} color={brandGreen} />
              <Text style={[styles.badgeText, { color: brandGreen }]}>Focusing</Text>
            </View>
          ) : null}
          {dueInfo ? (
            <View
              style={[
                styles.badge,
                {
                  borderWidth: 1,
                  borderColor: dueInfo.state === 'later' || dueInfo.state === 'soon' ? colors.border : dueColor,
                },
              ]}
            >
              <Ionicons
                name={dueInfo.state === 'overdue' ? 'alert-circle' : 'calendar-outline'}
                size={11}
                color={dueColor}
              />
              <Text style={[styles.badgeText, { color: dueColor }]}>{dueInfo.label}</Text>
            </View>
          ) : null}
        {isDone && onDelete ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete completed task"
            onPress={() => onDelete(task)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.deleteIconBtn,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
          </Pressable>
        ) : null}
        </View>
      </View>

      {/* Text Container: Full card width */}
      <View style={styles.textContainer}>
        {/* Task Title */}
        <Text
          style={[
            styles.taskTitle,
            { color: isDone ? colors.completedTitle : colors.text },
            isDone && styles.doneTitle,
          ]}
        >
          {task.title}
        </Text>

        {/* Task Description */}
        {task.description ? (
          <Text
            style={[
              styles.taskDescription,
              { color: isDone ? colors.completedDesc : colors.muted },
            ]}
          >
            {task.description}
          </Text>
        ) : null}

        {timeSpent > 0 ? (
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color={colors.muted} />
            <Text style={[styles.metaText, { color: colors.muted }]}>
              {formatMinutes(timeSpent)} focused
            </Text>
          </View>
        ) : null}

        {/* Learned Note Section (for completed tasks) */}
        {isDone && (onChangeLearnedNote || task.learnedNote) ? (
          <View style={styles.learnedSection}>
            <Field
              label="What did you learn?"
              value={learnedNote ?? task.learnedNote ?? ''}
              onChangeText={onChangeLearnedNote}
              multiline
              placeholder="Capture key takeaways..."
            />
            {onSaveLearnedNote ? (
              <Button
                title="Save learning note"
                onPress={onSaveLearnedNote}
                secondary
                style={styles.saveNoteBtn}
              />
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Flexible Spacer: pushes actions toward the bottom */}
      <View style={styles.spacer} />

      {/* Action buttons: Horizontal container at the bottom */}
      {effectiveActions.length > 0 ? (
        <View style={styles.actionsRow}>
          {effectiveActions.map((action, idx) => (
            <Button
              key={`${action.label}-${idx}`}
              title={action.label}
              onPress={action.onPress}
              secondary={action.secondary ?? true}
              danger={action.danger}
              disabled={action.disabled}
              style={styles.actionBtn}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minHeight: 148,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'column',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    width: '100%',
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteIconBtn: {
    padding: 2,
    borderRadius: 6,
  },
  taskStatus: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  textContainer: {
    flex: 1,
    width: '100%',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    width: '100%',
  },
  doneTitle: {
    textDecorationLine: 'line-through',
  },
  taskDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    width: '100%',
  },
  learnedSection: {
    marginTop: 10,
    gap: 8,
    width: '100%',
  },
  saveNoteBtn: {
    minHeight: 40,
  },
  spacer: {
    minHeight: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
});
