'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { customersApi, Customer } from '@/lib/api';
import { AppLayout } from '@/components/AppLayout';
import { Card, Button, Spinner, Empty } from '@/components/ui';
import { Search, Plus, Phone, Mail } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [showNew, setShowNew]     = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', company: '' });
  const [saving, setSaving] = useState(false);

  const load = async (q = '') => {
    setLoading(true);
    const data = await customersApi.list(q || undefined);
    setCustomers(data); setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await customersApi.create(form);
      setShowNew(false); setForm({ name: '', phone: '', email: '', company: '' });
      load(search);
    } finally { setSaving(false); }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">ลูกค้าทั้งหมด</h2>
          <Button onClick={() => setShowNew(!showNew)}>
            <Plus size={15} className="mr-1.5 inline" />เพิ่มลูกค้า
          </Button>
        </div>

        {showNew && (
          <Card className="p-5">
            <h3 className="font-semibold text-gray-700 mb-4">ลูกค้าใหม่</h3>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">ชื่อ *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">เบอร์โทร *</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">บริษัท</label>
                <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
              </div>
              <div className="col-span-2 flex gap-3">
                <Button type="submit" disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
                <Button variant="secondary" onClick={() => setShowNew(false)}>ยกเลิก</Button>
              </div>
            </form>
          </Card>
        )}

        <Card className="p-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ, เบอร์, อีเมล..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30" />
          </div>
        </Card>

        {loading ? <Spinner /> : customers.length === 0 ? <Empty message="ไม่พบลูกค้า" /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map(c => (
              <Link key={c.id} href={`/customers/${c.id}`}>
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="font-semibold text-gray-800 mb-2">{c.name}</div>
                  {(c as any).company && <p className="text-xs text-gray-500 mb-2">{(c as any).company}</p>}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone size={12} className="text-gray-400" />{c.phone}
                    </div>
                    {c.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail size={12} className="text-gray-400" />{c.email}
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
