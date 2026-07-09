'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { approveSubmission, rejectSubmission } from '@/features/membership/admin-actions';
import { toast } from 'sonner';
import { Check, X, FileText, Calendar, User, UserPlus } from 'lucide-react';

interface Submission {
  id: string;
  memberId: string | null;
  formType: string;
  status: 'PENDING' | 'PROCESSING' | 'APPROVED' | 'REJECTED';
  data: any;
  createdAt: Date;
  memberNames?: string;
}

export function AdminSubmissionsList({ initialSubmissions }: { initialSubmissions: Submission[] }) {
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await approveSubmission(id);
      if (res.success) {
        toast.success('Submission approved successfully!');
        setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: 'APPROVED' } : s));
      } else {
        toast.error(res.error || 'Failed to approve.');
      }
    } catch (err) {
      toast.error('An error occurred.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await rejectSubmission(id);
      if (res.success) {
        toast.success('Submission rejected.');
        setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: 'REJECTED' } : s));
      } else {
        toast.error(res.error || 'Failed to reject.');
      }
    } catch (err) {
      toast.error('An error occurred.');
    } finally {
      setLoadingId(null);
    }
  };

  const pendingList = submissions.filter(s => s.status === 'PENDING');
  const processedList = submissions.filter(s => s.status !== 'PENDING');

  return (
    <div className="space-y-8">
      {/* Pending Queue */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-amber-500" />
          Pending Approvals Queue ({pendingList.length})
        </h2>

        {pendingList.length === 0 ? (
          <Card className="text-center py-10 bg-white border border-slate-100">
            <CardContent className="text-slate-400 text-sm">
              All caught up! No pending submissions to review.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pendingList.map((sub) => (
              <Card key={sub.id} className="bg-white border border-slate-100 shadow-md flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider px-2">
                      {sub.formType}
                    </Badge>
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <CardTitle className="text-md font-bold text-slate-900 pt-2 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-slate-400" />
                    {sub.memberNames || `${sub.data.firstName || ''} ${sub.data.lastName || 'Guest Application'}`}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-3 pb-4">
                  <div className="bg-slate-50 rounded-lg p-3 max-h-48 overflow-y-auto border border-slate-100 text-xs text-slate-600 font-mono space-y-1">
                    {Object.entries(sub.data).map(([key, val]: any) => {
                      if (typeof val === 'object') return null; // skip sub-objects for neatness
                      return (
                        <div key={key} className="flex gap-2">
                          <span className="font-bold text-slate-500 w-24 truncate">{key}:</span>
                          <span className="text-slate-800">{String(val)}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>

                <div className="px-6 pb-6 pt-2 border-t border-slate-100 flex gap-2">
                  <Button 
                    onClick={() => handleApprove(sub.id)} 
                    disabled={loadingId !== null}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9"
                  >
                    <Check className="mr-1 h-4 w-4" /> Approve
                  </Button>
                  <Button 
                    onClick={() => handleReject(sub.id)} 
                    disabled={loadingId !== null}
                    variant="outline" 
                    className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-semibold h-9"
                  >
                    <X className="mr-1 h-4 w-4" /> Reject
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* History Log */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-400" />
          Processed Submissions History ({processedList.length})
        </h2>

        {processedList.length === 0 ? (
          <Card className="text-center py-8 bg-white border border-slate-100">
            <CardContent className="text-slate-400 text-sm">
              No historical submissions found.
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white border border-slate-100 shadow">
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {processedList.map((sub) => (
                  <div key={sub.id} className="p-4 flex justify-between items-center">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-800">
                        {sub.memberNames || `${sub.data.firstName || ''} ${sub.data.lastName || 'Guest'}`}
                      </p>
                      <div className="flex gap-2 items-center text-xs">
                        <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                          {sub.formType}
                        </Badge>
                        <span className="text-slate-400">
                          {new Date(sub.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div>
                      {sub.status === 'APPROVED' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-none font-semibold text-xs">
                          APPROVED
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-100 text-rose-800 border-none font-semibold text-xs">
                          REJECTED
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
