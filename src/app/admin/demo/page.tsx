import { notFound } from 'next/navigation';
import { CalendarClock, ClipboardList, Download, FlaskConical, MessageSquare, RotateCcw, Users, Wrench } from 'lucide-react';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { isDemoMode, DEMO_PERSONAS } from '@/lib/demo';
import { getClockOffsetMs, now } from '@/lib/clock';
import { isCardPaymentEnabled } from '@/lib/rollout';
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

  const [asOf, offset, members, feedback] = await Promise.all([
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

  const scenarios: Scenario[] = [
    {
      id: 'file',
      sw: 'Mwanachama anatoa taarifa ya msiba wa mama yake',
      en: 'A member reports her mother’s death',
      signInAs: `${DEMO_PERSONAS.member.labelSw} (Amina)`,
      steps: [
        'Kwenye ukurasa wa mwanzo bonyeza "Toa taarifa ya shida/msiba". / On the dashboard tap "Report a hardship or death".',
        'Chagua "Msiba wa ndugu" → "Mzazi/Mlezi" → "Zainabu Hassan". / Choose "A relative’s death" → "Parent" → "Zainabu Hassan".',
        'Endelea hadi mwisho, tuma. / Continue to the end and send.',
      ],
      expect: 'Namba ya kumbukumbu (TSA-C-…) na makadirio ya $3,000. / A reference number and an estimate of $3,000.',
    },
    {
      id: 'review',
      sw: 'Katibu anakagua, anaidhinisha na kutangaza',
      en: 'The Secretary reviews, approves and announces',
      signInAs: DEMO_PERSONAS.admin.labelSw,
      steps: [
        'Leo → "Taarifa … zinasubiri ukaguzi" → kesi ya Amina. / Today → the waiting case → Amina’s case.',
        '"Anza ukaguzi", angalia hali siku ya tukio na mambo ya kuangalia, kisha "Idhinisha kesi". / Start review, check the standing and flags, approve.',
        '"Tangaza sasa" → "Thibitisha". Fungua ujumbe wa WhatsApp. / Announce, then open the WhatsApp message.',
      ],
      expect:
        'Wanachama ~153 wanachangia takriban $19.61; jumla ni $3,000 kamili. Wenye akiba wamelipwa kutoka akiba. / About 153 members at ~$19.61, exactly $3,000 in total; savings cover it first.',
    },
    {
      id: 'report',
      sw: 'Mwanachama mwenye deni analipa kwa Zelle',
      en: 'A member who owes pays by Zelle',
      signInAs: `${DEMO_PERSONAS.arrears.labelSw} (Daniel)`,
      steps: [
        'Angalia kisanduku cha njano "Unadaiwa". Bonyeza "Lipa sasa". / See the amber "You owe" box; tap "Pay now".',
        'Angalia namba ya Zelle na TSA-namba ya memo, kisha bonyeza "Nimelipa". / See the Zelle number and memo reference; tap "I have paid".',
      ],
      expect: 'Ukurasa wa mwanzo unaonyesha "inasubiri uthibitisho" — deni bado halijafutwa. / The dashboard says it is waiting for the Treasurer; the debt is not cleared yet.',
    },
    {
      id: 'treasurer',
      sw: 'Mweka Hazina anapakia taarifa ya benki na kuthibitisha',
      en: 'The Treasurer uploads the bank file and confirms',
      signInAs: DEMO_PERSONAS.admin.labelSw,
      steps: [
        'Pakua "taarifa ya benki ya majaribio" hapa chini. / Download the practice bank statement below.',
        'Malipo → buruta faili kwenye kisanduku. / Payments → drop the file in the box.',
        '"Thibitisha zote zilizolingana". Kisha "Pesa za benki bila mwenyewe" → Baraka. / Confirm all matched; then assign Baraka’s unreported $100.',
      ],
      expect: 'Malipo yaliyoripotiwa yamelingana na benki; deni la Daniel limefutwa. / Reported payments matched; Daniel no longer owes.',
    },
    ...(isCardPaymentEnabled()
      ? [
          {
            id: 'card',
            sw: 'Mwanachama analipa kwa kadi',
            en: 'A member pays by card',
            signInAs: `${DEMO_PERSONAS.arrears.labelSw} (Daniel)`,
            steps: ['Lipa sasa → "Lipa kwa kadi". Tumia kadi ya majaribio 4242 4242 4242 4242, tarehe yoyote ya baadaye, CVC yoyote. / Use test card 4242 4242 4242 4242.'],
            expect: 'Malipo yanathibitishwa yenyewe bila Mweka Hazina. / The payment confirms itself — no Treasurer step.',
          },
        ]
      : []),
    {
      id: 'time',
      sw: 'Songa mbele siku 15: michango inachelewa',
      en: 'Move 15 days on: contributions go overdue',
      signInAs: DEMO_PERSONAS.admin.labelSw,
      steps: [
        'Hapa juu bonyeza "Songa mbele siku 15". / Above, press "+15 days".',
        'Angalia Leo: michango iliyochelewa na orodha ya Bodi ya Wadhamini. / Check Today: overdue contributions and the Board list.',
        'Ingia kama Daniel: onyo la Ibara 17. Lipa, thibitisha — onyo linaondoka. / Sign in as Daniel: the Art 17 warning. Pay and confirm — it clears.',
      ],
      expect: 'Onyo baada ya mchango 1–2 uliokosa; Bodi baada ya 3. Programu inaonyesha tu. / Warning after 1–2 missed; Board after 3. The software only flags.',
    },
    {
      id: 'tiers',
      sw: 'Viwango vya mafao (Ibara 18.9)',
      en: 'Benefit tiers (Art 18.9)',
      signInAs: DEMO_PERSONAS.admin.labelSw,
      steps: [
        'Fungua kesi ya Grace (mtoto wake Peter): ana ada tu, bila akiba → $2,000. / Open Grace’s case: dues only → $2,000.',
        'Fungua kesi ya Hamisi: ana akiba ya $80 tu, chini ya $125 → $1,500 badala ya $3,000. / Hamisi holds only $80, under $125 → $1,500 instead of $3,000.',
        'Kesi ya Neema: taarifa ilichelewa na jina halipo kwenye mkataba. / Neema’s case: reported late, and the name is not on her contract.',
      ],
      expect: 'Kiasi kinapendekezwa kwa kanuni; ukibadilisha lazima uandike sababu. / Amounts come from the rules; changing one needs a reason.',
    },
    {
      id: 'helper',
      sw: 'Msaidizi anatoa taarifa na kulipa kwa niaba ya mama yake',
      en: 'A helper reports and pays for her mother',
      signInAs: `${DEMO_PERSONAS.helper.labelSw} (Upendo)`,
      steps: [
        'Ukurasa wa mwanzo → "Badilisha akaunti" → Zawadi. / Dashboard → switch to Zawadi’s account.',
        'Toa taarifa au lipa kwa niaba yake. / Report or pay on her behalf.',
      ],
      expect: 'Bango linaonyesha unamsaidia Zawadi; kila kitendo kimeandikwa kwa jina lako. / A banner shows you are helping Zawadi; everything is recorded under your name.',
    },
    {
      id: 'payout',
      sw: 'Lipa mafao na ufunge kesi',
      en: 'Pay out the benefit and close',
      signInAs: DEMO_PERSONAS.admin.labelSw,
      steps: [
        'Shida/Misiba → kesi ya Zawadi → weka alama masharti manne ya Ibara 18.9. / Zawadi’s case → tick the four Art 18.9 conditions.',
        'Rekodi malipo ya mafao, kisha "Funga kesi". / Record the payout, then close.',
      ],
      expect: 'Kitufe cha kulipa hakifanyi kazi hadi masharti yote yawe tayari. / The pay button stays locked until every condition is ticked.',
    },
    {
      id: 'undo',
      sw: 'Tengua malipo yaliyoandikwa vibaya',
      en: 'Undo a payment recorded by mistake',
      signInAs: DEMO_PERSONAS.admin.labelSw,
      steps: [
        'Wanachama → mwanachama yeyote → Historia → "Tengua" → andika sababu. / Members → anyone → history → Undo → give a reason.',
      ],
      expect: 'Hakuna kinachofutwa: kiingilio cha kinyume kinaongezwa na vyote viwili vinaonekana. / Nothing is deleted: an opposite entry is added and both stay visible.',
    },
    {
      id: 'notice',
      sw: 'Geuza taarifa ya msiba kutoka tovuti kuwa kesi',
      en: 'Turn a public funeral notice into a case',
      signInAs: DEMO_PERSONAS.admin.labelSw,
      steps: ['Fomu → taarifa ya Rashid kuhusu Juma Mrisho → "Fungua kesi kutoka taarifa hii" → chagua Salma Mrisho. / Forms → the notice → open a case → choose Salma.'],
      expect: 'Taarifa zinahamishwa kwenye kesi mpya; fomu inaonyesha imeshughulikiwa. / The details carry across; the form is marked handled.',
    },
  ];

  const moved = offset !== 0;
  const openFeedback = feedback.filter((f) => f.status === 'PENDING');

  return (
    <AdminShell active="demo">
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-2"><FlaskConical className="h-4 w-4" aria-hidden />Majaribio / Test environment</span>}
        title="Mwongozo wa majaribio"
        subtitle="Kila kitu hapa si halisi, na hakuna kinachowagusa wanachama. Jaribu bila hofu — unaweza kurudisha mwanzo wakati wowote. / Nothing here is real and nothing affects members. Explore freely — you can reset at any time."
      />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="space-y-8 lg:col-span-3">
          <SectionCard title="Jaribu haya / Things to try" icon={<ClipboardList className="h-5 w-5 text-primary" />}>
            <ScenarioChecklist scenarios={scenarios} />
          </SectionCard>
        </div>
        <div className="space-y-8 lg:col-span-2">
          <SectionCard
            title="Songa mbele / Time machine"
            description="Tazama muda wa wiki 2 ukipita bila kusubiri. / See two-week deadlines pass without waiting."
            icon={<CalendarClock className="h-5 w-5 text-primary" />}
          >
            <DemoClock testDate={orgIsoDate(asOf)} moved={moved} />
          </SectionCard>

          <SectionCard title="Zana / Practice tools" icon={<Wrench className="h-5 w-5 text-primary" />}>
            <div className="space-y-6">
              <a
                href="/admin/demo/sample-statement"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-primary text-base font-bold text-primary hover:bg-primary/5"
              >
                <Download className="h-5 w-5" aria-hidden />
                Pakua taarifa ya benki ya majaribio / Download a practice bank statement
              </a>
              <SimulateDeposit members={members} />
            </div>
          </SectionCard>

          <SectionCard title="Watumiaji wa majaribio / Test sign-ins" description="Kwenye ukurasa wa kuingia — bila nywila. / On the sign-in page — no passwords." icon={<Users className="h-5 w-5 text-primary" />}>
            <ul className="space-y-3">
              {Object.entries(DEMO_PERSONAS).map(([key, p]) => (
                <li key={key}>
                  <p className="text-base font-semibold">
                    {p.labelSw} <span className="font-normal text-muted-foreground">/ {p.labelEn}</span>
                  </p>
                  <p className="text-base text-muted-foreground">{p.descriptionSw}</p>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard
            title={`Maoni ya wajaribio / Testers’ notes (${openFeedback.length})`}
            description="Kutoka kitufe cha 'Toa maoni' kwenye bango la majaribio. / From the 'Report a problem' button on the test banner."
            icon={<MessageSquare className="h-5 w-5 text-primary" />}
          >
            {feedback.length === 0 ? (
              <EmptyState title="Hakuna maoni bado. / No notes yet." />
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
            title="Anza upya / Start over"
            description="Inarudisha wanachama, kesi, malipo na tarehe kama mwanzo. / Puts members, cases, payments and the date back as they started."
            icon={<RotateCcw className="h-5 w-5 text-warning" />}
          >
            <DemoReset />
          </SectionCard>
        </div>
      </div>
    </AdminShell>
  );
}
