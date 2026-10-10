import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { api } from './api';
import type { GithubConnection, GithubDeviceAuthorization } from '@/types/api';

const DEVICE_SESSION_KEY = 'synergysphere.github-device-session';
const GITHUB_ACCESS_TOKEN_KEY = 'synergysphere.github-access-token';

export const github = {
  connection: () => api.get<GithubConnection>('/github/connection'),
  async begin(): Promise<GithubDeviceAuthorization> {
    const authorization = await api.post<GithubDeviceAuthorization>('/github/device/start');
    if (Platform.OS !== 'web') await SecureStore.setItemAsync(DEVICE_SESSION_KEY, authorization.id);
    return authorization;
  },
  openVerification: (authorization: GithubDeviceAuthorization) => WebBrowser.openBrowserAsync(authorization.verificationUriComplete || authorization.verificationUri),
  async poll(id: string) {
    const result = await api.post<{ status: 'pending' | 'connected'; accessToken?: string; username?: string; avatarUrl?: string; intervalSeconds?: number }>(`/github/device/${id}/poll`);
    if (result.status === 'connected' && result.accessToken && Platform.OS !== 'web') await SecureStore.setItemAsync(GITHUB_ACCESS_TOKEN_KEY, result.accessToken);
    return result;
  },
  async connectDirect(input: string): Promise<{ connected: boolean; username: string; avatarUrl: string | null }> {
    const result = await api.post<{ connected: boolean; username: string; avatarUrl: string | null; accessToken?: string }>('/github/connect-direct', { input });
    if (result.accessToken && Platform.OS !== 'web') {
      await SecureStore.setItemAsync(GITHUB_ACCESS_TOKEN_KEY, result.accessToken);
    }
    return result;
  },
  disconnect: async () => {
    await api.delete('/github/connection');
    if (Platform.OS !== 'web') await Promise.all([SecureStore.deleteItemAsync(DEVICE_SESSION_KEY), SecureStore.deleteItemAsync(GITHUB_ACCESS_TOKEN_KEY)]);
  },
  clearLocalToken: () => Platform.OS === 'web' ? Promise.resolve() : SecureStore.deleteItemAsync(GITHUB_ACCESS_TOKEN_KEY),
};
