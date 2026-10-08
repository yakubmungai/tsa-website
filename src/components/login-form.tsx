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
import { PhoneLoginForm } from '@/components/phone-login-form';
import { usePortalStrings } from '@/components/portal/use-portal-strings';

function EmailPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/portal';
  const t = usePortalStrings().login;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(t.enterBoth);
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
        toast.success(t.signedIn);
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      toast.error(t.failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <div className="space-y-4 font-sans">
        <div className="space-y-2">
          <Label htmlFor="email">{t.email}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 pl-10 text-base"
              disabled={loading}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t.password}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 pl-10 text-base"
              disabled={loading}
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          className="btn-shimmer h-12 w-full border-0 text-base font-bold text-primary-foreground"
          disabled={loading}
        >
          {loading ? t.signingIn : t.signIn}
          <LogIn className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="relative text-center text-sm uppercase tracking-wide text-muted-foreground">
      <span className="relative z-10 bg-card px-2">{label}</span>
      <div className="absolute top-1/2 left-0 right-0 -z-0 border-b border-border" />
    </div>
  );
}

/**
 * Phone is the primary way in.
 *
 * The member roster has a phone number for everyone and no email column at all,
 * so a code to their phone is the only route that works for the whole
 * membership — and for older members it means nothing to remember.
 *
 * Email and password stay available, collapsed, for accounts that have one.
 * `children` carries the demo sign-in block, rendered by the server only when
 * demo mode is on.
 */
export function LoginForm({ children }: { children?: React.ReactNode }) {
  const [showPassword, setShowPassword] = useState(false);
  const t = usePortalStrings().login;

  return (
    <CardContent className="space-y-5">
      <Suspense
        fallback={<div className="p-6 text-center text-base text-muted-foreground">{t.loading}</div>}
      >
        <PhoneLoginForm />
      </Suspense>

      <Divider label={t.or} />

      {showPassword ? (
        <Suspense fallback={null}>
          <EmailPasswordForm />
        </Suspense>
      ) : (
        <Button
          type="button"
          variant="ghost"
          onClick={() => setShowPassword(true)}
          className="h-12 w-full text-base font-medium text-muted-foreground hover:text-foreground"
        >
          {t.withEmail}
        </Button>
      )}

      {children ? (
        <>
          <Divider label={t.testing} />
          {children}
        </>
      ) : null}
    </CardContent>
  );
}
