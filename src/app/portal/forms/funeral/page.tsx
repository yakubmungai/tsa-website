import { redirect } from 'next/navigation';

/**
 * Old link from the forms directory. A signed-in member now reports a death
 * through the claim flow, which is linked to their account and goes straight
 * to the Katibu's queue. The public /funeral-notice page stays for relatives
 * and anyone reporting without an account.
 */
export default function PortalFuneralFormPage() {
  redirect('/portal/claims/new');
}
