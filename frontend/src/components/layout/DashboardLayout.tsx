'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { api } from '@/lib/utils';
import {
  Bell,
  BookOpen,
  CheckSquare,
  Flame,
  Search,
  Sparkles,
  Users,
  X,
  Loader2,
} from 'lucide-react';

interface SearchResults {
  challenges: Array<{ id: string; title: string; difficulty: string }>;
  projects: Array<{ id: string; title: string; category: string }>;
  tasks: Array<{ id: string; title: string; status: string }>;
  lessons?: Array<{ id: string; title: string; subjectId: string; subjectName: string }>;
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [dashboardData, setDashboardData] = useState<{
    streak: number;
    stats: { unreadNotifications: number };
  } | null>(null);
  const [liveNotification, setLiveNotification] = useState<{
    id: string;
    title: string;
    message: string;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [results, setResults] = useState<SearchResults>({ challenges: [], projects: [], tasks: [], lessons: [] });

  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api<{ streak: number; stats: { unreadNotifications: number } }>('/dashboard/stats')
      .then(setDashboardData)
      .catch(() => null);

    // Connect to /ws for real-time push notifications
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host =
      process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith('http')
        ? process.env.NEXT_PUBLIC_API_URL.replace(/^http/, 'ws').replace(/\/api\/?$/, '')
        : `${protocol}//${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:4000`;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`${host}/ws`);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data || '{}'));
          if (msg.type === 'notification' && msg.notification) {
            setLiveNotification({
              id: msg.notification.id || String(Date.now()),
              title: msg.notification.title || 'New Notification',
              message: msg.notification.message || '',
            });
            setDashboardData((prev) =>
              prev
                ? {
                    ...prev,
                    stats: {
                      ...prev.stats,
                      unreadNotifications: (prev.stats?.unreadNotifications || 0) + 1,
                    },
                  }
                : prev
            );
            setTimeout(() => setLiveNotification(null), 5000);
          }
        } catch {
        }
      };
    } catch {
    }

    return () => {
      try {
        ws?.close();
      } catch {}
    };
  }, [user]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults({ challenges: [], projects: [], tasks: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      api<SearchResults>(`/dashboard/search?q=${encodeURIComponent(searchQuery.trim())}`)
        .then((res) => {
          setResults(res || { challenges: [], projects: [], tasks: [] });
          setShowDropdown(true);
        })
        .catch(() => {
          setResults({ challenges: [], projects: [], tasks: [] });
        })
        .finally(() => setIsSearching(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setShowDropdown(false);
      router.push(`/tasks`);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const totalResultsCount =
    results.challenges.length + results.projects.length + results.tasks.length + (results.lessons?.length || 0);

  if (loading) {
    return (
      <div className="dashboard-grid min-h-screen bg-background p-6 space-y-6">
        <div className="h-14 w-full animate-pulse rounded-xl bg-white/[0.05]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.04]" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.04]" />
          <div className="h-64 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.04]" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="dashboard-grid min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="min-h-screen md:ml-60">
        <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#050a0d]/82 px-5 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-xs font-bold text-primary md:hidden">
              SS
            </div>

            {/* Global Search Bar */}
            <div ref={searchContainerRef} className="relative max-w-lg flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                aria-label="Search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value) setShowDropdown(true);
                }}
                onFocus={() => {
                  if (searchQuery.trim()) setShowDropdown(true);
                }}
                onKeyDown={handleKeyDown}
                className="h-9 w-full rounded-lg border border-white/[0.08] bg-black/25 pl-9 pr-8 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                placeholder="Search lessons, challenges, projects, tasks..."
              />
              {isSearching ? (
                <Loader2 className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setShowDropdown(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}

              {/* Autocomplete Dropdown */}
              {showDropdown && searchQuery.trim() && (
                <div className="absolute left-0 right-0 top-full mt-2 max-h-96 overflow-y-auto rounded-xl border border-white/[0.1] bg-[#0c141a]/95 p-2 shadow-2xl backdrop-blur-2xl z-50 divide-y divide-white/[0.06]">
                  {totalResultsCount === 0 && !isSearching ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No matching lessons, challenges, projects, or tasks found.
                    </div>
                  ) : (
                    <>
                      {/* Curriculum Lessons */}
                      {results.lessons && results.lessons.length > 0 && (
                        <div className="py-2 first:pt-0">
                          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <BookOpen className="h-3 w-3 text-emerald-400" />
                            Curriculum Lessons
                          </p>
                          {results.lessons.map((l) => (
                            <Link
                              key={l.id}
                              href={`/learning-hub?subject=${l.subjectId}&lesson=${l.id}`}
                              onClick={() => setShowDropdown(false)}
                              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs text-foreground hover:bg-white/[0.06] transition"
                            >
                              <span className="font-medium text-white truncate">{l.title}</span>
                              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300">
                                {l.subjectName}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Challenges */}
                      {results.challenges.length > 0 && (
                        <div className="py-2">
                          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Sparkles className="h-3 w-3 text-blue-400" />
                            Challenges
                          </p>
                          {results.challenges.map((c) => (
                            <Link
                              key={c.id}
                              href="/coding"
                              onClick={() => setShowDropdown(false)}
                              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs text-foreground hover:bg-white/[0.06] transition"
                            >
                              <span className="font-medium text-white truncate">{c.title}</span>
                              <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-300 capitalize">
                                {c.difficulty.toLowerCase()}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Projects */}
                      {results.projects.length > 0 && (
                        <div className="py-2">
                          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Users className="h-3 w-3 text-pink-400" />
                            Community Projects
                          </p>
                          {results.projects.map((p) => (
                            <Link
                              key={p.id}
                              href="/community"
                              onClick={() => setShowDropdown(false)}
                              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs text-foreground hover:bg-white/[0.06] transition"
                            >
                              <span className="font-medium text-white truncate">{p.title}</span>
                              <span className="rounded bg-pink-500/20 px-1.5 py-0.5 text-[10px] text-pink-300">
                                {p.category}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Tasks */}
                      {results.tasks.length > 0 && (
                        <div className="py-2 last:pb-0">
                          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <CheckSquare className="h-3 w-3 text-primary" />
                            Productivity & Tasks
                          </p>
                          {results.tasks.map((t) => (
                            <Link
                              key={t.id}
                              href="/tasks"
                              onClick={() => setShowDropdown(false)}
                              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs text-foreground hover:bg-white/[0.06] transition"
                            >
                              <span className="font-medium text-white truncate">{t.title}</span>
                              <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary">
                                {t.status}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Dynamic Activity Streak */}
            <div className="hidden items-center gap-2 rounded-lg border border-white/[0.08] bg-secondary/50 px-3 py-2 text-xs text-muted-foreground md:flex">
              <Flame className="h-4 w-4 text-amber-300" />
              <span className="font-semibold text-white">{dashboardData?.streak ?? 1}</span>
              day streak
            </div>

            {/* Notifications Button */}
            <Link
              href="/notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-secondary/50 text-muted-foreground transition hover:text-primary"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {(dashboardData?.stats?.unreadNotifications ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow">
                  {dashboardData?.stats.unreadNotifications}
                </span>
              )}
            </Link>

            {/* User Profile Pill */}
            <Link
              href="/portfolio"
              className="hidden items-center gap-3 rounded-lg border border-white/[0.08] bg-secondary/50 px-3 py-1.5 lg:flex hover:border-white/20 transition"
              title="View Profile / Portfolio"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {user.firstName?.[0]}
                {user.lastName?.[0]}
              </div>
              <div className="leading-tight">
                <p className="text-xs font-semibold text-white">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-[11px] text-muted-foreground">Level {user.level}</p>
              </div>
            </Link>

            <Sparkles className="hidden h-4 w-4 text-primary/70 xl:block" />
          </div>
        </header>
        {liveNotification && (
          <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/15 px-4 py-2.5 text-xs shadow-lg">
            <div className="flex items-center gap-2 min-w-0">
              <Bell className="h-4 w-4 text-primary shrink-0" />
              <div className="truncate">
                <span className="font-bold text-white">{liveNotification.title}: </span>
                <span className="text-gray-200">{liveNotification.message}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLiveNotification(null)}
              className="text-muted-foreground hover:text-white shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <main className="min-h-[calc(100vh-65px)] p-4 sm:p-5 xl:p-6">{children}</main>
      </div>
    </div>
  );
}
