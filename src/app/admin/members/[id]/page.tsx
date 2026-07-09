import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { AdminPostTransaction } from '@/components/admin-post-transaction';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  User, 
  MapPin, 
  Phone, 
  Users, 
  History, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign 
} from 'lucide-react';
import Link from 'next/link';

export default async function AdminMemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  const { id } = await params;

  // Fetch Member Info
  const member = await db.member.findUnique({
    where: { id },
    include: {
      transactions: {
        orderBy: { date: 'desc' }
      }
    }
  });

  if (!member) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <Navbar />
        <main className="flex-grow flex items-center justify-center p-8">
          <Card className="w-full max-w-md border-t-4 border-t-red-500 bg-white shadow-lg text-center p-6">
            <CardHeader>
              <CardTitle>Member Profile Not Found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 text-sm mb-4">
                We could not find a member profile with ID {params.id}.
              </p>
              <Button asChild>
                <Link href="/admin/members">Return to Directory</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Calculate Net balance and breakdown
  const transactions = member.transactions;
  const netBalance = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const advanceTotal = transactions.filter(t => t.type === 'ADVANCE').reduce((sum, t) => sum + Number(t.amount), 0);
  const registrationTotal = transactions.filter(t => t.type === 'REGISTRATION').reduce((sum, t) => sum + Number(t.amount), 0);
  const membershipTotal = transactions.filter(t => t.type === 'MEMBERSHIP').reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      <main className="flex-grow max-w-7xl w-full mx-auto pt-28 pb-10 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Back Button */}
        <div>
          <Button asChild variant="ghost" size="sm" className="hover:bg-slate-100 font-semibold text-xs">
            <Link href="/admin/members">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to Member Directory
            </Link>
          </Button>
        </div>

        {/* Member Profile Banner */}
        <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{member.names}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500 font-semibold">
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {member.phone || 'N/A'}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {member.address || 'N/A'}
              </span>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-lg px-6 py-3 flex flex-col items-center md:items-end justify-center min-w-40">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Net Balance</span>
            <span className={`text-2xl font-bold ${netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              ${netBalance.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column - Relations & Personal Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Relationships Details Card */}
            <Card className="shadow-md bg-white border border-slate-100">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">Family & Relations</CardTitle>
                  <CardDescription>Parents, spouse, children, siblings, and witnesses</CardDescription>
                </div>
                <Users className="h-5 w-5 text-slate-400" />
              </CardHeader>
              <CardContent className="space-y-4 divide-y divide-slate-100 text-sm text-slate-700">
                {/* Spouse */}
                <div className="grid grid-cols-1 sm:grid-cols-3 py-3 first:pt-0">
                  <span className="font-semibold text-slate-500 text-xs uppercase tracking-wider">Spouse</span>
                  <span className="col-span-2 font-medium">
                    {member.husbandWife ? `${member.husbandWife} ${member.spousePhone ? `(${member.spousePhone})` : ''}` : 'None registered'}
                  </span>
                </div>

                {/* Parents */}
                <div className="grid grid-cols-1 sm:grid-cols-3 py-3">
                  <span className="font-semibold text-slate-500 text-xs uppercase tracking-wider">Parents</span>
                  <div className="col-span-2 font-medium flex flex-col gap-1">
                    {member.parents.length === 0 ? 'None registered' : member.parents.map((p, i) => <span key={i}>{p}</span>)}
                  </div>
                </div>

                {/* Children */}
                <div className="grid grid-cols-1 sm:grid-cols-3 py-3">
                  <span className="font-semibold text-slate-500 text-xs uppercase tracking-wider">Children</span>
                  <div className="col-span-2 font-medium flex flex-col gap-1">
                    {member.children.length === 0 ? 'None registered' : member.children.map((c, i) => <span key={i}>{c}</span>)}
                  </div>
                </div>

                {/* Siblings */}
                <div className="grid grid-cols-1 sm:grid-cols-3 py-3">
                  <span className="font-semibold text-slate-500 text-xs uppercase tracking-wider">Siblings</span>
                  <div className="col-span-2 font-medium flex flex-col gap-1">
                    {member.siblings.length === 0 ? 'None registered' : member.siblings.map((s, i) => <span key={i}>{s}</span>)}
                  </div>
                </div>

                {/* Witnesses / Referees */}
                <div className="grid grid-cols-1 sm:grid-cols-3 py-3">
                  <span className="font-semibold text-slate-500 text-xs uppercase tracking-wider">Witnesses / Referees</span>
                  <div className="col-span-2 font-medium flex flex-col gap-1">
                    {member.witnesses.length === 0 ? 'None registered' : (member.witnesses as any[]).map((w, i) => (
                      <span key={i}>{w.name} {w.phone ? `(${w.phone})` : ''}</span>
                    ))}
                  </div>
                </div>

                {/* Next of Kin / Funeral Supervisors */}
                <div className="grid grid-cols-1 sm:grid-cols-3 py-3 last:pb-0">
                  <span className="font-semibold text-slate-500 text-xs uppercase tracking-wider">Next of Kin / Supervisors</span>
                  <div className="col-span-2 font-medium flex flex-col gap-1">
                    {member.nextOfKin.length === 0 ? 'None registered' : (member.nextOfKin as any[]).map((nk, i) => (
                      <span key={i}>{nk.name} {nk.phone ? `(${nk.phone})` : ''}</span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Statements Card */}
            <Card className="shadow-md bg-white border border-slate-100">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">Ledger Statement Log</CardTitle>
                  <CardDescription>Comprehensive log of all balance postings</CardDescription>
                </div>
                <History className="h-5 w-5 text-slate-400" />
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    No transactions recorded on this profile yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {transactions.map((t) => (
                      <div key={t.id} className="py-4 flex justify-between items-center first:pt-0 last:pb-0">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-800">{t.description || `${t.type} Entry`}</p>
                          <div className="flex gap-2 items-center">
                            <span className="text-xs text-slate-400">
                              {new Date(t.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 uppercase">
                              {t.type}
                            </Badge>
                          </div>
                        </div>
                        <div className={`text-sm font-bold flex items-center ${Number(t.amount) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {Number(t.amount) >= 0 ? (
                            <ArrowUpRight className="h-4 w-4 mr-0.5" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 mr-0.5" />
                          )}
                          ${Math.abs(Number(t.amount)).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Side Column - Posting Actions & Financial Summary */}
          <div className="space-y-6">
            {/* Quick Balance Breakdown Card */}
            <Card className="shadow-md bg-white border border-slate-100">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-slate-900 font-mono">Financial Ledger Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-700">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-500">Advance Credit:</span>
                  <span className="font-bold text-slate-800">${advanceTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-500">Registration Fee:</span>
                  <span className="font-bold text-slate-800">${registrationTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-500">Membership Dues:</span>
                  <span className="font-bold text-slate-800">${membershipTotal.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Post Transaction Form Card */}
            <AdminPostTransaction memberId={member.id} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
