import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export async function registerCommunityPushNotifications() {
  if (Platform.OS === 'web') return;
  // Expo Go on Android removed remote push notifications in SDK 53+
  if (Constants.appOwnership === 'expo' && Platform.OS === 'android') {
    return;
  }
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('community', { name: 'Community activity', importance: Notifications.AndroidImportance.DEFAULT });
    } catch {
      // ignore channel creation errors in preview environments
    }
  }
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
