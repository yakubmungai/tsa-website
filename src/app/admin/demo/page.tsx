import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { isDemoMode, DEMO_PERSONAS } from '@/lib/demo';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { DemoReset } from '@/components/demo-reset';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

/**
 * Control panel for the leaders' test environment: what to try, and how to put
 * everything back afterwards.
 */
export default async function DemoControlPage() {
  // 404 rather than redirect when demo mode is off, so this page does not even
  // advertise its existence on the live site.
  if (!isDemoMode()) notFound();

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') redirect('/login');

  const walkthrough = [
    {
      sw: 'Angalia salio la mwanachama',
      en: 'Open a member and read their balance',
      detail:
        'Members Directory → any name. Check the advance, entry fee and dues against what the constitution requires ($100 + $100 + $25).',
    },
    {
      sw: 'Weka malipo kwenye hesabu',
      en: 'Post a payment to the ledger',
      detail:
        'On a member page, use "Log New Transaction". Try an invalid amount such as "abc" or "12.345" — it should be refused rather than saved.',
    },
    {
      sw: 'Pakua ripoti',
      en: 'Download the reports',
      detail:
        'Members Directory → "Export Database (Excel)" and "Export PDF Report". The PDF is the one shared to WhatsApp, so check it reads well on a phone.',
    },
    {
      sw: 'Hifadhi mwanachama',
      en: 'Archive a member',
      detail:
        'Open a member → "Archive Profile". You must type their full name. Their transaction history is kept — confirm it is still there afterwards.',
    },
    {
      sw: 'Angalia ukurasa wa mwanachama',
      en: 'See what a member sees',
      detail:
        'Sign out, then sign in as "Member in good standing" and as "Member behind on contributions". Compare the two.',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-grow space-y-6 px-4 pb-16 pt-28 sm:px-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-3 gap-1.5 text-slate-600">
            <Link href="/admin/members">
              <ArrowLeft className="h-4 w-4" />
              Back to Members
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-slate-900">Mfumo wa Majaribio</h1>
          <p className="mt-1 text-lg text-slate-600">
            Test environment — nothing here is real, and nothing you do affects members.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Jaribu haya / Things to try</CardTitle>
            <CardDescription>
              Kila kitu kinaweza kurudishwa mwanzo. Usiogope kujaribu.
              <span className="mt-1 block">
                Everything can be reset, so explore freely — you cannot break anything.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {walkthrough.map((step, i) => (
                <li key={step.en} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                    {i + 1}
                  </span>
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-slate-900">
                      {step.sw}
                      <span className="ml-2 text-base font-normal text-slate-500">{step.en}</span>
                    </p>
                    <p className="text-base leading-relaxed text-slate-600">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Watumiaji wa majaribio / Test sign-ins</CardTitle>
            <CardDescription>
              Available on the sign-in page. No passwords — choosing a role is enough.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {Object.entries(DEMO_PERSONAS).map(([key, persona]) => (
                <li key={key} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {persona.labelSw}
                      <span className="ml-2 font-normal text-slate-500">{persona.labelEn}</span>
                    </p>
                    <p className="text-base text-slate-600">{persona.descriptionEn}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader>
            <CardTitle>Anza upya / Start over</CardTitle>
            <CardDescription>
              Rebuilds the demo members and balances exactly as they started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DemoReset />
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
