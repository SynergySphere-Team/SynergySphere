'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, User, getStoredUser, setStoredUser, clearAuth } from '@/lib/utils';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword?: string;
  role?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) setUser(stored);
    refreshUser().finally(() => setLoading(false));
  }, []);

  async function refreshUser() {
    try {
      const data = await api<User>('/auth/me');
      setUser(data);
      setStoredUser(data);
    } catch {
      clearAuth();
      setUser(null);
    }
  }

  async function login(email: string, password: string) {
    const data = await api<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredUser(data.user);
    setUser(data.user);
  }

  async function register(formData: RegisterData) {
    const data = await api<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
    setStoredUser(data.user);
    setUser(data.user);
  }

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // Local cleanup still happens if the API is unreachable.
    }
    clearAuth();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
