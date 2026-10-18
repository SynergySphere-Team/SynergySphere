import { Platform, Vibration } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

/**
 * Native Haptic Feedback Helpers
 * Leverages Vibration API with cross-platform duration and pattern configurations.
 */
export function triggerLightHaptic(): void {
  try {
    if (Platform.OS === 'ios') {
      Vibration.vibrate(10);
    } else if (Platform.OS === 'android') {
      Vibration.vibrate(15);
    } else if (typeof window !== 'undefined' && window.navigator && 'vibrate' in window.navigator) {
      window.navigator.vibrate(15);
    }
  } catch {
  }
}

export function triggerMediumHaptic(): void {
  try {
    if (Platform.OS === 'ios') {
      Vibration.vibrate(25);
    } else if (Platform.OS === 'android') {
      Vibration.vibrate(35);
    } else if (typeof window !== 'undefined' && window.navigator && 'vibrate' in window.navigator) {
      window.navigator.vibrate(30);
    }
  } catch {
  }
}

export function triggerSuccessHaptic(): void {
  try {
    if (Platform.OS === 'android') {
      Vibration.vibrate(30);
    } else {
      Vibration.vibrate(30);
    }
  } catch {
  }
}

export function triggerErrorHaptic(): void {
  try {
    if (Platform.OS === 'android') {
      Vibration.vibrate(50);
    } else {
      Vibration.vibrate(50);
    }
  } catch {
  }
}

/**
 * Screen Keep-Awake Helpers
 * Prevents screen locking during live interview coding and timer runs.
 */
let isKeepAwakeActive = false;

export async function enableKeepAwake(tag: string = 'realistic-interview'): Promise<void> {
  try {
    if (!isKeepAwakeActive) {
      await activateKeepAwakeAsync(tag);
      isKeepAwakeActive = true;
    }
  } catch {
  }
}

export async function disableKeepAwake(tag: string = 'realistic-interview'): Promise<void> {
  try {
    if (isKeepAwakeActive) {
      await deactivateKeepAwake(tag);
      isKeepAwakeActive = false;
    }
  } catch {
  }
}
