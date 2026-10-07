'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/utils';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock, ShieldCheck } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryToken = searchParams?.get('token') || '';

  const [token, setToken] = useState(queryToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (queryToken) {
      setToken(queryToken);
    }
  }, [queryToken]);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) {
      setError('A valid password reset token is required. Please request a new reset link.');
      return;
    }
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
      setError(err.message || 'Could not reset password. The link or token may have expired.');
    } finally {
      setLoading(false);
    }
  }

  const hasTokenFromUrl = Boolean(queryToken);

  return (
    <Card className="border-white/[0.08] bg-[#071015]/95 shadow-2xl backdrop-blur-xl">
      <CardHeader className="text-center space-y-1">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary shadow-lg shadow-primary/20">
          <KeyRound className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl font-bold text-white tracking-tight">
          Create New Password
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {hasTokenFromUrl
            ? 'Reset link verified. Choose a secure new password for your account.'
            : 'Enter your reset token from the email link and set a new password.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="rounded-lg border border-primary/20 bg-primary/10 p-5 text-center space-y-3">
            <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
            <p className="text-base font-semibold text-white">Password Reset Successfully!</p>
            <p className="text-xs text-muted-foreground">
              Your password has been updated. Redirecting you to the sign in page...
            </p>
            <div className="pt-2">
              <Link href="/login">
                <Button className="w-full text-xs">Sign In Now</Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            {hasTokenFromUrl ? (
              <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">Email verification token attached</span>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-muted-foreground">Reset Token</label>
                  <Link href="/forgot-password" className="text-[11px] text-primary hover:underline">
                    Need a reset link?
                  </Link>
                </div>
                <Input
                  className="font-mono text-xs"
                  placeholder="Paste your reset token..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground">New Password</label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  className="text-sm pr-10"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Confirm New Password</label>
              <div className="relative mt-1">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="text-sm pr-10"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Set New Password
            </Button>

            <div className="flex items-center justify-between pt-2 text-xs">
              <Link href="/login" className="inline-flex items-center gap-1 text-muted-foreground hover:text-white transition">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
              </Link>
              <Link href="/forgot-password" className="text-primary hover:underline">
                Request another link
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
    <div className="dashboard-grid flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl overflow-hidden border border-white/10 shadow-md">
            <img src="/brand/synergysphere-logo.png" alt="SynergySphere" className="h-full w-full object-cover" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">SynergySphere</span>
        </div>
        <Suspense fallback={<div className="text-center text-xs text-muted-foreground">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
