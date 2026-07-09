import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { AdminMembersList } from '@/components/admin-members-list';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Users, FileSpreadsheet, Hourglass, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default async function AdminMembersPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  // Fetch all members with transactions
  const membersRaw = await db.member.findMany({
    include: {
      transactions: true,
    },
    orderBy: { names: 'asc' },
  });

  // Calculate stats
  const members = membersRaw.map(m => {
    const balance = m.transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    return {
      id: m.id,
      names: m.names,
      phone: m.phone,
      address: m.address,
      husbandWife: m.husbandWife,
      spousePhone: m.spousePhone,
      parents: m.parents,
      children: m.children,
      siblings: m.siblings,
      witnesses: m.witnesses,
      nextOfKin: m.nextOfKin,
      balance,
    };
  });

  const totalMembersCount = members.length;
  const membersWithDebt = members.filter(m => m.balance < 0);
  const totalDebt = membersWithDebt.reduce((sum, m) => sum + Math.abs(m.balance), 0);
  const totalCredit = members.filter(m => m.balance > 0).reduce((sum, m) => sum + m.balance, 0);

  // Fetch pending submissions
  const pendingSubmissionsCount = await db.formSubmission.count({
    where: { status: 'PENDING' }
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      <main className="flex-grow max-w-7xl w-full mx-auto pt-28 pb-10 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin Control Center</h1>
            <p className="text-slate-500 text-sm">Tanzania Sharing Association • Central Management Portal</p>
          </div>
          <div className="flex gap-2">
            <Link 
              href="/admin/forms" 
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2"
            >
              <Hourglass className="h-4 w-4" />
              Forms Queue ({pendingSubmissionsCount})
            </Link>
          </div>
        </div>

        {/* Admin Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow bg-white border border-slate-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">Total Members</span>
              <Users className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{totalMembersCount}</div>
              <p className="text-xs text-slate-400 mt-1">Imported & approved profiles</p>
            </CardContent>
          </Card>

          <Card className="shadow bg-white border border-slate-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">Outstanding Dues</span>
              <ShieldAlert className="h-5 w-5 text-rose-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-700">${totalDebt.toFixed(2)}</div>
              <p className="text-xs text-slate-400 mt-1">Total owed by {membersWithDebt.length} members</p>
            </CardContent>
          </Card>

          <Card className="shadow bg-white border border-slate-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">Pre-Paid Advance Credits</span>
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700">${totalCredit.toFixed(2)}</div>
              <p className="text-xs text-slate-400 mt-1">Excess funds held in accounts</p>
            </CardContent>
          </Card>

          <Card className="shadow bg-white border border-slate-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">Form Applications</span>
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{pendingSubmissionsCount}</div>
              <p className="text-xs text-slate-400 mt-1">Pending approval reviews</p>
            </CardContent>
          </Card>
        </div>

        {/* Interactive Directory List */}
        <AdminMembersList initialMembers={members} />
      </main>

      <Footer />
    </div>
  );
}
