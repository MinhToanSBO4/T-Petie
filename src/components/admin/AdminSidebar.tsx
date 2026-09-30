'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

export type AdminNavItem = { href: string; label: string };

/** Điều hướng quản trị dùng chung cho mọi trang /admin/*; mục hiển thị theo vai trò. */
export function AdminSidebar({ items, userName, userRole }: {
  items: AdminNavItem[]; userName: string; userRole: string;
}) {
  const pathname = usePathname();
  return <nav aria-label="Điều hướng quản trị" className="flex flex-col gap-2">
    <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
      {items.map((item) => {
        const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
        return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}
          className={`shrink-0 rounded-xl px-4 py-3 text-sm font-semibold transition-colors lg:w-full ${
            active ? 'bg-honey-600 text-white shadow-sm' : 'bg-white text-charcoal-800 border border-cream-200 hover:border-honey-300 hover:text-honey-700'
          }`}>
          {item.label}
        </Link>;
      })}
    </div>

    <div className="mt-2 border-t border-cream-200 pt-3">
      <p className="px-2 text-xs font-semibold text-charcoal-800">{userName}</p>
      <p className="px-2 text-[11px] text-charcoal-500">{userRole === 'admin' ? 'Quản trị viên' : 'Nhân viên'}</p>
      <button type="button" onClick={() => void signOut({ callbackUrl: '/' })}
        className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl px-4 text-sm font-semibold text-blush-700 hover:bg-blush-50">
        <LogOut className="h-4 w-4" />
        Đăng xuất
      </button>
    </div>
  </nav>;
}
