import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { LoginForm } from '@/components/login-form';
import { DemoSignIn, type DemoPersonaOption } from '@/components/demo-sign-in';
import { isDemoMode, DEMO_PERSONAS } from '@/lib/demo';
import { getTranslations } from '@/lib/i18n';

/**
 * Server component so demo mode is decided on the server. When it is off the
 * demo block is not rendered, and because the persona list is passed as props
 * rather than imported by the client component, the demo account identifiers
 * are not present in the production bundle either.
 */
export default async function LoginPage() {
  const t = await getTranslations();
  const demo = isDemoMode();
  const personas: DemoPersonaOption[] = demo
    ? Object.entries(DEMO_PERSONAS).map(([key, p]) => ({
        key,
        labelEn: p.labelEn,
        labelSw: p.labelSw,
        descriptionEn: p.descriptionEn,
        descriptionSw: p.descriptionSw,
        landing: p.landing,
      }))
    : [];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <main className="flex-grow flex items-center justify-center pt-32 pb-16 px-4">
        <Card className="w-full max-w-md overflow-hidden rounded-3xl border border-border/60 border-t-4 border-t-primary bg-card shadow-sm">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t.auth.title}
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {t.auth.subtitle}
            </CardDescription>
          </CardHeader>

          <LoginForm>{demo ? <DemoSignIn personas={personas} /> : null}</LoginForm>

          <CardFooter className="flex justify-center border-t border-border/60 bg-muted/40 py-4">
            <p className="text-center text-base text-muted-foreground">
              {t.auth.joinPrompt}{' '}
              <a
                href="/membership"
                className="font-semibold text-primary underline hover:text-primary/80"
              >
                {t.auth.joinLink}
              </a>
            </p>
          </CardFooter>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
