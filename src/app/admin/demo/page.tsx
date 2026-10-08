import { notFound } from 'next/navigation';
import { CalendarClock, ClipboardList, Download, FlaskConical, MessageSquare, RotateCcw, Users, Wrench } from 'lucide-react';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { isDemoMode, DEMO_PERSONAS } from '@/lib/demo';
import { getClockOffsetMs, now } from '@/lib/clock';
import { isCardPaymentEnabled } from '@/lib/rollout';
import { getLocale, getPortalStrings } from '@/lib/i18n';
import { orgIsoDate } from '@/lib/finance/dates';
import { AdminShell } from '@/components/admin/admin-shell';
import { PageHeader } from '@/components/portal/page-header';
import { SectionCard } from '@/components/portal/section-card';
import { EmptyState } from '@/components/portal/empty-state';
import { DemoReset } from '@/components/demo-reset';
import {
  DemoClock,
  ResolveFeedback,
  ScenarioChecklist,
  SimulateDeposit,
  type Scenario,
} from '@/components/admin/demo/demo-tools';

// "Reset" rebuilds ~150 members and seven cases in one request.
export const maxDuration = 300;

/**
 * The leaders' test guide: practise every part of the system on invented
 * data, move time forward to see deadlines pass, and leave notes. 404 on the
 * live site.
 */
export default async function DemoControlPage() {
  if (!isDemoMode()) notFound();
  await requireAdmin();

  const [t, locale, asOf, offset, members, feedback] = await Promise.all([
    getPortalStrings(),
    getLocale(),
    now(),
    getClockOffsetMs(),
    db.member.findMany({
      where: { archivedAt: null, memberNumber: { lte: 120 } },
      select: { id: true, names: true },
      orderBy: { names: 'asc' },
    }),
    db.formSubmission.findMany({
      where: { formType: 'DEMO_FEEDBACK' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  const g = t.demo.guide;
  const persona = (key: keyof typeof DEMO_PERSONAS, who?: string) =>
    `${locale === 'sw' ? DEMO_PERSONAS[key].labelSw : DEMO_PERSONAS[key].labelEn}${who ? ` (${who})` : ''}`;

  // Order and sign-in for each scenario; the words come from the dictionary,
  // in the viewer's language.
  type ScenarioKey = keyof typeof t.demo.scenarios;
  const plan: [ScenarioKey, keyof typeof DEMO_PERSONAS, string?][] = [
    ['file', 'member', 'Amina'],
    ['review', 'admin'],
    ['report', 'arrears', 'Daniel'],
    ['treasurer', 'admin'],
    ...(isCardPaymentEnabled() ? ([['card', 'arrears', 'Daniel']] as [ScenarioKey, keyof typeof DEMO_PERSONAS, string][]) : []),
    ['time', 'admin'],
    ['tiers', 'admin'],
    ['helper', 'helper', 'Upendo'],
    ['payout', 'admin'],
    ['undo', 'admin'],
    ['notice', 'admin'],
  ];
  const scenarios: Scenario[] = plan.map(([id, who, name]) => ({
    id,
    title: t.demo.scenarios[id].title,
    signInAs: persona(who, name),
    steps: t.demo.scenarios[id].steps,
    expect: t.demo.scenarios[id].expect,
  }));

  const moved = offset !== 0;
  const openFeedback = feedback.filter((f) => f.status === 'PENDING');

  return (
    <AdminShell active="demo">
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-2"><FlaskConical className="h-4 w-4" aria-hidden />{g.eyebrow}</span>}
        title={g.title}
        subtitle={g.subtitle}
      />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="space-y-8 lg:col-span-3">
          <SectionCard title={g.thingsToTry} icon={<ClipboardList className="h-5 w-5 text-primary" />}>
            <ScenarioChecklist scenarios={scenarios} />
          </SectionCard>
        </div>
        <div className="space-y-8 lg:col-span-2">
          <SectionCard
            title={g.timeTitle}
            description={g.timeHelp}
            icon={<CalendarClock className="h-5 w-5 text-primary" />}
          >
            <DemoClock testDate={orgIsoDate(asOf)} moved={moved} />
          </SectionCard>

          <SectionCard title={g.toolsTitle} icon={<Wrench className="h-5 w-5 text-primary" />}>
            <div className="space-y-6">
              <a
                href="/admin/demo/sample-statement"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-primary text-base font-bold text-primary hover:bg-primary/5"
              >
                <Download className="h-5 w-5" aria-hidden />
                {g.download}
              </a>
              <SimulateDeposit members={members} />
            </div>
          </SectionCard>

          <SectionCard title={g.signInsTitle} description={g.signInsHelp} icon={<Users className="h-5 w-5 text-primary" />}>
            <ul className="space-y-3">
              {Object.entries(DEMO_PERSONAS).map(([key, p]) => (
                <li key={key}>
                  <p className="text-base font-semibold">{locale === 'sw' ? p.labelSw : p.labelEn}</p>
                  <p className="text-base text-muted-foreground">{locale === 'sw' ? p.descriptionSw : p.descriptionEn}</p>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard
            title={g.notesTitle(openFeedback.length)}
            description={g.notesHelp}
            icon={<MessageSquare className="h-5 w-5 text-primary" />}
          >
            {feedback.length === 0 ? (
              <EmptyState title={g.noNotes} />
            ) : (
              <ul className="space-y-3">
                {feedback.map((f) => {
                  const d = (f.data ?? {}) as { page?: string; comment?: string };
                  return (
                    <li key={f.id} className={f.status === 'PENDING' ? 'rounded-xl border border-border/60 p-3' : 'rounded-xl bg-muted/40 p-3 opacity-70'}>
                      <p className="whitespace-pre-wrap text-base">{d.comment}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {f.submitterName} · {d.page} · {orgIsoDate(f.createdAt)}
                      </p>
                      {f.status === 'PENDING' ? <div className="mt-2"><ResolveFeedback id={f.id} /></div> : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title={g.resetTitle}
            description={g.resetHelp}
            icon={<RotateCcw className="h-5 w-5 text-warning" />}
          >
            <DemoReset />
          </SectionCard>
        </div>
      </div>
    </AdminShell>
  );
}
