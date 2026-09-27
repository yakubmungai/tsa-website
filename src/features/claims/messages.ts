/**
 * WhatsApp wording for cases — the announcement to the group, and a personal
 * reminder to one member.
 *
 * Pure, so the wording can be revised and tested without a database. Swahili
 * first, English after, amount and deadline near the top: WhatsApp hides long
 * messages behind "Read more".
 */

const HEADER = '*TANZANIA SHARING ASSOCIATION (TSA)*';

export interface AnnouncementInput {
  type: 'MEMBER_DEATH' | 'CHILD_DEATH' | 'RELATIVE_DEATH' | 'HARDSHIP';
  reference: string;
  memberName: string;
  subjectName: string;
  /** Formatted, e.g. "$19.61". */
  share: string;
  /** Formatted, e.g. "24 Sep 2026". */
  deadline: string;
  voluntary?: boolean;
  link?: string;
}

function titles(type: AnnouncementInput['type']): { sw: string; en: string } {
  switch (type) {
    case 'MEMBER_DEATH':
      return { sw: 'TAARIFA YA MSIBA', en: 'BEREAVEMENT NOTICE' };
    case 'CHILD_DEATH':
    case 'RELATIVE_DEATH':
      return { sw: 'TAARIFA YA MSIBA', en: 'BEREAVEMENT NOTICE' };
    case 'HARDSHIP':
      return { sw: 'TAARIFA YA SHIDA', en: 'HARDSHIP NOTICE' };
  }
}

function whatHappened(input: AnnouncementInput): { sw: string; en: string } {
  switch (input.type) {
    case 'MEMBER_DEATH':
      return {
        sw: `Tunasikitika kuwajulisha kifo cha mwanachama wetu *${input.memberName}*.`,
        en: `We are saddened to announce the passing of our member *${input.memberName}*.`,
      };
    case 'CHILD_DEATH':
    case 'RELATIVE_DEATH':
      return {
        sw: `Mwanachama wetu *${input.memberName}* amefiwa na *${input.subjectName}*.`,
        en: `Our member *${input.memberName}* has lost *${input.subjectName}*.`,
      };
    case 'HARDSHIP':
      return {
        sw: `Mwanachama wetu *${input.memberName}* amepatwa na shida.`,
        en: `Our member *${input.memberName}* is facing a hardship.`,
      };
  }
}

export function announcementMessage(input: AnnouncementInput): string {
  const t = titles(input.type);
  const w = whatHappened(input);
  const lines = [HEADER, `*${t.sw}* (${input.reference})`, '', 'Ndugu wanachama,', w.sw];
  if (input.voluntary) {
    lines.push('Michango ni ya *hiari* (kihiari). Mungu awabariki kwa moyo wenu.');
  } else {
    lines.push(
      `Mchango wa kila mwanachama ni *${input.share}*, kabla ya *${input.deadline}*.`,
      'Kama una akiba tangulizi, mchango wako umeshatolewa humo.'
    );
  }
  if (input.link) lines.push(`Angalia akaunti yako: ${input.link}`);
  lines.push('', '— — —', '', `*${t.en}* (${input.reference})`, w.en);
  if (input.voluntary) {
    lines.push('Contributions are *voluntary* (kihiari). Thank you for your generosity.');
  } else {
    lines.push(
      `Each member's contribution is *${input.share}*, by *${input.deadline}*.`,
      'If you hold advance savings, your share has already been taken from them.'
    );
  }
  if (input.link) lines.push(`Check your account: ${input.link}`);
  return lines.join('\n');
}

export interface ReminderInput {
  firstName: string;
  reference: string;
  subjectName: string;
  /** Formatted amount still owed. */
  amount: string;
  deadline: string;
  overdue: boolean;
  link?: string;
}

/** A personal, polite reminder — sent one at a time from the officer's own WhatsApp. */
export function reminderMessage(input: ReminderInput): string {
  const lines = [
    `Habari ${input.firstName},`,
    input.overdue
      ? `Mchango wako wa *${input.amount}* kwa ${input.subjectName} (${input.reference}) ulitakiwa kufika tarehe ${input.deadline}.`
      : `Tunakukumbusha mchango wako wa *${input.amount}* kwa ${input.subjectName} (${input.reference}), kabla ya ${input.deadline}.`,
  ];
  if (input.link) lines.push(`Lipa au angalia hapa: ${input.link}`);
  lines.push('Asante sana. — TSA', '', `Hello ${input.firstName}, a reminder of your *${input.amount}* contribution for ${input.subjectName} (${input.reference}), due ${input.deadline}.`);
  return lines.join('\n');
}

/** wa.me link to one member, with the message ready to send. */
export function whatsappToUrl(phoneE164: string, message: string): string {
  return `https://wa.me/${phoneE164.replace(/[^\d]/g, '')}?text=${encodeURIComponent(message)}`;
}
