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

/**
 * Server component so demo mode is decided on the server. When it is off the
 * demo block is not rendered, and because the persona list is passed as props
 * rather than imported by the client component, the demo account identifiers
 * are not present in the production bundle either.
 */
export default function LoginPage() {
  const demo = isDemoMode();
  const personas: DemoPersonaOption[] = demo
    ? Object.entries(DEMO_PERSONAS).map(([key, p]) => ({
        key,
        labelEn: p.labelEn,
        labelSw: p.labelSw,
        descriptionEn: p.descriptionEn,
        landing: p.landing,
      }))
    : [];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      <main className="flex-grow flex items-center justify-center pt-32 pb-16 px-4">
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-emerald-600 bg-white">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
              TSA Member Portal
            </CardTitle>
            <CardDescription className="text-slate-500">
              Sign in to view your balance and fill in forms
            </CardDescription>
          </CardHeader>

          <LoginForm>{demo ? <DemoSignIn personas={personas} /> : null}</LoginForm>

          <CardFooter className="flex justify-center border-t border-slate-100 py-4 bg-slate-50/50">
            <p className="text-sm text-slate-600">
              Want to join TSA?{' '}
              <a
                href="/membership"
                className="text-emerald-600 hover:text-emerald-700 font-semibold underline"
              >
                Apply for membership
              </a>
            </p>
          </CardFooter>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
