import {
  StyleSheet,
  Text as RNText,
  View,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from 'react-native';
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
  learnedNote?: string;
  onChangeLearnedNote?: (value: string) => void;
  onSaveLearnedNote?: () => void | Promise<void>;
  style?: StyleProp<ViewStyle>;
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
  learnedNote,
  onChangeLearnedNote,
  onSaveLearnedNote,
  style,
}: TaskCardProps) {
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';
  const brandGreen = isLight ? '#00875A' : colors.primary;

  const currentStatus = status || task.status;
  const isDone = currentStatus === 'DONE';
  const isInProgress = currentStatus === 'IN_PROGRESS';
  const isTodo = currentStatus === 'TODO';

  // Compute actions if not explicitly provided via props
  const effectiveActions: TaskCardAction[] = actions ?? (() => {
    if (!onUpdateStatus) return [];

    if (isTodo) {
      return [
        {
          label: '▶ Start',
          onPress: () => onUpdateStatus(task, 'IN_PROGRESS'),
          secondary: true,
        },
        {
          label: '✓ Done',
          onPress: () => onUpdateStatus(task, 'DONE'),
          secondary: true,
        },
      ];
    }

    if (isInProgress) {
      const acts: TaskCardAction[] = [
        {
          label: '✓ Done',
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
      return [
        {
          label: 'Reopen',
          onPress: () => onUpdateStatus(task, 'TODO'),
          secondary: true,
        },
      ];
    }

    // Fallback for REVIEW or any future task status
    return [
      {
        label: '✓ Done',
        onPress: () => onUpdateStatus(task, 'DONE'),
        secondary: true,
      },
    ];
  })();

  const statusLabel = currentStatus.replace('_', ' ');

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isLight ? '#F9FBFA' : colors.surfaceElevated,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {/* Status label (top-left, full width) */}
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
    marginBottom: 6,
    width: '100%',
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
