import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, authStorage, ApiError } from '@/services/api';
import { github } from '@/services/github';
import type { AuthResponse, User } from '@/types/api';

type RegisterInput = { firstName: string; lastName: string; email: string; password: string; confirmPassword?: string; role?: 'STUDENT' | 'ORGANIZATION' };
type ProfileInput = { firstName: string; lastName: string; profilePicture?: string | null };
type AuthContextValue = { user: User | null; loading: boolean; login(email: string, password: string): Promise<User>; register(data: RegisterInput): Promise<User>; logout(): Promise<void>; refresh(): Promise<void>; updateProfile(data: ProfileInput): Promise<void>; };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    const token = await authStorage.getToken();
    if (!token) {
      setUser(null);
      return;
    }
    const cachedUser = await authStorage.getUser<User>();
    if (cachedUser) {
      setUser((prev) => prev || cachedUser);
    }
    try {
      const freshUser = await api.get<User>('/auth/me');
      setUser(freshUser);
      await authStorage.setUser(freshUser);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await authStorage.clearToken();
        setUser(null);
      }
    }
  }, []);
  useEffect(() => { refresh().finally(() => setLoading(false)); }, [refresh]);
  useEffect(() => {
    if (!user) return;

    // Notifications are optional at launch. Deferring their native module
    // setup prevents a notification configuration issue from blocking the
    // login screen on a freshly sideloaded iOS build.
    void import('@/services/notifications')
      .then(({ registerCommunityPushNotifications }) => registerCommunityPushNotifications())
      .catch((error) => console.warn('Push notification setup was skipped:', error));
  }, [user]);
  const establishSession = async (response: AuthResponse): Promise<User> => {
    await Promise.all([
      authStorage.setToken(response.token),
      authStorage.setUser(response.user),
    ]);
    setUser(response.user);
    return response.user;
  };
  const value = useMemo<AuthContextValue>(() => ({
    user, loading, refresh,
    login: async (email, password) => establishSession(await api.post<AuthResponse>('/auth/login', { email, password })),
    register: async (data) => establishSession(await api.post<AuthResponse>('/auth/register', data)),
    updateProfile: async (data) => {
      const updated = await api.patch<User>('/auth/me', data);
      await authStorage.setUser(updated);
      setUser(updated);
    },
    logout: async () => {
      try {
        await api.post('/auth/logout');
      } catch {
      } finally {
        await Promise.all([
          authStorage.clearToken(),
          github.clearLocalToken(),
        ]);
        setUser(null);
      }
    },
  }), [user, loading, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value; }
