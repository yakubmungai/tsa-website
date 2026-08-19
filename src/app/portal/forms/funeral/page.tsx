import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * The portal forms directory linked here but no such route existed, so members
 * following it got a 404 at exactly the moment they needed help.
 *
 * The funeral notice form itself lives on the public page. Reporting a
 * bereavement must not require signing in first — the person reporting is often
 * not the member, and may be doing it on someone else's phone.
 */
export default async function PortalFuneralFormPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login?callbackUrl=/portal/forms/funeral');
  redirect('/funeral-notice?from=portal');
}
