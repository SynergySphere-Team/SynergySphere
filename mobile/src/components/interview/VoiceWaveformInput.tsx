import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Animated,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/context/ThemeContext';

export interface VoiceWaveformInputProps {
  onAppendTranscription: (text: string) => void;
  onLiveTranscription?: (text: string) => void;
  onRecordingStart?: () => void;
  onRecordingEnd?: () => void;
  accentColor?: string;
}

export function VoiceWaveformInput({
  onAppendTranscription,
  onLiveTranscription,
  onRecordingStart,
  onRecordingEnd,
  accentColor = '#059669',
}: VoiceWaveformInputProps) {
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';

  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const [seconds, setSeconds] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Refs for persistent transcription across speech recognition pause/restart cycles
  const committedSpeechRef = useRef<string>('');
  const lastSessionFinalRef = useRef<string>('');
  const speechRecRef = useRef<any>(null);
  const restartTimerRef = useRef<any>(null);
  const onLiveTranscriptionRef = useRef(onLiveTranscription);
  const onAppendTranscriptionRef = useRef(onAppendTranscription);

  useEffect(() => {
    onLiveTranscriptionRef.current = onLiveTranscription;
    onAppendTranscriptionRef.current = onAppendTranscription;
  }, [onLiveTranscription, onAppendTranscription]);

  // Animated heights for 8 waveform meter bars
  const barHeights = useRef(
    new Array(8).fill(0).map(() => new Animated.Value(10))
  ).current;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveAnimRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<any>(null);
  const analyserRef = useRef<any>(null);
  const mediaStreamRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      cleanupAudio();
    };
  }, []);

  function cleanupAudio() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (waveAnimRef.current) clearInterval(waveAnimRef.current);
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);

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

  // Create a brand new SpeechRecognition instance every time so Chrome/WebKit never errors on restart
  function startRecognitionInstance(): any {
    if (!isRecordingRef.current) return null;

    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      setStatusMessage('Voice recognition is active. Note: Live dictation operates in supported browsers (Chrome, Edge, Safari).');
      return null;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.maxAlternatives = 1;

      rec.onresult = (event: any) => {
        let sessionFinal = '';
        let sessionInterim = '';

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0]?.transcript || '';
          if (res.isFinal) {
            sessionFinal += text + ' ';
          } else {
            sessionInterim += text;
          }
        }

        lastSessionFinalRef.current = sessionFinal;
        const currentSpoken = (committedSpeechRef.current + sessionFinal + sessionInterim).trim();

        if (currentSpoken) {
          setTranscription(currentSpoken);
          setStatusMessage(`Dictating: "${currentSpoken.slice(-35)}"`);

          // Stream live words directly into the parent text box in real-time
          if (onLiveTranscriptionRef.current) {
            onLiveTranscriptionRef.current(currentSpoken);
          }
        }
      };

      rec.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event?.error);
        if (event?.error === 'not-allowed') {
          setStatusMessage('Microphone access was denied. Please allow microphone permissions.');
          isRecordingRef.current = false;
          setIsRecording(false);
          cleanupAudio();
        } else if (event?.error === 'audio-capture') {
          setStatusMessage('No microphone detected or audio capture is blocked.');
          isRecordingRef.current = false;
          setIsRecording(false);
          cleanupAudio();
        }
        // 'no-speech' is harmless and will trigger onend auto-restart
      };

      rec.onend = () => {
        if (isRecordingRef.current) {
          // Commit accumulated words from this session before restarting
          if (lastSessionFinalRef.current) {
            committedSpeechRef.current += lastSessionFinalRef.current.trim() + ' ';
            lastSessionFinalRef.current = '';
          }

          // Restart a FRESH instance so the browser does not reject rec.start() on ended instance
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (isRecordingRef.current) {
              speechRecRef.current = startRecognitionInstance();
            }
          }, 120);
        }
      };

      rec.start();
      return rec;
    } catch (err) {
      console.warn('Failed to start SpeechRecognition instance:', err);
      return null;
    }
  }

  function toggleRecord() {
    if (isRecordingRef.current) {
      // ── STOP RECORDING ──
      isRecordingRef.current = false;
      setIsRecording(false);

      // Flush final recognized transcript to parent answer box
      const finalSpoken = (committedSpeechRef.current + lastSessionFinalRef.current).trim();
      if (finalSpoken) {
        if (onLiveTranscriptionRef.current) {
          onLiveTranscriptionRef.current(finalSpoken);
        } else if (onAppendTranscriptionRef.current) {
          onAppendTranscriptionRef.current(finalSpoken);
        }
      }

      cleanupAudio();
      onRecordingEnd?.();

      // Reset bars to idle
      barHeights.forEach((b) => {
        Animated.spring(b, {
          toValue: 10,
          useNativeDriver: false,
        }).start();
      });

      setShowEditor(Boolean(finalSpoken));
      setStatusMessage(finalSpoken ? 'Voice input captured and saved.' : '');
    } else {
      // ── START RECORDING ──
      const SpeechRecognition =
        typeof window !== 'undefined'
          ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
          : null;

      if (!SpeechRecognition) {
        if (Platform.OS === 'web') {
          Alert.alert(
            'Speech Recognition',
            'Web Speech API is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Microphone Dictation Active',
            'Tap the answer box above and use the Microphone icon (🎙️) on your keyboard (bottom-right next to spacebar on iOS / top-right on Android) to dictate directly into the box with native voice recognition!',
            [{ text: 'Got it' }]
          );
        }
        return;
      }

      isRecordingRef.current = true;
      setIsRecording(true);
      setSeconds(0);
      setTranscription('');
      setShowEditor(false);
      setStatusMessage('Listening to microphone... Speak clearly.');

      committedSpeechRef.current = '';
      lastSessionFinalRef.current = '';

      onRecordingStart?.();

      // 1. Start SpeechRecognition SYNCHRONOUSLY to preserve the browser user-gesture token
      speechRecRef.current = startRecognitionInstance();

      // 2. Seconds timer
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);

      // 4. Animate waveform bars according to real mic input if analyser is available, else active pulse
      waveAnimRef.current = setInterval(() => {
        let volumes: number[] = [];
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          for (let i = 0; i < barHeights.length; i++) {
            const raw = dataArray[i % dataArray.length] || 0;
            // Map 0-255 to 8-42px height
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
      setShowEditor(false);
      setStatusMessage('Inserted into answer.');
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
              {isRecording ? `Dictating Live (${seconds}s)...` : 'Voice Input & Audio Waveform'}
            </Text>
          </View>
          <Text style={[styles.subText, { color: colors.muted }]}>
            {isRecording
              ? (statusMessage || 'Recording microphone input... Streaming words to answer box.')
              : 'Tap to dictate your answer aloud — words stream directly into your answer.'}
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

      {/* Real-time Spoken Text Preview or Editor */}
      {isRecording && transcription ? (
        <View style={[styles.liveTranscriptPill, { backgroundColor: isLight ? '#eefbf3' : 'rgba(16, 185, 129, 0.12)', borderColor: accentColor }]}>
          <Ionicons name="mic" size={13} color={accentColor} />
          <Text style={[styles.liveTranscriptText, { color: colors.text }]} numberOfLines={2}>
            {transcription}
          </Text>
        </View>
      ) : null}

      {/* Transcription Editor after stopping */}
      {showEditor && !isRecording && (
        <View style={styles.transcriptionBox}>
          <Text style={[styles.transcriptionLabel, { color: colors.muted }]}>
            RECORDED MIC TRANSCRIPTION:
          </Text>
          <TextInput
            value={transcription}
            onChangeText={setTranscription}
            multiline
            placeholder="Your spoken words appear here. Edit or add text before inserting..."
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
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>Dismiss</Text>
            </Pressable>

            <Pressable
              onPress={handleInsert}
              style={[styles.actionBtn, { backgroundColor: accentColor, borderColor: accentColor }]}
            >
              <Ionicons name="checkmark" size={14} color="#ffffff" />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#ffffff' }}>
                Re-Insert into Answer
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
  liveTranscriptPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  liveTranscriptText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
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
