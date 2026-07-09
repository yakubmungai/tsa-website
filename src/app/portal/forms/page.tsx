import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight, ShieldCheck, HeartPulse } from 'lucide-react';
import Link from 'next/link';

export default async function PortalFormsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/login');
  }

  const forms = [
    {
      id: 'funeral',
      title: 'Funeral Assistance Request',
      description: 'Request financial and logistical assistance in the event of a member or family member passing.',
      icon: HeartPulse,
      href: '/portal/forms/funeral',
      color: 'border-t-rose-500'
    },
    {
      id: 'constitution',
      title: 'Constitution Agreement Signature',
      description: 'Read and digitally sign the official TSA Constitution Agreement as part of membership verification.',
      icon: ShieldCheck,
      href: '/constitution', // Redirect to existing constitution agreement page if it exists
      color: 'border-t-emerald-500'
    },
    {
      id: 'renewal',
      title: 'Membership Renewal / Update',
      description: 'Renew your 5-year membership term contract (2025-2030) or update your family records.',
      icon: FileText,
      href: '/membership', // Redirect to existing onboarding/renewal form
      color: 'border-t-blue-500'
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      <main className="flex-grow max-w-5xl w-full mx-auto pt-28 pb-12 px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">TSA Digital Forms Directory</h1>
          <p className="text-slate-500 text-sm max-w-xl mx-auto">
            Select a form below to fill out. The forms will automatically pre-populate your profile information to save you time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          {forms.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.id} className={`shadow-md bg-white border border-slate-100 border-t-4 ${f.color} flex flex-col justify-between`}>
                <CardHeader className="space-y-2">
                  <div className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-md font-bold text-slate-900">{f.title}</CardTitle>
                  <CardDescription className="text-slate-500 text-xs leading-relaxed">
                    {f.description}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-2">
                  <Button asChild className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs">
                    <Link href={f.href}>
                      Fill Form
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
