'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ticketsApi, usersApi, Ticket, Comment, User } from '@/lib/api';
import { AppLayout } from '@/components/AppLayout';
import { Card, StatusBadge, PriorityBadge, SlaBadge, Button, Spinner } from '@/components/ui';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { MessageSquare, History, UserCheck, ArrowRight, Lock, Globe } from 'lucide-react';

const STATUS_TRANSITIONS: Record<string, { label: string; next: string }[]> = {
  new:         [{ label: 'Assign & Start', next: 'assigned' }],
  assigned:    [{ label: 'เริ่มดำเนินการ', next: 'in_progress' }],
  in_progress: [{ label: 'รอ (Waiting)', next: 'waiting' }, { label: 'เสร็จแล้ว (Done)', next: 'done' }],
  waiting:     [{ label: 'กลับมาดำเนินการ', next: 'in_progress' }],
  done:        [{ label: 'ปิดงาน (Close)', next: 'closed' }, { label: 'เปิดใหม่', next: 'in_progress' }],
  closed: [], cancelled: [],
};

type Tab = 'comments' | 'assign' | 'logs';

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [ticket, setTicket]     = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [logs, setLogs]         = useState<any[]>([]);
  const [users, setUsers]       = useState<User[]>([]);
  const [depts, setDepts]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<Tab>('comments');

  // Form state
  const [comment, setComment]       = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ownerId, setOwnerId]       = useState('');
  const [deptId, setDeptId]         = useState('');

  // Status change
  const [statusNote, setStatusNote]   = useState('');
  const [waitingReason, setWaitingReason] = useState('');
  const [waitingEta, setWaitingEta]   = useState('');
  const [doneNote, setDoneNote]       = useState('');
  const [pendingStatus, setPendingStatus] = useState('');

  const load = async () => {
    const [t, c] = await Promise.all([
      ticketsApi.get(+id),
      ticketsApi.comments(+id),
    ]);
    setTicket(t); setComments(c);
  };

  useEffect(() => {
    Promise.all([load(), usersApi.list(), usersApi.departments()])
      .then(([_, u, d]) => { setUsers(u); setDepts(d); })
      .finally(() => setLoading(false));
  }, [id]);

  const loadLogs = async () => {
    const l = await ticketsApi.logs(+id);
    setLogs(l);
  };

  const handleTabChange = (t: Tab) => {
    setTab(t);
    if (t === 'logs' && logs.length === 0) loadLogs();
  };

  const submitComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const c = await ticketsApi.addComment(+id, comment, isInternal);
      setComments(prev => [...prev, c]);
      setComment('');
    } finally { setSubmitting(false); }
  };

  const handleAssign = async () => {
    if (!ownerId || !deptId) return;
    setSubmitting(true);
    try {
      const updated = await ticketsApi.assign(+id, +ownerId, +deptId);
      setTicket(updated);
    } finally { setSubmitting(false); }
  };

  const handleStatusChange = async (next: string) => {
    if (!statusNote && next !== 'assigned') {
      // Require note for most transitions
    }
    setSubmitting(true);
    try {
      const updated = await ticketsApi.changeStatus(+id, {
        status: next,
        comment: statusNote || undefined,
        waiting_reason: next === 'waiting' ? waitingReason : undefined,
        waiting_eta: next === 'waiting' ? waitingEta : undefined,
        done_note: next === 'done' ? doneNote : undefined,
      });
      setTicket(updated);
      setPendingStatus('');
      setStatusNote(''); setWaitingReason(''); setDoneNote('');
      await load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally { setSubmitting(false); }
  };

  if (loading || !ticket) return <AppLayout><Spinner size={36} /></AppLayout>;

  const transitions = STATUS_TRANSITIONS[ticket.status] || [];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm text-gray-400">{ticket.ticket_number}</span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <SlaBadge dueDate={ticket.due_date} isOverdue={ticket.is_overdue_live} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">{ticket.title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {ticket.category_name} · ลูกค้า: {ticket.customer_name} · {ticket.customer_phone}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => router.push('/tickets')}>← กลับ</Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Left: main info */}
          <div className="col-span-2 space-y-4">
            {/* Description */}
            <Card className="p-5">
              <h3 className="font-semibold text-gray-700 mb-2">รายละเอียดปัญหา</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
              {ticket.site_address && (
                <p className="text-xs text-gray-400 mt-3">📍 {ticket.site_address} {ticket.system_size_kw ? `(${ticket.system_size_kw} kWp)` : ''}</p>
              )}
              {ticket.internal_note && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-amber-700 mb-0.5">🔒 Internal Note</p>
                  <p className="text-sm text-amber-800">{ticket.internal_note}</p>
                </div>
              )}
            </Card>

            {/* Status Actions */}
            {transitions.length > 0 && (
              <Card className="p-5">
                <h3 className="font-semibold text-gray-700 mb-3">เปลี่ยนสถานะ</h3>
                <div className="flex gap-2 flex-wrap mb-3">
                  {transitions.map(({ label, next }) => (
                    <Button key={next} size="sm"
                      variant={next === 'closed' ? 'danger' : next === 'done' ? 'primary' : 'secondary'}
                      onClick={() => setPendingStatus(next)}>
                      {label} <ArrowRight size={12} className="ml-1 inline" />
                    </Button>
                  ))}
                </div>
                {pendingStatus && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <p className="text-sm font-medium text-gray-700">
                      เปลี่ยนเป็น: <strong>{pendingStatus}</strong>
                    </p>
                    {pendingStatus === 'waiting' && (
                      <>
                        <textarea value={waitingReason} onChange={e => setWaitingReason(e.target.value)}
                          placeholder="เหตุผลที่รอ (รออะไหล่ / รอลูกค้า / รอเอกสาร) *" rows={2}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
                        <input type="date" value={waitingEta} onChange={e => setWaitingEta(e.target.value)}
                          placeholder="ETA วันที่คาดว่าจะกลับมาดำเนินการ"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
                      </>
                    )}
                    {pendingStatus === 'done' && (
                      <textarea value={doneNote} onChange={e => setDoneNote(e.target.value)}
                        placeholder="สรุปงานที่ทำ (บังคับ) *" rows={2}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
                    )}
                    <textarea value={statusNote} onChange={e => setStatusNote(e.target.value)}
                      placeholder="Comment (แนะนำให้ใส่เสมอ)..." rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleStatusChange(pendingStatus)} disabled={submitting}>
                        ยืนยัน
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setPendingStatus('')}>ยกเลิก</Button>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Tabs: Comments / Assign / Logs */}
            <Card>
              <div className="flex border-b border-gray-100">
                {([['comments','💬 Comments'], ['assign','👤 Assign'], ['logs','📋 Logs']] as [Tab, string][]).map(([t, label]) => (
                  <button key={t} onClick={() => handleTabChange(t)}
                    className={`px-5 py-3 text-sm font-medium transition-colors ${tab === t ? 'border-b-2 border-brand text-brand' : 'text-gray-500 hover:text-gray-700'}`}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {/* Comments Tab */}
                {tab === 'comments' && (
                  <div className="space-y-4">
                    {comments.length === 0 && <p className="text-sm text-gray-400 text-center py-4">ยังไม่มี Comment</p>}
                    {comments.map(c => (
                      <div key={c.id} className={`flex gap-3 ${c.is_internal ? 'opacity-75' : ''}`}>
                        <div className="w-8 h-8 bg-brand/10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-brand">
                          {c.user_name?.[0] || '?'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-700">{c.user_name}</span>
                            {c.is_internal && (
                              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                <Lock size={10} />Internal
                              </span>
                            )}
                            <span className="text-xs text-gray-400">
                              {format(new Date(c.created_at), 'dd MMM HH:mm', { locale: th })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
                        </div>
                      </div>
                    ))}

                    {/* Add comment */}
                    <div className="border-t border-gray-100 pt-4">
                      <textarea value={comment} onChange={e => setComment(e.target.value)}
                        placeholder="เพิ่ม Comment..." rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
                      <div className="flex items-center justify-between mt-2">
                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                          <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)}
                            className="rounded" />
                          <Lock size={12} /> Internal (ทีมเห็นเท่านั้น)
                        </label>
                        <Button size="sm" onClick={submitComment} disabled={submitting || !comment.trim()}>
                          <MessageSquare size={13} className="mr-1.5 inline" />ส่ง
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Assign Tab */}
                {tab === 'assign' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">Owner ปัจจุบัน: <strong>{ticket.owner_name || 'ยังไม่ได้ Assign'}</strong></p>
                    <select value={deptId} onChange={e => setDeptId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/30">
                      <option value="">-- เลือกแผนก --</option>
                      {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <select value={ownerId} onChange={e => setOwnerId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/30">
                      <option value="">-- เลือก Owner ใหม่ --</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                    </select>
                    <Button onClick={handleAssign} disabled={submitting || !ownerId || !deptId}>
                      <UserCheck size={14} className="mr-1.5 inline" />Assign งาน
                    </Button>
                  </div>
                )}

                {/* Logs Tab */}
                {tab === 'logs' && (
                  <div className="space-y-2">
                    {logs.length === 0 && <p className="text-sm text-gray-400 text-center py-4">ไม่มี Log</p>}
                    {logs.map(l => (
                      <div key={l.id} className="flex items-start gap-3 text-sm py-1.5 border-b border-gray-50">
                        <History size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <span className="font-medium text-gray-700">{l.performed_by_name}</span>
                          <span className="text-gray-500"> — {l.event_type}</span>
                          {l.note && <span className="text-gray-400"> · {l.note.slice(0, 60)}</span>}
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {format(new Date(l.created_at), 'dd/MM HH:mm')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right: meta */}
          <div className="space-y-4">
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-gray-700 text-sm">ข้อมูล Ticket</h3>
              {[
                ['สถานะ', <StatusBadge key="s" status={ticket.status} />],
                ['Priority', <PriorityBadge key="p" priority={ticket.priority} />],
                ['Owner', ticket.owner_name || <span className="text-red-400 text-xs">ยังไม่ Assign</span>],
                ['แผนก', ticket.department_name || '-'],
                ['Due Date', format(new Date(ticket.due_date), 'dd MMM yyyy', { locale: th })],
                ['SLA', <SlaBadge key="sl" dueDate={ticket.due_date} isOverdue={ticket.is_overdue_live} />],
                ['สร้างเมื่อ', format(new Date(ticket.created_at), 'dd MMM yyyy HH:mm', { locale: th })],
                ['อัปเดตล่าสุด', format(new Date(ticket.updated_at), 'dd MMM HH:mm', { locale: th })],
              ].map(([label, val]) => (
                <div key={label as string} className="flex justify-between items-start gap-2">
                  <span className="text-xs text-gray-400">{label}</span>
                  <span className="text-xs text-gray-700 text-right">{val}</span>
                </div>
              ))}
            </Card>

            {ticket.waiting_reason && (
              <Card className="p-4 bg-purple-50 border-purple-200">
                <p className="text-xs font-semibold text-purple-700 mb-1">⏸ เหตุผลที่รอ</p>
                <p className="text-sm text-purple-800">{ticket.waiting_reason}</p>
                {ticket.waiting_eta && <p className="text-xs text-purple-600 mt-1">ETA: {ticket.waiting_eta}</p>}
              </Card>
            )}

            {ticket.done_note && (
              <Card className="p-4 bg-teal-50 border-teal-200">
                <p className="text-xs font-semibold text-teal-700 mb-1">✅ สรุปงาน</p>
                <p className="text-sm text-teal-800">{ticket.done_note}</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
