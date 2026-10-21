import Link from 'next/link';
import { Mail, Phone, Smartphone, UserPlus } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { getPortalStrings } from '@/lib/i18n';

/**
 * There is no sign-up form. A member on the roster activates their account by
 * signing in with their phone (src/features/auth/otp-actions.ts); anyone else
 * applies for membership first. This page explains both, for old links and
 * for people who look for a "sign up" button.
 */
export default async function SignupPage() {
  const t = (await getPortalStrings()).signup;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <main className="flex-grow flex items-center justify-center pt-32 pb-16 px-4">
        <Card className="w-full max-w-md overflow-hidden rounded-3xl border border-border/60 border-t-4 border-t-primary bg-card shadow-sm">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t.title}
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">{t.subtitle}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <Smartphone className="h-5 w-5 text-primary" aria-hidden />
                {t.memberTitle}
              </h2>
              <p className="text-base text-muted-foreground">{t.memberBody}</p>
              <Link
                href="/login"
                className="btn-shimmer inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-6 text-base font-bold text-primary-foreground"
              >
                {t.memberButton}
              </Link>
            </section>

            <section className="space-y-3 border-t border-border/60 pt-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <UserPlus className="h-5 w-5 text-primary" aria-hidden />
                {t.joinTitle}
              </h2>
              <p className="text-base text-muted-foreground">{t.joinBody}</p>
              <Link
                href="/membership"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border-2 border-primary px-6 text-base font-bold text-primary hover:bg-primary/5"
              >
                {t.joinButton}
              </Link>
            </section>

            <section className="space-y-2 rounded-2xl bg-muted/50 p-4">
              <h2 className="text-base font-bold text-foreground">{t.helpTitle}</h2>
              <p className="text-base text-muted-foreground">{t.helpBody}</p>
              <a href="tel:+12066020506" className="flex items-center gap-3 text-base font-semibold text-primary hover:underline">
                <Phone className="h-5 w-5 shrink-0" aria-hidden />
                (206) 602-0506
              </a>
              <a
                href="mailto:tansha.hq@gmail.com"
                className="flex items-center gap-3 break-all text-base font-semibold text-primary hover:underline"
              >
                <Mail className="h-5 w-5 shrink-0" aria-hidden />
                tansha.hq@gmail.com
              </a>
            </section>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
