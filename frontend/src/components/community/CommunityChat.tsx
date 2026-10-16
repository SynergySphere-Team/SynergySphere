'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Hash,
  HelpCircle,
  Send,
  X,
  CornerDownRight,
  CheckCircle2,
  Plus,
  ChevronRight,
  ArrowLeft,
  MessageSquare,
  Loader2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Channel {
  id: string;
  name: string;
  description: string | null;
  type: 'chat' | 'qa';
  emoji: string;
  messageCount: string;
  postCount: string;
}

interface ChatMessage {
  id: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  userId: string;
  firstName: string;
  lastName: string;
  replyToId: string | null;
  replyToBody: string | null;
  replyToFirstName: string | null;
  replyToLastName: string | null;
}

interface QAPost {
  id: string;
  title: string;
  body: string;
  tags: string | null;
  isSolved: boolean;
  createdAt: string;
  userId: string;
  firstName: string;
  lastName: string;
  replyCount: number;
}

interface QAReply {
  id: string;
  body: string;
  isAccepted: boolean;
  createdAt: string;
  userId: string;
  firstName: string;
  lastName: string;
  replyToId: string | null;
  replyToBody: string | null;
  replyToFirstName: string | null;
  replyToLastName: string | null;
}

interface PostDetail extends QAPost {
  replies: QAReply[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

function Avatar({ firstName, lastName, size = 'sm' }: { firstName: string; lastName: string; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs';
  return (
    <div className={`${sz} flex shrink-0 items-center justify-center rounded-full bg-primary font-bold text-black`}>
      {initials(firstName, lastName)}
    </div>
  );
}

// ─── Reply Quote Banner ────────────────────────────────────────────────────────

function ReplyBanner({
  firstName,
  lastName,
  body,
  onCancel,
}: {
  firstName: string;
  lastName: string;
  body: string;
  onCancel: () => void;
}) {
  return (
    <div className="mx-2 mb-1 flex items-center gap-2 rounded-t-lg border border-b-0 border-primary/30 bg-primary/5 px-3 py-1.5 text-xs">
      <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="text-muted-foreground">
        Replying to <span className="font-semibold text-white">{firstName} {lastName}</span>:{' '}
        <span className="line-clamp-1 italic text-muted-foreground">{body}</span>
      </span>
      <button onClick={onCancel} className="ml-auto text-muted-foreground hover:text-white">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Quoted Reply inside a message ────────────────────────────────────────────

function QuotedReply({ firstName, lastName, body }: { firstName: string; lastName: string; body: string }) {
  return (
    <div className="mb-1.5 flex items-start gap-1.5 rounded border-l-2 border-primary/50 bg-primary/5 px-2 py-1 text-[11px]">
      <CornerDownRight className="mt-0.5 h-3 w-3 shrink-0 text-primary/70" />
      <div>
        <span className="font-semibold text-primary/80">{firstName} {lastName}</span>
        <span className="ml-1.5 text-muted-foreground line-clamp-1 italic">{body}</span>
      </div>
    </div>
  );
}

// ─── Chat Channel View ────────────────────────────────────────────────────────

function ChatView({ channel, currentUserId }: { channel: Channel; currentUserId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const data = await api<ChatMessage[]>(`/community-chat/channels/${channel.id}/messages`);
      setMessages(data);
    } catch {
      // silently fail poll
    }
  }, [channel.id]);

  useEffect(() => {
    setMessages([]);
    setReplyTo(null);
    setInput('');
    fetchMessages();

    // Real-time WebSocket connection
    let socket: WebSocket | null = null;
    try {
      const wsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const isLocal = wsHost === 'localhost' || wsHost === '127.0.0.1';
      const defaultWsUrl = isLocal ? `${wsProtocol}//${wsHost}:4000/ws` : `${wsProtocol}//${wsHost}/ws`;
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || defaultWsUrl;
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        socket?.send(JSON.stringify({ type: 'subscribe', channelId: channel.id }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_message' && data.channelId === channel.id && data.message) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.message.id)) return prev;
              return [...prev, data.message];
            });
          }
        } catch {
          // ignore
        }
      };
    } catch {
      // fallback to polling
    }

    // Polling fallback as resilience safety net
    intervalRef.current = setInterval(fetchMessages, 6000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (socket) {
        socket.close();
      }
    };
  }, [channel.id, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const msg = await api<ChatMessage>(`/community-chat/channels/${channel.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: input.trim(), replyToId: replyTo?.id }),
      });
      setMessages((prev) => [...prev, msg]);
      setInput('');
      setReplyTo(null);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 space-y-0.5 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <MessageSquare className="mb-3 h-10 w-10 opacity-30" />
            <p className="font-semibold text-white">Welcome to #{channel.name}</p>
            <p className="mt-1 text-xs">{channel.description ?? 'Start the conversation!'}</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const prev = messages[i - 1];
          const sameUser = prev && prev.userId === msg.userId && !msg.replyToId;
          return (
            <div key={msg.id} className={`group flex items-start gap-2.5 ${sameUser ? 'pt-0.5' : 'pt-3'}`}>
              {sameUser ? (
                <div className="w-7 shrink-0 pt-0.5 text-center text-[10px] text-muted-foreground/40 opacity-0 group-hover:opacity-100">
                  {formatTime(msg.createdAt)}
                </div>
              ) : (
                <Avatar firstName={msg.firstName} lastName={msg.lastName} />
              )}
              <div className="min-w-0 flex-1">
                {!sameUser && (
                  <div className="flex items-baseline gap-2">
                    <span className={`text-sm font-semibold ${msg.userId === currentUserId ? 'text-primary' : 'text-white'}`}>
                      {msg.firstName} {msg.lastName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
                  </div>
                )}
                {msg.replyToId && msg.replyToBody && msg.replyToFirstName && msg.replyToLastName && (
                  <QuotedReply
                    firstName={msg.replyToFirstName}
                    lastName={msg.replyToLastName}
                    body={msg.replyToBody}
                  />
                )}
                <p className="text-sm leading-relaxed text-white/90">{msg.body}</p>
              </div>
              <button
                onClick={() => setReplyTo(msg)}
                className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition hover:bg-white/[0.06] hover:text-white group-hover:opacity-100"
                title="Reply"
              >
                <CornerDownRight className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/[0.08] p-3">
        {replyTo && (
          <ReplyBanner
            firstName={replyTo.firstName}
            lastName={replyTo.lastName}
            body={replyTo.body}
            onCancel={() => setReplyTo(null)}
          />
        )}
        <form onSubmit={send} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message #${channel.name}`}
            className="flex-1 bg-white/[0.06] text-sm"
            autoComplete="off"
          />
          <Button
            type="submit"
            disabled={!input.trim() || sending}
            className="bg-primary font-bold text-black hover:bg-primary/90"
            size="sm"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ─── Q&A Post Card ────────────────────────────────────────────────────────────

function PostCard({ post, onClick }: { post: QAPost; onClick: () => void }) {
  const tags = post.tags ? post.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border border-white/[0.08] bg-[#0d131f]/90 p-4 text-left transition hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {post.isSolved && (
              <span className="flex items-center gap-1 rounded bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                <CheckCircle2 className="h-2.5 w-2.5" /> Solved
              </span>
            )}
            {tags.map((tag) => (
              <span key={tag} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {tag}
              </span>
            ))}
          </div>
          <p className="mt-1 font-semibold text-white">{post.title}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{post.body}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span>
          {post.firstName} {post.lastName}
        </span>
        <span>{formatDate(post.createdAt)}</span>
        <span className="flex items-center gap-0.5">
          <MessageSquare className="h-3 w-3" /> {post.replyCount}
        </span>
      </div>
    </button>
  );
}

// ─── Q&A Channel View ─────────────────────────────────────────────────────────

function QAView({ channel, currentUserId }: { channel: Channel; currentUserId: string }) {
  const [posts, setPosts] = useState<QAPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<PostDetail | null>(null);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', body: '', tags: '' });
  const [replyInput, setReplyInput] = useState('');
  const [replyTo, setReplyTo] = useState<QAReply | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const data = await api<QAPost[]>(`/community-chat/channels/${channel.id}/posts`);
      setPosts(data);
    } finally {
      setLoading(false);
    }
  }, [channel.id]);

  const fetchPost = useCallback(async (postId: string) => {
    const data = await api<PostDetail>(`/community-chat/posts/${postId}`);
    setSelectedPost(data);
  }, []);

  useEffect(() => {
    setLoading(true);
    setPosts([]);
    setSelectedPost(null);
    fetchPosts();
  }, [channel.id, fetchPosts]);

  async function submitPost(e: React.FormEvent) {
    e.preventDefault();
    if (!newPost.title.trim() || !newPost.body.trim()) return;
    setSubmitting(true);
    try {
      await api(`/community-chat/channels/${channel.id}/posts`, {
        method: 'POST',
        body: JSON.stringify({ title: newPost.title.trim(), body: newPost.body.trim(), tags: newPost.tags.trim() || undefined }),
      });
      setNewPost({ title: '', body: '', tags: '' });
      setShowNewPost(false);
      await fetchPosts();
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyInput.trim() || !selectedPost) return;
    setSubmitting(true);
    try {
      await api(`/community-chat/posts/${selectedPost.id}/replies`, {
        method: 'POST',
        body: JSON.stringify({ body: replyInput.trim(), replyToId: replyTo?.id }),
      });
      setReplyInput('');
      setReplyTo(null);
      await fetchPost(selectedPost.id);
    } finally {
      setSubmitting(false);
    }
  }

  async function acceptReply(replyId: string) {
    if (!selectedPost) return;
    await api(`/community-chat/posts/${selectedPost.id}/replies/${replyId}/accept`, { method: 'PATCH' });
    await fetchPost(selectedPost.id);
  }

  // ── Post Detail View ──────────────────────────────────────────────────────

  if (selectedPost) {
    const isOwner = selectedPost.userId === currentUserId;
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-white/[0.08] px-4 py-3">
          <button
            onClick={() => setSelectedPost(null)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <span className="ml-2 font-semibold text-white line-clamp-1">{selectedPost.title}</span>
          {selectedPost.isSolved && (
            <span className="ml-auto flex items-center gap-1 rounded bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> Solved
            </span>
          )}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {/* Original post */}
          <div className="rounded-lg border border-white/[0.08] bg-[#0d131f]/80 p-4">
            <div className="flex items-center gap-2">
              <Avatar firstName={selectedPost.firstName} lastName={selectedPost.lastName} size="md" />
              <div>
                <p className="text-sm font-semibold text-white">{selectedPost.firstName} {selectedPost.lastName}</p>
                <p className="text-[10px] text-muted-foreground">{formatDate(selectedPost.createdAt)}</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/90 whitespace-pre-wrap">{selectedPost.body}</p>
            {selectedPost.tags && (
              <div className="mt-3 flex flex-wrap gap-1">
                {selectedPost.tags.split(',').map((t) => (
                  <span key={t.trim()} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                    {t.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Replies */}
          {selectedPost.replies.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {selectedPost.replies.length} {selectedPost.replies.length === 1 ? 'Answer' : 'Answers'}
              </p>
              {selectedPost.replies.map((reply) => (
                <div
                  key={reply.id}
                  className={`group rounded-lg border p-4 transition ${
                    reply.isAccepted
                      ? 'border-emerald-500/40 bg-emerald-950/20'
                      : 'border-white/[0.08] bg-[#0d131f]/80'
                  }`}
                >
                  {reply.isAccepted && (
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Accepted Answer
                    </div>
                  )}
                  {reply.replyToId && reply.replyToBody && reply.replyToFirstName && reply.replyToLastName && (
                    <QuotedReply
                      firstName={reply.replyToFirstName}
                      lastName={reply.replyToLastName}
                      body={reply.replyToBody}
                    />
                  )}
                  <div className="flex items-start gap-2.5">
                    <Avatar firstName={reply.firstName} lastName={reply.lastName} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-sm font-semibold ${reply.userId === currentUserId ? 'text-primary' : 'text-white'}`}>
                          {reply.firstName} {reply.lastName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{formatDate(reply.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-white/90 whitespace-pre-wrap">{reply.body}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => setReplyTo(reply)}
                      className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-white/[0.06] hover:text-white"
                    >
                      <CornerDownRight className="h-3 w-3" /> Reply
                    </button>
                    {isOwner && !reply.isAccepted && (
                      <button
                        onClick={() => acceptReply(reply.id)}
                        className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-emerald-950/40 hover:text-emerald-400"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Accept
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reply input */}
        <div className="border-t border-white/[0.08] p-3">
          {replyTo && (
            <ReplyBanner
              firstName={replyTo.firstName}
              lastName={replyTo.lastName}
              body={replyTo.body}
              onCancel={() => setReplyTo(null)}
            />
          )}
          <form onSubmit={submitReply} className="flex gap-2">
            <Input
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              placeholder="Write an answer..."
              className="flex-1 bg-white/[0.06] text-sm"
            />
            <Button
              type="submit"
              disabled={!replyInput.trim() || submitting}
              className="bg-primary font-bold text-black hover:bg-primary/90"
              size="sm"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ── Post List View ────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
        <p className="text-xs text-muted-foreground">{posts.length} question{posts.length !== 1 ? 's' : ''}</p>
        <Button
          size="sm"
          onClick={() => setShowNewPost(true)}
          className="bg-primary font-bold text-black hover:bg-primary/90"
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Ask Question
        </Button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading questions…
          </div>
        )}
        {!loading && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <HelpCircle className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-semibold text-white">No questions yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Be the first to ask one!</p>
          </div>
        )}
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onClick={async () => {
              const detail = await api<PostDetail>(`/community-chat/posts/${post.id}`);
              setSelectedPost(detail);
            }}
          />
        ))}
      </div>

      {/* New Post Modal */}
      {showNewPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#0d131f] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Ask a Question</h3>
              <button
                onClick={() => setShowNewPost(false)}
                className="rounded p-1 text-muted-foreground hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submitPost} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Title *</label>
                <Input
                  required
                  placeholder="e.g. How do I fix a CORS error in Express?"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Details *</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Describe your question in detail. Include any relevant code, errors, or context."
                  value={newPost.body}
                  onChange={(e) => setNewPost({ ...newPost, body: e.target.value })}
                  className="mt-1 w-full rounded-md border border-white/[0.1] bg-black/40 p-3 text-sm text-white outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Tags (comma-separated)</label>
                <Input
                  placeholder="e.g. react, express, typescript"
                  value={newPost.tags}
                  onChange={(e) => setNewPost({ ...newPost, tags: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-white/[0.08] pt-4">
                <Button type="button" variant="secondary" onClick={() => setShowNewPost(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !newPost.title.trim() || !newPost.body.trim()}
                  className="bg-primary font-bold text-black"
                >
                  {submitting ? 'Posting…' : 'Post Question'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Community Chat Component ────────────────────────────────────────────

export function CommunityChat() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [loadingChannels, setLoadingChannels] = useState(true);

  useEffect(() => {
    api<Channel[]>('/community-chat/channels')
      .then((data) => {
        setChannels(data);
        if (data.length > 0) setActiveChannel(data[0]);
      })
      .finally(() => setLoadingChannels(false));
  }, []);

  if (!user) return null;

  return (
    <div className="flex h-[calc(100vh-120px)] min-h-[500px] overflow-hidden rounded-xl border border-white/[0.08] bg-[#050a0d]">
      {/* ── Channels sidebar ───────────────────────────────────────────────── */}
      <div className="w-52 shrink-0 border-r border-white/[0.08] bg-black/40">
        <div className="border-b border-white/[0.08] px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Community</p>
        </div>

        {loadingChannels ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <nav className="space-y-0.5 p-2">
            {/* Chat channels */}
            <p className="px-2 pt-2 pb-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
              Channels
            </p>
            {channels
              .filter((c) => c.type === 'chat')
              .map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch)}
                  className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition ${
                    activeChannel?.id === ch.id
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-muted-foreground hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  <Hash className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{ch.name}</span>
                </button>
              ))}

            {/* Q&A channels */}
            {channels.some((c) => c.type === 'qa') && (
              <>
                <p className="px-2 pt-3 pb-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  Q&amp;A
                </p>
                {channels
                  .filter((c) => c.type === 'qa')
                  .map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => setActiveChannel(ch)}
                      className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition ${
                        activeChannel?.id === ch.id
                          ? 'bg-primary/10 font-semibold text-primary'
                          : 'text-muted-foreground hover:bg-white/[0.05] hover:text-white'
                      }`}
                    >
                      <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{ch.name}</span>
                    </button>
                  ))}
              </>
            )}
          </nav>
        )}
      </div>

      {/* ── Main area ──────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Channel header */}
        {activeChannel && (
          <div className="flex items-center gap-2 border-b border-white/[0.08] px-4 py-3">
            {activeChannel.type === 'qa' ? (
              <HelpCircle className="h-4 w-4 text-primary" />
            ) : (
              <Hash className="h-4 w-4 text-primary" />
            )}
            <span className="font-bold text-white">{activeChannel.name}</span>
            {activeChannel.description && (
              <>
                <span className="text-muted-foreground">|</span>
                <span className="text-xs text-muted-foreground">{activeChannel.description}</span>
              </>
            )}
          </div>
        )}

        {/* Channel content */}
        <div className="min-h-0 flex-1">
          {!activeChannel ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a channel to start chatting
            </div>
          ) : activeChannel.type === 'qa' ? (
            <QAView channel={activeChannel} currentUserId={user.id} />
          ) : (
            <ChatView channel={activeChannel} currentUserId={user.id} />
          )}
        </div>
      </div>
    </div>
  );
}
