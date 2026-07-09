'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Search, Download, FileText, Plus } from 'lucide-react';
import Link from 'next/link';

interface MemberWithBalance {
  id: string;
  names: string;
  phone: string | null;
  address: string | null;
  husbandWife: string | null;
  spousePhone: string | null;
  parents: string[];
  children: string[];
  siblings: string[];
  witnesses: any;
  nextOfKin: any;
  balance: number;
}

export function AdminMembersList({ initialMembers }: { initialMembers: MemberWithBalance[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'debt' | 'credit' | 'paid'>('all');

  const filteredMembers = initialMembers.filter(member => {
    // Search filter
    const matchesSearch = member.names.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (member.phone && member.phone.includes(searchTerm));

    // Balance filter
    let matchesBalance = true;
    if (balanceFilter === 'debt') matchesBalance = member.balance < 0;
    else if (balanceFilter === 'credit') matchesBalance = member.balance > 0;
    else if (balanceFilter === 'paid') matchesBalance = member.balance === 0;

    return matchesSearch && matchesBalance;
  });

  // Export database profiles to Excel (excludes balances)
  const handleExportDatabase = () => {
    const getNames = (arr: any) => {
      if (Array.isArray(arr)) return arr.join(', ');
      return '';
    };

    const getJsonNames = (arr: any) => {
      if (Array.isArray(arr)) {
        return arr.map((item: any) => `${item.name || ''} ${item.phone ? `(${item.phone})` : ''}`).filter(Boolean).join(', ');
      }
      return '';
    };

    const dataToExport = filteredMembers.map((m, idx) => ({
      'No.': idx + 1,
      'Names': m.names,
      'Phone': m.phone || 'N/A',
      'Address': m.address || 'N/A',
      'Husband/Wife': m.husbandWife || 'N/A',
      'Spouse Phone': m.spousePhone || 'N/A',
      'Parents': getNames(m.parents),
      'Children': getNames(m.children),
      'Sisters/Brothers': getNames(m.siblings),
      'Witnesses/Referees': getJsonNames(m.witnesses),
      'Next Of Kin / Supervisors': getJsonNames(m.nextOfKin),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TSA Database');

    // Auto-fit column widths
    const maxLens = Object.keys(dataToExport[0] || {}).map(key => 
      Math.max(key.length, ...dataToExport.map(row => String((row as any)[key]).length))
    );
    worksheet['!cols'] = maxLens.map(len => ({ wch: len + 3 }));

    XLSX.writeFile(workbook, `TSA_Database_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export PDF Report of alphabetical names and net balances (WhatsApp sharing optimized)
  const handleExportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF();
    
    // Add TSA header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(16, 124, 65); // Emerald green theme
    doc.text('TANZANIA SHARING ASSOCIATION (TSA)', 14, 20);
    
    // Add subtitle
    doc.setFontSize(11);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('Official Member Balance Statement', 14, 27);
    
    // Add date
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.setFontSize(9);
    doc.text(`Generated on: ${dateStr}`, 14, 33);
    
    // Header divider line
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 37, 196, 37);
    
    // Sort members alphabetically for public listing
    const sortedMembers = [...filteredMembers].sort((a, b) => a.names.localeCompare(b.names));
    const tableRows = sortedMembers.map((m, idx) => [
      String(idx + 1),
      m.names,
      m.phone || 'N/A',
      m.balance >= 0 ? `+$${m.balance.toFixed(2)}` : `-$${Math.abs(m.balance).toFixed(2)}`
    ]);
    
    // Build the table
    autoTable(doc, {
      startY: 43,
      head: [['No.', 'Member Name', 'Phone Number', 'Net Balance']],
      body: tableRows,
      theme: 'striped',
      headStyles: {
        fillColor: [16, 124, 65], // Emerald green
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 80 },
        2: { cellWidth: 45 },
        3: { cellWidth: 40, fontStyle: 'bold', halign: 'right' }
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      didDrawCell: (data) => {
        // Color balance column values dynamically
        if (data.column.index === 3 && data.cell.section === 'body') {
          const val = data.cell.text[0];
          if (val.startsWith('-')) {
            doc.setTextColor(225, 29, 72); // Rose-600 (Red)
          } else if (val.startsWith('+')) {
            doc.setTextColor(22, 163, 74); // Green-600
          }
        }
      }
    });
    
    doc.save(`TSA_Member_Balances_Statement_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <Card className="w-full bg-white shadow-md border border-slate-100">
      <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-50">
        <div>
          <CardTitle className="text-xl font-bold text-slate-900 font-sans">TSA Member Directory</CardTitle>
          <CardDescription className="font-sans">Manage profile details, lookup transactions, and export backups.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto font-sans">
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 h-9">
            <Link href="/admin/members/new">
              <Plus className="h-4 w-4" />
              Add Member
            </Link>
          </Button>
          <Button onClick={handleExportDatabase} variant="outline" className="border-slate-200 text-xs font-semibold gap-1.5 h-9">
            <Download className="h-4 w-4" />
            Export Database
          </Button>
          <Button onClick={handleExportPDF} variant="outline" className="border-slate-200 text-xs font-semibold gap-1.5 h-9">
            <FileText className="h-4 w-4 text-emerald-600" />
            Export PDF Report
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6 font-sans">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by name or phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <Button 
              variant={balanceFilter === 'all' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setBalanceFilter('all')}
              className="text-xs font-semibold"
            >
              All ({initialMembers.length})
            </Button>
            <Button 
              variant={balanceFilter === 'debt' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setBalanceFilter('debt')}
              className="text-xs font-semibold"
            >
              Outstanding Dues ({initialMembers.filter(m => m.balance < 0).length})
            </Button>
            <Button 
              variant={balanceFilter === 'credit' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setBalanceFilter('credit')}
              className="text-xs font-semibold"
            >
              Advance Credit ({initialMembers.filter(m => m.balance > 0).length})
            </Button>
            <Button 
              variant={balanceFilter === 'paid' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setBalanceFilter('paid')}
              className="text-xs font-semibold"
            >
              Settle Balances ({initialMembers.filter(m => m.balance === 0).length})
            </Button>
          </div>
        </div>

        {/* Directory Table */}
        <div className="border border-slate-100 rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-12 font-bold text-slate-700">No.</TableHead>
                <TableHead className="font-bold text-slate-700">Names</TableHead>
                <TableHead className="font-bold text-slate-700">Phone</TableHead>
                <TableHead className="font-bold text-slate-700">Postal Address</TableHead>
                <TableHead className="font-bold text-slate-700 text-right">Net Balance</TableHead>
                <TableHead className="w-24 text-right font-bold text-slate-700">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-400">
                    No members match search query.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((m, idx) => (
                  <TableRow key={m.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium text-slate-500">{idx + 1}</TableCell>
                    <TableCell className="font-semibold text-slate-800">{m.names}</TableCell>
                    <TableCell className="text-slate-600 font-mono text-xs">{m.phone || 'N/A'}</TableCell>
                    <TableCell className="text-slate-600 max-w-xs truncate text-xs">{m.address || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-bold text-sm ${m.balance > 0 ? 'text-emerald-600' : m.balance < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                        {m.balance >= 0 ? `+$${m.balance.toFixed(2)}` : `-$${Math.abs(m.balance).toFixed(2)}`}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline" className="text-xs font-semibold px-2 py-1 h-7 border-slate-200">
                        <Link href={`/admin/members/${m.id}`}>
                          View Profile
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

