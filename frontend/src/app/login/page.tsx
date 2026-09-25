'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard-grid flex min-h-screen items-center justify-center p-4">
      <Card className="relative w-full max-w-md">
        <CardHeader className="text-center">
          <img
            src="/brand/synergysphere-logo.png"
            alt="SynergySphere"
            className="mx-auto mb-3 h-16 w-16 rounded-2xl object-cover shadow-lg shadow-primary/20"
          />
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to your SynergySphere account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@university.edu" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Password</label>
                <Link href="/reset-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Password" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary hover:underline">Register</Link>
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Demo: student@synergysphere.com / student123
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
