import type { Metadata } from 'next';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { getLocale } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Privacy | Tanzania Sharing Association',
};

/**
 * Leaders have not approved this text yet. While false, the page says it is a
 * draft. Set to true (and update LAST_UPDATED) once they sign it off.
 */
const APPROVED = false;
const LAST_UPDATED = { en: 'October 2026', sw: 'Oktoba 2026' };

interface Section {
  heading: string;
  paragraphs?: string[];
  items?: string[];
}

const CONTENT: Record<'en' | 'sw', { title: string; intro: string; draft: string; updated: string; sections: Section[] }> = {
  en: {
    title: 'Privacy',
    intro:
      'The Tanzania Sharing Association (TSA) is a mutual-aid association of Tanzanians in the United States. This page explains what personal information TSA collects through this website and the member portal, why, who can see it, and what you can ask of us.',
    draft: 'Draft — this text is waiting for approval by TSA’s leaders.',
    updated: 'Last updated',
    sections: [
      {
        heading: 'What we collect',
        items: [
          'Membership application: your name, phone, email, home address, date and place of birth, and the names, ages, phone numbers and places of residence of the family members your membership covers (spouse, parents, children, brothers and sisters), plus funeral supervisors, witnesses and your signature.',
          'A copy of your ID, if you attach one to the membership form. It is emailed to TSA’s officers with your application and is not stored on the website.',
          'Your member account: your phone number, the payments you make, your savings, dues and contributions, and the benefits paid to you or your family.',
          'Reports you make: details of a death, illness, detention or fire, the people involved, and who should receive support.',
          'Helpers: the name and phone number of anyone you allow to help with your account, and what you allowed them to do.',
          'Messages you send through the contact form.',
        ],
      },
      {
        heading: 'What the website records automatically',
        items: [
          'A sign-in cookie, so you stay signed in, and small settings such as your language and text size.',
          'A scrambled (hashed) version of your internet address, used to stop abuse such as repeated sign-in attempts. The address itself is not stored.',
          'A record of important actions (for example, a payment confirmed or a case approved), showing who did what and when, so the association’s money can be accounted for.',
          'We do not use advertising or tracking cookies, and we do not sell or share your information for marketing.',
        ],
      },
      {
        heading: 'Why we use it',
        items: [
          'To run your membership as the TSA constitution sets out: record what you pay, work out contributions and benefits, and pay support to you or your family.',
          'To contact you about your account, cases and announcements.',
          'To keep the association’s finances accurate and open to audit, and to protect accounts from misuse.',
        ],
      },
      {
        heading: 'Who can see it',
        items: [
          'TSA’s officers (such as the Secretary and Treasurer), who need it to run the association.',
          'Helpers you approve, and only for what you allowed.',
          'Service providers that run the website for TSA, under their own security terms: Vercel (hosting), Neon (database), Twilio (sign-in codes by text message), Resend (email), and, if card payments are switched on, Stripe. They process your information only to provide their service.',
          'Nobody else, unless the law requires it.',
        ],
      },
      {
        heading: 'How long we keep it',
        paragraphs: [
          'Financial records — payments, contributions and benefits — are kept permanently, as the constitution requires the association’s accounts to be complete. If a member leaves, their record is archived rather than deleted. Form submissions and messages are kept for as long as they are needed to deal with them and for the association’s records.',
        ],
      },
      {
        heading: 'Your choices',
        items: [
          'See what is recorded on your account at any time in the member portal.',
          'Ask a TSA leader to correct anything that is wrong.',
          'Remove a helper whenever you like, from “My helpers”.',
          'Ask us any question about your information.',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: ['Tanzania Sharing Association — tansha.hq@gmail.com — (206) 602-0506.'],
      },
    ],
  },
  sw: {
    title: 'Faragha',
    intro:
      'Tanzania Sharing Association (TSA) ni jumuiya ya kusaidiana ya Watanzania walioko Marekani. Ukurasa huu unaeleza taarifa binafsi ambazo TSA inakusanya kupitia tovuti hii na akaunti ya mwanachama, kwa nini, nani anaweza kuziona, na unachoweza kutuomba.',
    draft: 'Rasimu — maandishi haya yanasubiri kuidhinishwa na viongozi wa TSA.',
    updated: 'Ilibadilishwa mwisho',
    sections: [
      {
        heading: 'Tunachokusanya',
        items: [
          'Ombi la uanachama: jina lako, simu, barua pepe, anwani ya nyumbani, tarehe na mahali pa kuzaliwa, na majina, umri, namba za simu na makazi ya wanafamilia wanaohusika na uanachama wako (mwenzi, wazazi, watoto, kaka na dada), pamoja na wasimamizi wa msiba, mashahidi na sahihi yako.',
          'Nakala ya kitambulisho chako, ukiiambatisha kwenye fomu ya uanachama. Inatumwa kwa barua pepe kwa viongozi wa TSA pamoja na ombi lako, na haihifadhiwi kwenye tovuti.',
          'Akaunti yako ya mwanachama: namba yako ya simu, malipo unayofanya, akiba yako, ada na michango, na mafao uliyolipwa wewe au familia yako.',
          'Taarifa unazotoa: maelezo ya msiba, ugonjwa, kizuizini au moto, watu wanaohusika, na nani apokee msaada.',
          'Wasaidizi: jina na namba ya simu ya mtu unayemruhusu kukusaidia na akaunti yako, na ulichomruhusu kufanya.',
          'Ujumbe unaotuma kupitia fomu ya mawasiliano.',
        ],
      },
      {
        heading: 'Tovuti inachorekodi yenyewe',
        items: [
          'Kuki ya kuingia, ili ubaki umeingia, na mipangilio midogo kama lugha na ukubwa wa maandishi.',
          'Toleo lililochanganywa (hash) la anwani yako ya intaneti, kuzuia matumizi mabaya kama majaribio ya kuingia mara nyingi. Anwani yenyewe haihifadhiwi.',
          'Kumbukumbu ya hatua muhimu (kwa mfano, malipo yaliyothibitishwa au shida iliyoidhinishwa), ikionyesha nani alifanya nini na lini, ili fedha za jumuiya ziweze kuhesabiwa.',
          'Hatutumii kuki za matangazo au za kufuatilia, na hatuuzi wala kushiriki taarifa zako kwa ajili ya biashara.',
        ],
      },
      {
        heading: 'Kwa nini tunazitumia',
        items: [
          'Kuendesha uanachama wako kama Katiba ya TSA inavyoelekeza: kurekodi unacholipa, kukokotoa michango na mafao, na kulipa msaada kwako au kwa familia yako.',
          'Kuwasiliana nawe kuhusu akaunti yako, shida/misiba na matangazo.',
          'Kuweka fedha za jumuiya sahihi na wazi kwa ukaguzi, na kulinda akaunti dhidi ya matumizi mabaya.',
        ],
      },
      {
        heading: 'Nani anaweza kuziona',
        items: [
          'Viongozi wa TSA (kama Katibu na Mweka Hazina), wanaozihitaji kuendesha jumuiya.',
          'Wasaidizi unaowaruhusu, na kwa kile tu ulichoruhusu.',
          'Watoa huduma wanaoendesha tovuti kwa ajili ya TSA, chini ya masharti yao ya usalama: Vercel (kuhifadhi tovuti), Neon (hifadhidata), Twilio (namba za kuingia kwa ujumbe mfupi), Resend (barua pepe), na, malipo ya kadi yakiwashwa, Stripe. Wanatumia taarifa zako tu kutoa huduma yao.',
          'Hakuna mwingine, isipokuwa sheria ikitaka.',
        ],
      },
      {
        heading: 'Tunazihifadhi kwa muda gani',
        paragraphs: [
          'Kumbukumbu za fedha — malipo, michango na mafao — zinahifadhiwa daima, kwa kuwa Katiba inataka hesabu za jumuiya ziwe kamili. Mwanachama akiondoka, kumbukumbu zake zinawekwa kando badala ya kufutwa. Fomu na ujumbe zinahifadhiwa kwa muda unaohitajika kuzishughulikia na kwa kumbukumbu za jumuiya.',
        ],
      },
      {
        heading: 'Unachoweza kufanya',
        items: [
          'Kuona kilichorekodiwa kwenye akaunti yako wakati wowote kwenye akaunti ya mwanachama.',
          'Kumwomba kiongozi wa TSA kurekebisha chochote kisicho sahihi.',
          'Kumwondoa msaidizi wakati wowote, kupitia “Wasaidizi wangu”.',
          'Kutuuliza swali lolote kuhusu taarifa zako.',
        ],
      },
      {
        heading: 'Mawasiliano',
        paragraphs: ['Tanzania Sharing Association — tansha.hq@gmail.com — (206) 602-0506.'],
      },
    ],
  },
};

export default async function PrivacyPage() {
  const locale = (await getLocale()) === 'en' ? 'en' : 'sw';
  const c = CONTENT[locale];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-grow px-4 pt-32 pb-16">
        <article className="mx-auto max-w-3xl space-y-8">
          <header className="space-y-3">
            <h1 className="font-serif text-4xl font-bold text-foreground">{c.title}</h1>
            <p className="text-base text-muted-foreground">
              {c.updated}: {LAST_UPDATED[locale]}
            </p>
            {APPROVED ? null : (
              <p role="note" className="rounded-2xl border-2 border-warning/40 bg-warning/10 p-4 text-base font-semibold text-foreground">
                {c.draft}
              </p>
            )}
            <p className="text-lg leading-relaxed text-foreground">{c.intro}</p>
          </header>

          {c.sections.map((s) => (
            <section key={s.heading} className="space-y-3">
              <h2 className="font-serif text-2xl font-bold text-foreground">{s.heading}</h2>
              {s.paragraphs?.map((p) => (
                <p key={p} className="text-lg leading-relaxed text-foreground">
                  {p}
                </p>
              ))}
              {s.items ? (
                <ul className="list-disc space-y-2 pl-6 text-lg leading-relaxed text-foreground">
                  {s.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </article>
      </main>
      <Footer />
    </div>
  );
}
