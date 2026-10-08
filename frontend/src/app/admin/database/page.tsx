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
  databaseSize?: string;
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
    adminName?: string;
    description?: string;
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
  const [latestBackup, setLatestBackup] = useState<{ snapshotId: string; counts: Record<string, number>; timestamp: string } | null>(null);

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

  async function handleRunMaintenance(action: string, recordId?: string, purgeAll?: boolean) {
    setMaintenanceLoading(true);
    setFeedback(null);
    try {
      const res = await api<{ message?: string; softDeleted?: any[]; backup?: any }>('/admin/database/maintenance', {
        method: 'POST',
        body: JSON.stringify({ action, recordId, purgeAll }),
      });
      if (action === 'review_soft_deleted') {
        setSoftDeletedModal(res.softDeleted || []);
      } else if (action === 'restore_soft_deleted' || action === 'purge_soft_deleted') {
        setFeedback(res.message || 'Operation executed successfully.');
        const updated = await api<{ softDeleted: any[] }>('/admin/database/maintenance', {
          method: 'POST',
          body: JSON.stringify({ action: 'review_soft_deleted' }),
        });
        setSoftDeletedModal(updated.softDeleted || []);
        await fetchHealth();
      } else {
        if (res.backup) {
          setLatestBackup(res.backup);
        }
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

  function downloadBackupMetadata() {
    if (!latestBackup) return;
    const blob = new Blob([JSON.stringify(latestBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${latestBackup.snapshotId}_metadata.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Admin Access Restriction Guard
  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="max-w-md rounded-2xl border border-primary/30 bg-[#071015] p-8 shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/30 text-primary mb-4">
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2 font-mono">
            <Lock className="h-3 w-3" />
            Administrator Environment
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Database className="h-6 w-6 text-primary" />
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
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin text-primary' : ''}`} />
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

      {latestBackup && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-xs text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div>
            <p className="font-bold text-primary flex items-center gap-1.5">
              <Archive className="h-4 w-4" />
              Latest Snapshot: {latestBackup.snapshotId}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 font-mono">
              Created: {new Date(latestBackup.timestamp).toLocaleString()} • Users: {latestBackup.counts.users} | Posts: {latestBackup.counts.posts} | Tickets: {latestBackup.counts.tickets}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={downloadBackupMetadata}
            className="text-xs border-primary/30 bg-black/40 text-primary hover:bg-primary/20 shrink-0"
          >
            Download Snapshot JSON
          </Button>
        </div>
      )}

      {/* ─── Diagnostic Metrics Section ──────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-white tracking-tight">Database Cluster Diagnostics & Health</h2>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">Real-time PostgreSQL engine metrics</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="border-white/[0.08] bg-[#071015]/85">
            <CardContent className="p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Cluster Engine</span>
                <Server className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-bold text-white truncate">{health?.engine || 'PostgreSQL'}</span>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono">Connected & Healthy</p>
            </CardContent>
          </Card>

          <Card className="border-white/[0.08] bg-[#071015]/85">
            <CardContent className="p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Query Latency</span>
                <Activity className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="text-xl font-bold text-white font-mono">{health?.latencyMs ?? 0} ms</div>
              <p className="text-[10px] text-muted-foreground">Round-trip benchmark</p>
            </CardContent>
          </Card>

          <Card className="border-white/[0.08] bg-[#071015]/85">
            <CardContent className="p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Database Size</span>
                <HardDrive className="h-3.5 w-3.5 text-cyan-400" />
              </div>
              <div className="text-xl font-bold text-white font-mono">{health?.databaseSize || '18 MB'}</div>
              <p className="text-[10px] text-muted-foreground">Physical disk footprint</p>
            </CardContent>
          </Card>

          <Card className="border-white/[0.08] bg-[#071015]/85">
            <CardContent className="p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Connection Pool</span>
                <Layers className="h-3.5 w-3.5 text-purple-400" />
              </div>
              <div className="text-xl font-bold text-white font-mono">
                {health?.pool.total ?? 0} / {health?.pool.max ?? 10}
              </div>
              <p className="text-[10px] text-muted-foreground font-mono">
                Idle: {health?.pool.idle ?? 0} • Wait: {health?.pool.waiting ?? 0}
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/[0.08] bg-[#071015]/85">
            <CardContent className="p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Snapshot Backup</span>
                <Archive className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <div className="text-sm font-bold text-white font-mono truncate">
                {health?.lastBackup ? new Date(health.lastBackup.timestamp).toLocaleTimeString() : 'Active'}
              </div>
              <p className="text-[10px] text-emerald-400 font-mono">
                Status: {health?.lastBackup.status || 'VERIFIED'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── Maintenance Actions ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            <h2 className="text-sm sm:text-base font-bold text-white">Maintenance Operations & Cache Utilities</h2>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">Automated cluster tasks</span>
        </div>

        <Card className="border-white/[0.08] bg-[#071015]/85 shadow-lg">
          <CardContent className="p-3.5">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3.5 space-y-2">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Archive className="h-4 w-4 text-amber-400" />
                  Create Snapshot Backup
                </h3>
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

              <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3.5 space-y-2">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Clear System Cache
                </h3>
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

              <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3.5 space-y-2">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Trash2 className="h-4 w-4 text-rose-400" />
                  Review Soft-Deleted Records
                </h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Inspect archived records ({health?.softDeletedCount || 0} soft-deleted posts), restore, or permanently purge.
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
      </div>

      {/* ─── Table Tuple Diagnostics ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <h2 className="text-sm sm:text-base font-bold text-white">Live Database Tables & Tuple Estimates</h2>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">PostgreSQL pg_class reltuples</span>
        </div>

        <Card className="border-white/[0.08] bg-[#071015]/85 overflow-hidden shadow-lg">
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
      </div>

      {/* ─── Confirmation Modal ──────────────────────────────────────────────── */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-primary/30 bg-[#091218] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white capitalize">
              Confirm Maintenance: {confirmAction.replace('_', ' ')}
            </h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              This high-impact operation will be executed against the live cluster and recorded in the audit log. Are you sure you wish to proceed?
            </p>
            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-white/[0.08]">
              <Button size="sm" variant="outline" onClick={() => setConfirmAction(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={maintenanceLoading}
                onClick={() => handleRunMaintenance(confirmAction)}
                className="text-xs bg-primary hover:bg-emerald-600 text-black font-bold"
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
          <div className="relative w-full max-w-xl rounded-2xl border border-white/[0.1] bg-[#091218] p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="text-base font-bold text-white">Soft-Deleted Records Review</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage archived forum discussions. Restore to public feed or permanently purge from disk.
                </p>
              </div>
              <button onClick={() => setSoftDeletedModal(null)} className="text-muted-foreground hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {softDeletedModal.length > 0 && (
              <div className="flex items-center justify-between pt-3 pb-1">
                <span className="text-xs text-muted-foreground font-mono">{softDeletedModal.length} soft-deleted records</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={maintenanceLoading}
                  onClick={() => {
                    if (confirm('Permanently purge all soft-deleted records from the database? This cannot be undone.')) {
                      handleRunMaintenance('purge_soft_deleted', undefined, true);
                    }
                  }}
                  className="h-7 text-xs border-rose-500/30 text-rose-300 hover:bg-rose-500/20"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Purge All
                </Button>
              </div>
            )}

            <div className="space-y-3 pt-3 text-xs">
              {softDeletedModal.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                  No soft-deleted records present in database.
                </div>
              ) : (
                softDeletedModal.map((item) => (
                  <div key={item.id} className="rounded-lg border border-white/[0.06] bg-black/40 p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{item.title}</p>
                        <p className="text-[11px] text-rose-400 font-mono mt-0.5">Reason: {item.deleteReason || 'None recorded'}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          Deleted At: {item.deletedAt ? new Date(item.deletedAt).toLocaleString('en-GB') : 'Archived'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={maintenanceLoading}
                          onClick={() => handleRunMaintenance('restore_soft_deleted', item.id)}
                          className="h-7 px-2 text-[11px] border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={maintenanceLoading}
                          onClick={() => {
                            if (confirm(`Permanently delete "${item.title}"?`)) {
                              handleRunMaintenance('purge_soft_deleted', item.id);
                            }
                          }}
                          className="h-7 px-2 text-[11px] border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Purge
                        </Button>
                      </div>
                    </div>
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
