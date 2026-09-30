'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type AdminNavItem = { href: string; label: string };

/**
 * Điều hướng chức năng của khu quản trị; mục hiển thị theo vai trò.
 * Luôn xếp dọc ở mọi kích thước màn hình để không bị đẩy lên thành hàng ngang.
 */
export function AdminSidebar({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();
  return <nav aria-label="Điều hướng quản trị" className="flex flex-col gap-2">
    {items.map((item) => {
      const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
      return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}
        className={`w-full rounded-xl px-3 py-3 text-sm font-semibold transition-colors sm:px-4 ${
          active ? 'bg-honey-600 text-white shadow-sm' : 'bg-white text-charcoal-800 border border-cream-200 hover:border-honey-300 hover:text-honey-700'
        }`}>
        {item.label}
      </Link>;
    })}
  </nav>;
}
