'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Code2,
  Bot,
  CheckSquare,
  Heart,
  Users,
  BookOpen,
  Briefcase,
  Mic,
  Trophy,
  Bell,
  BarChart3,
  LogOut,
  Sparkles,
  Settings,
  Upload,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: any;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Learn',
    items: [
      { href: '/learning-hub', label: 'Learning Hub', icon: BookOpen },
      { href: '/ai-assistant', label: 'AI Workspace', icon: Bot },
      { href: '/lecture-to-life', label: 'LectureToLife', icon: Upload },
    ],
  },
  {
    label: 'Practice',
    items: [
      { href: '/coding', label: 'Challenges & Gym', icon: Code2 },
      { href: '/interviews', label: 'Interview Coach', icon: Mic },
    ],
  },
  {
    label: 'Build',
    items: [
      { href: '/community', label: 'Community', icon: Users },
      { href: '/tasks', label: 'Productivity', icon: CheckSquare },
    ],
  },
  {
    label: 'Career',
    items: [
      { href: '/portfolio', label: 'Portfolio & Evidence', icon: Briefcase },
      { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    ],
  },
  {
    label: 'You',
    items: [
      { href: '/wellness', label: 'Wellness Check', icon: Heart },
      { href: '/notifications', label: 'Notifications', icon: Bell },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const adminItems = [
  { href: '/admin', label: 'Analytics', icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const initials = `${user?.firstName?.[0] ?? 'S'}${user?.lastName?.[0] ?? 'S'}`;

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-60 flex-col md:flex border-r border-white/[0.08] bg-[#050a0d]/95 backdrop-blur-xl">
      <div className="flex items-center gap-2.5 border-b border-white/[0.08] px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden border border-white/10 shadow-md shadow-primary/20">
          <img src="/brand/synergysphere-logo.png" alt="SynergySphere" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold text-white tracking-tight">SynergySphere</h1>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Junior Career OS</p>
        </div>
      </div>

      <nav className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-3">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href === '/learning-hub' && pathname.startsWith('/learning-hub'));
              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-2.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-all',
                    active
                      ? 'border-primary/30 bg-primary/[0.12] text-primary font-semibold shadow-inner shadow-primary/10'
                      : 'border-transparent text-muted-foreground hover:border-white/[0.06] hover:bg-secondary/60 hover:text-foreground'
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground group-hover:text-primary')} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}

        {user?.role === 'ADMIN' && (
          <div className="space-y-1 pt-2 border-t border-white/[0.06]">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">
              Admin
            </p>
            {adminItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-2.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-all',
                    active
                      ? 'border-primary/30 bg-primary/[0.12] text-primary'
                      : 'border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {user && (
        <div className="border-t border-white/[0.08] p-3">
          <div className="mb-2.5 rounded-lg border border-primary/[0.15] bg-primary/[0.06] p-2.5">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">{user.firstName} {user.lastName}</p>
                <p className="text-[10px] text-muted-foreground font-mono">Level {user.level || 1} • {user.xp || 0} XP</p>
              </div>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, ((user.xp || 0) % 200) / 2)}%` }}
              />
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}
