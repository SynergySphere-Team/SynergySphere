'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, isSuperAdmin, isAdmin } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  Filter,
  UserCheck,
  UserX,
  Shield,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCw,
  X,
  Loader2,
  FileText,
  LifeBuoy,
} from 'lucide-react';

interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  studentId: string | null;
  profilePicture: string | null;
  xp: number;
  level: number;
  createdAt: string;
  updatedAt: string;
  rejectionReason: string | null;
  ticketCount: number;
  complaintCount: number;
}

export default function UsersManagementPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [roleModalUser, setRoleModalUser] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState('user');
  const [roleSaving, setRoleSaving] = useState(false);

  const [statusAction, setStatusAction] = useState<{
    user: AdminUser;
    type: 'suspend' | 'activate' | 'reject' | 'approve';
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  async function fetchUsers() {
    try {
      setRefreshing(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const data = await api<AdminUser[]>(`/admin/users?${params.toString()}`);
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchUsers();
  }

  async function handleUpdateRole(e: React.FormEvent) {
    e.preventDefault();
    if (!roleModalUser) return;
    setRoleSaving(true);
    setModalError(null);

    try {
      await api(`/admin/users/${roleModalUser.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      setRoleModalUser(null);
      await fetchUsers();
    } catch (err: any) {
      setModalError(err.message || 'Failed to update user role.');
    } finally {
      setRoleSaving(false);
    }
  }

  async function handleConfirmStatusAction(e: React.FormEvent) {
    e.preventDefault();
    if (!statusAction) return;
    setStatusSaving(true);
    setModalError(null);

    const targetStatus =
      statusAction.type === 'approve' || statusAction.type === 'activate'
        ? 'active'
        : statusAction.type === 'suspend'
        ? 'suspended'
        : 'rejected';

    try {
      await api(`/admin/users/${statusAction.user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: targetStatus,
          rejectionReason: actionReason.trim() || undefined,
        }),
      });
      setStatusAction(null);
      setActionReason('');
      await fetchUsers();
    } catch (err: any) {
      setModalError(err.message || 'Failed to update status.');
    } finally {
      setStatusSaving(false);
    }
  }

  const isSuper = isSuperAdmin(currentUser);

  function getStatusBadge(status: string) {
    const s = status.toLowerCase();
    switch (s) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Active
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-400">
            <UserX className="h-3 w-3" />
            Suspended
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-zinc-500/30 bg-zinc-500/10 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
            Rejected
          </span>
        );
      default:
        return <span className="text-xs text-muted-foreground capitalize">{status}</span>;
    }
  }

  function getRoleBadge(role: string) {
    const r = role.toUpperCase();
    if (r === 'SUPERADMIN') {
      return (
        <span className="rounded border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[11px] font-mono font-bold text-purple-300">
          SuperAdmin
        </span>
      );
    }
    if (r === 'ADMIN') {
      return (
        <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-mono font-bold text-amber-300">
          Admin
        </span>
      );
    }
    if (r === 'MODERATOR') {
      return (
        <span className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[11px] font-mono font-bold text-blue-300">
          Moderator
        </span>
      );
    }
    return (
      <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
        User
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Users className="h-6 w-6 text-amber-400" />
            User Management & Directory
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Browse verified accounts, inspect student IDs, review roles, and manage access privileges.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/users/pending">
            <Button size="sm" className="gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-black font-bold">
              <UserCheck className="h-3.5 w-3.5" />
              Pending Approvals Queue
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            disabled={refreshing}
            className="h-9 gap-1.5 text-xs border-white/[0.1] bg-black/40 hover:bg-white/[0.05]"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ─── Search & Filters Bar ────────────────────────────────────────────── */}
      <Card className="border-white/[0.08] bg-[#071015]/85 p-3.5 shadow-md">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by full name, email, student ID (STU-...), or UUID..."
              className="h-9 pl-9 text-xs border-white/[0.08] bg-black/40 text-foreground"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 rounded-lg border border-white/[0.08] bg-black/40 px-3 text-xs text-foreground focus:outline-none focus:border-primary/40"
            >
              <option value="all">All Roles</option>
              <option value="superadmin">SuperAdmin</option>
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
              <option value="student">User / Student</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-lg border border-white/[0.08] bg-black/40 px-3 text-xs text-foreground focus:outline-none focus:border-primary/40"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="rejected">Rejected</option>
            </select>

            <Button type="submit" size="sm" className="h-9 text-xs gap-1.5">
              Filter
            </Button>
          </div>
        </form>
      </Card>

      {/* ─── Users Table ─────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-sm sm:text-base font-bold text-white">
              Registered User Accounts ({users.length})
            </h2>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">Platform directory</span>
        </div>

        <Card className="border-white/[0.08] bg-[#071015]/85 overflow-hidden shadow-lg">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            No users found matching your search and filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-black/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-4">Student / User ID</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Activity & Tickets</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {users.map((u) => {
                  const isCurrentSuper = u.role.toUpperCase() === 'SUPERADMIN';
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition">
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary shrink-0">
                            {u.firstName?.[0] || 'U'}
                            {u.lastName?.[0] || ''}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate">
                              {u.firstName} {u.lastName}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate font-mono">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Student ID */}
                      <td className="py-3 px-4 font-mono text-muted-foreground">
                        {u.studentId || <span className="opacity-40">—</span>}
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">{getRoleBadge(u.role)}</td>

                      {/* Status */}
                      <td className="py-3 px-4">{getStatusBadge(u.status)}</td>

                      {/* Activity & Stats */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                            title="Submitted Tickets"
                          >
                            <LifeBuoy className="h-3 w-3 text-blue-400" />
                            {u.ticketCount}
                          </span>
                          <span
                            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                            title="Complaints Filed"
                          >
                            <AlertTriangle className="h-3 w-3 text-orange-400" />
                            {u.complaintCount}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60 font-mono">
                            Lvl {u.level}
                          </span>
                        </div>
                      </td>

                      {/* Registration Date */}
                      <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString('en-GB')}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUser(u)}
                            className="h-7 px-2 text-[11px] border-white/[0.1] hover:bg-white/[0.05]"
                            title="View Full Profile & Diagnostics"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>

                          {/* Edit Role (Only if caller has authority) */}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isCurrentSuper && !isSuper}
                            onClick={() => {
                              setRoleModalUser(u);
                              setNewRole(u.role.toLowerCase());
                              setModalError(null);
                            }}
                            className="h-7 px-2 text-[11px] border-white/[0.1] hover:bg-white/[0.05] text-amber-400"
                            title="Edit Role"
                          >
                            <Shield className="h-3 w-3" />
                          </Button>

                          {/* Status Actions */}
                          {u.status === 'pending' ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                setStatusAction({ user: u, type: 'approve' });
                                setActionReason('');
                                setModalError(null);
                              }}
                              className="h-7 px-2 text-[11px] bg-emerald-500 hover:bg-emerald-600 text-black font-semibold"
                            >
                              Approve
                            </Button>
                          ) : u.status === 'suspended' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setStatusAction({ user: u, type: 'activate' });
                                setActionReason('');
                                setModalError(null);
                              }}
                              className="h-7 px-2 text-[11px] border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                            >
                              Activate
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isCurrentSuper && !isSuper}
                              onClick={() => {
                                setStatusAction({ user: u, type: 'suspend' });
                                setActionReason('');
                                setModalError(null);
                              }}
                              className="h-7 px-2 text-[11px] border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                              title="Suspend Account"
                            >
                              Suspend
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      </div>

      {/* ─── Modal 1: Edit Role Modal ────────────────────────────────────────── */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#091218] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Modify User Role</h3>
                  <p className="text-xs text-muted-foreground font-mono">{roleModalUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRoleModalUser(null)}
                className="text-muted-foreground hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateRole} className="space-y-4 pt-4">
              {modalError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  {modalError}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-white">Current Role</label>
                <div className="mt-1">{getRoleBadge(roleModalUser.role)}</div>
              </div>

              <div>
                <label className="text-xs font-semibold text-white">Assign New Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="mt-1 flex w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-xs text-foreground focus:outline-none focus:border-amber-500/40"
                >
                  <option value="user">User / Student</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Administrator</option>
                  {isSuper && <option value="superadmin">SuperAdmin</option>}
                </select>
                <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                  Every role modification is recorded in the platform audit trail. Administrators cannot assign permissions exceeding their own authority.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRoleModalUser(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={roleSaving}
                  className="text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-black"
                >
                  {roleSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirm Role Change'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal 2: Status Action Confirmation Dialog ──────────────────────── */}
      {statusAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#091218] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white capitalize">
                {statusAction.type} Account: {statusAction.user.firstName} {statusAction.user.lastName}
              </h3>
              <button
                type="button"
                onClick={() => setStatusAction(null)}
                className="text-muted-foreground hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmStatusAction} className="space-y-4 pt-3">
              {modalError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  {modalError}
                </div>
              )}

              <p className="text-xs text-muted-foreground leading-relaxed">
                {statusAction.type === 'suspend'
                  ? 'Suspending this account will immediately revoke login sessions and notify the user.'
                  : statusAction.type === 'reject'
                  ? 'Rejecting this pending application will log the reason and notify the applicant.'
                  : statusAction.type === 'approve'
                  ? 'Approving this pending account grants active platform privileges and notifies the user.'
                  : 'Re-activating this account restores full platform login capability.'}
              </p>

              {(statusAction.type === 'suspend' || statusAction.type === 'reject') && (
                <div>
                  <label className="text-xs font-semibold text-white">Reason (Required for audit log)</label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Provide specific administrative rationale..."
                    rows={3}
                    className="mt-1 flex w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-xs text-foreground focus:outline-none focus:border-amber-500/40"
                    required
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusAction(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={statusSaving}
                  className={`text-xs font-semibold ${
                    statusAction.type === 'suspend' || statusAction.type === 'reject'
                      ? 'bg-rose-500 hover:bg-rose-600 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-black'
                  }`}
                >
                  {statusSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirm Action'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal 3: User Details Drawer/Modal ──────────────────────────────── */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#091218] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 border border-primary/30 text-sm font-bold text-primary">
                  {selectedUser.firstName?.[0]}
                  {selectedUser.lastName?.[0]}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">{selectedUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="text-muted-foreground hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/[0.06] bg-black/40 p-3">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Student ID</span>
                  <span className="text-white font-mono">{selectedUser.studentId || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Role</span>
                  <div className="mt-0.5">{getRoleBadge(selectedUser.role)}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Account Status</span>
                  <div className="mt-0.5">{getStatusBadge(selectedUser.status)}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Gamification XP</span>
                  <span className="text-primary font-mono font-bold">
                    {selectedUser.xp} XP (Level {selectedUser.level})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-white/[0.06] bg-black/30 p-3">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Support Tickets</span>
                  <span className="text-lg font-bold text-white font-mono">{selectedUser.ticketCount}</span>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-black/30 p-3">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Complaints Logged</span>
                  <span className="text-lg font-bold text-white font-mono">{selectedUser.complaintCount}</span>
                </div>
              </div>

              {selectedUser.rejectionReason && (
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-rose-300">
                  <span className="font-semibold block mb-0.5">Policy / Rejection Note:</span>
                  <span>{selectedUser.rejectionReason}</span>
                </div>
              )}
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
