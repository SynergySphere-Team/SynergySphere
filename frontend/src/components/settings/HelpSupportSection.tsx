'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  HelpCircle,
  LifeBuoy,
  PlusCircle,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  Upload,
  RefreshCw,
  Search,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export interface UserTicket {
  id: string;
  ticketNumber: string;
  category: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  adminNotes?: string | null;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

const FAQ_ITEMS = [
  {
    id: 'faq-1',
    question: 'How do I submit code solutions for challenges and projects?',
    answer:
      'Navigate to the Challenges or Community section from the sidebar. You can write your solution directly in the integrated Monaco-powered web editor or link your GitHub repository. Once all unit tests pass, XP points are credited directly to your profile.',
  },
  {
    id: 'faq-2',
    question: 'How is my account verified and approved?',
    answer:
      'Student and institution registrations undergo automated and manual administrative verification. Administrators review your campus email or student credentials to activate verified features like mentorship pairing and public GitHub repository portfolio links.',
  },
  {
    id: 'faq-3',
    question: 'How does the support ticketing process work?',
    answer:
      'When you submit an issue, a unique ticket identifier (e.g. #SS-1048) is automatically assigned. Our operations and technical team reviews the request, sets operational priority, and updates the status. You can track status changes live under "My Support Requests".',
  },
  {
    id: 'faq-4',
    question: 'How are my personal data and code protected?',
    answer:
      'SynergySphere complies with the Protection of Personal Information Act (POPIA) and modern cryptographic standards. Your lecture uploads and project deliverables remain strictly your property. You may request account exports or deletion at any time in Settings.',
  },
  {
    id: 'faq-5',
    question: 'What should I do if a community post violates community rules?',
    answer:
      'You can report community guidelines violations by opening a support request under the "Community Issue" category, or by using the report trigger on the post. Moderators review flagged content in a dedicated queue.',
  },
];

const CATEGORIES = [
  'Bug / Technical Issue',
  'Account & Login',
  'Feature Request',
  'Community Issue',
  'Event Issue',
  'Other',
] as const;

export function HelpSupportSection() {
  const [tickets, setTickets] = useState<UserTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openFaq, setOpenFaq] = useState<string | null>('faq-3');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Report Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formCategory, setFormCategory] = useState<(typeof CATEGORIES)[number]>('Bug / Technical Issue');
  const [formSubject, setFormSubject] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Confirmation state
  const [confirmedTicket, setConfirmedTicket] = useState<{
    ticketNumber: string;
    category: string;
    title: string;
  } | null>(null);

  // Detail View Modal state
  const [selectedTicket, setSelectedTicket] = useState<UserTicket | null>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    try {
      setRefreshing(true);
      const data = await api<UserTicket[]>('/settings/tickets/me');
      setTickets(data || []);
    } catch (err: any) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFormError('File size exceeds the 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentName(file.name);
      setAttachmentUrl(reader.result as string);
      setFormError(null);
    };
    reader.onerror = () => {
      setFormError('Failed to read file attachment.');
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmitTicket(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (formSubject.trim().length < 3) {
      setFormError('Subject must be at least 3 characters.');
      return;
    }
    if (formSubject.trim().length > 100) {
      setFormError('Subject cannot exceed 100 characters.');
      return;
    }
    if (formDescription.trim().length < 10) {
      setFormError('Description must be at least 10 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await api<UserTicket>('/settings/tickets', {
        method: 'POST',
        body: JSON.stringify({
          category: formCategory,
          title: formSubject.trim(),
          description: formDescription.trim(),
          attachmentName: attachmentName || undefined,
          attachmentUrl: attachmentUrl || undefined,
        }),
      });

      // Clear form
      setFormSubject('');
      setFormDescription('');
      setAttachmentName(null);
      setAttachmentUrl(null);
      setIsModalOpen(false);

      // Open confirmation modal
      setConfirmedTicket({
        ticketNumber: created.ticketNumber,
        category: created.category,
        title: created.title,
      });

      // Refresh list
      await fetchTickets();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit ticket. Please check your network and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchesSearch =
      !searchQuery.trim() ||
      t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  function getStatusBadge(status: string) {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            Open
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
            <Clock className="h-3 w-3" />
            In Progress
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Resolved
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
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
        return <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Critical</span>;
      case 'high':
        return <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">High</span>;
      case 'medium':
        return <span className="text-[11px] font-medium text-blue-400">Medium</span>;
      case 'low':
      default:
        return <span className="text-[11px] font-medium text-muted-foreground">Low</span>;
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Help & Support Banner Card */}
      <Card className="border-white/[0.08] bg-gradient-to-br from-[#07131b] via-[#050c12] to-[#04080b] shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <CardHeader className="pb-3 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-2">
                <LifeBuoy className="h-3.5 w-3.5" />
                Help Centre & Support Desk
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Need assistance with SynergySphere?
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl">
                Have a question or encountered a technical issue? Check our Frequently Asked Questions below or report an issue directly to our support team.
              </p>
            </div>
            <div className="flex shrink-0">
              <Button
                onClick={() => {
                  setIsModalOpen(true);
                  setFormError(null);
                }}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all font-semibold"
              >
                <PlusCircle className="h-4 w-4" />
                Report an Issue
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Frequently Asked Questions Accordion */}
      <Card className="border-white/[0.08] bg-[#071015]/90">
        <CardHeader className="pb-3 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              Frequently Asked Questions
            </CardTitle>
            <span className="text-xs text-muted-foreground">Self-service resources</span>
          </div>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-white/[0.06]">
          {FAQ_ITEMS.map((faq) => {
            const isOpen = openFaq === faq.id;
            return (
              <div key={faq.id} className="transition-colors">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                  className="flex w-full items-center justify-between p-4 text-left text-sm font-medium text-foreground hover:text-white transition"
                >
                  <span className="pr-4">{faq.question}</span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs leading-relaxed text-muted-foreground bg-white/[0.01]">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* My Submitted Issues Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              My Support Requests
            </h2>
            <p className="text-xs text-muted-foreground">
              Review and track the real-time resolution status of your reported issues.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTickets}
              disabled={refreshing}
              className="h-8 gap-1.5 text-xs border-white/[0.1] bg-black/30 hover:bg-white/[0.05]"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setIsModalOpen(true);
                setFormError(null);
              }}
              className="h-8 gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              New Issue
            </Button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticket number (#SS-...), subject, or category..."
              className="h-9 pl-9 text-xs border-white/[0.08] bg-black/40 text-foreground"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'open', 'in_progress', 'resolved', 'closed'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition whitespace-nowrap ${
                  filterStatus === st
                    ? 'bg-primary/20 text-primary border border-primary/30 font-semibold'
                    : 'bg-black/30 text-muted-foreground border border-white/[0.06] hover:text-white'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Ticket List */}
        {loading ? (
          <div className="flex h-36 items-center justify-center rounded-xl border border-white/[0.08] bg-[#071015]/60">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredTickets.length === 0 ? (
          <Card className="border-white/[0.08] bg-[#071015]/60 p-8 text-center">
            <LifeBuoy className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white">No support requests found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {searchQuery || filterStatus !== 'all'
                ? 'No requests matched your filter criteria.'
                : 'You have not submitted any support tickets yet. Click "Report an Issue" if you need technical or platform assistance.'}
            </p>
            {(!searchQuery && filterStatus === 'all') && (
              <Button
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="mt-4 text-xs gap-1.5"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Submit Your First Request
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid gap-3">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#071015]/90 p-4 transition-all hover:border-primary/40 hover:bg-[#0a1720] cursor-pointer"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                      #{ticket.ticketNumber}
                    </span>
                    <span className="text-xs rounded bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 text-muted-foreground">
                      {ticket.category}
                    </span>
                    {getPriorityBadge(ticket.priority)}
                  </div>
                  <h4 className="text-sm font-semibold text-white truncate group-hover:text-primary transition-colors">
                    {ticket.title}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {ticket.description}
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/[0.06]">
                  <div>{getStatusBadge(ticket.status)}</div>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Submitted {new Date(ticket.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Modal 1: Report an Issue ────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#091218] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
                  <LifeBuoy className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Report an Issue</h3>
                  <p className="text-xs text-muted-foreground">Submit a support request to the platform administration</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitTicket} className="space-y-4 pt-4">
              {formError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}

              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-white">Issue Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="mt-1 flex w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-xs text-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-[#091218] text-white">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white">Subject</label>
                  <span className="text-[10px] text-muted-foreground font-mono">{formSubject.length}/100</span>
                </div>
                <Input
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value.slice(0, 100))}
                  placeholder="Brief summary of the issue (e.g. Unable to upload profile picture)"
                  className="mt-1 text-xs border-white/[0.08] bg-black/40"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-white">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={4}
                  placeholder="Please describe what happened, what you expected to happen, and any steps that may help us reproduce the issue."
                  className="mt-1 flex w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              {/* Optional Attachment */}
              <div>
                <label className="text-xs font-semibold text-white flex items-center justify-between">
                  <span>Attachment (Optional)</span>
                  <span className="text-[10px] text-muted-foreground">PNG, JPEG, WebP or logs (Max 5MB)</span>
                </label>
                <div className="mt-1 flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-white/[0.08] bg-black/30 px-3 py-1.5 text-xs text-muted-foreground hover:text-white hover:border-white/20 transition">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{attachmentName ? 'Change File' : 'Upload Screenshot / Log'}</span>
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      accept="image/png,image/jpeg,image/webp,text/plain"
                      className="hidden"
                    />
                  </label>
                  {attachmentName && (
                    <div className="flex items-center gap-1.5 text-xs text-primary truncate max-w-[200px]">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{attachmentName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachmentName(null);
                          setAttachmentUrl(null);
                        }}
                        className="text-muted-foreground hover:text-white ml-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="text-xs gap-1.5 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LifeBuoy className="h-3.5 w-3.5" />}
                  Submit Issue
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal 2: Confirmation Modal ─────────────────────────────────────── */}
      {confirmedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-primary/30 bg-[#09151e] p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary border border-primary/30 mb-4">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <h3 className="text-lg font-bold text-white tracking-tight">Issue Submitted Successfully</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Your support request has been received and routed to our support team.
            </p>

            <div className="my-5 rounded-xl border border-white/[0.08] bg-black/50 p-4">
              <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold block mb-1">
                Assigned Ticket Number
              </span>
              <span className="font-mono text-2xl font-extrabold text-primary tracking-wider">
                #{confirmedTicket.ticketNumber}
              </span>
              <p className="text-xs text-muted-foreground mt-2 truncate">
                {confirmedTicket.title}
              </p>
            </div>

            <p className="text-xs text-muted-foreground/80 mb-6">
              Our support team will review your request. You will receive notifications when updates or responses are posted.
            </p>

            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmedTicket(null)}
                className="text-xs"
              >
                Done
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setConfirmedTicket(null);
                  setFilterStatus('all');
                }}
                className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5"
              >
                View My Requests
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal 3: Ticket Detail View ─────────────────────────────────────── */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#091218] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                    #{selectedTicket.ticketNumber}
                  </span>
                  {getStatusBadge(selectedTicket.status)}
                </div>
                <h3 className="text-base font-bold text-white">{selectedTicket.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="text-muted-foreground hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-white/[0.06] bg-black/30 p-3">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Category</span>
                  <span className="text-foreground font-medium">{selectedTicket.category}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Submitted Date</span>
                  <span className="text-foreground font-mono">
                    {new Date(selectedTicket.createdAt).toLocaleString('en-GB')}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                  Issue Description
                </span>
                <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3 text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {selectedTicket.description}
                </div>
              </div>

              {selectedTicket.attachmentName && (
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                    Attached Evidence
                  </span>
                  <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/30 p-2.5 text-xs text-primary">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="truncate">{selectedTicket.attachmentName}</span>
                  </div>
                </div>
              )}

              {selectedTicket.status === 'resolved' && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-400 flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Issue Resolved</span>
                    <span className="text-[11px] text-emerald-300/90">
                      Our support engineering team has investigated and marked this issue as resolved. If you still encounter problems, you may submit a follow-up request.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-white/[0.08]">
              <Button size="sm" variant="outline" onClick={() => setSelectedTicket(null)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
