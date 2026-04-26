'use client';
import clsx from 'clsx';
import { TicketStatus, TicketPriority } from '@/lib/api';

// ── Status Badge ───────────────────────────────────────────────────────
const STATUS_STYLES: Record<TicketStatus, string> = {
  new:         'bg-gray-100 text-gray-700',
  assigned:    'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  waiting:     'bg-purple-100 text-purple-700',
  done:        'bg-teal-100 text-teal-700',
  closed:      'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-700',
};
const STATUS_LABELS: Record<TicketStatus, string> = {
  new: 'ใหม่', assigned: 'Assigned', in_progress: 'กำลังทำ',
  waiting: 'รอ', done: 'เสร็จ', closed: 'ปิดแล้ว', cancelled: 'ยกเลิก',
};
export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

// ── Priority Badge ─────────────────────────────────────────────────────
const PRIORITY_STYLES: Record<TicketPriority, string> = {
  low:      'bg-gray-100 text-gray-600',
  medium:   'bg-blue-100 text-blue-600',
  high:     'bg-orange-100 text-orange-600',
  critical: 'bg-red-100 text-red-700 font-bold',
};
const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'ต่ำ', medium: 'ปกติ', high: 'สูง', critical: 'เร่งด่วน',
};
export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <span className={clsx('px-2 py-0.5 rounded text-xs', PRIORITY_STYLES[priority])}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

// ── SLA Chip ───────────────────────────────────────────────────────────
export function SlaBadge({ dueDate, isOverdue }: { dueDate: string; isOverdue: boolean }) {
  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86400000);
  const color = isOverdue ? 'bg-red-100 text-red-700'
              : diffDays <= 1 ? 'bg-amber-100 text-amber-700'
              : 'bg-green-100 text-green-700';
  return (
    <span className={clsx('px-2 py-0.5 rounded text-xs', color)}>
      {isOverdue ? `เกิน ${Math.abs(diffDays)} วัน` : diffDays === 0 ? 'วันนี้' : `${diffDays} วัน`}
    </span>
  );
}

// ── Card ───────────────────────────────────────────────────────────────
export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('bg-white rounded-xl border border-gray-200 shadow-sm', className)}>{children}</div>;
}

// ── Button ─────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
const BTN: Record<BtnVariant, string> = {
  primary:   'bg-brand text-white hover:bg-brand-light',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
  danger:    'bg-red-600 text-white hover:bg-red-700',
  ghost:     'text-gray-600 hover:bg-gray-100',
};
export function Button({
  children, variant = 'primary', className, disabled, onClick, type = 'button', size = 'md',
}: {
  children: React.ReactNode; variant?: BtnVariant; className?: string;
  disabled?: boolean; onClick?: () => void; type?: 'button'|'submit'|'reset'; size?: 'sm'|'md'|'lg';
}) {
  const sz = size === 'sm' ? 'px-3 py-1.5 text-sm' : size === 'lg' ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm';
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={clsx('rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed', sz, BTN[variant], className)}>
      {children}
    </button>
  );
}

// ── Input ──────────────────────────────────────────────────────────────
export function Input({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <input {...props}
        className={clsx('border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand',
          error ? 'border-red-400' : 'border-gray-300', props.className)} />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

// ── Select ─────────────────────────────────────────────────────────────
export function Select({ label, error, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <select {...props}
        className={clsx('border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand bg-white',
          error ? 'border-red-400' : 'border-gray-300', props.className)}>
        {children}
      </select>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="border-4 border-gray-200 border-t-brand rounded-full animate-spin"
        style={{ width: size, height: size }} />
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────
export function Empty({ message }: { message: string }) {
  return <div className="text-center py-16 text-gray-400">{message}</div>;
}
