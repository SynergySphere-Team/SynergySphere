'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Calendar,
  PlusCircle,
  Sparkles,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  X,
  Loader2,
  Clock,
  Star,
  Edit,
  Trash2,
} from 'lucide-react';

interface CommunityEvent {
  id: string;
  title: string;
  description: string | null;
  organizerId: string | null;
  organizerName: string;
  eventDate: string;
  location: string;
  capacity: number;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'CANCELLED' | 'ARCHIVED';
  isFeatured: boolean;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CommunityEvent | null>(null);
  const [cancelModalEvent, setCancelModalEvent] = useState<CommunityEvent | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    eventDate: '',
    location: '',
    capacity: 50,
    category: 'Workshop',
    isFeatured: false,
  });
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      setRefreshing(true);
      const data = await api<CommunityEvent[]>('/admin/events');
      setEvents(data || []);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function openCreateModal() {
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
    setForm({
      title: '',
      description: '',
      eventDate: nextWeek,
      location: '',
      capacity: 50,
      category: 'Workshop',
      isFeatured: false,
    });
    setFormError(null);
    setCreateModalOpen(true);
  }

  function openEditModal(event: CommunityEvent) {
    const d = new Date(event.eventDate).toISOString().slice(0, 16);
    setForm({
      title: event.title,
      description: event.description || '',
      eventDate: d,
      location: event.location,
      capacity: event.capacity,
      category: event.category,
      isFeatured: event.isFeatured,
    });
    setEditingEvent(event);
    setFormError(null);
  }

  async function handleCreateOrEdit(e: React.FormEvent) {
    e.preventDefault();
    setFormSaving(true);
    setFormError(null);

    const payload = {
      ...form,
      eventDate: new Date(form.eventDate).toISOString(),
    };

    try {
      if (editingEvent) {
        const updated = await api<CommunityEvent>(`/admin/events/${editingEvent.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setEvents((prev) => prev.map((ev) => (ev.id === editingEvent.id ? updated : ev)));
        setEditingEvent(null);
        setFeedback('Event updated successfully.');
      } else {
        const created = await api<CommunityEvent>('/admin/events', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setEvents((prev) => [created, ...prev]);
        setCreateModalOpen(false);
        setFeedback('Event published successfully.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save event.');
    } finally {
      setFormSaving(false);
    }
  }

  async function handleToggleFeature(event: CommunityEvent) {
    try {
      const updated = await api<CommunityEvent>(`/admin/events/${event.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isFeatured: !event.isFeatured }),
      });
      setEvents((prev) => prev.map((ev) => (ev.id === event.id ? updated : ev)));
      setFeedback(event.isFeatured ? 'Event unfeatured.' : 'Event featured on community page.');
    } catch (err: any) {
      alert(err.message || 'Failed to toggle feature status.');
    }
  }

  async function handleStatusChange(event: CommunityEvent, newStatus: string) {
    try {
      const updated = await api<CommunityEvent>(`/admin/events/${event.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setEvents((prev) => prev.map((ev) => (ev.id === event.id ? updated : ev)));
      setFeedback(`Event status updated to ${newStatus}.`);
    } catch (err: any) {
      alert(err.message || 'Failed to change event status.');
    }
  }

  async function handleConfirmCancel() {
    if (!cancelModalEvent) return;
    try {
      const updated = await api<CommunityEvent>(`/admin/events/${cancelModalEvent.id}`, {
        method: 'DELETE',
      });
      setEvents((prev) => prev.map((ev) => (ev.id === cancelModalEvent.id ? { ...ev, status: 'CANCELLED' } : ev)));
      setCancelModalEvent(null);
      setFeedback('Event successfully cancelled.');
    } catch (err: any) {
      alert(err.message || 'Failed to cancel event.');
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-mono text-emerald-400">
            APPROVED
          </span>
        );
      case 'PENDING':
        return (
          <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-mono text-amber-300">
            PENDING
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="rounded border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-mono text-rose-400">
            CANCELLED
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
            ARCHIVED
          </span>
        );
      default:
        return <span className="text-xs text-muted-foreground">{status}</span>;
    }
  }

  return (
    <div className="space-y-6">
      {/* ─── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Calendar className="h-6 w-6 text-purple-400" />
            Events & Hackathon Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Schedule workshops, approve student submissions, feature flagship campus sprints, and handle cancellations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={openCreateModal}
            className="gap-1.5 text-xs bg-purple-500 hover:bg-purple-600 text-white font-semibold"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Create Event
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchEvents}
            disabled={refreshing}
            className="h-9 gap-1.5 text-xs border-white/[0.1] bg-black/40 hover:bg-white/[0.05]"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin text-purple-400' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-primary flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-primary hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ─── Events Table ────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <h2 className="text-sm sm:text-base font-bold text-white">
              Scheduled Platform Workshops & Events ({events.length})
            </h2>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">Engineering calendar</span>
        </div>

        <Card className="border-white/[0.08] bg-[#071015]/85 overflow-hidden shadow-lg">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            No events scheduled. Click "Create Event" to schedule the first platform workshop.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-black/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4">Event & Category</th>
                  <th className="py-3 px-4">Organiser</th>
                  <th className="py-3 px-4">Scheduled Date</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Featured</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 px-4">
                      <p className="font-bold text-white text-sm">{ev.title}</p>
                      <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20">
                        {ev.category}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-medium text-white">{ev.organizerName}</td>

                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      {new Date(ev.eventDate).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3 px-4 text-muted-foreground">{ev.location}</td>

                    <td className="py-3 px-4 font-mono font-semibold text-white">{ev.capacity} slots</td>

                    <td className="py-3 px-4">{getStatusBadge(ev.status)}</td>

                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleFeature(ev)}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono transition ${
                          ev.isFeatured
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                            : 'bg-white/5 text-muted-foreground hover:text-white'
                        }`}
                      >
                        <Star className={`h-3 w-3 ${ev.isFeatured ? 'fill-amber-400 text-amber-400' : ''}`} />
                        {ev.isFeatured ? 'Featured' : 'Standard'}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(ev)}
                          className="h-7 text-[11px] border-white/[0.1] hover:bg-white/[0.05]"
                          title="Edit Event"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>

                        {ev.status === 'PENDING' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(ev, 'APPROVED')}
                            className="h-7 text-[11px] bg-emerald-500 hover:bg-emerald-600 text-black font-semibold"
                          >
                            Approve
                          </Button>
                        )}

                        {ev.status !== 'CANCELLED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCancelModalEvent(ev)}
                            className="h-7 text-[11px] border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                            title="Cancel Event"
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      </div>

      {/* ─── Modal 1: Create or Edit Event ───────────────────────────────────── */}
      {(createModalOpen || editingEvent) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#091218] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white">
                {editingEvent ? 'Edit Event: ' + editingEvent.title : 'Create New Event'}
              </h3>
              <button
                onClick={() => {
                  setCreateModalOpen(false);
                  setEditingEvent(null);
                }}
                className="text-muted-foreground hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrEdit} className="space-y-3 pt-3 text-xs">
              {formError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">
                  {formError}
                </div>
              )}

              <div>
                <label className="text-white font-semibold">Event Title</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Full-Stack TypeScript Hackathon"
                  className="mt-1 h-8 text-xs border-white/[0.08] bg-black/40"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white font-semibold">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="mt-1 w-full h-8 rounded-lg border border-white/[0.08] bg-black/40 px-2 text-xs text-foreground focus:outline-none focus:border-purple-500/40"
                  >
                    <option value="Workshop">Workshop</option>
                    <option value="Hackathon">Hackathon</option>
                    <option value="Masterclass">Masterclass</option>
                    <option value="Mentorship Sprint">Mentorship Sprint</option>
                  </select>
                </div>

                <div>
                  <label className="text-white font-semibold">Seat Capacity</label>
                  <Input
                    type="number"
                    min={1}
                    max={5000}
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 50 })}
                    className="mt-1 h-8 text-xs border-white/[0.08] bg-black/40"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white font-semibold">Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={form.eventDate}
                    onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                    className="mt-1 h-8 text-xs border-white/[0.08] bg-black/40"
                    required
                  />
                </div>

                <div>
                  <label className="text-white font-semibold">Location / Link</label>
                  <Input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Campus Lab 4 or Online"
                    className="mt-1 h-8 text-xs border-white/[0.08] bg-black/40"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-white font-semibold">Event Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Outline syllabus, deliverables, and participant requirements..."
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/40 p-2 text-xs text-foreground focus:outline-none focus:border-purple-500/40"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="featCheck"
                  checked={form.isFeatured}
                  onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                  className="h-4 w-4 rounded border-white/[0.1] bg-black/40 text-purple-500 focus:ring-purple-500"
                />
                <label htmlFor="featCheck" className="text-xs text-white cursor-pointer select-none">
                  Highlight as Featured Event on user dashboard
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCreateModalOpen(false);
                    setEditingEvent(null);
                  }}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={formSaving}
                  className="text-xs bg-purple-500 hover:bg-purple-600 text-white font-semibold"
                >
                  {formSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save Event'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal 2: Cancel Confirmation Dialog ─────────────────────────────── */}
      {cancelModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#091218] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">Cancel Event: {cancelModalEvent.title}</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Are you sure you want to cancel this event? It will be marked as CANCELLED in the calendar and audit logs.
            </p>
            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-white/[0.08]">
              <Button size="sm" variant="outline" onClick={() => setCancelModalEvent(null)} className="text-xs">
                Back
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmCancel}
                className="text-xs bg-rose-500 hover:bg-rose-600 text-white font-semibold"
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
