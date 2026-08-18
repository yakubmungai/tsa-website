'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LogIn, Mail, Lock } from 'lucide-react';

function EmailPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/portal';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success('Logged in successfully!');
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <div className="space-y-4 font-sans">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              disabled={loading}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              disabled={loading}
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
          <LogIn className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

/**
 * `children` carries the demo sign-in block, which the server renders only when
 * demo mode is active — so nothing about it exists in the bundle otherwise.
 */
export function LoginForm({ children }: { children?: React.ReactNode }) {
  return (
    <CardContent className="space-y-5">
      <Suspense
        fallback={<div className="p-6 text-center text-sm text-slate-400">Loading form...</div>}
      >
        <EmailPasswordForm />
      </Suspense>

      {children ? (
        <>
          <div className="relative text-center text-xs uppercase tracking-wide text-slate-400">
            <span className="relative z-10 bg-white px-2">Au / Or</span>
            <div className="absolute top-1/2 left-0 right-0 -z-0 border-b border-slate-200" />
          </div>
          {children}
        </>
      ) : null}
    </CardContent>
  );
}
