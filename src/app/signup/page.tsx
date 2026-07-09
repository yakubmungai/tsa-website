'use client';

import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  lookupMemberProfile, 
  sendVerificationCode, 
  verifyOTPAndRegister 
} from '@/features/membership/auth-actions';
import { Search, Mail, KeyRound, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  
  // Step-based state: 1 = lookup, 2 = email entry & send OTP, 3 = verify OTP & set password
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Lookup fields
  const [lookupTerm, setLookupTerm] = useState('');
  const [matchedMember, setMatchedMember] = useState<{ id: string; names: string } | null>(null);

  // Email & OTP fields
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Handle Lookup
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupTerm) {
      toast.error('Please enter your phone number or email.');
      return;
    }
    setLoading(true);
    try {
      const res = await lookupMemberProfile(lookupTerm);
      if (res.success && res.memberId && res.names) {
        setMatchedMember({ id: res.memberId, names: res.names });
        setStep(2);
        toast.success(`Profile found for: ${res.names}`);
      } else {
        toast.error(res.error || 'Profile lookup failed.');
      }
    } catch (err) {
      toast.error('An error occurred during profile lookup.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Send OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await sendVerificationCode(email);
      if (res.success) {
        toast.success(`Verification code sent to ${email}`);
        setStep(3);
      } else {
        toast.error(res.error || 'Failed to send verification code.');
      }
    } catch (err) {
      toast.error('An error occurred while sending the code.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Verify & Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !password || !confirmPassword) {
      toast.error('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOTPAndRegister({
        memberId: matchedMember!.id,
        email,
        code,
        passwordHash: password
      });

      if (res.success) {
        toast.success('Account activated successfully! You can now log in.');
        router.push('/login');
      } else {
        toast.error(res.error || 'Failed to verify code and register.');
      }
    } catch (err) {
      toast.error('An error occurred during account registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      <main className="flex-grow flex items-center justify-center pt-32 pb-16 px-4">
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-emerald-600 bg-white">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Activate Account</CardTitle>
            <CardDescription className="text-slate-500">
              {step === 1 && "Find your existing member profile to setup portal access"}
              {step === 2 && `Setting up account for ${matchedMember?.names}`}
              {step === 3 && "Verify your email with the 6-digit code"}
            </CardDescription>
          </CardHeader>

          {/* STEP 1: LOOKUP BY PHONE/EMAIL */}
          {step === 1 && (
            <form onSubmit={handleLookup}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lookup">Phone Number or Email</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input 
                      id="lookup" 
                      type="text" 
                      placeholder="e.g. 563-210-1022" 
                      value={lookupTerm}
                      onChange={(e) => setLookupTerm(e.target.value)}
                      className="pl-10"
                      disabled={loading}
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    We will search the TSA database using the contact info you provided on signup.
                  </p>
                </div>
                
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium" disabled={loading}>
                  {loading ? 'Searching...' : 'Find My Profile'}
                </Button>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 justify-center border-t border-slate-100 py-4 bg-slate-50/50 text-center">
                <p className="text-sm text-slate-600">
                  Profile not found?{' '}
                  <a href="/membership" className="text-emerald-600 hover:text-emerald-700 font-semibold underline">
                    Join TSA / Apply Now
                  </a>
                </p>
                <p className="text-xs text-slate-400">
                  Already have portal credentials? <a href="/login" className="text-emerald-600 hover:underline">Log in here</a>
                </p>
              </CardFooter>
            </form>
          )}

          {/* STEP 2: PROVIDE LOGIN EMAIL & SEND CODE */}
          {step === 2 && (
            <form onSubmit={handleSendOTP}>
              <CardContent className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-800">Found Record</h4>
                    <p className="text-xs text-emerald-700 font-medium">{matchedMember?.names}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Login Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="Enter your preferred email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      disabled={loading}
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    We will send a 6-digit OTP code to this email to verify ownership.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setStep(1)} 
                    disabled={loading}
                    className="w-1/3"
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                  </Button>
                  <Button type="submit" className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium" disabled={loading}>
                    {loading ? 'Sending Code...' : 'Send Code'}
                  </Button>
                </div>
              </CardContent>
            </form>
          )}

          {/* STEP 3: OTP VERIFICATION & PASSWORD SETUP */}
          {step === 3 && (
            <form onSubmit={handleRegister}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Verification Code</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input 
                      id="code" 
                      type="text" 
                      placeholder="6-digit OTP" 
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      maxLength={6}
                      className="pl-10 font-mono tracking-widest text-center text-lg"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Create Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setStep(2)} 
                    disabled={loading}
                    className="w-1/3"
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                  </Button>
                  <Button type="submit" className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium" disabled={loading}>
                    {loading ? 'Registering...' : 'Verify & Register'}
                  </Button>
                </div>
              </CardContent>
            </form>
          )}
        </Card>
      </main>

      <Footer />
    </div>
  );
}
