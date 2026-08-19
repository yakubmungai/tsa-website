import Link from 'next/link';
import { requireAdmin } from '@/lib/session';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { BroadcastComposer } from '@/components/broadcast-composer';

/**
 * Compose a WhatsApp announcement for the TSA group.
 *
 * WhatsApp is where the association actually communicates, so this meets
 * leaders where they already are: it produces the message and they paste it.
 * No Meta account, no per-message cost, nothing to approve.
 */
export default async function AdminBroadcastPage() {
  await requireAdmin();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tansha.org';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-grow space-y-6 px-4 pb-16 pt-28 sm:px-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-3 gap-1.5 text-slate-600">
            <Link href="/admin/members">
              <ArrowLeft className="h-4 w-4" />
              Back to Members
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-slate-900">Matangazo ya WhatsApp</h1>
          <p className="mt-1 text-lg text-slate-600">
            Compose a bilingual announcement for the TSA group.
          </p>
        </div>

        <BroadcastComposer siteUrl={siteUrl} />
      </main>
      <Footer />
    </div>
  );
}
