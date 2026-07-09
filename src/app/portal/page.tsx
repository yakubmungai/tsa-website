import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  User, 
  History, 
  ArrowUpRight, 
  ArrowDownRight, 
  FileText, 
  ChevronRight, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import Link from 'next/link';

export default async function PortalPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/login');
  }

  // Pure admins don't have member profiles
  if (session.user.role === 'ADMIN' && !session.user.memberId) {
    redirect('/admin/members');
  }

  const memberId = session.user.memberId;
  if (!memberId) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <Navbar />
        <main className="flex-grow flex items-center justify-center p-8">
          <Card className="w-full max-w-md border-t-4 border-t-amber-500 bg-white shadow-lg text-center p-6">
            <CardHeader>
              <CardTitle>Account Link Pending</CardTitle>
              <CardDescription>
                Your account is registered but not yet linked to a TSA member profile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 text-sm mb-4">
                Please contact the TSA administrators to link your profile so you can access your dashboard.
              </p>
              <Link href="/" className="text-emerald-600 font-semibold hover:underline">
                Return to Homepage
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Fetch Member Details
  const member = await db.member.findUnique({
    where: { id: memberId },
    include: {
      transactions: {
        orderBy: { date: 'desc' }
      },
      submissions: {
        orderBy: { createdAt: 'desc' },
        take: 5
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
              <CardTitle>Profile Not Found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 text-sm mb-4">
                We could not locate your member profile details. Please contact the administrator.
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Calculate Balances
  const transactions = member.transactions;
  const advanceTotal = transactions
    .filter(t => t.type === 'ADVANCE')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const registrationTotal = transactions
    .filter(t => t.type === 'REGISTRATION')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const membershipTotal = transactions
    .filter(t => t.type === 'MEMBERSHIP')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const netBalance = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      <main className="flex-grow max-w-7xl w-full mx-auto pt-28 pb-10 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 text-white rounded-2xl p-6 sm:p-8 shadow-md">
          <h1 className="text-2xl sm:text-3xl font-bold">Welcome, {member.names}!</h1>
          <p className="text-emerald-100/90 text-sm mt-1 sm:text-base">
            Member Portal Dashboard • Secure and Up-to-Date
          </p>
        </div>

        {/* Balance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow bg-white border border-slate-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Net Account Balance</span>
              <DollarSign className={`h-5 w-5 ${netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                ${netBalance.toFixed(2)}
              </div>
              <p className="text-xs text-slate-400 mt-1">Calculated sum of all contributions</p>
            </CardContent>
          </Card>

          <Card className="shadow bg-white border border-slate-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Advance Balance</span>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-800 hover:bg-emerald-50">Ledger</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">${advanceTotal.toFixed(2)}</div>
              <p className="text-xs text-slate-400 mt-1">Excess contributions held</p>
            </CardContent>
          </Card>

          <Card className="shadow bg-white border border-slate-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Registration Fee</span>
              {registrationTotal > 0 ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-none font-semibold">PAID</Badge>
              ) : (
                <Badge className="bg-rose-100 text-rose-800 border-none font-semibold">UNPAID</Badge>
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">${registrationTotal.toFixed(2)}</div>
              <p className="text-xs text-slate-400 mt-1">One-time registration status</p>
            </CardContent>
          </Card>

          <Card className="shadow bg-white border border-slate-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Membership Fee</span>
              {membershipTotal > 0 ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-none font-semibold">PAID</Badge>
              ) : (
                <Badge className="bg-rose-100 text-rose-800 border-none font-semibold">UNPAID</Badge>
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">${membershipTotal.toFixed(2)}</div>
              <p className="text-xs text-slate-400 mt-1">Annual membership dues status</p>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column - Financial Ledger */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-md bg-white border border-slate-100">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">Transaction Statements</CardTitle>
                  <CardDescription>Financial record history and ledger updates</CardDescription>
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

          {/* Side Column - Profile & Form Quick Access */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="shadow-md bg-white border border-slate-100">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-slate-900">Quick Portal Actions</CardTitle>
                <CardDescription>Fill in digital forms and agreements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/portal/forms" className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 text-slate-700 transition">
                  <span className="flex items-center text-sm font-semibold gap-2">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    Forms Directory
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </Link>
                <Link href="/membership" className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 text-slate-700 transition">
                  <span className="flex items-center text-sm font-semibold gap-2">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    Renew Membership Agreement
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </Link>
              </CardContent>
            </Card>

            {/* Profile Info Summary */}
            <Card className="shadow-md bg-white border border-slate-100">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">Profile Details</CardTitle>
                  <CardDescription>Your registered contact details</CardDescription>
                </div>
                <User className="h-5 w-5 text-slate-400" />
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-slate-400 font-semibold block uppercase">Phone Number</span>
                  <span className="text-slate-800 font-medium">{member.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-semibold block uppercase">Postal Address</span>
                  <span className="text-slate-800 font-medium">{member.address || 'N/A'}</span>
                </div>
                {member.husbandWife && (
                  <div>
                    <span className="text-xs text-slate-400 font-semibold block uppercase">Spouse</span>
                    <span className="text-slate-800 font-medium">{member.husbandWife}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Form Submissions Status */}
            <Card className="shadow-md bg-white border border-slate-100">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-slate-900">Submissions Status</CardTitle>
                <CardDescription>Recent form submission states</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {member.submissions.length === 0 ? (
                  <div className="text-center py-4 text-slate-400 text-xs">
                    No recent submissions found.
                  </div>
                ) : (
                  member.submissions.map((sub) => (
                    <div key={sub.id} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50">
                      <div>
                        <p className="font-semibold text-slate-800">{sub.formType}</p>
                        <span className="text-[10px] text-slate-400">
                          {new Date(sub.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {sub.status === 'APPROVED' && (
                        <Badge className="bg-emerald-100 text-emerald-800 border-none font-semibold text-[10px] flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> APPROVED
                        </Badge>
                      )}
                      {sub.status === 'PENDING' && (
                        <Badge className="bg-amber-100 text-amber-800 border-none font-semibold text-[10px] flex items-center gap-1">
                          <Clock className="h-3 w-3" /> PENDING
                        </Badge>
                      )}
                      {sub.status === 'PROCESSING' && (
                        <Badge className="bg-blue-100 text-blue-800 border-none font-semibold text-[10px] flex items-center gap-1">
                          <Clock className="h-3 w-3" /> PROCESSING
                        </Badge>
                      )}
                      {sub.status === 'REJECTED' && (
                        <Badge className="bg-rose-100 text-rose-800 border-none font-semibold text-[10px]">
                          REJECTED
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
