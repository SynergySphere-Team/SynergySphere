'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/utils';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Github,
  Globe,
  KeyRound,
  LifeBuoy,
  Linkedin,
  Loader2,
  Lock,
  Palette,
  Shield,
  Trash2,
  User,
} from 'lucide-react';
import { HelpSupportSection } from '@/components/settings/HelpSupportSection';

interface SettingsData {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    bio: string | null;
    theme: string;
    emailNotifications: boolean;
  };
  profile: {
    githubUrl: string | null;
    linkedinUrl: string | null;
    targetRole: string | null;
    location: string | null;
    about: string | null;
  };
}

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security' | 'support'>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (tabParam === 'support') setActiveTab('support');
    }
  }, []);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    targetRole: '',
    location: '',
    githubUrl: '',
    linkedinUrl: '',
    theme: 'dark',
    emailNotifications: true,
  });

  const [resetSending, setResetSending] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api<SettingsData>('/auth/settings')
      .then((data) => {
        setForm({
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || '',
          bio: data.user.bio || data.profile.about || '',
          targetRole: data.profile.targetRole || '',
          location: data.profile.location || '',
          githubUrl: data.profile.githubUrl || '',
          linkedinUrl: data.profile.linkedinUrl || '',
          theme: data.user.theme || 'dark',
          emailNotifications: data.user.emailNotifications ?? true,
        });
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await api('/auth/settings', {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      await refreshUser();
      setMessage({ type: 'success', text: 'Settings updated successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleTriggerPasswordReset() {
    if (!user?.email) return;
    setResetSending(true);
    setResetMessage(null);
    try {
      const res = await api<{ message: string; resetToken?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: user.email }),
      });
      setResetMessage(res.message);
    } catch (err: any) {
      setResetMessage(err.message || 'Could not send reset link.');
    } finally {
      setResetSending(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      await api('/auth/me', { method: 'DELETE' });
      await logout();
      router.push('/register');
    } catch (err: any) {
      alert(err.message || 'Could not delete account.');
      setDeleting(false);
    }
  }

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="Account & Preferences"
        title="Settings"
        description="Manage your verified engineering profile, professional links, notification preferences, and account security."
      />

      {/* Tabs */}
      <div className="mb-6 flex border-b border-white/[0.08] gap-4 sm:gap-6 overflow-x-auto scrollbar-none flex-nowrap pb-0.5">
        <button
          onClick={() => { setActiveTab('profile'); setMessage(null); }}
          className={`pb-3 text-xs sm:text-sm font-medium transition-colors border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-white'
          }`}
        >
          <User className="h-4 w-4 shrink-0" />
          Developer Profile
        </button>
        <button
          onClick={() => { setActiveTab('preferences'); setMessage(null); }}
          className={`pb-3 text-xs sm:text-sm font-medium transition-colors border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap ${
            activeTab === 'preferences'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-white'
          }`}
        >
          <Palette className="h-4 w-4 shrink-0" />
          Preferences & POPIA
        </button>
        <button
          onClick={() => { setActiveTab('security'); setMessage(null); }}
          className={`pb-3 text-xs sm:text-sm font-medium transition-colors border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap ${
            activeTab === 'security'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-white'
          }`}
        >
          <Shield className="h-4 w-4 shrink-0" />
          Security & Account
        </button>
        <button
          onClick={() => { setActiveTab('support'); setMessage(null); }}
          className={`pb-3 text-xs sm:text-sm font-medium transition-colors border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap ${
            activeTab === 'support'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-white'
          }`}
        >
          <LifeBuoy className="h-4 w-4 shrink-0" />
          Help & Support
        </button>
      </div>

      {message && (
        <div
          className={`mb-6 rounded-lg p-3 text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'bg-destructive/10 text-destructive border border-destructive/20'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : activeTab === 'profile' ? (
        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">
          <Card className="border-white/[0.08] bg-[#071015]/90">
            <CardHeader>
              <CardTitle className="text-base text-white">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">First Name</label>
                  <Input
                    className="mt-1"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Last Name</label>
                  <Input
                    className="mt-1"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Email (read-only)</label>
                <Input className="mt-1 bg-black/40 text-muted-foreground" value={user?.email || ''} disabled />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Target Role</label>
                <Input
                  className="mt-1"
                  placeholder="e.g. Junior Backend Developer (Java / SQL)"
                  value={form.targetRole}
                  onChange={(e) => setForm({ ...form, targetRole: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Location</label>
                <Input
                  className="mt-1"
                  placeholder="e.g. Durban, South Africa / Remote"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Headline & Bio</label>
                <textarea
                  className="mt-1 flex w-full rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  rows={3}
                  placeholder="Describe your engineering focus, tech stack, and goals..."
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/[0.08] bg-[#071015]/90">
            <CardHeader>
              <CardTitle className="text-base text-white">Professional Profiles & Evidence Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Github className="h-3.5 w-3.5" /> GitHub Profile URL
                </label>
                <Input
                  className="mt-1"
                  placeholder="https://github.com/yourusername"
                  value={form.githubUrl}
                  onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Linkedin className="h-3.5 w-3.5" /> LinkedIn Profile URL
                </label>
                <Input
                  className="mt-1"
                  placeholder="https://linkedin.com/in/yourusername"
                  value={form.linkedinUrl}
                  onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save Profile Changes
          </Button>
        </form>
      ) : activeTab === 'preferences' ? (
        <div className="space-y-6 max-w-2xl">
          <Card className="border-white/[0.08] bg-[#071015]/90">
            <CardHeader>
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" /> Appearance & Theme
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Interface Theme</p>
                  <p className="text-xs text-muted-foreground">Dark mode is optimized for long coding sessions.</p>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-black/30 p-1">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, theme: 'dark' })}
                    className={`rounded px-3 py-1 text-xs font-medium transition ${
                      form.theme === 'dark' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground'
                    }`}
                  >
                    Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, theme: 'light' })}
                    className={`rounded px-3 py-1 text-xs font-medium transition ${
                      form.theme === 'light' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground'
                    }`}
                  >
                    Light
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/[0.08] bg-[#071015]/90">
            <CardHeader>
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" /> Notifications & Mentorship Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive weekly progress digests and PR review mentions.</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.emailNotifications}
                  onChange={(e) => setForm({ ...form, emailNotifications: e.target.checked })}
                  className="h-4 w-4 rounded border-white/[0.1] bg-black/40 text-primary focus:ring-primary"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/[0.08] bg-[#071015]/90">
            <CardHeader>
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" /> POPIA & Data Rights (South Africa)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs leading-relaxed text-muted-foreground">
              <p>
                Under the Protection of Personal Information Act (POPIA), you retain complete ownership of your code,
                learning records, and uploaded lecture materials. You may request a complete JSON export or execute full account deletion at any time.
              </p>
              <div className="pt-2">
                <Link href="/portfolio">
                  <Button variant="outline" size="sm" className="text-xs">
                    View Public Evidence Locker
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSaveSettings} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save Preferences
          </Button>
        </div>
      ) : activeTab === 'security' ? (
        <div className="space-y-6 max-w-2xl">
          <Card className="border-white/[0.08] bg-[#071015]/90">
            <CardHeader>
              <CardTitle className="text-base text-white flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" /> Password & Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Trigger a secure password reset token for your account ({user?.email}).
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTriggerPasswordReset}
                disabled={resetSending}
                className="gap-2 text-xs"
              >
                {resetSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                Generate Password Reset Token
              </Button>
              {resetMessage && (
                <div className="rounded-lg border border-primary/20 bg-primary/10 p-3 text-xs text-primary font-mono">
                  {resetMessage}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-destructive/30 bg-destructive/[0.04]">
            <CardHeader>
              <CardTitle className="text-base text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Danger Zone: Delete Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Permanently delete your SynergySphere account, verified progress, task records, and lecture notes. This action is irreversible.
              </p>
              {!showDeleteConfirm ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete My Account
                </Button>
              ) : (
                <div className="space-y-3 rounded-lg border border-destructive/30 bg-black/40 p-4">
                  <p className="text-xs text-white font-semibold">
                    Type <span className="font-mono text-destructive">DELETE</span> to confirm permanent deletion:
                  </p>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="font-mono text-xs border-destructive/40"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== 'DELETE' || deleting}
                      className="bg-destructive hover:bg-destructive/90 text-white text-xs"
                    >
                      {deleting ? 'Deleting...' : 'Confirm Permanent Deletion'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <HelpSupportSection />
      )}
    </DashboardLayout>
  );
}
