'use client';

import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LogIn, Mail, Lock, ShieldCheck, UserCheck } from 'lucide-react';

function LoginForm() {
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
    } catch (err) {
      toast.error('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (type: 'member' | 'admin') => {
    setLoading(true);
    const demoEmail = type === 'member' ? 'member@demo.tsa' : 'admin@demo.tsa';
    try {
      const res = await signIn('credentials', {
        email: demoEmail,
        password: 'demoPassword123',
        redirect: false,
        callbackUrl: type === 'admin' ? '/admin/members' : '/portal',
      });

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Logged in as Demo ${type === 'admin' ? 'Admin' : 'Member'}!`);
        router.push(type === 'admin' ? '/admin/members' : '/portal');
        router.refresh();
      }
    } catch (err) {
      toast.error('Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4 font-sans">
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
            <div className="flex justify-between items-center">
              <Label htmlFor="password">Password</Label>
            </div>
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
          
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
            <LogIn className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </form>

      <div className="relative px-6 pb-2 text-center text-xs text-slate-400 uppercase">
        <span className="bg-white px-2 relative z-10">Or Sign In With</span>
        <div className="absolute top-1/2 left-6 right-6 border-b border-slate-200 -z-0"></div>
      </div>

      <CardContent className="space-y-2 pb-6">
        <Button 
          variant="outline" 
          className="w-full flex items-center justify-center gap-2 hover:bg-slate-50"
          onClick={() => signIn('google', { callbackUrl })}
          disabled={loading}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </Button>
      </CardContent>

      <div className="relative px-6 pb-2 text-center text-xs text-slate-400 uppercase">
        <span className="bg-white px-2 relative z-10">Testing Demo Portals</span>
        <div className="absolute top-1/2 left-6 right-6 border-b border-slate-200 -z-0"></div>
      </div>

      <CardContent className="grid grid-cols-2 gap-2 pb-6">
        <Button 
          variant="secondary" 
          className="text-xs font-semibold"
          onClick={() => handleDemoLogin('member')}
          disabled={loading}
        >
          <UserCheck className="mr-1 h-3.5 w-3.5" />
          Demo Member
        </Button>
        <Button 
          variant="secondary" 
          className="text-xs font-semibold"
          onClick={() => handleDemoLogin('admin')}
          disabled={loading}
        >
          <ShieldCheck className="mr-1 h-3.5 w-3.5" />
          Demo Admin
        </Button>
      </CardContent>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center pt-32 pb-16 px-4">
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-emerald-600 bg-white">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">TSA Member Portal</CardTitle>
            <CardDescription className="text-slate-500">
              Sign in to view your balance and fill in forms
            </CardDescription>
          </CardHeader>
          
          <Suspense fallback={<div className="p-6 text-center text-sm text-slate-400">Loading form...</div>}>
            <LoginForm />
          </Suspense>

          <CardFooter className="flex justify-center border-t border-slate-100 py-4 bg-slate-50/50">
            <p className="text-sm text-slate-600">
              Need access?{' '}
              <a href="/signup" className="text-emerald-600 hover:text-emerald-700 font-semibold underline">
                Activate account / Join TSA
              </a>
            </p>
          </CardFooter>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
