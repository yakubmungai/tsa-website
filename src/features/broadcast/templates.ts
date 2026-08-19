/**
 * WhatsApp message templates.
 *
 * WhatsApp is how TSA actually communicates — the constitution even provides
 * for meetings held there. This composes messages an officer pastes into the
 * group, with no Meta account, no per-message cost and no approval process.
 *
 * Every message is bilingual by construction, Swahili first, because the group
 * is mixed and the constitution conducts business in Swahili.
 *
 * Pure functions, so they are cheap to test and the wording can be revised
 * without touching the page.
 */

export type BroadcastKind =
  | 'MSIBA'
  | 'PAYMENT_REMINDER'
  | 'MONTHLY_STATEMENT'
  | 'GENERAL';

export interface BroadcastInput {
  kind: BroadcastKind;
  /** Who the announcement concerns. */
  subjectName?: string;
  /** Their relationship to the member, for a bereavement. */
  relation?: string;
  memberName?: string;
  /** Each member's share, already formatted, e.g. "$19.48". */
  amount?: string;
  /** Deadline, already formatted for humans. */
  deadline?: string;
  burialLocation?: string;
  burialDate?: string;
  /** Short link into the portal. */
  link?: string;
  /** Free text for a general announcement. */
  bodySw?: string;
  bodyEn?: string;
}

const HEADER = '*TANZANIA SHARING ASSOCIATION (TSA)*';
const DIVIDER = '— — —';

function line(value: string | undefined, render: (v: string) => string): string[] {
  return value && value.trim() ? [render(value.trim())] : [];
}

/**
 * WhatsApp understands *bold* and _italic_ only — not markdown headings, which
 * would render as literal hashes.
 */
export function composeBroadcast(input: BroadcastInput): string {
  const parts: string[] = [HEADER];

  switch (input.kind) {
    case 'MSIBA': {
      parts.push(
        '*TAARIFA YA MSIBA*',
        '',
        'Ndugu wanachama,',
        `Tumepokea taarifa ya msiba wa *${input.subjectName ?? '—'}*${
          input.relation && input.memberName
            ? `, ${input.relation} wa mwanachama wetu ${input.memberName}`
            : ''
        }.`,
        ''
      );
      parts.push(...line(input.amount, (v) => `Mchango wa kila mwanachama ni *${v}*.`));
      parts.push(...line(input.deadline, (v) => `Tafadhali lipa kabla ya *${v}*.`));
      parts.push(...line(input.link, (v) => `Lipa hapa 👉 ${v}`));
      parts.push(...line(input.burialLocation, (v) => `\nMazishi: ${v}`));
      parts.push(...line(input.burialDate, (v) => `Tarehe: ${v}`));

      parts.push(
        '',
        DIVIDER,
        '*BEREAVEMENT NOTICE*',
        '',
        `We have received notice of the passing of *${input.subjectName ?? '—'}*${
          input.relation && input.memberName
            ? `, ${input.relation} of our member ${input.memberName}`
            : ''
        }.`
      );
      parts.push(...line(input.amount, (v) => `Each member's contribution is *${v}*.`));
      parts.push(...line(input.deadline, (v) => `Please pay by *${v}*.`));
      parts.push(...line(input.link, (v) => `Pay here 👉 ${v}`));
      parts.push('', '_Mungu ailaze roho ya marehemu mahali pema peponi._');
      break;
    }

    case 'PAYMENT_REMINDER': {
      parts.push(
        '*UKUMBUSHO WA MALIPO*',
        '',
        'Ndugu wanachama,'
      );
      parts.push(
        ...line(input.deadline, (v) => `Tafadhali kumbuka kulipa michango yako kabla ya *${v}*.`)
      );
      parts.push(...line(input.amount, (v) => `Kiasi: *${v}*`));
      parts.push(...line(input.link, (v) => `Angalia salio lako 👉 ${v}`));
      parts.push(
        '',
        DIVIDER,
        '*PAYMENT REMINDER*',
        ''
      );
      parts.push(...line(input.deadline, (v) => `Please pay your contributions by *${v}*.`));
      parts.push(...line(input.amount, (v) => `Amount: *${v}*`));
      parts.push(...line(input.link, (v) => `Check your balance 👉 ${v}`));
      break;
    }

    case 'MONTHLY_STATEMENT': {
      parts.push(
        '*TAARIFA YA MWEZI*',
        '',
        'Ndugu wanachama,',
        'Taarifa ya mapato na michango ya mwezi huu iko tayari.'
      );
      parts.push(...line(input.link, (v) => `Angalia salio lako 👉 ${v}`));
      parts.push(
        '',
        DIVIDER,
        '*MONTHLY STATEMENT*',
        '',
        "This month's contribution report is ready."
      );
      parts.push(...line(input.link, (v) => `View your balance 👉 ${v}`));
      break;
    }

    case 'GENERAL': {
      parts.push('*TAARIFA*', '');
      parts.push(...line(input.bodySw, (v) => v));
      if (input.bodyEn?.trim()) {
        parts.push('', DIVIDER, '*ANNOUNCEMENT*', '', input.bodyEn.trim());
      }
      parts.push(...line(input.link, (v) => `\n👉 ${v}`));
      break;
    }
  }

  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * WhatsApp collapses long messages behind "Read more", which hides the
 * deadline and the link — the two things that matter.
 */
export const LENGTH_WARNING_THRESHOLD = 900;

export function messageWarnings(message: string): string[] {
  const warnings: string[] = [];
  if (message.length > LENGTH_WARNING_THRESHOLD) {
    warnings.push(
      `This message is ${message.length} characters. WhatsApp hides anything past roughly ${LENGTH_WARNING_THRESHOLD} behind "Read more" — put the amount and deadline near the top.`
    );
  }
  if (/https?:\/\/[^\s]{60,}/.test(message)) {
    warnings.push('That link is long enough to be unusable on a phone. Use a short link.');
  }
  return warnings;
}

/** A wa.me share link, which opens WhatsApp with the message ready to send. */
export function whatsappShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
