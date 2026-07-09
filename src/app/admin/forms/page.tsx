import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { AdminSubmissionsList } from '@/components/admin-submissions-list';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function AdminFormsPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  // Fetch all form submissions
  const submissionsRaw = await db.formSubmission.findMany({
    include: {
      member: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const submissions = submissionsRaw.map((s) => ({
    id: s.id,
    memberId: s.memberId,
    formType: s.formType,
    status: s.status as any,
    data: s.data,
    createdAt: s.createdAt,
    memberNames: s.member?.names,
  }));

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      <main className="flex-grow max-w-7xl w-full mx-auto pt-28 pb-10 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Back Button & Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <Button asChild variant="ghost" size="sm" className="hover:bg-slate-100 font-semibold text-xs -ml-3">
              <Link href="/admin/members">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to Directory
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Form Submissions Queue</h1>
            <p className="text-slate-500 text-sm">Review applications, agreements, and funeral request filings.</p>
          </div>
        </div>

        {/* Submissions Queue Table/Grid */}
        <AdminSubmissionsList initialSubmissions={submissions} />
      </main>

      <Footer />
    </div>
  );
}
