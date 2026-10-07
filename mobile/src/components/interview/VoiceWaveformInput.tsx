import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Animated,
  TextInput,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/context/ThemeContext';

interface VoiceWaveformInputProps {
  onAppendTranscription: (text: string) => void;
  accentColor?: string;
}

const SAMPLE_SPEECH_SNIPPETS = [
  'In production environments, I emphasize defensive programming, modular interfaces, and deterministic error handling with OpenTelemetry tracing.',
  'To maintain high throughput, I utilize in-memory token bucket counters within Redis to isolate noisy neighbors and enforce tiered rate limits.',
  'When faced with high write contention, we partitioned the database horizontally and introduced idempotent messaging queues to decouple processing.',
  'I chose a prefix sum hash map approach because it provides strict O(N) time complexity in a single linear pass over the data array.',
];

export function VoiceWaveformInput({
  onAppendTranscription,
  accentColor = '#059669',
}: VoiceWaveformInputProps) {
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';

  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [showEditor, setShowEditor] = useState(false);

  // Animated heights for 8 waveform meter bars
  const barHeights = useRef(
    new Array(8).fill(0).map(() => new Animated.Value(12))
  ).current;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveAnimRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (waveAnimRef.current) clearInterval(waveAnimRef.current);
    };
  }, []);

  function toggleRecord() {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (waveAnimRef.current) clearInterval(waveAnimRef.current);

      // Reset bars to idle
      barHeights.forEach((b) => {
        Animated.spring(b, {
          toValue: 10,
          useNativeDriver: false,
        }).start();
      });

      // Generate realistic simulated transcription snippet
      const randomSnippet =
        SAMPLE_SPEECH_SNIPPETS[Math.floor(Math.random() * SAMPLE_SPEECH_SNIPPETS.length)];
      setTranscription(randomSnippet);
      setShowEditor(true);
    } else {
      // Start recording
      setIsRecording(true);
      setSeconds(0);
      setTranscription('');
      setShowEditor(false);

      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);

      // Animate waveform bars periodically
      waveAnimRef.current = setInterval(() => {
        barHeights.forEach((b) => {
          const targetHeight = Math.floor(Math.random() * 32) + 8;
          Animated.timing(b, {
            toValue: targetHeight,
            duration: 140,
            useNativeDriver: false,
          }).start();
        });
      }, 150);
    }
  }

  function handleInsert() {
    if (transcription.trim()) {
      onAppendTranscription(transcription.trim());
      setTranscription('');
      setShowEditor(false);
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <View style={styles.micStatusCol}>
          <View style={styles.titleRow}>
            <View
              style={[
                styles.liveIndicator,
                { backgroundColor: isRecording ? '#dc2626' : colors.muted },
              ]}
            />
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {isRecording ? `Recording (${seconds}s)...` : 'Voice Input & Audio Waveform'}
            </Text>
          </View>
          <Text style={[styles.subText, { color: colors.muted }]}>
            {isRecording
              ? 'Speaking response... Speak naturally to test verbal delivery.'
              : 'Tap to dictate your response aloud as in a real interview.'}
          </Text>
        </View>

        <Pressable
          onPress={toggleRecord}
          style={({ pressed }) => [
            styles.recordBtn,
            {
              backgroundColor: isRecording ? '#dc2626' : accentColor,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          accessibilityLabel={isRecording ? 'Stop voice recording' : 'Start voice recording'}
        >
          <Ionicons
            name={isRecording ? 'stop' : 'mic'}
            size={18}
            color="#ffffff"
          />
        </Pressable>
      </View>

      {/* Animated Waveform Bars */}
      <View style={[styles.waveformContainer, { backgroundColor: isLight ? '#f8fafc' : '#0f172a' }]}>
        {barHeights.map((h, i) => (
          <Animated.View
            key={i}
            style={[
              styles.waveBar,
              {
                height: h,
                backgroundColor: isRecording ? accentColor : isLight ? '#cbd5e1' : '#334155',
              },
            ]}
          />
        ))}
      </View>

      {/* Transcription Editor */}
      {showEditor && (
        <View style={styles.transcriptionBox}>
          <Text style={[styles.transcriptionLabel, { color: colors.muted }]}>
            TRANSCRIPTION (EDITABLE):
          </Text>
          <TextInput
            value={transcription}
            onChangeText={setTranscription}
            multiline
            placeholder="Edit your speech-to-text response..."
            placeholderTextColor={colors.muted}
            style={[
              styles.transcriptInput,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => setShowEditor(false)}
              style={[styles.actionBtn, { borderColor: colors.border }]}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>Discard</Text>
            </Pressable>

            <Pressable
              onPress={handleInsert}
              style={[styles.actionBtn, { backgroundColor: accentColor, borderColor: accentColor }]}
            >
              <Ionicons name="checkmark" size={14} color="#ffffff" />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#ffffff' }}>
                Insert into Answer
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  micStatusCol: {
    flex: 1,
    gap: 2,
    paddingRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  subText: {
    fontSize: 11,
    lineHeight: 15,
  },
  recordBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformContainer: {
    height: 44,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  waveBar: {
    width: 5,
    borderRadius: 3,
  },
  transcriptionBox: {
    gap: 6,
    marginTop: 4,
  },
  transcriptionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  transcriptInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    minHeight: 64,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
});
