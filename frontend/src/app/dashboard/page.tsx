'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth.store';
import { ticketsApi } from '@/lib/api';
import { AppLayout } from '@/components/AppLayout';
import { Card, Spinner } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, Clock, CheckCircle2, TrendingUp, Inbox, Pause, XCircle } from 'lucide-react';
import Link from 'next/link';

const PIE_COLORS = ['#1B3A6B','#2563EB','#0D9488','#D97706','#DC2626','#16A34A'];

function KpiCard({ label, value, icon: Icon, color, href }: {
  label: string; value: number; icon: React.ElementType; color: string; href?: string;
}) {
  const content = (
    <Card className="p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-xl ${color}`}><Icon size={20} className="text-white" /></div>
      <div>
        <div className="text-2xl font-bold text-gray-800">{value}</div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      </div>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default function DashboardPage() {
  const { user, loadUser } = useAuth();
  const router = useRouter();
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser().then(() => {
      const token = localStorage.getItem('token');
      if (!token) { router.push('/login'); return; }
      ticketsApi.dashboard().then(setData).finally(() => setLoading(false));
    });
  }, []);

  if (loading) return <AppLayout><Spinner size={36} /></AppLayout>;

  const s = data?.summary;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">ยินดีต้อนรับ, {user?.name} 👋</h2>
          <p className="text-sm text-gray-500 mt-0.5">ภาพรวมระบบ Ticket ทั้งหมด</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Ticket ใหม่"    value={+s?.new_count || 0}         icon={Inbox}          color="bg-blue-500"   href="/tickets?status=new" />
          <KpiCard label="กำลังดำเนินงาน" value={+s?.in_progress_count || 0} icon={TrendingUp}      color="bg-amber-500"  href="/tickets?status=in_progress" />
          <KpiCard label="รอดำเนินการ"   value={+s?.waiting_count || 0}      icon={Pause}          color="bg-purple-500" href="/tickets?status=waiting" />
          <KpiCard label="เกินกำหนด 🔴"  value={+s?.overdue_count || 0}      icon={AlertTriangle}   color="bg-red-500"    href="/tickets?overdue=1" />
          <KpiCard label="Assigned"        value={+s?.assigned_count || 0}     icon={Clock}          color="bg-indigo-500" href="/tickets?status=assigned" />
          <KpiCard label="เสร็จรอยืนยัน" value={+s?.done_count || 0}         icon={CheckCircle2}   color="bg-teal-500"   href="/tickets?status=done" />
          <KpiCard label="ปิดแล้ว"        value={+s?.closed_count || 0}       icon={XCircle}        color="bg-green-600"  href="/tickets?status=closed" />
          <KpiCard label="ทั้งหมด"        value={+s?.total || 0}              icon={TrendingUp}     color="bg-gray-600" />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Category */}
          <Card className="p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Ticket แยกตามประเภท</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.byCategory || []} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="#1B3A6B" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* By Priority */}
          <Card className="p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Ticket แยกตาม Priority</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data?.byPriority || []} dataKey="count" nameKey="priority"
                  cx="50%" cy="50%" outerRadius={80} label={({ priority, count }) => `${priority}: ${count}`}>
                  {(data?.byPriority || []).map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overdue by owner */}
          {data?.overdueByOwner?.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold text-gray-700 mb-3">Overdue แยกตาม Owner</h3>
              <div className="space-y-2">
                {data.overdueByOwner.map((row: any) => (
                  <div key={row.owner} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{row.owner}</span>
                    <span className="text-sm font-bold text-red-600">{row.overdue_count} tickets</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recent tickets */}
          <Card className="p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Ticket ล่าสุด</h3>
            <div className="space-y-2">
              {(data?.recentTickets || []).map((t: any) => (
                <Link key={t.ticket_number} href={`/tickets/${t.ticket_number}`}
                  className="flex items-center justify-between py-1.5 hover:bg-gray-50 rounded px-1 -mx-1">
                  <div>
                    <span className="text-xs font-mono text-gray-400">{t.ticket_number}</span>
                    <p className="text-sm text-gray-700 truncate max-w-[200px]">{t.title}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    t.status === 'new' ? 'bg-gray-100' :
                    t.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                    'bg-green-100 text-green-700'}`}>
                    {t.status}
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
