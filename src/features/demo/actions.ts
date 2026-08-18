'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { defineAction, actionError } from '@/lib/action';
import { isDemoMode } from '@/lib/demo';
import { clearAllData, seedDemoData } from './seed';

/**
 * Reset the demo environment back to its seeded state.
 *
 * Leaders testing the system will post transactions, edit profiles and archive
 * members. This lets them start a scenario over without asking a developer.
 *
 * It deletes data, so it is guarded three ways: admin only, DEMO_MODE only (and
 * `isDemoMode()` throws outright on a production hostname), and it re-checks
 * inside the handler rather than trusting the caller.
 */
export const resetDemoData = defineAction({
  name: 'resetDemoData',
  guard: 'admin',
  schema: z.object({ confirm: z.literal('RESET') }).strict(),
  async handler(): Promise<{ members: number; transactions: number }> {
    if (!isDemoMode()) {
      actionError('Demo reset is only available in the test environment.');
    }

    await clearAllData();
    const result = await seedDemoData();

    revalidatePath('/admin/members');
    revalidatePath('/portal');
    return { members: result.members, transactions: result.transactions };
  },
});
