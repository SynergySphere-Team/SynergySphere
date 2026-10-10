import { useEffect, useState, useRef } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
  Animated,
  Easing,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/context/ThemeContext';

interface ZenBreathingModalProps {
  visible: boolean;
  onClose: () => void;
  targetCycles?: number;
}

type BreathPhase = 'Inhale' | 'Hold' | 'Exhale';

const PHASE_CONFIG: Record<BreathPhase, { seconds: number; label: string; instruction: string; color: string; scale: number }> = {
  Inhale: {
    seconds: 4,
    label: 'Inhale',
    instruction: 'Breathe in quietly through your nose...',
    color: '#34D399', // Emerald
    scale: 1.35,
  },
  Hold: {
    seconds: 7,
    label: 'Hold',
    instruction: 'Hold your breath gently and relax your shoulders...',
    color: '#818CF8', // Indigo
    scale: 1.35,
  },
  Exhale: {
    seconds: 8,
    label: 'Exhale',
    instruction: 'Release completely through your mouth with a soft whoosh...',
    color: '#38BDF8', // Sky
    scale: 1.0,
  },
};

export function ZenBreathingModal({
  visible,
  onClose,
  targetCycles = 4,
}: ZenBreathingModalProps) {
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';

  const [phase, setPhase] = useState<BreathPhase>('Inhale');
  const [secondsLeft, setSecondsLeft] = useState(PHASE_CONFIG.Inhale.seconds);
  const [currentCycle, setCurrentCycle] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  // Animation values for the biophilic pulse
  const scaleAnim = useRef(new Animated.Value(1.0)).current;
  const pulseRing = useRef(new Animated.Value(1.0)).current;

  // Reset state on open
  useEffect(() => {
    if (visible) {
      setPhase('Inhale');
      setSecondsLeft(PHASE_CONFIG.Inhale.seconds);
      setCurrentCycle(1);
      setIsCompleted(false);
      scaleAnim.setValue(1.0);
    }
  }, [visible, scaleAnim]);

  // Phase transition animator
  useEffect(() => {
    if (!visible || isCompleted) return;

    const config = PHASE_CONFIG[phase];

    if (phase === 'Inhale') {
      Animated.timing(scaleAnim, {
        toValue: config.scale,
        duration: config.seconds * 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else if (phase === 'Exhale') {
      Animated.timing(scaleAnim, {
        toValue: config.scale,
        duration: config.seconds * 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [phase, visible, isCompleted, scaleAnim]);

  // Secondary continuous ripple effect
  useEffect(() => {
    if (!visible || isCompleted) return;
    const ripple = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseRing, {
          toValue: 1.12,
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseRing, {
          toValue: 1.0,
          duration: 1500,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    ripple.start();
    return () => ripple.stop();
  }, [visible, isCompleted, pulseRing]);

  // Main timer tick
  useEffect(() => {
    if (!visible || isCompleted) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) {
          return prev - 1;
        }

        // Phase advance
        if (phase === 'Inhale') {
          setPhase('Hold');
          if (hapticsEnabled) {
            try { Vibration.vibrate([0, 30, 60, 30]); } catch {}
          }
          return PHASE_CONFIG.Hold.seconds;
        } else if (phase === 'Hold') {
          setPhase('Exhale');
          if (hapticsEnabled) {
            try { Vibration.vibrate(60); } catch {}
          }
          return PHASE_CONFIG.Exhale.seconds;
        } else {
          // Exhale finished
          if (currentCycle >= targetCycles) {
            setIsCompleted(true);
            if (hapticsEnabled) {
              try { Vibration.vibrate([0, 60, 100, 80]); } catch {}
            }
            return 0;
          }
          setCurrentCycle((c) => c + 1);
          setPhase('Inhale');
          if (hapticsEnabled) {
            try { Vibration.vibrate(40); } catch {}
          }
          return PHASE_CONFIG.Inhale.seconds;
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, phase, currentCycle, targetCycles, isCompleted, hapticsEnabled]);

  const currentConfig = PHASE_CONFIG[phase];
  const progressRatio = isCompleted ? 1 : (currentCycle - 1 + (1 - secondsLeft / currentConfig.seconds)) / targetCycles;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: isLight ? 'rgba(240, 248, 244, 0.96)' : 'rgba(10, 22, 28, 0.97)',
          },
        ]}
      >
        {/* Top Header Controls */}
        <View style={styles.topBar}>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              4-7-8 Breathing Decompression
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
              {isCompleted
                ? 'Session Complete'
                : `Cycle ${currentCycle} of ${targetCycles} · ${Math.round(progressRatio * 100)}%`}
            </Text>
          </View>

          <View style={styles.topButtons}>
            <Pressable
              onPress={() => setHapticsEnabled(!hapticsEnabled)}
              hitSlop={8}
              accessibilityLabel={hapticsEnabled ? 'Mute vibrations' : 'Enable vibrations'}
              style={[
                styles.iconBtn,
                { backgroundColor: isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)' },
              ]}
            >
              <Ionicons
                name={hapticsEnabled ? 'phone-portrait-outline' : 'phone-portrait'}
                size={18}
                color={hapticsEnabled ? currentConfig.color : colors.muted}
              />
            </Pressable>

            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityLabel="Exit Breathing"
              style={[
                styles.iconBtn,
                { backgroundColor: isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)' },
              ]}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>

        {/* Central Biophilic Breathing Circle */}
        <View style={styles.centerContainer}>
          {isCompleted ? (
            <View style={styles.completedContainer}>
              <View style={[styles.completedIconCircle, { backgroundColor: '#34D39925' }]}>
                <Ionicons name="leaf" size={48} color="#34D399" />
              </View>
              <Text style={[styles.completedTitle, { color: colors.text }]}>
                Nervous System Reset
              </Text>
              <Text style={[styles.completedDesc, { color: colors.muted }]}>
                Your heart rate has stabilized and cortisol response lowered. Great job taking time for yourself.
              </Text>
              <Pressable
                onPress={onClose}
                style={[styles.doneBtn, { backgroundColor: '#34D399' }]}
              >
                <Text style={styles.doneBtnText}>Return Grounded</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Outer Ripple Ring */}
              <Animated.View
                style={[
                  styles.rippleRing,
                  {
                    borderColor: `${currentConfig.color}35`,
                    transform: [{ scale: pulseRing }],
                  },
                ]}
              />

              {/* Main Expanding Breathing Orb */}
              <Animated.View
                style={[
                  styles.breathingOrb,
                  {
                    backgroundColor: `${currentConfig.color}15`,
                    borderColor: currentConfig.color,
                    transform: [{ scale: scaleAnim }],
                  },
                ]}
              >
                <Text style={[styles.phaseLabel, { color: currentConfig.color }]}>
                  {currentConfig.label}
                </Text>
                <Text style={[styles.secondsCountdown, { color: colors.text }]}>
                  {secondsLeft}s
                </Text>
              </Animated.View>

              {/* Phase Guidance Instruction */}
              <View style={styles.instructionBox}>
                <Text style={[styles.instructionText, { color: colors.text }]}>
                  {currentConfig.instruction}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Bottom Progress Bar */}
        {!isCompleted && (
          <View style={styles.bottomBar}>
            <View style={[styles.progressBarTrack, { backgroundColor: isLight ? '#CBD5E1' : '#1E293B' }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(100, Math.max(5, progressRatio * 100))}%`,
                    backgroundColor: currentConfig.color,
                  },
                ]}
              />
            </View>
            <Text style={[styles.breathProtocolNote, { color: colors.muted }]}>
              Dr. Weil 4-7-8 Parasympathetic Vagus Nerve Protocol
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 54,
    paddingBottom: 36,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  topButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 20,
  },
  rippleRing: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 2,
  },
  breathingOrb: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  phaseLabel: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  secondsCountdown: {
    fontSize: 42,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  instructionBox: {
    marginTop: 48,
    paddingHorizontal: 20,
    maxWidth: 320,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
  },
  bottomBar: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  breathProtocolNote: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  completedContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    maxWidth: 320,
  },
  completedIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  completedTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  completedDesc: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 28,
  },
  doneBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
