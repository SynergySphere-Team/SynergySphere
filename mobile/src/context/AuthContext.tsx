import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, authStorage, ApiError, onboardingStorage } from '@/services/api';
import { registerCommunityPushNotifications } from '@/services/notifications';
import { github } from '@/services/github';
import type { AuthResponse, User } from '@/types/api';

type RegisterInput = { firstName: string; lastName: string; email: string; password: string; confirmPassword?: string; role?: 'STUDENT' | 'ORGANIZATION' };
type ProfileInput = { firstName: string; lastName: string; profilePicture?: string | null };
type AuthContextValue = { user: User | null; loading: boolean; login(email: string, password: string): Promise<void>; register(data: RegisterInput): Promise<void>; logout(): Promise<void>; refresh(): Promise<void>; updateProfile(data: ProfileInput): Promise<void>; };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    const token = await authStorage.getToken();
    if (!token) { setUser(null); return; }
    try { setUser(await api.get<User>('/auth/me')); }
    catch (error) { if (error instanceof ApiError && error.status === 401) await authStorage.clearToken(); setUser(null); }
  }, []);
  useEffect(() => { refresh().finally(() => setLoading(false)); }, [refresh]);
  useEffect(() => { if (user) void registerCommunityPushNotifications(); }, [user]);
  const establishSession = async (response: AuthResponse) => { await authStorage.setToken(response.token); setUser(response.user); };
  const value = useMemo<AuthContextValue>(() => ({
    user, loading, refresh,
    login: async (email, password) => establishSession(await api.post<AuthResponse>('/auth/login', { email, password })),
    register: async (data) => establishSession(await api.post<AuthResponse>('/auth/register', data)),
    updateProfile: async (data) => setUser(await api.patch<User>('/auth/me', data)),
    logout: async () => {
      try {
        await api.post('/auth/logout');
      } finally {
        await Promise.all([
          authStorage.clearToken(),
          github.clearLocalToken(),
          onboardingStorage.reset(),
        ]);
        setUser(null);
      }
    },
  }), [user, loading, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value; }
