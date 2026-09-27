import { db } from '@/lib/db';
import { isDemoMode } from '@/lib/demo';
import { getSessionUser } from '@/lib/session';
import { now } from '@/lib/clock';
import { orgIsoDate } from '@/lib/finance/dates';

/**
 * A practice bank statement, in Wells Fargo's download layout, built from
 * what is waiting right now: every payment members have reported, plus one
 * deposit nobody reported and one bank fee — so a leader can try the whole
 * upload-match-confirm routine. Test environment only.
 */
export async function GET(): Promise<Response> {
  if (!isDemoMode()) return new Response(null, { status: 404 });
  const user = await getSessionUser();
  if (user?.role !== 'ADMIN') return new Response(null, { status: 404 });

  const today = await now();
  const us = (d: Date) => {
    const [y, m, day] = orgIsoDate(d).split('-');
    return `${m}/${day}/${y}`;
  };
  const reported = await db.payment.findMany({
    where: { status: 'REPORTED' },
    include: { member: { select: { names: true, memberNumber: true } } },
  });
  const lines = reported.map((p) => {
    const sender = (p.payerName ?? p.member.names).toUpperCase();
    const ref = p.method === 'ZELLE' && p.member.memberNumber ? ` TSA-${p.member.memberNumber}` : '';
    const kind = p.method === 'CASHAPP' ? `CASH APP*${sender}` : `ZELLE FROM ${sender}`;
    return `"${us(p.paidOn)}","${(p.amountCents / 100).toFixed(2)}","*","","${kind} ON ${us(p.paidOn).slice(0, 5)} REF # WFCT${p.id.slice(0, 6).toUpperCase()}${ref}"`;
  });

  // Someone paid without telling anyone — the Treasurer decides whose it is.
  const quiet = await db.member.findFirst({ where: { names: 'Baraka Mwakalinga' } });
  if (quiet) {
    lines.push(`"${us(today)}","100.00","*","","ZELLE FROM BARAKA MWAKALINGA ON ${us(today).slice(0, 5)} REF # WFCTQUIET1"`);
  }
  lines.push(`"${us(today)}","-12.00","*","","MONTHLY SERVICE FEE"`);

  return new Response(lines.join('\r\n') + '\r\n', {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="majaribio-wells-fargo-${orgIsoDate(today)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
