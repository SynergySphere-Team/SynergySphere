'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MessageSquare,
  Search,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Flag,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Loader2,
  Clock,
  Shield,
  ArrowRight,
} from 'lucide-react';

interface AdminPost {
  id: string;
  channelId: string | null;
  userId: string;
  title: string;
  body: string;
  tags: string | null;
  isSolved: boolean;
  isHidden: boolean;
  isLocked: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  deleteReason: string | null;
  flagCount: number;
  createdAt: string;
  updatedAt: string;
  authorFirstName: string;
  authorLastName: string;
  authorEmail: string;
  authorRole: string;
  channelName: string | null;
  replyCount: number;
}

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [flagFilter, setFlagFilter] = useState('all');

  // Modals state
  const [selectedPost, setSelectedPost] = useState<AdminPost | null>(null);
  const [deleteModalPost, setDeleteModalPost] = useState<AdminPost | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, [statusFilter, flagFilter]);

  async function fetchPosts() {
    try {
      setRefreshing(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (flagFilter === 'flagged') params.set('flagged', 'true');

      const data = await api<AdminPost[]>(`/admin/posts?${params.toString()}`);
      setPosts(data || []);
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchPosts();
  }

  async function handleToggleHide(post: AdminPost) {
    setActionLoading(true);
    try {
      const updated = await api<AdminPost>(`/admin/posts/${post.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isHidden: !post.isHidden }),
      });
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, ...updated } : p)));
      if (selectedPost?.id === post.id) {
        setSelectedPost((prev) => (prev ? { ...prev, ...updated } : null));
      }
      setActionMessage(post.isHidden ? 'Post unhidden successfully.' : 'Post hidden from public feed.');
    } catch (err: any) {
      alert(err.message || 'Failed to toggle post visibility.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleLock(post: AdminPost) {
    setActionLoading(true);
    try {
      const updated = await api<AdminPost>(`/admin/posts/${post.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isLocked: !post.isLocked }),
      });
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, ...updated } : p)));
      if (selectedPost?.id === post.id) {
        setSelectedPost((prev) => (prev ? { ...prev, ...updated } : null));
      }
      setActionMessage(post.isLocked ? 'Comments unlocked.' : 'Comments locked on post.');
    } catch (err: any) {
      alert(err.message || 'Failed to toggle lock status.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!deleteModalPost) return;
    setActionLoading(true);
    try {
      await api(`/admin/posts/${deleteModalPost.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: deleteReason.trim() || 'Violated community guidelines' }),
      });
      setDeleteModalPost(null);
      setDeleteReason('');
      await fetchPosts();
      setActionMessage('Post has been soft-deleted and archived.');
    } catch (err: any) {
      alert(err.message || 'Failed to soft-delete post.');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ─── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <MessageSquare className="h-6 w-6 text-cyan-400" />
            Community Posts & Discussions Moderation
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Review community forum threads, manage visibility, lock comments, and soft-delete inappropriate content.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/community/flagged">
            <Button size="sm" className="gap-1.5 text-xs bg-rose-500 hover:bg-rose-600 text-white font-semibold">
              <Flag className="h-3.5 w-3.5" />
              Flagged Content Queue
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPosts}
            disabled={refreshing}
            className="h-9 gap-1.5 text-xs border-white/[0.1] bg-black/40 hover:bg-white/[0.05]"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {actionMessage && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-primary flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-primary hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ─── Search & Filters Bar ────────────────────────────────────────────── */}
      <Card className="border-white/[0.08] bg-[#071015]/85 p-3.5 shadow-md">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts by keywords, title, or body..."
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
              <option value="visible">Visible Only</option>
              <option value="hidden">Hidden Only</option>
              <option value="deleted">Soft-Deleted</option>
            </select>

            <select
              value={flagFilter}
              onChange={(e) => setFlagFilter(e.target.value)}
              className="h-9 rounded-lg border border-white/[0.08] bg-black/40 px-3 text-xs text-foreground focus:outline-none focus:border-primary/40"
            >
              <option value="all">All Content</option>
              <option value="flagged">Flagged / Reported</option>
            </select>

            <Button type="submit" size="sm" className="h-9 text-xs gap-1.5">
              Filter
            </Button>
          </div>
        </form>
      </Card>

      {/* ─── Posts Feed List ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h2 className="text-sm sm:text-base font-bold text-white">
              Community Discussion Threads ({posts.length})
            </h2>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">Forum moderation queue</span>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-white/[0.08] bg-[#071015]/60">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <Card className="border-white/[0.08] bg-[#071015]/60 p-12 text-center text-xs text-muted-foreground font-mono">
            No community posts match your criteria.
          </Card>
        ) : (
          posts.map((post) => (
            <Card
              key={post.id}
              className={`border-white/[0.08] bg-[#071015]/85 transition-all hover:border-primary/30 shadow-md ${
                post.isDeleted
                  ? 'opacity-60 bg-rose-950/10 border-rose-500/20'
                  : post.isHidden
                  ? 'border-amber-500/30 bg-amber-500/[0.02]'
                  : ''
              }`}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                        {post.channelName || 'General Q&A'}
                      </span>
                      {post.isHidden && (
                        <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-amber-300">
                          <EyeOff className="h-3 w-3" />
                          HIDDEN
                        </span>
                      )}
                      {post.isLocked && (
                        <span className="inline-flex items-center gap-1 rounded border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-purple-300">
                          <Lock className="h-3 w-3" />
                          LOCKED
                        </span>
                      )}
                      {post.isDeleted && (
                        <span className="inline-flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-rose-300">
                          <Trash2 className="h-3 w-3" />
                          SOFT-DELETED
                        </span>
                      )}
                      {post.flagCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded border border-rose-500/40 bg-rose-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-300">
                          <Flag className="h-3 w-3" />
                          {post.flagCount} FLAGS
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white tracking-tight">{post.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {post.body}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground pt-1 border-t border-white/[0.04]">
                      <span>
                        Author:{' '}
                        <strong className="text-white font-medium">
                          {post.authorFirstName} {post.authorLastName}
                        </strong>{' '}
                        ({post.authorEmail})
                      </span>
                      <span>Replies: {post.replyCount}</span>
                      <span>Posted: {new Date(post.createdAt).toLocaleDateString('en-GB')}</span>
                      {post.deleteReason && (
                        <span className="text-rose-400 font-mono">Delete Reason: {post.deleteReason}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPost(post)}
                      className="h-8 text-xs border-white/[0.1] hover:bg-white/[0.05]"
                      title="View Details"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View
                    </Button>

                    {!post.isDeleted && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionLoading}
                          onClick={() => handleToggleHide(post)}
                          className={`h-8 text-xs ${
                            post.isHidden
                              ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                              : 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                          }`}
                          title={post.isHidden ? 'Unhide Post' : 'Hide Post'}
                        >
                          {post.isHidden ? <Eye className="h-3.5 w-3.5 mr-1" /> : <EyeOff className="h-3.5 w-3.5 mr-1" />}
                          {post.isHidden ? 'Unhide' : 'Hide'}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionLoading}
                          onClick={() => handleToggleLock(post)}
                          className={`h-8 text-xs ${
                            post.isLocked
                              ? 'border-purple-500/30 text-purple-400 hover:bg-purple-500/10'
                              : 'border-white/[0.1] text-muted-foreground hover:bg-white/[0.05]'
                          }`}
                          title={post.isLocked ? 'Unlock Comments' : 'Lock Comments'}
                        >
                          {post.isLocked ? <Unlock className="h-3.5 w-3.5 mr-1" /> : <Lock className="h-3.5 w-3.5 mr-1" />}
                          {post.isLocked ? 'Unlock' : 'Lock'}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDeleteModalPost(post);
                            setDeleteReason('');
                          }}
                          className="h-8 text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                          title="Soft Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* ─── Modal 1: Soft-Delete Dialog ─────────────────────────────────────── */}
      {deleteModalPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#091218] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white">Soft-Delete Post</h3>
              <button
                type="button"
                onClick={() => setDeleteModalPost(null)}
                className="text-muted-foreground hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDelete} className="space-y-4 pt-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Deleting this post will soft-delete it so it no longer appears in user feeds. The record, deletion timestamp, and reason will remain preserved in the audit log for administrative review.
              </p>

              <div>
                <label className="text-xs font-semibold text-white">Reason for Deletion</label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="e.g. Unsolicited commercial advertising or spam link..."
                  rows={3}
                  className="mt-1 flex w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-xs text-foreground focus:outline-none focus:border-rose-500/40"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteModalPost(null)}
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
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirm Soft Delete'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal 2: View Post Detail & Moderation History ─────────────────── */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#091218] p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white">Post Moderation Review</h3>
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="text-muted-foreground hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 pt-3 text-xs">
              <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3 space-y-2">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Title</span>
                  <span className="text-white font-bold text-sm">{selectedPost.title}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Author</span>
                  <span className="text-white font-medium">
                    {selectedPost.authorFirstName} {selectedPost.authorLastName} ({selectedPost.authorEmail})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Channel / Tags</span>
                  <span className="text-muted-foreground font-mono">
                    {selectedPost.channelName || 'General'} • {selectedPost.tags || 'No tags'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                  Full Body Text
                </span>
                <div className="rounded-xl border border-white/[0.08] bg-black/50 p-4 text-white leading-relaxed whitespace-pre-wrap">
                  {selectedPost.body}
                </div>
              </div>

              {selectedPost.deleteReason && (
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-rose-300">
                  <span className="font-semibold block mb-0.5">Moderation Deletion Rationale:</span>
                  <span>{selectedPost.deleteReason}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-white/[0.08]">
              <Button size="sm" variant="outline" onClick={() => setSelectedPost(null)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
