import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from './api';

// Configure notification presentation in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let channelConfigured = false;

export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android' || channelConfigured) return;
  try {
    await Notifications.setNotificationChannelAsync('focus-timer', {
      name: 'Focus Timer',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#00875A',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('community', {
      name: 'Community Activity',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    channelConfigured = true;
  } catch (err) {
    console.warn('Failed to setup notification channel:', err);
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const settings = await Notifications.getPermissionsAsync();
    let granted =
      settings.granted ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

    if (!granted) {
      const requested = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      granted =
        requested.granted ||
        requested.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
        requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    }
    return granted;
  } catch (err) {
    console.warn('Notification permission error:', err);
    return false;
  }
}

export async function scheduleFocusCompletionNotification(
  seconds: number,
  durationMinutes: number,
): Promise<string | null> {
  if (Platform.OS === 'web' || seconds <= 0) return null;
  try {
    await setupNotificationChannels();
    const hasPerm = await requestNotificationPermissions();
    if (!hasPerm) return null;

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎯 Focus Session Complete!',
        body: `Great job! You completed your ${durationMinutes}-minute focus session. Take a break!`,
        sound: 'default',
        data: { type: 'focus-complete', durationMinutes },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
        channelId: 'focus-timer',
      },
    });
  } catch (err) {
    console.warn('Failed to schedule focus notification:', err);
    return null;
  }
}

export async function scheduleBreakCompletionNotification(
  seconds: number,
  breakMinutes: number,
): Promise<string | null> {
  if (Platform.OS === 'web' || seconds <= 0) return null;
  try {
    await setupNotificationChannels();
    const hasPerm = await requestNotificationPermissions();
    if (!hasPerm) return null;

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: '☕ Break Over',
        body: `Your ${breakMinutes}-minute break has ended. Ready for the next focus session?`,
        sound: 'default',
        data: { type: 'break-complete', breakMinutes },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
        channelId: 'focus-timer',
      },
    });
  } catch (err) {
    console.warn('Failed to schedule break notification:', err);
    return null;
  }
}

export async function cancelFocusNotification(notificationId: string | null): Promise<void> {
  if (!notificationId || Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (err) {
    console.warn('Failed to cancel notification:', err);
  }
}

export async function sendImmediateFocusNotification(durationMinutes: number): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await setupNotificationChannels();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎯 Focus Session Complete!',
        body: `Great job! You completed your ${durationMinutes}-minute focus session. +15 XP earned!`,
        sound: 'default',
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('Immediate notification error:', err);
  }
}

export async function registerCommunityPushNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  // Expo Go on Android removed remote push notifications in SDK 53+
  if (Constants.appOwnership === 'expo' && Platform.OS === 'android') {
    return;
  }
  await setupNotificationChannels();
  try {
    const current = await Notifications.getPermissionsAsync();
    const permission = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
    if (permission.status !== 'granted') return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await api.put('/github/push-token', { token, platform: Platform.OS });
  } catch {
    // Development clients or Expo Go without push credentials still use the in-app feed.
  }
}

