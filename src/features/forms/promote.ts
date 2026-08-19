import 'server-only';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { toE164 } from '@/lib/phone';

/**
 * Turning an approved application into a member record.
 *
 * The version this replaces always called `member.create`, so approving an
 * application from someone already on the roster silently produced a second
 * profile — and the roster already contains near-duplicates from the original
 * import. It also built the address by concatenating four fields without
 * checking them, yielding "undefined, undefined, undefined undefined" whenever
 * any were absent.
 */

export interface DuplicateCandidate {
  id: string;
  names: string;
  phone: string | null;
  reason: 'phone' | 'name';
}

/**
 * Look for members this application might already be.
 *
 * Phone is the strong signal; name is a weaker one offered for a human to judge.
 */
export async function findDuplicateCandidates(
  fullName: string,
  phone?: string | null
): Promise<DuplicateCandidate[]> {
  const e164 = phone ? toE164(phone) : null;
  const lastName = fullName.trim().split(/\s+/).pop() ?? '';

  const [byPhone, byName] = await Promise.all([
    e164
      ? db.member.findMany({
          where: { phoneE164: e164, archivedAt: null },
          select: { id: true, names: true, phone: true },
          take: 5,
        })
      : Promise.resolve([]),
    lastName.length >= 3
      ? db.member.findMany({
          where: { names: { contains: lastName, mode: 'insensitive' }, archivedAt: null },
          select: { id: true, names: true, phone: true },
          take: 5,
        })
      : Promise.resolve([]),
  ]);

  const seen = new Set<string>();
  const candidates: DuplicateCandidate[] = [];

  for (const m of byPhone) {
    seen.add(m.id);
    candidates.push({ ...m, reason: 'phone' });
  }
  for (const m of byName) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    candidates.push({ ...m, reason: 'name' });
  }
  return candidates;
}

/**
 * Join only the address parts that are present, in US postal form:
 * "1 Test Way, Houston, TX 77072" — state and ZIP separated by a space, not a
 * comma.
 */
function composeAddress(payload: Record<string, unknown>): string | null {
  const part = (key: string) => {
    const value = payload[key];
    const text = typeof value === 'string' ? value.trim() : '';
    return text && text !== 'N/A' ? text : '';
  };

  const stateZip = [part('state'), part('zipCode')].filter(Boolean).join(' ');
  const line = [part('streetAddress'), part('city'), stateZip].filter(Boolean);
  return line.length ? line.join(', ') : null;
}

function names(payload: Record<string, unknown>): string {
  const first = typeof payload.firstName === 'string' ? payload.firstName.trim() : '';
  const last = typeof payload.lastName === 'string' ? payload.lastName.trim() : '';
  const full = `${first} ${last}`.trim();
  return full || (typeof payload.fullName === 'string' ? payload.fullName.trim() : '');
}

function nameList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) =>
      typeof item === 'string' ? item : typeof item?.name === 'string' ? item.name : ''
    )
    .map((s) => s.trim())
    .filter(Boolean);
}

function contactList(value: unknown): { name: string; phone: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item.name === 'string' && item.name.trim())
    .map((item) => ({ name: String(item.name).trim(), phone: String(item.phone ?? '').trim() }));
}

/** Build member fields from a membership application payload. */
export function memberDataFromApplication(payload: Record<string, unknown>) {
  const parents = [payload.fatherName, payload.motherName]
    .filter((v): v is string => typeof v === 'string' && v.trim() !== '' && v !== 'N/A')
    .map((v) => v.trim());

  const phone = typeof payload.phone === 'string' ? payload.phone.trim() : null;
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : null;
  const dob = typeof payload.dob === 'string' && payload.dob !== 'N/A' ? new Date(payload.dob) : null;

  return {
    names: names(payload),
    phone: phone && phone !== 'N/A' ? phone : null,
    phoneE164: phone ? toE164(phone) : null,
    email: email && email !== 'n/a' && email.includes('@') ? email : null,
    dateOfBirth: dob && !Number.isNaN(dob.getTime()) ? dob : null,
    placeOfBirth:
      typeof payload.pob === 'string' && payload.pob !== 'N/A' ? payload.pob.trim() : null,
    address: composeAddress(payload),
    husbandWife:
      typeof payload.spouseName === 'string' && payload.spouseName !== 'N/A'
        ? payload.spouseName.trim()
        : null,
    spousePhone:
      typeof payload.spousePhone === 'string' && payload.spousePhone !== 'N/A'
        ? payload.spousePhone.trim()
        : null,
    parents,
    children: nameList(payload.children),
    siblings: nameList(payload.siblings),
    witnesses: contactList(payload.witnesses) as unknown as Prisma.InputJsonValue[],
    nextOfKin: contactList(payload.funeralSupervisors) as unknown as Prisma.InputJsonValue[],
  };
}
