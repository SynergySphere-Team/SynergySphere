import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/context/ThemeContext';

interface InterviewTimerProps {
  secondsRemaining: number;
  totalAllocatedSeconds: number;
  isPaused: boolean;
  onTogglePause: () => void;
  onTimeExpired?: () => void;
}

export function InterviewTimer({
  secondsRemaining,
  totalAllocatedSeconds,
  isPaused,
  onTogglePause,
  onTimeExpired,
}: InterviewTimerProps) {
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';

  const expiredNotifiedRef = useRef(false);

  useEffect(() => {
    if (secondsRemaining <= 0 && !expiredNotifiedRef.current) {
      expiredNotifiedRef.current = true;
      if (onTimeExpired) onTimeExpired();
    } else if (secondsRemaining > 0) {
      expiredNotifiedRef.current = false;
    }
  }, [secondsRemaining, onTimeExpired]);

  const minutes = Math.floor(Math.max(0, secondsRemaining) / 60);
  const seconds = Math.max(0, secondsRemaining) % 60;
  const isCritical = secondsRemaining <= 60 && secondsRemaining > 0;
  const isWarning = secondsRemaining <= 180 && !isCritical && secondsRemaining > 0;

  const progressPercent = Math.min(
    100,
    Math.max(0, (secondsRemaining / (totalAllocatedSeconds || 1)) * 100)
  );

  let accentColor = '#059669'; // Emerald default
  if (isCritical) accentColor = '#dc2626'; // Crimson
  else if (isWarning) accentColor = '#d97706'; // Amber

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <View style={styles.labelCol}>
          <Text style={[styles.timerTitle, { color: colors.muted }]}>
            STAGE TIMER {isPaused ? '· PAUSED' : ''}
          </Text>
          <View style={styles.timeDisplayRow}>
            <Ionicons
              name={isCritical ? 'alert-circle' : isPaused ? 'pause-circle' : 'time-outline'}
              size={18}
              color={isPaused ? colors.muted : accentColor}
            />
            <Text
              style={[
                styles.digits,
                { color: isPaused ? colors.muted : isCritical ? '#dc2626' : colors.text },
              ]}
            >
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onTogglePause}
          style={({ pressed }) => [
            styles.pauseBtn,
            {
              backgroundColor: isPaused ? `${colors.primary}20` : isLight ? '#f1f5f9' : '#1e293b',
              borderColor: isPaused ? colors.primary : colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          accessibilityLabel={isPaused ? 'Resume countdown timer' : 'Pause countdown timer'}
        >
          <Ionicons
            name={isPaused ? 'play' : 'pause'}
            size={16}
            color={isPaused ? colors.primary : colors.text}
          />
          <Text
            style={[
              styles.pauseBtnText,
              { color: isPaused ? colors.primary : colors.text },
            ]}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </Text>
        </Pressable>
      </View>

      {/* Progress Track */}
      <View style={[styles.progressTrack, { backgroundColor: isLight ? '#e2e8f0' : '#334155' }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progressPercent}%`,
              backgroundColor: accentColor,
            },
          ]}
        />
      </View>

      {isCritical && !isPaused && (
        <View style={styles.warningRow}>
          <Ionicons name="warning" size={13} color="#dc2626" />
          <Text style={styles.warningText}>
            Under 1 minute remaining. Wrap up your solution!
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelCol: {
    gap: 2,
  },
  timerTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  timeDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  digits: {
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  pauseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  pauseBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  warningText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
  },
});
