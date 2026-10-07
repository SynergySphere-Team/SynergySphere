'use client';

import { useEffect, useState } from 'react';
import { api, isAdmin, isSuperAdmin } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Database,
  Activity,
  HardDrive,
  ShieldAlert,
  Server,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Archive,
  Trash2,
  Lock,
  Layers,
  Sparkles,
  X,
} from 'lucide-react';

interface DatabaseHealth {
  status: string;
  engine: string;
  latencyMs: number;
  pool: {
    total: number;
    idle: number;
    waiting: number;
    max: number;
  };
  lastBackup: {
    timestamp: string;
    status: string;
    type: string;
  };
  softDeletedCount: number;
  tableStats: Array<{
    table_name: string;
    row_count: number;
  }>;
}

export default function DatabaseAdminPage() {
  const { user } = useAuth();
  const [health, setHealth] = useState<DatabaseHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Maintenance action states
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'create_backup' | 'clear_cache' | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Soft-deleted review modal
  const [softDeletedModal, setSoftDeletedModal] = useState<any[] | null>(null);

  const isAuthorized = isAdmin(user) || isSuperAdmin(user);

  useEffect(() => {
    if (isAuthorized) {
      fetchHealth();
    } else {
      setLoading(false);
    }
  }, [isAuthorized]);

  async function fetchHealth() {
    try {
      setRefreshing(true);
      const data = await api<DatabaseHealth>('/admin/database/health');
      setHealth(data);
    } catch (err) {
      console.error('Failed to load database health:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRunMaintenance(action: string) {
    setMaintenanceLoading(true);
    setFeedback(null);
    try {
      const res = await api<{ message?: string; softDeleted?: any[] }>('/admin/database/maintenance', {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      if (action === 'review_soft_deleted') {
        setSoftDeletedModal(res.softDeleted || []);
      } else {
        setFeedback(res.message || 'Action executed successfully.');
        setConfirmAction(null);
        await fetchHealth();
      }
    } catch (err: any) {
      alert(err.message || 'Maintenance action failed.');
    } finally {
      setMaintenanceLoading(false);
    }
  }

  // Admin Access Restriction Guard
  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="max-w-md rounded-2xl border border-purple-500/30 bg-[#080d12] p-8 shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 mb-4">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Admin Clearance Required</h2>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Database administration and physical cluster operations require administrator privileges.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ─── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300 mb-2 font-mono">
            <Lock className="h-3 w-3" />
            Administrator Environment
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Database className="h-6 w-6 text-purple-400" />
            Database Administration & Cluster Diagnostics
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Safe live telemetry monitoring, connection pool health, automated backups, and cache management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHealth}
            disabled={refreshing}
            className="h-9 gap-1.5 text-xs border-white/[0.1] bg-black/40 hover:bg-white/[0.05]"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin text-purple-400' : ''}`} />
            Refresh Diagnostics
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-emerald-400 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ─── Diagnostic Cards Row ────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-white/[0.08] bg-[#071118]/90">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
            <span className="text-xs text-muted-foreground">Cluster Engine & Health</span>
            <Server className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-base font-bold text-white">{health?.engine || 'PostgreSQL'}</span>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">Status: Connected & Healthy</p>
          </CardContent>
        </Card>

        <Card className="border-white/[0.08] bg-[#071118]/90">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
            <span className="text-xs text-muted-foreground">Response Latency</span>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1">
            <div className="text-2xl font-black text-white font-mono">{health?.latencyMs ?? 0} ms</div>
            <p className="text-[11px] text-muted-foreground">Round-trip query benchmark</p>
          </CardContent>
        </Card>

        <Card className="border-white/[0.08] bg-[#071118]/90">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
            <span className="text-xs text-muted-foreground">Connection Pool</span>
            <Layers className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1">
            <div className="text-2xl font-black text-white font-mono">
              {health?.pool.total ?? 0} / {health?.pool.max ?? 10}
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">
              Idle: {health?.pool.idle ?? 0} • Waiting: {health?.pool.waiting ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/[0.08] bg-[#071118]/90">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
            <span className="text-xs text-muted-foreground">Last Snapshot Backup</span>
            <Archive className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1">
            <div className="text-sm font-bold text-white font-mono">
              {health?.lastBackup ? new Date(health.lastBackup.timestamp).toLocaleTimeString() : 'Recent'}
            </div>
            <p className="text-[11px] text-emerald-400 font-mono">
              Status: {health?.lastBackup.status || 'VERIFIED'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Maintenance Actions ─────────────────────────────────────────────── */}
      <Card className="border-white/[0.08] bg-[#071118]/90 shadow-xl">
        <CardHeader className="pb-3 border-b border-white/[0.06]">
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-purple-400" />
            Maintenance Operations & Cache Utilities
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/[0.06] bg-black/40 p-4 space-y-2">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Archive className="h-4 w-4 text-amber-400" />
                Create Snapshot Backup
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Take an immediate consistent point-in-time snapshot of application and user tables.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmAction('create_backup')}
                className="w-full text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
              >
                Execute Backup
              </Button>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-black/40 p-4 space-y-2">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                Clear System Cache
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Purge in-memory curriculum aliases, cache layers, and reset database prepared query pool.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmAction('clear_cache')}
                className="w-full text-xs border-primary/30 text-primary hover:bg-primary/10"
              >
                Purge Caches
              </Button>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-black/40 p-4 space-y-2">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Trash2 className="h-4 w-4 text-rose-400" />
                Review Soft-Deleted Records
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Inspect archived records ({health?.softDeletedCount || 0} soft-deleted posts) and deletion audit logs.
              </p>
              <Button
                size="sm"
                variant="outline"
                disabled={maintenanceLoading}
                onClick={() => handleRunMaintenance('review_soft_deleted')}
                className="w-full text-xs border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
              >
                Review Records
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Table Tuple Diagnostics ─────────────────────────────────────────── */}
      <Card className="border-white/[0.08] bg-[#071118]/90 overflow-hidden shadow-xl">
        <CardHeader className="pb-3 border-b border-white/[0.06]">
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            <Database className="h-4 w-4 text-purple-400" />
            Live Database Tables & Tuple Estimates
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-[#060c10] z-10">
                <tr className="border-b border-white/[0.08] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-2.5 px-4">Relation / Table Name</th>
                  <th className="py-2.5 px-4 text-right">Estimated Live Tuples</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {health?.tableStats.map((t) => (
                  <tr key={t.table_name} className="hover:bg-white/[0.02]">
                    <td className="py-2 px-4 font-mono text-white/90">{t.table_name}</td>
                    <td className="py-2 px-4 text-right font-mono text-primary font-bold">
                      {t.row_count} rows
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Confirmation Modal ──────────────────────────────────────────────── */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-purple-500/30 bg-[#091218] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white capitalize">
              Confirm Maintenance: {confirmAction.replace('_', ' ')}
            </h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              This high-impact operation will be recorded in the SuperAdmin audit log. Are you sure you wish to proceed?
            </p>
            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-white/[0.08]">
              <Button size="sm" variant="outline" onClick={() => setConfirmAction(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={maintenanceLoading}
                onClick={() => handleRunMaintenance(confirmAction)}
                className="text-xs bg-purple-500 hover:bg-purple-600 text-white font-semibold"
              >
                {maintenanceLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirm & Execute'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Soft-Deleted Review Modal ───────────────────────────────────────── */}
      {softDeletedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#091218] p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white">Soft-Deleted Records Review</h3>
              <button onClick={() => setSoftDeletedModal(null)} className="text-muted-foreground hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 pt-3 text-xs">
              {softDeletedModal.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">No soft-deleted records present.</p>
              ) : (
                softDeletedModal.map((item) => (
                  <div key={item.id} className="rounded-lg border border-white/[0.06] bg-black/40 p-3 space-y-1">
                    <p className="font-bold text-white">{item.title}</p>
                    <p className="text-[11px] text-rose-400 font-mono">Reason: {item.deleteReason || 'None recorded'}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      Deleted At: {new Date(item.deletedAt).toLocaleString('en-GB')}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-white/[0.08]">
              <Button size="sm" variant="outline" onClick={() => setSoftDeletedModal(null)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
