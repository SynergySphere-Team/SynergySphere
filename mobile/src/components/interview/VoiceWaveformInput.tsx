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

export function VoiceWaveformInput({
  onAppendTranscription,
  accentColor = '#059669',
}: VoiceWaveformInputProps) {
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';

  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);
  const [seconds, setSeconds] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Animated heights for 8 waveform meter bars
  const barHeights = useRef(
    new Array(8).fill(0).map(() => new Animated.Value(10))
  ).current;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveAnimRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechRecRef = useRef<any>(null);
  const audioContextRef = useRef<any>(null);
  const analyserRef = useRef<any>(null);
  const mediaStreamRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  function cleanupAudio() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (waveAnimRef.current) clearInterval(waveAnimRef.current);
    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {
        // ignore
      }
      speechRecRef.current = null;
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks?.().forEach((t: any) => t.stop());
      } catch {
        // ignore
      }
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close?.();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }

  async function toggleRecord() {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      cleanupAudio();

      // Reset bars to idle
      barHeights.forEach((b) => {
        Animated.spring(b, {
          toValue: 10,
          useNativeDriver: false,
        }).start();
      });

      setShowEditor(true);
      setStatusMessage('');
    } else {
      // Start recording
      setIsRecording(true);
      setSeconds(0);
      setTranscription('');
      setShowEditor(false);
      setStatusMessage('Listening to microphone...');

      // 1. Setup AudioContext and mic input for real-time waveform if available
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaStreamRef.current = stream;

          const AudioContextClass =
            (typeof window !== 'undefined' &&
              ((window as any).AudioContext || (window as any).webkitAudioContext)) ||
            null;

          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            audioContextRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 32;
            source.connect(analyser);
            analyserRef.current = analyser;
          }
        }
      } catch (err) {
        console.warn('Microphone stream access notice:', err);
      }

      // 2. Setup Speech Recognition
      const SpeechRecognition =
        typeof window !== 'undefined'
          ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
          : null;

      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = 'en-US';

          rec.onresult = (event: any) => {
            let fullText = '';
            for (let i = 0; i < event.results.length; i++) {
              fullText += event.results[i][0].transcript + ' ';
            }
            const clean = fullText.trim();
            if (clean) {
              setTranscription(clean);
            }
          };

          rec.onerror = (event: any) => {
            console.warn('SpeechRecognition error:', event);
            if (event.error === 'not-allowed') {
              setStatusMessage('Microphone access was denied. Please allow microphone permissions.');
            }
          };

          rec.onend = () => {
            if (isRecordingRef.current) {
              try {
                rec.start();
              } catch {}
            }
          };

          rec.start();
          speechRecRef.current = rec;
        } catch (err) {
          console.warn('Failed to start SpeechRecognition:', err);
        }
      } else {
        setStatusMessage('Listening (speak into mic)... Speech recognition operates in supported browsers.');
      }

      // 3. Seconds timer
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);

      // 4. Animate waveform bars according to real mic input if analyser is available, else audio pulse
      waveAnimRef.current = setInterval(() => {
        let volumes: number[] = [];
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          for (let i = 0; i < barHeights.length; i++) {
            const raw = dataArray[i % dataArray.length] || 0;
            // Map 0-255 to 8-40px height
            volumes.push(Math.max(8, Math.min(42, Math.round((raw / 255) * 36) + 8)));
          }
        } else {
          volumes = barHeights.map(() => Math.floor(Math.random() * 26) + 8);
        }

        barHeights.forEach((b, idx) => {
          Animated.timing(b, {
            toValue: volumes[idx] || 10,
            duration: 100,
            useNativeDriver: false,
          }).start();
        });
      }, 110);
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
              ? (statusMessage || 'Recording microphone input... Speak clearly.')
              : 'Tap to dictate your verbal answer aloud into the mic.'}
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
            RECORDED MIC TRANSCRIPTION:
          </Text>
          <TextInput
            value={transcription}
            onChangeText={setTranscription}
            multiline
            placeholder="Your spoken words will appear here. Edit or add text before inserting..."
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
