'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { ChevronRight, FileText, Plus, Search, Sheet } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { formatUSD } from '@/lib/money';
import type { StandingTier } from '@/lib/finance/constants';
import { recordMemberExport } from '@/features/finance/admin-actions';
import { usePortalStrings } from '@/components/portal/use-portal-strings';
import { MoneyAmount } from '@/components/portal/money';
import { StatusBadge, type Tone } from '@/components/portal/status-badge';
import { EmptyState } from '@/components/portal/empty-state';

export interface DirectoryMember {
  id: string;
  names: string;
  memberNumber: number | null;
  phone: string | null;
  address: string | null;
  husbandWife: string | null;
  spousePhone: string | null;
  parents: string[];
  children: string[];
  siblings: string[];
  witnesses: unknown;
  nextOfKin: unknown;
  advanceCents: number;
  outstandingCents: number;
  netCents: number;
  tier: StandingTier;
}

const TIER_TONE: Record<StandingTier, Tone> = {
  FULL: 'success',
  REDUCED: 'warning',
  MINIMAL: 'warning',
  VOLUNTARY: 'danger',
};

type Filter = 'all' | 'owing' | 'below' | 'full';

function contactList(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value
    .map((c: { name?: string; phone?: string }) => `${c?.name ?? ''}${c?.phone ? ` (${c.phone})` : ''}`.trim())
    .filter(Boolean)
    .join(', ');
}

async function logoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch('/images/tsa-logo.png');
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function AdminMembersList({ members }: { members: DirectoryMember[] }) {
  const t = usePortalStrings();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      const matches =
        !q ||
        m.names.toLowerCase().includes(q) ||
        (m.phone ?? '').includes(q) ||
        (m.memberNumber !== null && `tsa-${m.memberNumber}`.includes(q));
      const passes =
        filter === 'all' ||
        (filter === 'owing' && m.outstandingCents > 0) ||
        (filter === 'below' && m.tier !== 'FULL') ||
        (filter === 'full' && m.tier === 'FULL');
      return matches && passes;
    });
  }, [members, query, filter]);

  // Exports are built in the browser, so they are logged on the server first.
  async function logExport(format: 'EXCEL_PROFILES' | 'PDF_BALANCES') {
    const res = await recordMemberExport({ format, rowCount: visible.length });
    if (!res.success) {
      toast.error(res.error);
      return false;
    }
    return true;
  }

  async function exportExcel() {
    if (!(await logExport('EXCEL_PROFILES'))) return;
    const rows = visible.map((m, i) => ({
      'No.': i + 1,
      'Member No.': m.memberNumber ?? '',
      Names: m.names,
      Phone: m.phone ?? '',
      Address: m.address ?? '',
      'Husband/Wife': m.husbandWife ?? '',
      'Spouse Phone': m.spousePhone ?? '',
      Parents: m.parents.join(', '),
      Children: m.children.join(', '),
      'Sisters/Brothers': m.siblings.join(', '),
      'Witnesses/Referees': contactList(m.witnesses),
      'Next Of Kin': contactList(m.nextOfKin),
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const widths = Object.keys(rows[0] ?? {}).map((key) =>
      Math.max(key.length, ...rows.map((r) => String(r[key as keyof typeof r]).length))
    );
    sheet['!cols'] = widths.map((w) => ({ wch: w + 3 }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'TSA Database');
    XLSX.writeFile(book, `TSA_Database_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function exportPdf() {
    if (!(await logExport('PDF_BALANCES'))) return;
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    const logo = await logoDataUrl();
    if (logo) doc.addImage(logo, 'PNG', 14, 11, 18, 18);

    // TSA green, from the site theme (hsl 133 55% 40%).
    const green: [number, number, number] = [46, 158, 62];
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...green);
    doc.text('TANZANIA SHARING ASSOCIATION (TSA)', 35, 19);
    doc.setFontSize(11);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 110, 120);
    doc.text('Taarifa ya Akiba za Wanachama / Member Savings Statement', 35, 25);
    doc.setFontSize(8.5);
    doc.text(
      `${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      35,
      31
    );
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 37, 196, 37);

    const sorted = [...visible].sort((a, b) => a.names.localeCompare(b.names));
    autoTable(doc, {
      startY: 43,
      head: [['No.', 'Jina / Name', 'Akiba / Savings', 'Deni / Owes']],
      body: sorted.map((m, i) => [
        String(i + 1),
        m.names,
        formatUSD(m.advanceCents),
        m.outstandingCents > 0 ? formatUSD(m.outstandingCents) : '—',
      ]),
      theme: 'striped',
      headStyles: { fillColor: green, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 14 },
        1: { cellWidth: 104 },
        2: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
        3: { cellWidth: 32, halign: 'right' },
      },
      styles: { fontSize: 9, cellPadding: 3 },
    });
    doc.save(`TSA_Member_Savings_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t.admin.members.all },
    { key: 'owing', label: t.admin.members.owes },
    { key: 'below', label: t.admin.members.belowMinimum },
    { key: 'full', label: t.tiers.FULL },
  ];

  return (
    <section className="rounded-3xl border border-border/60 bg-card shadow-sm">
      <div className="space-y-4 border-b border-border/60 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.admin.members.search}
              className="h-12 rounded-xl pl-12 text-base"
              aria-label={t.admin.members.search}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/members/new"
              className="btn-shimmer inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-base font-semibold text-primary-foreground"
            >
              <Plus className="h-5 w-5" aria-hidden />
              {t.admin.members.addMember}
            </Link>
            <button
              type="button"
              onClick={exportExcel}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border px-4 text-base font-semibold hover:bg-muted"
            >
              <Sheet className="h-5 w-5" aria-hidden />
              {t.admin.members.exportExcel}
            </button>
            <button
              type="button"
              onClick={exportPdf}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border px-4 text-base font-semibold hover:bg-muted"
            >
              <FileText className="h-5 w-5" aria-hidden />
              {t.admin.members.exportPdf}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2" role="group">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={
                filter === f.key
                  ? 'min-h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground'
                  : 'min-h-10 rounded-full border border-border px-4 text-sm font-semibold text-muted-foreground hover:bg-muted'
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={<Search className="h-6 w-6" />} title={t.admin.members.empty} />
      ) : (
        <ul className="divide-y divide-border/60">
          {visible.map((m) => (
            <li key={m.id}>
              <Link
                href={`/admin/members/${m.id}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50 sm:px-6"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-lg font-semibold">{m.names}</p>
                  <p className="text-sm text-muted-foreground">
                    {[m.memberNumber ? `TSA-${m.memberNumber}` : null, m.phone].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-sm text-muted-foreground">{t.admin.members.holds}</p>
                  <MoneyAmount cents={m.advanceCents} className="text-base font-semibold" />
                </div>
                <div className="hidden w-28 text-right sm:block">
                  <p className="text-sm text-muted-foreground">{t.admin.members.owes}</p>
                  {m.outstandingCents > 0 ? (
                    <MoneyAmount cents={m.outstandingCents} className="text-base font-semibold text-warning" />
                  ) : (
                    <span className="text-base text-muted-foreground">—</span>
                  )}
                </div>
                <StatusBadge tone={TIER_TONE[m.tier]} className="hidden md:inline-flex">
                  {t.tiers[m.tier]}
                </StatusBadge>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
