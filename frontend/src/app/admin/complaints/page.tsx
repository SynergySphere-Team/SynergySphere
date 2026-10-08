'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCw,
  X,
  Loader2,
  User,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

interface ComplaintItem {
  id: string;
  complaintNumber: string;
  reporterId: string | null;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  status: 'pending' | 'reviewed' | 'dismissed' | 'action_taken';
  moderatorId: string | null;
  actionTaken: string | null;
  createdAt: string;
  updatedAt: string;
  reporterFirstName: string | null;
  reporterLastName: string | null;
  reporterEmail: string | null;
  moderatorFirstName: string | null;
  moderatorLastName: string | null;
}

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState('all');

  // Detail Modal state
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintItem | null>(null);
  const [actionType, setActionType] = useState('reviewed');
  const [actionNotes, setActionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter, targetTypeFilter]);

  async function fetchComplaints() {
    try {
      setRefreshing(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (targetTypeFilter !== 'all') params.set('targetType', targetTypeFilter);

      const data = await api<ComplaintItem[]>(`/admin/complaints?${params.toString()}`);
      setComplaints(data || []);
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleUpdateComplaint(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedComplaint) return;
    setActionLoading(true);
    setFeedback(null);

    try {
      const updated = await api<ComplaintItem>(`/admin/complaints/${selectedComplaint.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: actionType,
          actionTaken: actionNotes.trim() || undefined,
        }),
      });

      setComplaints((prev) =>
        prev.map((c) => (c.id === selectedComplaint.id ? { ...c, ...updated } : c)),
      );
      setSelectedComplaint(null);
      setFeedback(`Complaint #${selectedComplaint.complaintNumber} updated successfully.`);
    } catch (err: any) {
      alert(err.message || 'Failed to update complaint.');
    } finally {
      setActionLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case 'reviewed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-400">
            Reviewed
          </span>
        );
      case 'action_taken':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Action Taken
          </span>
        );
      case 'dismissed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            Dismissed
          </span>
        );
      default:
        return <span className="text-xs text-muted-foreground capitalize">{status}</span>;
    }
  }

  return (
    <div className="space-y-6">
      {/* ─── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <AlertTriangle className="h-6 w-6 text-orange-400" />
            Community Complaints & Misconduct Queue
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Dedicated queue for harassment, spam, and code-of-conduct violations — completely separated from technical support tickets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchComplaints}
            disabled={refreshing}
            className="h-9 gap-1.5 text-xs border-white/[0.1] bg-black/40 hover:bg-white/[0.05]"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin text-orange-400' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400 flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-emerald-400 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ─── Filters Bar ─────────────────────────────────────────────────────── */}
      <Card className="border-white/[0.08] bg-[#071118]/80 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-lg border border-white/[0.08] bg-black/40 px-3 text-xs text-foreground focus:outline-none focus:border-orange-500/40"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="action_taken">Action Taken</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Target Type:</span>
            <select
              value={targetTypeFilter}
              onChange={(e) => setTargetTypeFilter(e.target.value)}
              className="h-9 rounded-lg border border-white/[0.08] bg-black/40 px-3 text-xs text-foreground focus:outline-none focus:border-orange-500/40"
            >
              <option value="all">All Targets</option>
              <option value="post">Post</option>
              <option value="comment">Comment</option>
              <option value="user">User</option>
              <option value="event">Event</option>
            </select>
          </div>
        </div>
      </Card>

      {/* ─── Complaints Table ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <h2 className="text-sm sm:text-base font-bold text-white">
              Community Misconduct Complaints ({complaints.length})
            </h2>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">Policy violation reports</span>
        </div>

        <Card className="border-white/[0.08] bg-[#071015]/85 overflow-hidden shadow-lg">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            No complaints found matching the criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-black/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4">Complaint ID</th>
                  <th className="py-3 px-4">Target Type</th>
                  <th className="py-3 px-4">Reason & Details</th>
                  <th className="py-3 px-4">Reporter</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Action Taken</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">
                        #{c.complaintNumber}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="rounded bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 text-[10px] uppercase font-mono text-muted-foreground">
                        {c.targetType}
                      </span>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-semibold text-white truncate">{c.reason}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 truncate">
                        {c.details || 'No additional details.'}
                      </p>
                    </td>

                    <td className="py-3 px-4">
                      <p className="text-white font-medium truncate">
                        {c.reporterFirstName ? `${c.reporterFirstName} ${c.reporterLastName}` : 'Anonymous'}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">{c.reporterEmail || 'N/A'}</p>
                    </td>

                    <td className="py-3 px-4">{getStatusBadge(c.status)}</td>

                    <td className="py-3 px-4 text-[11px] text-muted-foreground max-w-xs truncate">
                      {c.actionTaken || <span className="opacity-40">None yet</span>}
                    </td>

                    <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                      {new Date(c.createdAt).toLocaleDateString('en-GB')}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedComplaint(c);
                          setActionType(c.status === 'pending' ? 'reviewed' : c.status);
                          setActionNotes(c.actionTaken || '');
                        }}
                        className="h-7 text-[11px] border-white/[0.1] hover:bg-white/[0.05]"
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      </div>

      {/* ─── Complaint Inspection & Resolution Modal ─────────────────────────── */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#091218] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="space-y-1">
                <span className="font-mono text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">
                  Complaint #{selectedComplaint.complaintNumber}
                </span>
                <h3 className="text-base font-bold text-white">{selectedComplaint.reason}</h3>
              </div>
              <button onClick={() => setSelectedComplaint(null)} className="text-muted-foreground hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateComplaint} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/[0.06] bg-black/40 p-3">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Target Category</span>
                  <span className="text-white font-mono uppercase">{selectedComplaint.targetType}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Target ID</span>
                  <span className="text-primary font-mono truncate block">{selectedComplaint.targetId}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Reporter</span>
                  <span className="text-white">
                    {selectedComplaint.reporterFirstName ? `${selectedComplaint.reporterFirstName} ${selectedComplaint.reporterLastName}` : 'Anonymous'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Date Filed</span>
                  <span className="text-muted-foreground font-mono">{new Date(selectedComplaint.createdAt).toLocaleString('en-GB')}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                  Report Particulars & Context
                </span>
                <div className="rounded-xl border border-white/[0.08] bg-black/50 p-3 text-white leading-relaxed whitespace-pre-wrap">
                  {selectedComplaint.details || 'No further details submitted.'}
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                <div>
                  <label className="text-xs font-semibold text-white block mb-1">Set Resolution Status</label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    className="w-full h-8 rounded-lg border border-white/[0.08] bg-black/40 px-3 text-xs text-foreground focus:outline-none focus:border-orange-500/40"
                  >
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed (No further action)</option>
                    <option value="action_taken">Action Taken (Warning / Removal)</option>
                    <option value="dismissed">Dismissed (Unsubstantiated)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-white block mb-1">Action & Resolution Notes</label>
                  <textarea
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    rows={2}
                    placeholder="e.g. Content removed and formal reminder issued to user."
                    className="w-full rounded-lg border border-white/[0.08] bg-black/40 p-2 text-xs text-foreground focus:outline-none focus:border-orange-500/40"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedComplaint(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={actionLoading}
                  className="bg-orange-500 hover:bg-orange-600 text-black font-semibold"
                >
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save Determination'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
