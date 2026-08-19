import Link from 'next/link';
import { db } from '@/lib/db';
import { requireMember } from '@/lib/session';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { AddHelperForm } from '@/components/add-helper-form';
import { RevokeHelperButton } from '@/components/revoke-helper-button';
import { formatPhone } from '@/lib/phone';

const PERMISSION_LABELS: Record<string, { sw: string; en: string }> = {
  VIEW_FINANCES: { sw: 'Kuona salio', en: 'See balance' },
  MAKE_PAYMENTS: { sw: 'Kulipa', en: 'Make payments' },
  SUBMIT_FORMS: { sw: 'Kujaza fomu', en: 'Submit forms' },
  EDIT_PROFILE: { sw: 'Kubadilisha taarifa', en: 'Edit details' },
};

export default async function PortalAccessPage() {
  const ctx = await requireMember();

  const delegations = await db.delegation.findMany({
    where: { ownerMemberId: ctx.memberId, status: { in: ['ACTIVE', 'PENDING_OWNER_APPROVAL'] } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-grow space-y-6 px-4 pb-16 pt-28 sm:px-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-3 gap-1.5 text-slate-600">
            <Link href="/portal">
              <ArrowLeft className="h-4 w-4" />
              Rudi / Back
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-slate-900">Wasaidizi wangu</h1>
          <p className="mt-1 text-lg text-slate-600">
            People who can help with my account
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-700" aria-hidden />
              Nani anaweza kuona akaunti yangu
            </CardTitle>
            <CardDescription className="text-base">
              Unaweza kumwondoa mtu wakati wowote. Kila kitu wanachofanya kinaandikwa.
              <span className="mt-1 block text-slate-500">
                You can remove someone at any time. Everything they do is recorded against
                your account.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {delegations.length === 0 ? (
              <p className="text-base text-slate-600">
                Hakuna mtu mwingine anayeweza kuona akaunti yako.
                <span className="ml-1 text-slate-500">Nobody else can see your account.</span>
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {delegations.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 p-4"
                  >
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-slate-900">
                        {d.delegateName}
                        {d.relationship ? (
                          <span className="ml-2 text-base font-normal text-slate-500">
                            ({d.relationship})
                          </span>
                        ) : null}
                      </p>
                      <p className="text-sm text-slate-600">
                        {formatPhone(d.delegatePhoneE164)}
                      </p>
                      <p className="text-sm text-slate-600">
                        {d.permissions
                          .map((p) => PERMISSION_LABELS[p]?.en ?? p)
                          .join(' · ')}
                      </p>
                      {d.status === 'PENDING_OWNER_APPROVAL' ? (
                        <p className="text-sm font-semibold text-amber-700">
                          Inasubiri uthibitisho wako / Waiting for your confirmation
                        </p>
                      ) : null}
                      {d.origin === 'ADMIN_PROVISIONED' ? (
                        <p className="text-sm text-slate-500">
                          Iliwekwa na ofisi / Set up by the TSA office
                        </p>
                      ) : null}
                    </div>
                    <RevokeHelperButton delegationId={d.id} name={d.delegateName} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <AddHelperForm />
      </main>
      <Footer />
    </div>
  );
}
