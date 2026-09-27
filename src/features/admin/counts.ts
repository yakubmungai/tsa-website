import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';

export interface AdminCounts {
  /** Cases waiting for the Katibu/Muhakiki to review. */
  claims: number;
  /** Member-reported payments and bank rows waiting for the Treasurer. */
  payments: number;
  /** Form submissions not yet reviewed. */
  forms: number;
  total: number;
}

/** What is waiting for an officer, for the tab badges and the Today inbox. */
export const getAdminCounts = cache(async (): Promise<AdminCounts> => {
  const forms = await db.formSubmission.count({ where: { status: 'PENDING' } });
  const claims = 0;
  const payments = 0;
  return { claims, payments, forms, total: claims + payments + forms };
});
