'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  LifeBuoy,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertOctagon,
  AlertTriangle,
  RefreshCw,
  X,
  Loader2,
  FileText,
  User,
  ArrowRight,
  Shield,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface TicketItem {
  id: string;
  ticketNumber: string;
  userId: string;
  category: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  adminNotes: string | null;
  resolvedBy: string | null;
  assignedTo: string | null;
  attachmentName: string | null;
  attachmentUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  reporterFirstName: string;
  reporterLastName: string;
  reporterEmail: string;
  reporterStudentId: string | null;
  assignedFirstName: string | null;
  assignedLastName: string | null;
}

const CATEGORIES = [
  'all',
  'Bug / Technical Issue',
  'Account & Login',
  'Feature Request',
  'Community Issue',
  'Event Issue',
  'Other',
];

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Detail Modal / Drawer state
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [editStatus, setEditStatus] = useState<string>('open');
  const [editPriority, setEditPriority] = useState<string>('medium');
  const [editAdminNotes, setEditAdminNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter, categoryFilter]);

  async function fetchTickets() {
    try {
      setRefreshing(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);

      const data = await api<TicketItem[]>(`/admin/tickets?${params.toString()}`);
      setTickets(data || []);
    } catch (err) {
      console.error('Failed to load support tickets:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchTickets();
  }

  function openTicketDetail(ticket: TicketItem) {
    setSelectedTicket(ticket);
    setEditStatus(ticket.status);
    setEditPriority(ticket.priority);
    setEditAdminNotes(ticket.adminNotes || '');
    setSaveSuccess(false);
    setSaveError(null);
  }

  async function handleSaveChanges(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTicket) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const updated = await api<TicketItem>(`/admin/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: editStatus,
          priority: editPriority,
          adminNotes: editAdminNotes.trim() || undefined,
        }),
      });

      setSaveSuccess(true);
      // Update in local list
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicket.id ? { ...t, ...updated } : t)),
      );
      setSelectedTicket((prev) => (prev ? { ...prev, ...updated } : null));
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update ticket changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickResolve() {
    if (!selectedTicket) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await api<TicketItem>(`/admin/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'resolved',
          priority: editPriority,
          adminNotes: editAdminNotes.trim() || selectedTicket.adminNotes || 'Issue addressed and resolved by administration.',
        }),
      });
      setEditStatus('resolved');
      setSaveSuccess(true);
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicket.id ? { ...t, ...updated } : t)),
      );
      setSelectedTicket((prev) => (prev ? { ...prev, ...updated } : null));
    } catch (err: any) {
      setSaveError(err.message || 'Failed to resolve ticket.');
    } finally {
      setSaving(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            Open
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
            <Clock className="h-3 w-3" />
            In Progress
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Resolved
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            Closed
          </span>
        );
      default:
        return <span className="text-xs text-muted-foreground capitalize">{status}</span>;
    }
  }

  function getPriorityBadge(priority: string) {
    switch (priority) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 rounded border border-rose-500/40 bg-rose-500/20 px-2 py-0.5 text-[11px] font-mono font-bold text-rose-300 animate-pulse">
            <AlertOctagon className="h-3 w-3 text-rose-400" />
            CRITICAL
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[11px] font-mono font-semibold text-amber-300">
            <AlertTriangle className="h-3 w-3 text-amber-400" />
            HIGH
          </span>
        );
      case 'medium':
        return (
          <span className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[11px] font-mono text-blue-300">
            MEDIUM
          </span>
        );
      case 'low':
      default:
        return (
          <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
            LOW
          </span>
        );
    }
  }

  return (
    <div className="space-y-6">
      {/* ─── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <LifeBuoy className="h-6 w-6 text-primary" />
            Support Tickets & Inquiries
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Centrally manage user-submitted bugs, account issues, and technical support requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTickets}
            disabled={refreshing}
            className="h-9 gap-1.5 text-xs border-white/[0.1] bg-black/40 hover:bg-white/[0.05]"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin text-primary' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ─── Search & Filters Bar ────────────────────────────────────────────── */}
      <Card className="border-white/[0.08] bg-[#071118]/80 p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ticket # (SS-1048), subject, reporter name, or email..."
              className="h-9 pl-9 text-xs border-white/[0.08] bg-black/40 text-foreground"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-lg border border-white/[0.08] bg-black/40 px-3 text-xs text-foreground focus:outline-none focus:border-primary/40"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-9 rounded-lg border border-white/[0.08] bg-black/40 px-3 text-xs text-foreground focus:outline-none focus:border-primary/40"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 rounded-lg border border-white/[0.08] bg-black/40 px-3 text-xs text-foreground focus:outline-none focus:border-primary/40"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.filter((c) => c !== 'all').map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <Button type="submit" size="sm" className="h-9 text-xs gap-1.5">
              Filter
            </Button>
          </div>
        </form>
      </Card>

      {/* ─── Tickets Table ───────────────────────────────────────────────────── */}
      <Card className="border-white/[0.08] bg-[#071118]/90 overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            No support tickets match the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-black/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Subject & Description</th>
                  <th className="py-3 px-4">Reporter</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => openTicketDetail(t)}
                    className="hover:bg-white/[0.02] transition cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                        #{t.ticketNumber}
                      </span>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-semibold text-white truncate group-hover:text-primary transition-colors">
                        {t.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate line-clamp-1">
                        {t.description}
                      </p>
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-medium text-white truncate">
                        {t.reporterFirstName} {t.reporterLastName}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">
                        {t.reporterEmail}
                      </p>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-[11px] rounded bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 text-muted-foreground">
                        {t.category}
                      </span>
                    </td>

                    <td className="py-3 px-4">{getPriorityBadge(t.priority)}</td>

                    <td className="py-3 px-4">{getStatusBadge(t.status)}</td>

                    <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                      {new Date(t.createdAt).toLocaleDateString('en-GB')}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openTicketDetail(t);
                        }}
                        className="h-7 text-[11px] border-white/[0.1] hover:bg-white/[0.05]"
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ─── Ticket Detail & Control Panel Drawer/Modal ──────────────────────── */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-2xl border border-white/[0.1] bg-[#091218] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-white/[0.08]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                    Ticket #{selectedTicket.ticketNumber}
                  </span>
                  {getStatusBadge(selectedTicket.status)}
                  {getPriorityBadge(selectedTicket.priority)}
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {selectedTicket.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="text-muted-foreground hover:text-white p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content & Metadata */}
            <div className="space-y-4 py-4 text-xs">
              {saveSuccess && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Ticket changes and internal notes successfully saved.
                </div>
              )}
              {saveError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">
                  {saveError}
                </div>
              )}

              {/* Reporter Info Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-white/[0.06] bg-black/40 p-3">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Reporter</span>
                  <span className="text-white font-semibold">
                    {selectedTicket.reporterFirstName} {selectedTicket.reporterLastName}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Email</span>
                  <span className="text-muted-foreground font-mono truncate block">
                    {selectedTicket.reporterEmail}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Student ID</span>
                  <span className="text-primary font-mono font-bold">
                    {selectedTicket.reporterStudentId || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Category</span>
                  <span className="text-white font-medium">{selectedTicket.category}</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                  Issue Description
                </span>
                <div className="rounded-xl border border-white/[0.08] bg-black/50 p-4 text-white leading-relaxed whitespace-pre-wrap text-xs">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Attachment if present */}
              {selectedTicket.attachmentName && (
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                    Submitted Attachment
                  </span>
                  <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-black/30 p-2.5 text-xs text-primary">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span>{selectedTicket.attachmentName}</span>
                  </div>
                </div>
              )}

              <div className="text-[11px] text-muted-foreground font-mono flex items-center justify-between pt-1">
                <span>Created: {new Date(selectedTicket.createdAt).toLocaleString('en-GB')}</span>
                <span>Last Updated: {new Date(selectedTicket.updatedAt).toLocaleString('en-GB')}</span>
              </div>

              {/* ─── Administrative Control Panel ───────────────────────────── */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-4 space-y-4 pt-4 mt-2">
                <div className="flex items-center justify-between border-b border-amber-500/10 pb-2">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <Shield className="h-3.5 w-3.5" />
                    Administrative Resolution Panel
                  </span>
                  <span className="text-[10px] text-muted-foreground">Admin Only</span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-white block mb-1">
                      Set Priority
                    </label>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                      className="w-full h-8 rounded-lg border border-white/[0.08] bg-black/50 px-2.5 text-xs text-foreground focus:outline-none focus:border-amber-500/40"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-white block mb-1">
                      Set Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full h-8 rounded-lg border border-white/[0.08] bg-black/50 px-2.5 text-xs text-foreground focus:outline-none focus:border-amber-500/40"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-white flex items-center justify-between mb-1">
                    <span>Internal Admin Notes</span>
                    <span className="text-[10px] text-muted-foreground">Not visible to student reporter</span>
                  </label>
                  <textarea
                    value={editAdminNotes}
                    onChange={(e) => setEditAdminNotes(e.target.value)}
                    rows={3}
                    placeholder="e.g. Investigated endpoint handler. Fixed parameter verification in user profile service."
                    className="w-full rounded-lg border border-white/[0.08] bg-black/50 p-2.5 text-xs text-foreground focus:outline-none focus:border-amber-500/40 placeholder:text-muted-foreground/60"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-amber-500/10">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving || editStatus === 'resolved'}
                    onClick={handleQuickResolve}
                    className="w-full sm:w-auto h-8 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Quick Resolve & Notify
                  </Button>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTicket(null)}
                      className="h-8 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={saving}
                      onClick={handleSaveChanges}
                      className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-1.5"
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
