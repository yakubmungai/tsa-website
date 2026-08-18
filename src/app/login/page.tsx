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
import { LogIn, Mail, Lock } from 'lucide-react';

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
              Want to join TSA?{' '}
              <a href="/membership" className="text-emerald-600 hover:text-emerald-700 font-semibold underline">
                Apply for membership
              </a>
            </p>
          </CardFooter>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
