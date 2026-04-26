'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { customersApi } from '@/lib/api';
import { AppLayout } from '@/components/AppLayout';
import { Card, StatusBadge, PriorityBadge, Spinner } from '@/components/ui';
import { format } from 'date-fns';
import { Phone, Mail, MessageSquare, MapPin, Zap } from 'lucide-react';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    customersApi.get(+id).then(setData);
  }, [id]);

  if (!data) return <AppLayout><Spinner size={36} /></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{data.name}</h2>
              {data.company && <p className="text-gray-500 text-sm">{data.company}</p>}
            </div>
            <Link href={`/tickets/new?customer_id=${data.id}`}
              className="text-sm bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-light transition-colors">
              + สร้าง Ticket
            </Link>
          </div>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
            <span className="flex items-center gap-1.5"><Phone size={13} />{data.phone}</span>
            {data.phone2 && <span className="flex items-center gap-1.5"><Phone size={13} />{data.phone2}</span>}
            {data.email && <span className="flex items-center gap-1.5"><Mail size={13} />{data.email}</span>}
            {data.line_id && <span className="flex items-center gap-1.5"><MessageSquare size={13} />LINE: {data.line_id}</span>}
          </div>
        </Card>

        {/* Sites */}
        {data.sites?.length > 0 && (
          <Card className="p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Sites ({data.sites.length})</h3>
            <div className="space-y-3">
              {data.sites.map((s: any) => (
                <div key={s.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <MapPin size={13} className="text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-700">{s.address}</p>
                      <div className="flex gap-3 mt-1 text-xs text-gray-500">
                        {s.system_size_kw && <span className="flex items-center gap-1"><Zap size={10} />{s.system_size_kw} kWp</span>}
                        {s.inverter_brand && <span>Inverter: {s.inverter_brand}</span>}
                        {s.installation_date && <span>ติดตั้ง: {format(new Date(s.installation_date), 'dd/MM/yyyy')}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Ticket history */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-700 mb-3">ประวัติ Ticket ({data.tickets?.length || 0})</h3>
          {data.tickets?.length === 0 ? (
            <p className="text-sm text-gray-400">ยังไม่มี Ticket</p>
          ) : (
            <div className="space-y-2">
              {data.tickets.map((t: any) => (
                <Link key={t.id} href={`/tickets/${t.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div>
                    <span className="font-mono text-xs text-gray-400 mr-2">{t.ticket_number}</span>
                    <span className="text-sm text-gray-700">{t.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                    <span className="text-xs text-gray-400">{format(new Date(t.created_at), 'dd/MM/yy')}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
