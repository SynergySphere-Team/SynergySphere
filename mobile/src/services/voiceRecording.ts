import { Platform } from 'react-native';
import { api } from '@/services/api';

export interface ActiveRecordingSession {
  recording: any;
  stopAndTranscribe: (contextHint?: string) => Promise<string>;
  cancel: () => Promise<void>;
}

/**
 * Returns false in standard Expo Go because custom native audio recorder modules
 * (such as ExponentAV) are omitted from standard Expo Go builds in modern SDKs.
 */
export function isNativeAudioAvailable(): boolean {
  return false;
}

export async function requestMicrophonePermission(): Promise<boolean> {
  return true;
}

export async function transcribeAudioBase64(
  base64Audio: string,
  mimeType: string = 'audio/m4a',
  contextHint?: string,
): Promise<string> {
  const response = await api.post<{ transcript: string }>('/ai/transcribe', {
    audio: base64Audio,
    mimeType,
    contextHint,
  });
  return response.transcript || '';
}
