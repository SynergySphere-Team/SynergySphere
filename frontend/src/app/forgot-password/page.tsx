'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/utils';
import { AlertCircle, ArrowLeft, CheckCircle2, ExternalLink, KeyRound, Loader2, Lock, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [emailDelivered, setEmailDelivered] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  function isValidEmail(val: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api<{ message: string; emailDelivered?: boolean; resetUrl?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: trimmedEmail }),
      });

      setSuccess(true);
      setEmailDelivered(Boolean(response.emailDelivered));
      if (response.resetUrl) {
        setDevResetUrl(response.resetUrl);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to request password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard-grid flex min-h-screen items-center justify-center p-4">
      <Card className="relative w-full max-w-md border-white/[0.08] bg-[#071015]/95 shadow-2xl backdrop-blur-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary shadow-lg shadow-primary/20">
            {success ? (
              emailDelivered ? <Mail className="h-7 w-7 text-primary" /> : <AlertCircle className="h-7 w-7 text-amber-400" />
            ) : (
              <KeyRound className="h-7 w-7 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold text-white tracking-tight">
            {success ? (emailDelivered ? 'Check Your Email' : 'Reset Link Generated') : 'Forgot Password?'}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            {success
              ? emailDelivered
                ? `We sent instructions to reset your password to ${email}`
                : `A reset link has been generated for ${email}.`
              : "Enter the email associated with your account and we'll send you a link to reset your password."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {success ? (
            <div className="space-y-4">
              {emailDelivered ? (
                <div className="rounded-lg border border-primary/20 bg-primary/10 p-4 space-y-2 text-center">
                  <CheckCircle2 className="mx-auto h-6 w-6 text-primary" />
                  <p className="text-sm font-semibold text-white">Reset Link Dispatched</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    If an account exists for <strong className="text-white">{email}</strong>, you will receive an email shortly with a secure link to create a new password. The link will expire in 1 hour.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span>SMTP Mail Server Not Yet Configured</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The backend does not have SMTP credentials (such as Gmail App Password or SendGrid) configured in <code className="bg-black/40 px-1 py-0.5 rounded text-amber-200">backend/.env</code>, so real emails cannot be transmitted to your email provider yet.
                  </p>
                  <p className="text-xs text-white font-medium">
                    You can reset your password right now using the generated link:
                  </p>
                  {devResetUrl && (
                    <Link href={devResetUrl} className="block">
                      <Button className="w-full gap-2 bg-amber-500 text-black hover:bg-amber-400 font-bold text-xs">
                        <Lock className="h-4 w-4" />
                        Click Here to Reset Password Now
                      </Button>
                    </Link>
                  )}
                  <p className="text-[11px] text-muted-foreground/80 leading-normal">
                    💡 To receive real emails in your inbox, add <code className="text-amber-200">SMTP_SERVICE="gmail"</code>, <code className="text-amber-200">SMTP_USER</code>, and <code className="text-amber-200">SMTP_PASS</code> into <code className="text-amber-200">backend/.env</code>.
                  </p>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => {
                    setSuccess(false);
                    setDevResetUrl(null);
                  }}
                >
                  Resend or use another email
                </Button>

                <div className="text-center pt-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Sign In
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  required
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={loading || !email.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending link...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Send Password Reset Link
                  </>
                )}
              </Button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
