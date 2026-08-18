import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Phone, Mail, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

/**
 * Self-service account activation is disabled until the phone-verification flow
 * replaces it. The previous version let a visitor claim any member's profile and
 * financial ledger by knowing their phone number.
 *
 * Until then, TSA leaders set up member accounts directly.
 */
export default function SignupPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      <main className="flex-grow flex items-center justify-center pt-32 pb-16 px-4">
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-amber-500 bg-white">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
              <ShieldAlert className="h-6 w-6 text-amber-600" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
              Uwezeshaji wa Akaunti
            </CardTitle>
            <CardDescription className="text-slate-500">Account Activation</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 text-slate-700">
            <p className="text-base leading-relaxed">
              Kwa sasa, akaunti za wanachama zinawezeshwa na viongozi wa TSA. Tafadhali
              wasiliana na kiongozi ili upewe akaunti yako.
            </p>
            <p className="text-base leading-relaxed text-slate-600">
              Member accounts are currently set up by TSA leaders. Please contact a leader
              to have your account activated.
            </p>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
              <a
                href="tel:+12066020506"
                className="flex items-center gap-3 text-base font-semibold text-emerald-700 hover:text-emerald-800"
              >
                <Phone className="h-5 w-5 shrink-0" />
                (206) 602-0506
              </a>
              <a
                href="mailto:tansha.hq@gmail.com"
                className="flex items-center gap-3 text-base font-semibold text-emerald-700 hover:text-emerald-800 break-all"
              >
                <Mail className="h-5 w-5 shrink-0" />
                tansha.hq@gmail.com
              </a>
            </div>

            <p className="text-sm text-slate-600">
              Bado si mwanachama?{' '}
              <Link
                href="/membership"
                className="text-emerald-600 hover:text-emerald-700 font-semibold underline"
              >
                Jiunge na TSA / Apply for membership
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
