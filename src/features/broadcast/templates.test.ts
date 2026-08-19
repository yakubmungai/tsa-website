import { describe, it, expect } from 'vitest';
import {
  composeBroadcast,
  messageWarnings,
  whatsappShareUrl,
  LENGTH_WARNING_THRESHOLD,
} from './templates';

describe('composeBroadcast', () => {
  it('puts Swahili first and English below', () => {
    const message = composeBroadcast({
      kind: 'MSIBA',
      subjectName: 'Mzee Juma',
      relation: 'baba',
      memberName: 'Amina Hassan',
      amount: '$19.48',
      deadline: '3 September',
    });
    expect(message.indexOf('TAARIFA YA MSIBA')).toBeLessThan(
      message.indexOf('BEREAVEMENT NOTICE')
    );
  });

  it('carries the details a member needs to act', () => {
    const message = composeBroadcast({
      kind: 'MSIBA',
      subjectName: 'Mzee Juma',
      amount: '$19.48',
      deadline: '3 September',
      link: 'https://tansha.org/l/AB3K9',
    });
    expect(message).toContain('$19.48');
    expect(message).toContain('3 September');
    expect(message).toContain('https://tansha.org/l/AB3K9');
  });

  it('omits lines for details that were not supplied', () => {
    const message = composeBroadcast({ kind: 'MSIBA', subjectName: 'Mzee Juma' });
    expect(message).not.toContain('undefined');
    expect(message).not.toContain('Mazishi:');
    expect(message).not.toMatch(/Lipa hapa/);
  });

  it('uses WhatsApp formatting, never markdown headings', () => {
    const message = composeBroadcast({ kind: 'PAYMENT_REMINDER', deadline: 'Friday' });
    expect(message).toContain('*');
    expect(message).not.toMatch(/^#/m);
  });

  it('never leaves a run of blank lines', () => {
    const message = composeBroadcast({ kind: 'GENERAL', bodySw: 'Habari', bodyEn: 'Hello' });
    expect(message).not.toMatch(/\n{3,}/);
  });

  it('handles a Swahili-only general announcement', () => {
    const message = composeBroadcast({ kind: 'GENERAL', bodySw: 'Mkutano Jumapili' });
    expect(message).toContain('Mkutano Jumapili');
    expect(message).not.toContain('ANNOUNCEMENT');
  });

  it('builds every kind without throwing', () => {
    for (const kind of ['MSIBA', 'PAYMENT_REMINDER', 'MONTHLY_STATEMENT', 'GENERAL'] as const) {
      expect(() => composeBroadcast({ kind })).not.toThrow();
      expect(composeBroadcast({ kind })).toContain('TANZANIA SHARING ASSOCIATION');
    }
  });
});

describe('messageWarnings', () => {
  it('warns when WhatsApp would hide the important part', () => {
    expect(messageWarnings('x'.repeat(LENGTH_WARNING_THRESHOLD + 1))[0]).toMatch(/Read more/);
  });

  it('stays quiet for a normal message', () => {
    const message = composeBroadcast({ kind: 'PAYMENT_REMINDER', deadline: 'Friday' });
    expect(messageWarnings(message)).toHaveLength(0);
  });

  it('flags a link too long to use on a phone', () => {
    const long = `https://tansha.org/portal/pay?campaign=${'a'.repeat(70)}`;
    expect(messageWarnings(long).some((w) => w.includes('short link'))).toBe(true);
  });
});

describe('whatsappShareUrl', () => {
  it('encodes the message so newlines and symbols survive', () => {
    const url = whatsappShareUrl('Habari\n*bold* & $19.48');
    expect(url.startsWith('https://wa.me/?text=')).toBe(true);
    expect(url).not.toContain('\n');
    expect(decodeURIComponent(url.replace('https://wa.me/?text=', ''))).toContain('$19.48');
  });
});
