'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Bell, Flame, Search, Sparkles } from 'lucide-react';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="dashboard-grid flex min-h-screen items-center justify-center bg-background">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="dashboard-grid min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="ml-56 min-h-screen">
        <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#050a0d]/82 px-5 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="relative max-w-lg flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                aria-label="Search"
                className="h-9 w-full rounded-lg border border-white/[0.08] bg-black/25 pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                placeholder="Search for challenges, projects, notes..."
              />
            </div>
            <div className="hidden items-center gap-2 rounded-lg border border-white/[0.08] bg-secondary/50 px-3 py-2 text-xs text-muted-foreground md:flex">
              <Flame className="h-4 w-4 text-amber-300" />
              <span className="font-semibold text-white">14</span>
              day streak
            </div>
            <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-secondary/50 text-muted-foreground transition hover:text-primary">
              <Bell className="h-4 w-4" />
            </button>
            <div className="hidden items-center gap-3 rounded-lg border border-white/[0.08] bg-secondary/50 px-3 py-1.5 lg:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </div>
              <div className="leading-tight">
                <p className="text-xs font-semibold text-white">{user.firstName} {user.lastName}</p>
                <p className="text-[11px] text-muted-foreground">Level {user.level}</p>
              </div>
            </div>
            <Sparkles className="hidden h-4 w-4 text-primary/70 xl:block" />
          </div>
        </header>
        <main className="min-h-[calc(100vh-65px)] p-5 xl:p-6">{children}</main>
      </div>
    </div>
  );
}
