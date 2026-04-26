'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ticketsApi, Ticket } from '@/lib/api';
import { AppLayout } from '@/components/AppLayout';
import { Card, StatusBadge, PriorityBadge, SlaBadge, Button, Spinner, Empty } from '@/components/ui';
import { Plus, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

const STATUSES = ['','new','assigned','in_progress','waiting','done','closed','cancelled'];
const PRIORITIES = ['','low','medium','high','critical'];

export default function TicketsPage() {
  const searchParams = useSearchParams();
  const [tickets, setTickets]   = useState<Ticket[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState(searchParams.get('status') || '');
  const [priority, setPriority] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ticketsApi.list({ status: status || undefined, priority: priority || undefined, search: search || undefined, page, limit: 25 });
      setTickets(res.data); setTotal(res.total);
    } finally { setLoading(false); }
  }, [status, priority, search, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Tickets ทั้งหมด</h2>
            <p className="text-sm text-gray-500">{total} รายการ</p>
          </div>
          <Link href="/tickets/new">
            <Button><Plus size={16} className="mr-1.5 inline" />สร้าง Ticket</Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="ค้นหา Ticket, ลูกค้า..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
            </div>
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/30">
              {STATUSES.map(s => <option key={s} value={s}>{s || 'สถานะทั้งหมด'}</option>)}
            </select>
            <select value={priority} onChange={e => { setPriority(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/30">
              {PRIORITIES.map(p => <option key={p} value={p}>{p || 'Priority ทั้งหมด'}</option>)}
            </select>
            <Button variant="secondary" onClick={() => { setStatus(''); setPriority(''); setSearch(''); setPage(1); }}>
              <Filter size={14} className="mr-1.5 inline" />ล้างตัวกรอง
            </Button>
          </div>
        </Card>

        {/* Table */}
        <Card>
          {loading ? <Spinner /> : tickets.length === 0 ? <Empty message="ไม่พบ Ticket" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Ticket No.','หัวข้อ','ลูกค้า','ผู้รับผิดชอบ','ประเภท','Priority','Status','Due Date','SLA'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tickets.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/tickets/${t.id}`} className="font-mono text-xs text-brand hover:underline">{t.ticket_number}</Link>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <Link href={`/tickets/${t.id}`} className="font-medium text-gray-800 hover:text-brand line-clamp-1">{t.title}</Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{t.customer_name}</td>
                      <td className="px-4 py-3 text-gray-600">{t.owner_name || <span className="text-red-400 text-xs">ยังไม่ Assign</span>}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{t.category_name}</td>
                      <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                      <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {format(new Date(t.due_date), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3"><SlaBadge dueDate={t.due_date} isOverdue={t.is_overdue_live} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > 25 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">หน้า {page} / {Math.ceil(total / 25)}</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>ก่อนหน้า</Button>
                <Button variant="secondary" size="sm" disabled={page >= Math.ceil(total / 25)} onClick={() => setPage(p => p + 1)}>ถัดไป</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
