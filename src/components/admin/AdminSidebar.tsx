'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type AdminNavItem = { href: string; label: string };

/** Điều hướng quản trị dùng chung cho mọi trang /admin/*; mục hiển thị theo vai trò. */
export function AdminSidebar({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();
  return <nav aria-label="Điều hướng quản trị"
    className="mb-6 flex gap-2 overflow-x-auto pb-2 lg:mb-0 lg:flex-col lg:overflow-visible lg:pb-0">
    {items.map((item) => {
      const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
      return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}
        className={`shrink-0 rounded-xl px-4 py-3 text-sm font-semibold transition-colors lg:w-full ${
          active ? 'bg-honey-600 text-white shadow-sm' : 'bg-white text-charcoal-800 border border-cream-200 hover:border-honey-300 hover:text-honey-700'
        }`}>
        {item.label}
      </Link>;
    })}
  </nav>;
}
