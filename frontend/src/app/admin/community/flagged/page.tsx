'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Flag,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  UserX,
  Trash2,
  RefreshCw,
  X,
  Loader2,
  Clock,
  ShieldAlert,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';

interface FlaggedPost {
  id: string;
  title: string;
  body: string;
  flagCount: number;
  isHidden: boolean;
  createdAt: string;
  authorFirstName: string;
  authorLastName: string;
  authorEmail: string;
}

interface ComplaintQueueItem {
  id: string;
  complaintNumber: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reporterFirstName: string | null;
  reporterLastName: string | null;
  reporterEmail: string | null;
}

interface FlaggedData {
  flaggedPosts: FlaggedPost[];
  complaintsQueue: ComplaintQueueItem[];
}

export default function FlaggedContentPage() {
  const [data, setData] = useState<FlaggedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Detail Modal state
  const [activeItem, setActiveItem] = useState<{
    type: 'post' | 'complaint';
    item: any;
  } | null>(null);

  useEffect(() => {
    fetchFlagged();
  }, []);

  async function fetchFlagged() {
    try {
      setRefreshing(true);
      const res = await api<FlaggedData>('/admin/community/flagged');
      setData(res);
    } catch (err) {
      console.error('Failed to load flagged queue:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleDismissComplaint(id: string) {
    setActionLoading(true);
    try {
      await api(`/admin/complaints/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'dismissed', actionTaken: 'Dismissed by moderator as benign' }),
      });
      setMessage({ type: 'success', text: 'Report dismissed.' });
      setActiveItem(null);
      await fetchFlagged();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Action failed.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleTakeActionOnComplaint(id: string, actionType: string) {
    setActionLoading(true);
    try {
      await api(`/admin/complaints/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'action_taken', actionTaken: actionType }),
      });
      setMessage({ type: 'success', text: `Enforced action: ${actionType}` });
      setActiveItem(null);
      await fetchFlagged();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Action failed.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleHidePost(postId: string) {
    setActionLoading(true);
    try {
      await api(`/admin/posts/${postId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isHidden: true }),
      });
      setMessage({ type: 'success', text: 'Post hidden from community.' });
      setActiveItem(null);
      await fetchFlagged();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Action failed.' });
    } finally {
      setActionLoading(false);
    }
  }

  const flaggedPosts = data?.flaggedPosts || [];
  const complaintsQueue = data?.complaintsQueue || [];

  return (
    <div className="space-y-6">
      {/* ─── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Flag className="h-6 w-6 text-rose-400" />
            Flagged & Inappropriate Content Queue
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Investigate reported user misconduct, harassment, spam, and flagged forum discussions before enforcement.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/community/posts">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs border-white/[0.1] hover:bg-white/[0.05]">
              Community Posts
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFlagged}
            disabled={refreshing}
            className="h-9 gap-1.5 text-xs border-white/[0.1] bg-black/40 hover:bg-white/[0.05]"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin text-rose-400' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg p-3 text-xs flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ─── Reported User Misconduct / Complaints Queue ──────────────────────── */}
      <Card className="border-white/[0.08] bg-[#071118]/90 overflow-hidden shadow-xl">
        <CardHeader className="pb-3 border-b border-white/[0.06] flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            Reported Violations Awaiting Moderator Review ({complaintsQueue.length})
          </CardTitle>
          <span className="text-[11px] text-muted-foreground font-mono">Context Review Required</span>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-36 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-rose-400" />
            </div>
          ) : complaintsQueue.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No pending user reports in the queue.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {complaintsQueue.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-white/[0.02] transition"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                        #{c.complaintNumber}
                      </span>
                      <span className="rounded bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 text-[10px] uppercase font-mono text-muted-foreground">
                        Target: {c.targetType}
                      </span>
                      <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono text-amber-300">
                        {c.reason}
                      </span>
                    </div>
                    <p className="text-xs text-white font-medium">{c.details || 'No additional details provided.'}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      Reporter: {c.reporterFirstName ? `${c.reporterFirstName} ${c.reporterLastName}` : 'Anonymous'} (
                      {c.reporterEmail || 'N/A'}) • {new Date(c.createdAt).toLocaleDateString('en-GB')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveItem({ type: 'complaint', item: c })}
                      className="h-8 text-xs border-white/[0.1] hover:bg-white/[0.05]"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Inspect Context
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleDismissComplaint(c.id)}
                      className="h-8 text-xs border-zinc-500/30 text-zinc-400 hover:bg-zinc-500/10"
                    >
                      Dismiss
                    </Button>
                    <Button
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleTakeActionOnComplaint(c.id, 'Warned User & Logged Infraction')}
                      className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                    >
                      Warn User
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── High Flag Count Forum Posts ─────────────────────────────────────── */}
      <Card className="border-white/[0.08] bg-[#071118]/90 overflow-hidden shadow-xl">
        <CardHeader className="pb-3 border-b border-white/[0.06] flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-rose-400" />
            Flagged Forum Threads ({flaggedPosts.length})
          </CardTitle>
          <span className="text-[11px] text-muted-foreground font-mono">Flag Threshold Exceeded</span>
        </CardHeader>
        <CardContent className="p-0">
          {flaggedPosts.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No community posts have active flags.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {flaggedPosts.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-white/[0.02] transition"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-400">
                        {p.flagCount} FLAGS
                      </span>
                      {p.isHidden && (
                        <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono text-amber-300">
                          CURRENTLY HIDDEN
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-white truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{p.body}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      Author: {p.authorFirstName} {p.authorLastName} ({p.authorEmail})
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveItem({ type: 'post', item: p })}
                      className="h-8 text-xs border-white/[0.1] hover:bg-white/[0.05]"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Review
                    </Button>
                    {!p.isHidden && (
                      <Button
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => handleHidePost(p.id)}
                        className="h-8 text-xs bg-rose-500 hover:bg-rose-600 text-white font-semibold"
                      >
                        <EyeOff className="h-3.5 w-3.5 mr-1" />
                        Hide Content
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Inspection Modal ────────────────────────────────────────────────── */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#091218] p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white">
                Inspect Context: {activeItem.type === 'post' ? 'Forum Post' : 'Complaint #' + activeItem.item.complaintNumber}
              </h3>
              <button onClick={() => setActiveItem(null)} className="text-muted-foreground hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 pt-3 text-xs">
              <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3 space-y-2">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Subject / Title</span>
                  <span className="text-white font-bold">{activeItem.item.title || activeItem.item.reason}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Details / Content</span>
                  <span className="text-white leading-relaxed whitespace-pre-wrap block">
                    {activeItem.item.body || activeItem.item.details || 'No content.'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-4 border-t border-white/[0.08]">
                {activeItem.type === 'complaint' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDismissComplaint(activeItem.item.id)}
                      className="text-xs"
                    >
                      Dismiss Report
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleTakeActionOnComplaint(activeItem.item.id, 'Formal Written Warning Issued')}
                      className="text-xs bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                    >
                      Warn User
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleTakeActionOnComplaint(activeItem.item.id, 'Target Content Removed / Suspended')}
                      className="text-xs bg-rose-500 hover:bg-rose-600 text-white font-semibold"
                    >
                      Enforce Removal
                    </Button>
                  </>
                )}
                {activeItem.type === 'post' && (
                  <Button
                    size="sm"
                    onClick={() => handleHidePost(activeItem.item.id)}
                    className="text-xs bg-rose-500 hover:bg-rose-600 text-white font-semibold"
                  >
                    Hide from Feed
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
