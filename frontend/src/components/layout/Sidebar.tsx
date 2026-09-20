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

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/learning-hub', label: 'Learning Hub', icon: BookOpen },
  { href: '/ai-assistant', label: 'AI Workspace', icon: Bot },
  { href: '/lecture-to-life', label: 'LectureToLife', icon: Upload },
  { href: '/tasks', label: 'Productivity', icon: CheckSquare },
  { href: '/community', label: 'Community', icon: Users },
  { href: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { href: '/interviews', label: 'Interviews', icon: Mic },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/wellness', label: 'Wellness', icon: Heart },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard', label: 'Settings', icon: Settings },
];

const adminItems = [
  { href: '/admin', label: 'Analytics', icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const items = user?.role === 'ADMIN' ? [...navItems, ...adminItems] : navItems;
  const initials = `${user?.firstName?.[0] ?? 'S'}${user?.lastName?.[0] ?? 'S'}`;

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-56 flex-col md:flex border-r border-white/[0.08] bg-[#050a0d]/95 backdrop-blur-xl">
      <div className="flex items-center gap-2 border-b border-white/[0.08] px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-primary/10 shadow-lg shadow-primary/20">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold text-white">SynergySphere</h1>
          <p className="text-[11px] text-muted-foreground">Learn. Build. Impact.</p>
        </div>
      </div>

      <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href === '/learning-hub' && pathname === '/coding');
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg border px-3 py-2 text-[13px] font-medium transition-all',
                active
                  ? 'border-primary/20 bg-primary/[0.12] text-primary shadow-inner shadow-primary/10'
                  : 'border-transparent text-muted-foreground hover:border-white/[0.06] hover:bg-secondary/70 hover:text-foreground'
              )}
            >
              <Icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-muted-foreground group-hover:text-primary')} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="border-t border-white/[0.08] p-3">
          <div className="mb-3 rounded-lg border border-primary/[0.15] bg-primary/[0.08] p-3">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">{user.firstName} {user.lastName}</p>
                <p className="text-[11px] text-muted-foreground">Student</p>
              </div>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
              <div className="h-full w-2/3 rounded-full bg-primary" />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">Level {user.level} - {user.xp} XP</p>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}
