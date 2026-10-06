'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/utils';
import { CheckCircle2, KeyRound, Loader2, Lock } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryToken = searchParams?.get('token') || '';

  const [token, setToken] = useState(queryToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: token.trim(), newPassword }),
      });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (err: any) {
      setError(err.message || 'Could not reset password. Token may have expired.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-white/[0.08] bg-[#071015]/95 shadow-2xl backdrop-blur-xl">
      <CardHeader className="text-center space-y-1">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
          <KeyRound className="h-5 w-5" />
        </div>
        <CardTitle className="text-xl font-bold text-white tracking-tight">
          Reset Your Password
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Enter your verification reset token and choose a new secure password.
        </p>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="rounded-lg border border-primary/20 bg-primary/10 p-4 text-center space-y-2">
            <CheckCircle2 className="mx-auto h-6 w-6 text-primary" />
            <p className="text-sm font-semibold text-white">Password Reset Successfully!</p>
            <p className="text-xs text-muted-foreground">Redirecting you to the login screen...</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground">Reset Token</label>
              <Input
                className="mt-1 font-mono text-xs"
                placeholder="Paste your reset token..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">New Password</label>
              <Input
                type="password"
                className="mt-1 text-sm"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Confirm New Password</label>
              <Input
                type="password"
                className="mt-1 text-sm"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Set New Password
            </Button>

            <div className="text-center pt-2">
              <Link href="/login" className="text-xs text-muted-foreground hover:text-white transition">
                ← Back to Login
              </Link>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050a0d] p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden border border-white/10 shadow-md">
            <img src="/brand/synergysphere-logo.png" alt="SynergySphere" className="h-full w-full object-cover" />
          </div>
          <span className="text-base font-bold text-white tracking-tight">SynergySphere</span>
        </div>
        <Suspense fallback={<div className="text-center text-xs text-muted-foreground">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
