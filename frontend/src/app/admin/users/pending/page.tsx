'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  UserCheck,
  UserX,
  CheckCircle2,
  Clock,
  ArrowLeft,
  RefreshCw,
  X,
  Loader2,
  AlertCircle,
  Eye,
  Shield,
  FileCheck,
} from 'lucide-react';

interface PendingUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  studentId: string | null;
  profilePicture: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function PendingApprovalsPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reject modal state
  const [rejectUser, setRejectUser] = useState<PendingUser | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  async function fetchPendingUsers() {
    try {
      setRefreshing(true);
      const data = await api<PendingUser[]>('/admin/users/pending');
      setPendingUsers(data || []);
    } catch (err) {
      console.error('Failed to load pending users:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleApprove(user: PendingUser) {
    setActionLoading(true);
    setFeedbackMessage(null);
    try {
      await api(`/admin/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      });
      setFeedbackMessage({
        type: 'success',
        text: `Successfully approved account for ${user.firstName} ${user.lastName}.`,
      });
      await fetchPendingUsers();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to approve account.',
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRejectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectUser) return;
    setActionLoading(true);
    setFeedbackMessage(null);
    try {
      await api(`/admin/users/${rejectUser.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'rejected',
          rejectionReason: rejectionReason.trim() || 'Could not verify student credentials.',
        }),
      });
      setFeedbackMessage({
        type: 'success',
        text: `Application for ${rejectUser.firstName} ${rejectUser.lastName} has been marked as rejected.`,
      });
      setRejectUser(null);
      setRejectionReason('');
      await fetchPendingUsers();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to reject account.',
      });
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ─── Breadcrumb & Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/admin/users" className="hover:text-white transition">
              User Management
            </Link>
            <span>/</span>
            <span className="text-amber-400 font-semibold">Pending Approvals</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <UserCheck className="h-6 w-6 text-amber-400" />
            Pending User Verification Queue
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Verify student identity, review credential identifiers, and grant verified platform privileges.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/users">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs border-white/[0.1] hover:bg-white/[0.05]">
              <ArrowLeft className="h-3.5 w-3.5" />
              All Users Directory
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPendingUsers}
            disabled={refreshing}
            className="h-9 gap-1.5 text-xs border-white/[0.1] bg-black/40 hover:bg-white/[0.05]"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {feedbackMessage && (
        <div
          className={`rounded-lg p-3 text-xs flex items-center gap-2 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {feedbackMessage.text}
        </div>
      )}

      {/* ─── Pending Users List ──────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h2 className="text-sm sm:text-base font-bold text-white">
              Awaiting Verification ({pendingUsers.length})
            </h2>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">Requires Admin Approval</span>
        </div>

        <Card className="border-white/[0.08] bg-[#071015]/85 overflow-hidden shadow-lg">
          <CardContent className="p-0">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-400/60 mx-auto" />
              <h3 className="text-sm font-bold text-white">All caught up!</h3>
              <p className="max-w-xs mx-auto">There are no pending student applications waiting for administrative review.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {pendingUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-white/[0.02] transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold shrink-0">
                      {u.firstName?.[0]}
                      {u.lastName?.[0]}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white text-sm truncate">
                          {u.firstName} {u.lastName}
                        </p>
                        <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.2 text-[10px] font-mono text-amber-300">
                          PENDING
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono truncate">{u.email}</p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                        <span className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                          ID: {u.studentId || 'Unspecified'}
                        </span>
                        <span>
                          Applied: {new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUser(u)}
                      className="h-8 text-xs border-white/[0.1] hover:bg-white/[0.05]"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRejectUser(u);
                        setRejectionReason('');
                      }}
                      className="h-8 text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                    >
                      <UserX className="h-3.5 w-3.5 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleApprove(u)}
                      className="h-8 text-xs bg-emerald-500 hover:bg-emerald-600 text-black font-bold"
                    >
                      <UserCheck className="h-3.5 w-3.5 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* ─── Modal: Reject Application Dialog ────────────────────────────────── */}
      {rejectUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#091218] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white">
                Reject Application: {rejectUser.firstName} {rejectUser.lastName}
              </h3>
              <button
                type="button"
                onClick={() => setRejectUser(null)}
                className="text-muted-foreground hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4 pt-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Provide an optional rejection reason explaining why the application could not be verified. This note will be recorded in the audit log and delivered to the user.
              </p>

              <div>
                <label className="text-xs font-semibold text-white">Rejection Reason</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Student ID number does not match registered campus records..."
                  rows={3}
                  className="mt-1 flex w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-xs text-foreground focus:outline-none focus:border-rose-500/40"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectUser(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={actionLoading}
                  className="text-xs bg-rose-500 hover:bg-rose-600 text-white font-semibold"
                >
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirm Rejection'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: User Details ─────────────────────────────────────────────── */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#091218] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white">Pending Verification Details</h3>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="text-muted-foreground hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 pt-3 text-xs">
              <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3 space-y-2">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Full Name</span>
                  <span className="text-white font-semibold">{selectedUser.firstName} {selectedUser.lastName}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Email</span>
                  <span className="text-white font-mono">{selectedUser.email}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Student / Campus ID</span>
                  <span className="text-primary font-mono font-bold">{selectedUser.studentId || 'None Provided'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Registration Timestamp</span>
                  <span className="text-muted-foreground font-mono">{new Date(selectedUser.createdAt).toLocaleString('en-GB')}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-white/[0.08]">
              <Button size="sm" variant="outline" onClick={() => setSelectedUser(null)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
