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
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Search, Download, ShieldCheck, UserCheck, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Link from 'next/link';

interface MemberWithBalance {
  id: string;
  names: string;
  phone: string | null;
  address: string | null;
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

  // Export filtered members to Excel
  const handleExport = () => {
    const dataToExport = filteredMembers.map((m, idx) => ({
      'No.': idx + 1,
      'Name': m.names,
      'Phone': m.phone || 'N/A',
      'Address': m.address || 'N/A',
      'Account Balance ($)': m.balance.toFixed(2),
      'Status': m.balance > 0 ? 'Credit' : m.balance < 0 ? 'Outstanding Dues (Debt)' : 'Fully Settled'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TSA Member Balances');

    // Auto-fit column widths
    const maxLens = Object.keys(dataToExport[0] || {}).map(key => 
      Math.max(key.length, ...dataToExport.map(row => String((row as any)[key]).length))
    );
    worksheet['!cols'] = maxLens.map(len => ({ wch: len + 3 }));

    XLSX.writeFile(workbook, `TSA_Member_Balances_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <Card className="w-full bg-white shadow-md border border-slate-100">
      <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <CardTitle className="text-xl font-bold text-slate-900">TSA Member Directory</CardTitle>
          <CardDescription>Manage profile details, lookup transactions, and export data spreadsheets.</CardDescription>
        </div>
        <Button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export to Excel
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-6">
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
                        ${m.balance.toFixed(2)}
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
