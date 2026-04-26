'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth.store';
import { LayoutDashboard, Ticket, Users, LogOut, Sun, Bell, PlusCircle } from 'lucide-react';
import clsx from 'clsx';

const NAV = [
  { href: '/dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/tickets',   label: 'Tickets',       icon: Ticket },
  { href: '/tickets/new', label: 'สร้าง Ticket', icon: PlusCircle },
  { href: '/customers', label: 'ลูกค้า',        icon: Users },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-brand flex flex-col flex-shrink-0">
        <div className="p-4 flex items-center gap-2 border-b border-white/10">
          <Sun className="text-amber-400" size={22} />
          <span className="text-white font-bold text-lg tracking-tight">Solar CRM</span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={clsx('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname === href || (href !== '/dashboard' && pathname.startsWith(href) && href !== '/tickets/new')
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white')}>
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="text-white/70 text-xs mb-2 px-1">{user?.name}</div>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 text-sm transition-colors">
            <LogOut size={14} />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <h1 className="text-sm text-gray-500">
            {NAV.find(n => n.href === pathname)?.label || 'Solar CRM'}
          </h1>
          <div className="flex items-center gap-3">
            <button className="text-gray-400 hover:text-gray-600 relative">
              <Bell size={18} />
            </button>
            <div className="text-sm text-gray-700 font-medium">{user?.name}</div>
            <div className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded-full">{user?.role}</div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
