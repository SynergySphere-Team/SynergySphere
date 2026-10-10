import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { api } from '@/services/api';

export interface ActiveRecordingSession {
  recording: Audio.Recording;
  stopAndTranscribe: (contextHint?: string) => Promise<string>;
  cancel: () => Promise<void>;
}

export async function requestMicrophonePermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return true;
  }
  try {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('Microphone permission request failed:', err);
    return false;
  }
}

export async function startNativeAudioRecording(
  onStatusUpdate?: (status: Audio.RecordingStatus) => void,
): Promise<ActiveRecordingSession> {
  const granted = await requestMicrophonePermission();
  if (!granted) {
    throw new Error('Microphone permission not granted.');
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
  });

  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync({
    ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });

  if (onStatusUpdate) {
    recording.setOnRecordingStatusUpdate(onStatusUpdate);
  }

  await recording.startAsync();

  return {
    recording,
    stopAndTranscribe: async (contextHint?: string): Promise<string> => {
      try {
        const status = await recording.getStatusAsync();
        if (status.isRecording) {
          await recording.stopAndUnloadAsync();
        }
      } catch (err) {
        console.warn('Stop recording warning:', err);
      }

      const uri = recording.getURI();
      if (!uri) {
        throw new Error('Recording audio file URI is unavailable.');
      }

      // Read audio file as base64 string
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (!base64Audio) {
        throw new Error('Recorded audio file is empty.');
      }

      // Determine appropriate mime type
      const mimeType = Platform.OS === 'android' ? 'audio/mp4' : 'audio/m4a';

      // Call backend AI transcription endpoint
      const response = await api.post<{ transcript: string }>('/ai/transcribe', {
        audio: base64Audio,
        mimeType,
        contextHint,
      });

      return response.transcript || '';
    },
    cancel: async (): Promise<void> => {
      try {
        const status = await recording.getStatusAsync();
        if (status.isRecording || status.canRecord) {
          await recording.stopAndUnloadAsync();
        }
      } catch {
        // ignore cancellation cleanup error
      }
    },
  };
}
