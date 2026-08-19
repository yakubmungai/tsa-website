import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, Phone } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-6 py-16 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Ukurasa haupo</h1>
        <p className="text-xl text-slate-600">Page not found</p>
      </div>

      <p className="max-w-md text-base leading-relaxed text-slate-600">
        Ukurasa uliouomba haupatikani. Huenda kiungo kimebadilika.
        <span className="mt-1 block text-slate-500">
          The page you asked for does not exist. The link may have changed.
        </span>
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          asChild
          className="h-12 gap-2 bg-emerald-600 px-6 text-base font-semibold text-white hover:bg-emerald-700"
        >
          <Link href="/">
            <Home className="h-4 w-4" />
            Nyumbani / Home
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-12 px-6 text-base font-semibold">
          <Link href="/portal">Ukurasa wangu / My account</Link>
        </Button>
      </div>

      <a
        href="tel:+12066020506"
        className="flex items-center gap-2 text-lg font-semibold text-emerald-700 hover:text-emerald-800"
      >
        <Phone className="h-5 w-5" />
        (206) 602-0506
      </a>
    </main>
  );
}
