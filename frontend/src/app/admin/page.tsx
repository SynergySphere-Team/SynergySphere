'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  UserCheck,
  LifeBuoy,
  AlertOctagon,
  AlertTriangle,
  Calendar,
  MessageSquare,
  UserX,
  ArrowRight,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Loader2,
  ExternalLink,
} from 'lucide-react';

interface OverviewData {
  kpis: {
    totalActiveUsers: number;
    totalUsers: number;
    pendingApprovals: number;
    openTickets: number;
    criticalTickets: number;
    unreviewedComplaints: number;
    scheduledEventsWeek: number;
    totalCommunityPosts: number;
    suspendedUsers: number;
  };
  recentActivity: Array<{
    id: string;
    userId: string | null;
    adminName: string;
    action: string;
    targetType: string | null;
    targetId: string | null;
    description: string;
    createdAt: string;
  }>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOverview();
  }, []);

  async function fetchOverview() {
    try {
      setRefreshing(true);
      const res = await api<OverviewData>('/admin/overview');
      setData(res);
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
          <p className="text-xs text-muted-foreground font-mono">Loading platform operations telemetry...</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalActiveUsers: 0,
    totalUsers: 0,
    pendingApprovals: 0,
    openTickets: 0,
    criticalTickets: 0,
    unreviewedComplaints: 0,
    scheduledEventsWeek: 0,
    totalCommunityPosts: 0,
    suspendedUsers: 0,
  };

  const kpiCards = [
    {
      title: 'Total Active Users',
      value: kpis.totalActiveUsers,
      subtext: `Out of ${kpis.totalUsers} registered users`,
      icon: Users,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
      href: '/admin/users',
      actionText: 'View All Users',
    },
    {
      title: 'Pending Account Approvals',
      value: kpis.pendingApprovals,
      subtext: 'Requires identity verification',
      icon: UserCheck,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
      href: '/admin/users/pending',
      actionText: 'Review Queue',
      highlight: kpis.pendingApprovals > 0,
    },
    {
      title: 'Open Support Tickets',
      value: kpis.openTickets,
      subtext: 'Awaiting support team review',
      icon: LifeBuoy,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/20',
      href: '/admin/tickets',
      actionText: 'View Tickets',
    },
    {
      title: 'High / Critical Tickets',
      value: kpis.criticalTickets,
      subtext: 'Urgent operational attention',
      icon: AlertOctagon,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10 border-rose-500/20',
      href: '/admin/tickets',
      actionText: 'Prioritize Tickets',
      highlight: kpis.criticalTickets > 0,
    },
    {
      title: 'Unreviewed Complaints',
      value: kpis.unreviewedComplaints,
      subtext: 'User & content misconduct reports',
      icon: AlertTriangle,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10 border-orange-500/20',
      href: '/admin/complaints',
      actionText: 'Review Complaints',
      highlight: kpis.unreviewedComplaints > 0,
    },
    {
      title: 'Scheduled Events This Week',
      value: kpis.scheduledEventsWeek,
      subtext: 'Approved workshops & hackathons',
      icon: Calendar,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10 border-purple-500/20',
      href: '/admin/events',
      actionText: 'Manage Events',
    },
    {
      title: 'Total Community Posts',
      value: kpis.totalCommunityPosts,
      subtext: 'Active discussion forum posts',
      icon: MessageSquare,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10 border-cyan-500/20',
      href: '/admin/community/posts',
      actionText: 'Moderate Posts',
    },
    {
      title: 'Suspended Accounts',
      value: kpis.suspendedUsers,
      subtext: 'Enforced policy restrictions',
      icon: UserX,
      color: 'text-zinc-400',
      bgColor: 'bg-zinc-500/10 border-zinc-500/20',
      href: '/admin/users?status=suspended',
      actionText: 'View Suspended',
    },
  ];

  function formatTimeAgo(dateString: string) {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  function getActionBadge(action: string) {
    if (action.includes('APPROVED') || action.includes('ACTIVATED') || action.includes('RESOLVED')) {
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
    }
    if (action.includes('REJECTED') || action.includes('SUSPENDED') || action.includes('DELETED')) {
      return 'border-rose-500/30 bg-rose-500/10 text-rose-400';
    }
    if (action.includes('ROLE_CHANGED') || action.includes('HIDDEN')) {
      return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
    }
    return 'border-primary/30 bg-primary/10 text-primary';
  }

  return (
    <div className="space-y-8">
      {/* ─── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 mb-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            Platform Governance & Operations
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Administrative Control Center
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
            Live operations overview across user accounts, support inquiries, community moderation, and scheduled engineering events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOverview}
            disabled={refreshing}
            className="h-9 gap-1.5 text-xs border-white/[0.1] bg-black/40 hover:bg-white/[0.05]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
            Refresh Telemetry
          </Button>
        </div>
      </div>

      {/* ─── KPI Cards Section ──────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-white tracking-tight">Platform Telemetry & Metrics</h2>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">Live cluster counts</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.title} href={card.href} className="group block">
                <Card className="h-full border-white/[0.08] bg-[#071015]/85 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-[#09151e] shadow-md relative overflow-hidden">
                  {card.highlight && (
                    <div className="absolute top-0 right-0 w-12 h-12 bg-primary/10 rounded-full blur-lg pointer-events-none" />
                  )}
                  <CardContent className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-muted-foreground group-hover:text-white transition-colors truncate">
                        {card.title}
                      </span>
                      <div className={`flex h-7 w-7 items-center justify-center rounded-md border shrink-0 ${card.bgColor} ${card.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-bold text-white tracking-tight font-mono">
                        {card.value}
                      </div>
                      <p className="text-[10px] text-muted-foreground/80 line-clamp-1 mt-0.5">{card.subtext}</p>
                    </div>
                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-semibold text-primary group-hover:text-emerald-300">
                      <span>{card.actionText}</span>
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ─── Quick Actions Panel ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm sm:text-base font-bold text-white">Administrative Quick Actions</h2>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">High-frequency workflows</span>
        </div>

        <Card className="border-white/[0.08] bg-[#071015]/85 shadow-lg">
          <CardContent className="p-3.5">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              <Link href="/admin/users/pending">
                <div className="flex flex-col items-center justify-center rounded-lg border border-white/[0.08] bg-black/40 p-3 text-center transition hover:border-primary/40 hover:bg-primary/[0.06] group cursor-pointer">
                  <UserCheck className="h-4 w-4 text-primary mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-white">Approve Users</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">{kpis.pendingApprovals} pending</span>
                </div>
              </Link>

              <Link href="/admin/tickets">
                <div className="flex flex-col items-center justify-center rounded-lg border border-white/[0.08] bg-black/40 p-3 text-center transition hover:border-blue-500/40 hover:bg-blue-500/[0.06] group cursor-pointer">
                  <LifeBuoy className="h-4 w-4 text-blue-400 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-white">Support Tickets</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">{kpis.openTickets} open</span>
                </div>
              </Link>

              <Link href="/admin/complaints">
                <div className="flex flex-col items-center justify-center rounded-lg border border-white/[0.08] bg-black/40 p-3 text-center transition hover:border-orange-500/40 hover:bg-orange-500/[0.06] group cursor-pointer">
                  <AlertTriangle className="h-4 w-4 text-orange-400 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-white">Review Complaints</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">{kpis.unreviewedComplaints} awaiting</span>
                </div>
              </Link>

              <Link href="/admin/community/flagged">
                <div className="flex flex-col items-center justify-center rounded-lg border border-white/[0.08] bg-black/40 p-3 text-center transition hover:border-rose-500/40 hover:bg-rose-500/[0.06] group cursor-pointer">
                  <MessageSquare className="h-4 w-4 text-rose-400 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-white">Review Flagged</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Content queue</span>
                </div>
              </Link>

              <Link href="/admin/events">
                <div className="flex flex-col items-center justify-center rounded-lg border border-white/[0.08] bg-black/40 p-3 text-center transition hover:border-purple-500/40 hover:bg-purple-500/[0.06] group cursor-pointer">
                  <Calendar className="h-4 w-4 text-purple-400 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-white">Manage Events</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">{kpis.scheduledEventsWeek} this week</span>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Recent Administrative Activity Feed ───────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h2 className="text-sm sm:text-base font-bold text-white">Recent Administrative Activity</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time chronological audit trail of administrative events and moderation decisions.
            </p>
          </div>
          <Link href="/admin/reports">
            <Button variant="outline" size="sm" className="h-8 text-xs border-white/[0.1] bg-black/30 hover:bg-white/[0.05]">
              Full Audit Trail
            </Button>
          </Link>
        </div>

        <Card className="border-white/[0.08] bg-[#071015]/85 shadow-lg">
          <CardContent className="p-3.5">
            {!data?.recentActivity || data.recentActivity.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground font-mono">
                No recent administrative actions recorded.
              </div>
            ) : (
              <div className="space-y-2">
                {data.recentActivity.map((act) => (
                  <div
                    key={act.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-black/30 p-2.5 transition hover:border-white/[0.1] hover:bg-black/50"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider shrink-0 ${getActionBadge(
                          act.action,
                        )}`}
                      >
                        {act.action.replace(/_/g, ' ')}
                      </span>
                      <p className="text-xs text-white truncate font-medium">
                        {act.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground shrink-0 sm:self-center self-end font-mono">
                      <Clock className="h-3 w-3 text-muted-foreground/60" />
                      <span>{formatTimeAgo(act.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
