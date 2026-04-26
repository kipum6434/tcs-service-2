'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ticketsApi, customersApi, usersApi, Category, Customer, User } from '@/lib/api';
import { AppLayout } from '@/components/AppLayout';
import { Card, Button, Input, Select, Spinner } from '@/components/ui';
import { format, addDays } from 'date-fns';

export default function NewTicketPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const [categories, setCategories]   = useState<Category[]>([]);
  const [customers, setCustomers]     = useState<Customer[]>([]);
  const [users, setUsers]             = useState<User[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [sites, setSites]             = useState<any[]>([]);

  const [form, setForm] = useState({
    title: '', description: '', category_id: '',
    priority: 'medium', customer_id: '', site_id: '',
    owner_id: '', department_id: '', due_date: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
    internal_note: '',
  });

  useEffect(() => {
    Promise.all([
      ticketsApi.categories(),
      customersApi.list(),
      usersApi.list(),
      usersApi.departments(),
    ]).then(([cats, custs, usrs, depts]) => {
      setCategories(cats); setCustomers(custs); setUsers(usrs); setDepartments(depts);
    });
  }, []);

  // Auto-set due_date when category changes (from SLA)
  const handleCategoryChange = (catId: string) => {
    const cat = categories.find(c => c.id === +catId);
    if (cat) {
      const hours = cat.sla_hours;
      const due = new Date(Date.now() + hours * 3600 * 1000);
      setForm(f => ({ ...f, category_id: catId, due_date: format(due, 'yyyy-MM-dd') }));
    } else {
      setForm(f => ({ ...f, category_id: catId }));
    }
  };

  // Load sites when customer changes
  const handleCustomerChange = async (customerId: string) => {
    setForm(f => ({ ...f, customer_id: customerId, site_id: '' }));
    if (customerId) {
      const data = await customersApi.get(+customerId);
      setSites(data.sites || []);
    } else { setSites([]); }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      const ticket = await ticketsApi.create({
        ...form,
        category_id: +form.category_id,
        customer_id: +form.customer_id,
        site_id: form.site_id ? +form.site_id : undefined,
        owner_id: +form.owner_id,
        department_id: +form.department_id,
      });
      router.push(`/tickets/${ticket.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally { setSaving(false); }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-6">สร้าง Ticket ใหม่</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer */}
          <Card className="p-5 space-y-4">
            <h3 className="font-semibold text-gray-700">ข้อมูลลูกค้า</h3>
            <Select label="ลูกค้า *" value={form.customer_id} onChange={e => handleCustomerChange(e.target.value)} required>
              <option value="">-- เลือกลูกค้า --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
            </Select>
            {sites.length > 0 && (
              <Select label="Site (ที่อยู่ติดตั้ง)" value={form.site_id} onChange={set('site_id')}>
                <option value="">-- เลือก Site --</option>
                {sites.map((s: any) => <option key={s.id} value={s.id}>{s.address}</option>)}
              </Select>
            )}
          </Card>

          {/* Ticket Info */}
          <Card className="p-5 space-y-4">
            <h3 className="font-semibold text-gray-700">รายละเอียด Ticket</h3>
            <Input label="หัวข้อ *" value={form.title} onChange={set('title')} required placeholder="เช่น Inverter แสดง Error E04" />
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">รายละเอียดปัญหา *</label>
              <textarea value={form.description} onChange={set('description')} required rows={4}
                placeholder="อธิบายปัญหาอย่างละเอียด..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select label="ประเภทงาน *" value={form.category_id} onChange={e => handleCategoryChange(e.target.value)} required>
                <option value="">-- เลือกประเภท --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name} (SLA {c.sla_hours}h)</option>)}
              </Select>
              <Select label="Priority *" value={form.priority} onChange={set('priority')} required>
                <option value="low">ต่ำ (Low)</option>
                <option value="medium">ปกติ (Medium)</option>
                <option value="high">สูง (High)</option>
                <option value="critical">เร่งด่วน (Critical)</option>
              </Select>
            </div>
            <Input label="Due Date *" type="date" value={form.due_date} onChange={set('due_date')} required />
          </Card>

          {/* Assignment */}
          <Card className="p-5 space-y-4">
            <h3 className="font-semibold text-gray-700">มอบหมายงาน</h3>
            <div className="grid grid-cols-2 gap-4">
              <Select label="แผนก *" value={form.department_id} onChange={set('department_id')} required>
                <option value="">-- เลือกแผนก --</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
              <Select label="ผู้รับผิดชอบ (Owner) *" value={form.owner_id} onChange={set('owner_id')} required>
                <option value="">-- เลือก Owner --</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Internal Note</label>
              <textarea value={form.internal_note} onChange={set('internal_note')} rows={2}
                placeholder="Note ภายในทีม (ลูกค้าไม่เห็น)..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
            </div>
          </Card>

          {error && <p className="text-red-500 text-sm text-center bg-red-50 rounded-lg p-3">{error}</p>}

          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => router.back()}>ยกเลิก</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'กำลังบันทึก...' : 'สร้าง Ticket'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
