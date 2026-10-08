'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  TrendingUp,
  Clock,
  LifeBuoy,
  Users,
  AlertTriangle,
  Calendar,
  RefreshCw,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface AnalyticsData {
  dailyRegistrations: Array<{ date: string; newUsers: number }>;
  ticketCategoryBreakdown: Array<{ category: string; count: number }>;
  ticketStatusBreakdown: Array<{ status: string; count: number }>;
  avgResolutionHours: number;
  complaintTypeBreakdown: Array<{ targetType: string; count: number }>;
  eventStats: Array<{ status: string; count: number; totalCapacity: number }>;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      setError(null);
      setRefreshing(true);
      const res = await api<AnalyticsData>('/admin/analytics');
      setData(res);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(err?.message || 'Failed to retrieve platform analytics telemetry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  const daily = data?.dailyRegistrations || [];
  const maxRegistrations = Math.max(...daily.map((d) => d.newUsers), 1);
  const ticketCats = data?.ticketCategoryBreakdown || [];
  const maxCatCount = Math.max(...ticketCats.map((c) => c.count), 1);
  const ticketStatuses = data?.ticketStatusBreakdown || [];
  const complaintTypes = data?.complaintTypeBreakdown || [];
  const events = data?.eventStats || [];

  return (
    <div className="space-y-8">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="h-6 w-6 text-amber-400" />
            Platform Telemetry & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Aggregated metrics derived exclusively from live database records, tickets, and user activities.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchAnalytics}
          disabled={refreshing}
          className="h-9 gap-1.5 text-xs border-white/[0.1] bg-black/40 hover:bg-white/[0.05]"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
          Refresh Metrics
        </Button>
      </div>

      {error ? (
        <div className="flex items-center justify-between p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchAnalytics}
            className="h-7 text-xs text-red-300 hover:text-white hover:bg-red-500/20"
          >
            Retry
          </Button>
        </div>
      ) : null}

      {/* ─── Top Stats Row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-white/[0.08] bg-[#071118]/90">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Clock className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-black text-white font-mono truncate">
                {data?.avgResolutionHours || 0} hrs
              </p>
              <p className="text-xs text-muted-foreground truncate">Mean Ticket Resolution Time</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/[0.08] bg-[#071118]/90">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-black text-white font-mono truncate">
                {daily.reduce((acc, d) => acc + d.newUsers, 0)} users
              </p>
              <p className="text-xs text-muted-foreground truncate">New Registrations (Last 14d)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/[0.08] bg-[#071118]/90 sm:col-span-2 lg:col-span-1">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-black text-white font-mono truncate">
                {events.reduce((acc, ev) => acc + ev.totalCapacity, 0)} seats
              </p>
              <p className="text-xs text-muted-foreground truncate">Total Workshop Seat Capacity</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Daily Registrations Bar Chart (Pure CSS/SVG) ─────────────────────── */}
      <Card className="border-white/[0.08] bg-[#071118]/90 shadow-xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-white/[0.06] flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            User Registration Volume (Recent Trend)
          </CardTitle>
          <span className="text-xs font-mono text-muted-foreground">
            Peak: {maxRegistrations} users/day
          </span>
        </CardHeader>
        <CardContent className="pt-6">
          {daily.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">No recent registration events recorded.</div>
          ) : (
            <div className="overflow-x-auto pb-2 scrollbar-thin">
              <div className="min-w-[560px] space-y-2">
                {/* Bar Tracks Area */}
                <div className="flex items-end gap-3 h-44 px-3 border-b border-white/[0.1] pb-1">
                  {daily.map((item) => {
                    const barHeight = Math.max(10, Math.round((item.newUsers / maxRegistrations) * 100));
                    return (
                      <div
                        key={item.date}
                        className="flex-1 h-full flex flex-col justify-end items-center relative group"
                      >
                        {/* Hover Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 bg-black/95 border border-white/20 px-2 py-0.5 rounded text-[10px] font-mono text-white transition z-30 shadow-lg whitespace-nowrap">
                          {item.newUsers} {item.newUsers === 1 ? 'user' : 'users'}
                        </div>

                        {/* Bar Graphic */}
                        <div
                          className="w-full max-w-[34px] bg-gradient-to-t from-primary/60 to-primary rounded-t-md transition-all group-hover:bg-primary shadow-sm"
                          style={{ height: `${barHeight}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* X-Axis Date Labels (Separated from bars to prevent any overlap) */}
                <div className="flex items-center gap-3 px-3">
                  {daily.map((item) => (
                    <div key={item.date} className="flex-1 text-center">
                      <span className="block text-[10px] text-muted-foreground font-mono tracking-tight whitespace-nowrap">
                        {item.date.slice(5)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Category Breakdown & Status Grids ────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Support Ticket Categories */}
        <Card className="border-white/[0.08] bg-[#071118]/90 shadow-xl">
          <CardHeader className="pb-3 border-b border-white/[0.06]">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <LifeBuoy className="h-4 w-4 text-primary" />
              Support Requests by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {ticketCats.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No support tickets filed yet.</p>
            ) : (
              ticketCats.map((cat) => {
                const pct = Math.round((cat.count / maxCatCount) * 100);
                return (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="text-white font-medium truncate">{cat.category}</span>
                      <span className="text-muted-foreground font-mono shrink-0">{cat.count} tickets</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-black/40 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-cyan-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Complaints Target Breakdown */}
        <Card className="border-white/[0.08] bg-[#071118]/90 shadow-xl">
          <CardHeader className="pb-3 border-b border-white/[0.06]">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              Community Complaints by Target Type
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {complaintTypes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No complaints registered in database.</p>
            ) : (
              complaintTypes.map((comp) => (
                <div
                  key={comp.targetType}
                  className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-black/40 text-xs gap-3"
                >
                  <span className="uppercase font-mono text-white font-semibold truncate">{comp.targetType}</span>
                  <span className="rounded bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 font-mono font-bold shrink-0">
                    {comp.count} filed
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
