import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Card } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';

interface BurnoutActionCardProps {
  stress: number;
  energy: number;
  onLaunchBreathing: () => void;
  onLaunchTasksDecompression: () => void;
  onScheduleBreak: () => void;
}

export function BurnoutActionCard({
  stress,
  energy,
  onLaunchBreathing,
  onLaunchTasksDecompression,
  onScheduleBreak,
}: BurnoutActionCardProps) {
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';

  const strain = stress - energy; // Strain spike if >= 2 or stress >= 7
  const isHighStrain = strain >= 2 || stress >= 7;

  const statusConfig = isHighStrain
    ? {
        level: 'Elevated Strain',
        badgeColor: '#EF4444',
        bgColor: isLight ? '#FEF2F2' : 'rgba(239, 68, 68, 0.12)',
        desc: 'Cognitive load is currently exceeding recovery capacity. Recommended action: 3-5 min parasympathetic reset.',
        icon: 'warning' as const,
      }
    : strain >= 0
    ? {
        level: 'Balanced Focus',
        badgeColor: '#F59E0B',
        bgColor: isLight ? '#FFFBEB' : 'rgba(245, 158, 11, 0.12)',
        desc: 'Cognitive strain and stamina are in healthy equilibrium. Keep your workflow paced.',
        icon: 'shield-checkmark' as const,
      }
    : {
        level: 'Optimal Recovery',
        badgeColor: '#10B981',
        bgColor: isLight ? '#ECFDF5' : 'rgba(16, 185, 129, 0.12)',
        desc: 'High energy reserves with low friction. Great window for demanding problem-solving or coding.',
        icon: 'sparkles' as const,
      };

  return (
    <Card>
      <View style={styles.headerRow}>
        <View style={styles.titleInfo}>
          <Text style={[styles.title, { color: colors.text }]}>Strain &amp; Burnout Guard</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Real-Time Stress/Energy Differential: {strain > 0 ? `+${strain}` : strain}
          </Text>
        </View>

        <View
          style={[
            styles.badge,
            { backgroundColor: statusConfig.bgColor, borderColor: statusConfig.badgeColor },
          ]}
        >
          <Ionicons name={statusConfig.icon} size={13} color={statusConfig.badgeColor} />
          <Text style={[styles.badgeText, { color: statusConfig.badgeColor }]}>
            {statusConfig.level}
          </Text>
        </View>
      </View>

      <Text style={[styles.descText, { color: colors.muted }]}>
        {statusConfig.desc}
      </Text>

      {/* Actionable Interventions Grid */}
      <View style={styles.actionsContainer}>
        <Text style={[styles.actionsHeading, { color: colors.text }]}>
          Recommended Decompression Tools
        </Text>

        <View style={styles.actionsRow}>
          {/* 1. Zen Breathing */}
          <Pressable
            onPress={onLaunchBreathing}
            style={({ pressed }) => [
              styles.actionCard,
              {
                backgroundColor: isLight ? '#F0FDF4' : 'rgba(34, 197, 94, 0.1)',
                borderColor: '#22C55E',
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#22C55E20' }]}>
              <Ionicons name="leaf" size={20} color="#22C55E" />
            </View>
            <Text style={[styles.actionTitle, { color: colors.text }]}>Zen Breathing</Text>
            <Text style={[styles.actionSubtitle, { color: colors.muted }]}>4-7-8 Vagus Reset</Text>
          </Pressable>

          {/* 2. Tasks Decompression Timer */}
          <Pressable
            onPress={onLaunchTasksDecompression}
            style={({ pressed }) => [
              styles.actionCard,
              {
                backgroundColor: isLight ? '#EFF6FF' : 'rgba(59, 130, 246, 0.1)',
                borderColor: '#3B82F6',
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#3B82F620' }]}>
              <Ionicons name="timer" size={20} color="#3B82F6" />
            </View>
            <Text style={[styles.actionTitle, { color: colors.text }]}>5m Decompression</Text>
            <Text style={[styles.actionSubtitle, { color: colors.muted }]}>Productivity Timer</Text>
          </Pressable>

          {/* 3. Screen-Free Break */}
          <Pressable
            onPress={onScheduleBreak}
            style={({ pressed }) => [
              styles.actionCard,
              {
                backgroundColor: isLight ? '#FFF7ED' : 'rgba(249, 115, 22, 0.1)',
                borderColor: '#F97316',
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#F9731620' }]}>
              <Ionicons name="walk" size={20} color="#F97316" />
            </View>
            <Text style={[styles.actionTitle, { color: colors.text }]}>Step Away</Text>
            <Text style={[styles.actionSubtitle, { color: colors.muted }]}>15m Screen-Free</Text>
          </Pressable>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleInfo: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  descText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
    marginBottom: 16,
  },
  actionsContainer: {
    gap: 10,
  },
  actionsHeading: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
});
