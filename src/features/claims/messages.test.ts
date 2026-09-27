import { describe, it, expect } from 'vitest';
import { announcementMessage, reminderMessage, whatsappToUrl } from './messages';

describe('announcementMessage', () => {
  const base = {
    type: 'RELATIVE_DEATH' as const,
    reference: 'TSA-C-4K2P9',
    memberName: 'Amina Mrisho',
    subjectName: 'Zainabu Hassan',
    share: '$19.61',
    deadline: '24 Sep 2026',
  };

  it('puts the amount and deadline near the top, Swahili first', () => {
    const m = announcementMessage(base);
    expect(m.indexOf('$19.61')).toBeLessThan(300);
    expect(m.indexOf('Ndugu wanachama')).toBeLessThan(m.indexOf('BEREAVEMENT'));
    expect(m).toContain('TSA-C-4K2P9');
  });

  it('asks for nothing specific on a voluntary case', () => {
    const m = announcementMessage({ ...base, voluntary: true });
    expect(m).not.toContain('$19.61');
    expect(m).toContain('kihiari');
  });

  it('uses WhatsApp bold, never markdown headings', () => {
    expect(announcementMessage(base)).not.toMatch(/^#/m);
  });
});

describe('reminderMessage', () => {
  it('is personal and says whether it is overdue', () => {
    const m = reminderMessage({
      firstName: 'Daniel',
      reference: 'TSA-C-4K2P9',
      subjectName: 'Zainabu Hassan',
      amount: '$19.61',
      deadline: '24 Sep',
      overdue: true,
    });
    expect(m.startsWith('Habari Daniel')).toBe(true);
    expect(m).toContain('ulitakiwa');
  });
});

describe('whatsappToUrl', () => {
  it('strips the plus and encodes the text', () => {
    expect(whatsappToUrl('+17135550101', 'a b')).toBe('https://wa.me/17135550101?text=a%20b');
  });
});
