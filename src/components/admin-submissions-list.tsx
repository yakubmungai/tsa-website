'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Inbox,
  Loader2,
  User,
  UserPlus,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  approveSubmission,
  rejectSubmission,
  getSubmissionDuplicates,
} from '@/features/membership/admin-actions';
import type { DuplicateCandidate } from '@/features/forms/promote';
import { useLanguage } from '@/components/language-context';
import { SectionCard } from '@/components/portal/section-card';
import { StatusBadge, type Tone } from '@/components/portal/status-badge';
import { EmptyState } from '@/components/portal/empty-state';
import { usePortalStrings } from '@/components/portal/use-portal-strings';

interface Submission {
  id: string;
  memberId: string | null;
  formType: string;
  status: 'PENDING' | 'PROCESSING' | 'APPROVED' | 'REJECTED';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  createdAt: Date;
  memberNames?: string;
}

export function AdminSubmissionsList({ initialSubmissions }: { initialSubmissions: Submission[] }) {
  const t = usePortalStrings();
  const { language } = useLanguage();
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const [duplicates, setDuplicates] = useState<Record<string, DuplicateCandidate[]>>({});

  const settle = (id: string, status: Submission['status']) =>
    setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));

  /**
   * Membership applications are checked for an existing member first. Approving
   * without that check is how a second profile gets created for someone already
   * on the roster.
   */
  const handleApprove = async (submission: Submission) => {
    const { id, formType, memberId } = submission;
    setLoadingId(id);
    try {
      if (formType === 'MEMBERSHIP' && !memberId && duplicates[id] === undefined) {
        const found = await getSubmissionDuplicates({ submissionId: id });
        if (found.success && found.data.candidates.length > 0) {
          setDuplicates((prev) => ({ ...prev, [id]: found.data.candidates }));
          toast.warning(t.adminForms.maybeMemberToast);
          return;
        }
        setDuplicates((prev) => ({ ...prev, [id]: [] }));
      }

      const resolution =
        formType === 'MEMBERSHIP' && !memberId
          ? ({ action: 'createMember' } as const)
          : ({ action: 'acknowledge' } as const);

      const res = await approveSubmission({ submissionId: id, resolution });
      if (res.success) {
        toast.success(t.adminForms.approvedToast);
        settle(id, 'APPROVED');
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error(t.common.somethingWrong);
    } finally {
      setLoadingId(null);
    }
  };

  const handleLinkExisting = async (id: string, memberId: string, name: string) => {
    setLoadingId(id);
    try {
      const res = await approveSubmission({
        submissionId: id,
        resolution: { action: 'linkExisting', memberId },
      });
      if (res.success) {
        toast.success(t.adminForms.linkedTo(name));
        settle(id, 'APPROVED');
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error(t.common.somethingWrong);
    } finally {
      setLoadingId(null);
    }
  };

  const handleCreateAnyway = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await approveSubmission({
        submissionId: id,
        resolution: { action: 'createMember' },
      });
      if (res.success) {
        toast.success(t.adminForms.memberCreated);
        settle(id, 'APPROVED');
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error(t.common.somethingWrong);
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await rejectSubmission({ submissionId: id });
      if (res.success) {
        toast.success(t.adminForms.rejectedToast);
        settle(id, 'REJECTED');
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error(t.common.somethingWrong);
    } finally {
      setLoadingId(null);
    }
  };

  const dateFmt = new Intl.DateTimeFormat(language === 'sw' ? 'sw-TZ' : 'en-US', {
    dateStyle: 'medium',
    timeZone: 'America/Chicago',
  });
  const formLabel = (type: string) =>
    t.adminForms.types[type as keyof typeof t.adminForms.types] ?? type;
  const applicantName = (sub: Submission, fallback: string) =>
    sub.memberNames || `${sub.data.firstName || ''} ${sub.data.lastName || fallback}`.trim();

  const STATUS: Record<Submission['status'], { tone: Tone; label: string; icon: React.ReactNode }> = {
    PENDING: { tone: 'warning', label: t.adminForms.status.PENDING, icon: <Clock className="h-3.5 w-3.5" aria-hidden /> },
    PROCESSING: { tone: 'info', label: t.adminForms.status.PROCESSING, icon: <Loader2 className="h-3.5 w-3.5" aria-hidden /> },
    APPROVED: { tone: 'success', label: t.adminForms.status.APPROVED, icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> },
    REJECTED: { tone: 'danger', label: t.adminForms.status.REJECTED, icon: <XCircle className="h-3.5 w-3.5" aria-hidden /> },
  };

  const pendingList = submissions.filter((s) => s.status === 'PENDING');
  const processedList = submissions.filter((s) => s.status !== 'PENDING');

  return (
    <div className="space-y-10">
      {/* Pending queue */}
      <section className="space-y-4" aria-labelledby="pending-heading">
        <h2 id="pending-heading" className="flex items-center gap-2 font-serif text-2xl font-bold text-foreground">
          <UserPlus className="h-6 w-6 text-warning" aria-hidden />
          {t.adminForms.pendingTitle}
          <span className="rounded-full bg-warning/15 px-2.5 py-0.5 font-sans text-base font-bold text-warning">
            {pendingList.length}
          </span>
        </h2>

        {pendingList.length === 0 ? (
          <SectionCard>
            <EmptyState
              icon={<Inbox className="h-6 w-6" aria-hidden />}
              title={t.adminForms.pendingEmpty}
            />
          </SectionCard>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {pendingList.map((sub) => (
              <article
                key={sub.id}
                className="flex flex-col rounded-3xl border border-border/60 bg-card shadow-sm"
              >
                <div className="space-y-3 px-5 pt-5 sm:px-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge tone="info" icon={<FileText className="h-3.5 w-3.5" aria-hidden />}>
                      {formLabel(sub.formType)}
                    </StatusBadge>
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" aria-hidden />
                      {dateFmt.format(new Date(sub.createdAt))}
                    </span>
                  </div>
                  <h3 className="flex items-center gap-2 break-words font-serif text-xl font-bold text-foreground">
                    <User className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                    {applicantName(sub, t.adminForms.guestApplication)}
                  </h3>
                </div>

                <div className="px-5 py-4 sm:px-6">
                  <dl className="max-h-56 space-y-1.5 overflow-y-auto rounded-2xl border border-border/60 bg-muted/50 p-4 text-sm">
                    {Object.entries(sub.data).map(([key, val]) => {
                      if (typeof val === 'object') return null; // skip sub-objects for neatness
                      return (
                        <div key={key} className="grid grid-cols-[minmax(0,8rem)_1fr] gap-3">
                          <dt className="truncate font-semibold text-muted-foreground">{key}</dt>
                          <dd className="break-words text-foreground">{String(val)}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>

                {duplicates[sub.id]?.length ? (
                  <div className="mx-5 mb-4 rounded-2xl border-2 border-warning/40 bg-warning/10 p-4 sm:mx-6">
                    <p className="flex items-center gap-2 text-base font-bold text-foreground">
                      <AlertTriangle className="h-5 w-5 text-warning" aria-hidden />
                      {t.adminForms.maybeMember}
                    </p>
                    <p className="mt-1 text-base text-muted-foreground">{t.adminForms.maybeMemberBody}</p>
                    <div className="mt-3 grid gap-2">
                      {duplicates[sub.id].map((candidate) => (
                        <button
                          key={candidate.id}
                          type="button"
                          disabled={loadingId !== null}
                          onClick={() => handleLinkExisting(sub.id, candidate.id, candidate.names)}
                          className="flex min-h-12 w-full flex-col items-start gap-0.5 rounded-xl border-2 border-border/70 bg-card px-4 py-2 text-left transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50"
                        >
                          <span className="text-base font-semibold text-foreground">{candidate.names}</span>
                          <span className="text-sm text-muted-foreground">
                            {candidate.phone ?? t.adminForms.noPhone} &middot;{' '}
                            {t.adminForms.matchedOn(t.adminForms.matchReason[candidate.reason])}
                          </span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={loadingId !== null}
                      onClick={() => handleCreateAnyway(sub.id)}
                      className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-xl px-3 text-base font-semibold text-foreground transition-colors hover:bg-warning/15 disabled:opacity-50"
                    >
                      {t.adminForms.createAnyway}
                    </button>
                  </div>
                ) : null}

                <div className="mt-auto flex flex-col gap-2 border-t border-border/60 px-5 py-4 sm:flex-row sm:px-6">
                  <button
                    type="button"
                    onClick={() => handleApprove(sub)}
                    disabled={loadingId !== null}
                    className="btn-shimmer inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl text-base font-bold text-primary-foreground disabled:opacity-60"
                  >
                    <Check className="h-5 w-5" aria-hidden />
                    {loadingId === sub.id ? t.common.loading : t.adminForms.approve}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(sub.id)}
                    disabled={loadingId !== null}
                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-destructive/40 bg-card text-base font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
                  >
                    <X className="h-5 w-5" aria-hidden />
                    {t.adminForms.reject}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <SectionCard
        title={
          <>
            {t.adminForms.processedTitle}
            <span className="font-sans text-base font-semibold text-muted-foreground">
              ({processedList.length})
            </span>
          </>
        }
        icon={<FileText className="h-5 w-5 text-muted-foreground" aria-hidden />}
      >
        {processedList.length === 0 ? (
          <EmptyState title={t.adminForms.processedEmpty} className="py-6" />
        ) : (
          <ul className="divide-y divide-border/60">
            {processedList.map((sub) => {
              const status = STATUS[sub.status];
              return (
                <li
                  key={sub.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="break-words text-base font-semibold text-foreground">
                      {applicantName(sub, t.adminForms.guest)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formLabel(sub.formType)} · {dateFmt.format(new Date(sub.createdAt))}
                    </p>
                  </div>
                  <StatusBadge tone={status.tone} icon={status.icon} className="self-start sm:self-auto">
                    {status.label}
                  </StatusBadge>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
