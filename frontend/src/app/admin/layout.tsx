'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { isModerator, isSuperAdmin, isAdmin } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  MessageSquare,
  Flag,
  Calendar,
  LifeBuoy,
  AlertTriangle,
  BarChart3,
  FileSpreadsheet,
  Database,
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  ChevronRight,
  Loader2,
  Bell,
  ExternalLink,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: any;
  badge?: number | string;
  badgeColor?: string;
  superAdminOnly?: boolean;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [pendingCount, setPendingCount] = useState<number>(0);
  const [openTicketsCount, setOpenTicketsCount] = useState<number>(0);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch live counts for badges
  useEffect(() => {
    if (user && isModerator(user)) {
      fetch('/api/admin/overview', { credentials: 'include' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.kpis) {
            setPendingCount(data.kpis.pendingApprovals || 0);
            setOpenTicketsCount(data.kpis.openTickets || 0);
          }
        })
        .catch(() => null);
    }
  }, [user, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#03070a]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-mono">Verifying administrative security credentials...</p>
        </div>
      </div>
    );
  }

  // RBAC Access Control Guard:
  // Normal users (STUDENT / USER) are strictly blocked with 403 Forbidden
  if (!user || !isModerator(user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#03070a] p-4 text-center">
        <div className="max-w-md rounded-2xl border border-destructive/30 bg-[#080d12] p-8 shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive mb-4">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">403 Forbidden — Access Denied</h2>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            The SynergySphere Admin Portal requires authorized staff clearance (SuperAdmin, Admin, or Moderator).
            Your current account (<span className="text-white font-mono">{user?.email || 'Guest'}</span>) does not have sufficient role permissions.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button size="sm" className="w-full text-xs gap-2">
                <ArrowLeft className="h-3.5 w-3.5" />
                Return to Student Dashboard
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="w-full sm:w-auto text-xs border-white/[0.1] hover:bg-white/[0.05]"
            >
              Sign In with Another Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const roleName = user.role.toUpperCase();
  const roleBadgeColor =
    roleName === 'SUPERADMIN'
      ? 'border-purple-500/30 bg-purple-500/10 text-purple-300'
      : roleName === 'ADMIN'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
      : 'border-blue-500/30 bg-blue-500/10 text-blue-300';

  const navSections: NavSection[] = [
    {
      title: 'Core Administration',
      items: [
        { href: '/admin', label: 'Overview / Dashboard', icon: LayoutDashboard },
        {
          href: '/admin/users',
          label: 'User Management',
          icon: Users,
          adminOnly: true,
        },
        {
          href: '/admin/users/pending',
          label: 'Pending Approvals',
          icon: UserCheck,
          adminOnly: true,
          badge: pendingCount > 0 ? pendingCount : undefined,
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        },
      ],
    },
    {
      title: 'Community & Content',
      items: [
        { href: '/admin/community/posts', label: 'Community Posts', icon: MessageSquare },
        { href: '/admin/community/flagged', label: 'Flagged Content', icon: Flag },
        { href: '/admin/events', label: 'Events Management', icon: Calendar },
      ],
    },
    {
      title: 'Tickets & Governance',
      items: [
        {
          href: '/admin/tickets',
          label: 'Support Tickets',
          icon: LifeBuoy,
          badge: openTicketsCount > 0 ? openTicketsCount : undefined,
          badgeColor: 'bg-primary/20 text-primary border-primary/30',
        },
        { href: '/admin/complaints', label: 'Complaints Queue', icon: AlertTriangle },
      ],
    },
    {
      title: 'Telemetry & Infrastructure',
      items: [
        { href: '/admin/analytics', label: 'Analytics Overview', icon: BarChart3 },
        { href: '/admin/reports', label: 'System Reports', icon: FileSpreadsheet },
        {
          href: '/admin/database',
          label: 'Database & Maintenance',
          icon: Database,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#03070a] text-foreground">
      {/* ─── Admin Sidebar ───────────────────────────────────────────────────── */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col md:flex border-r border-white/[0.08] bg-[#050a0e]/95 backdrop-blur-xl">
        {/* Brand & Portal Badge */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 font-bold text-xs shrink-0 shadow-md shadow-amber-500/10">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xs font-bold text-white tracking-tight">SynergySphere</h1>
              <p className="text-[10px] uppercase tracking-wider text-amber-400/90 font-mono font-semibold">
                Admin Portal
              </p>
            </div>
          </div>
          <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider ${roleBadgeColor}`}>
            {roleName}
          </span>
        </div>

        {/* Navigation Sections */}
        <nav className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-3">
          {navSections.map((section) => {
            // Filter section items according to user permissions
            const visibleItems = section.items.filter((item) => {
              if (item.superAdminOnly && !isSuperAdmin(user)) return false;
              if (item.adminOnly && !isAdmin(user)) return false;
              return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">
                  {section.title}
                </p>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/admin' && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                        isActive
                          ? 'border-amber-500/30 bg-amber-500/[0.12] text-amber-300 font-semibold shadow-inner shadow-amber-500/10'
                          : 'border-transparent text-muted-foreground hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? 'text-amber-400' : 'text-muted-foreground group-hover:text-amber-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span className={`rounded border px-1.5 py-0.2 text-[10px] font-mono font-semibold ${item.badgeColor || 'bg-white/10 text-white'}`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Switch Back to Student App & Sign Out */}
        <div className="border-t border-white/[0.08] p-3 space-y-2">
          <Link
            href="/dashboard"
            className="flex w-full items-center justify-between rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition"
          >
            <span className="flex items-center gap-2">
              <ArrowLeft className="h-3.5 w-3.5" />
              Return to User App
            </span>
            <ExternalLink className="h-3 w-3 opacity-70" />
          </Link>

          <div className="flex items-center justify-between pt-1 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white shrink-0">
                {user.firstName?.[0] || 'A'}
              </div>
              <div className="truncate text-left leading-tight">
                <p className="text-[11px] font-medium text-white truncate">{user.firstName} {user.lastName}</p>
                <p className="text-[9px] text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="text-muted-foreground hover:text-white transition p-1"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── Main Content Wrapper ────────────────────────────────────────────── */}
      <div className="min-h-screen md:ml-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.08] bg-[#04080b]/85 px-4 sm:px-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <span className="font-semibold text-white">SynergySphere Central Console</span>
              <span className="text-white/20">/</span>
              <span className="capitalize text-amber-400/90 font-mono text-[11px]">
                {pathname.replace('/admin', '').replace('/', ' → ') || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`hidden sm:inline-flex rounded-full border px-2.5 py-0.5 text-xs font-mono font-medium ${roleBadgeColor}`}>
              Clearance: {roleName}
            </span>
            <Link href="/dashboard">
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs border-white/[0.1] hover:bg-white/[0.05]">
                <ArrowLeft className="h-3 w-3" />
                <span className="hidden sm:inline">User Application</span>
              </Button>
            </Link>
          </div>
        </header>

        {/* Content Children */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
