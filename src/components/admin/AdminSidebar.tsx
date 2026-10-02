'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3, Download, FolderHeart, Home, LayoutTemplate, MessageSquareHeart, Package, Settings, ShoppingBag,
  Star, UserCog, Users, type LucideIcon,
} from 'lucide-react';

const ICONS = {
  dashboard: BarChart3, home: Home, orders: ShoppingBag, products: Package, collections: FolderHeart, content: LayoutTemplate,
  customers: Users, reviews: Star, feedback: MessageSquareHeart, staff: UserCog, settings: Settings, exports: Download,
} satisfies Record<string, LucideIcon>;

/** `badge`: số việc đang chờ (ví dụ đơn cần xử lý), hiện cạnh mục để nhắc mà không phải mở trang. */
export type AdminNavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number };

/**
 * Điều hướng chức năng của khu quản trị/nhân viên; mục hiển thị theo vai trò.
 * Luôn xếp dọc ở mọi kích thước màn hình. Trên điện thoại thu gọn thành thanh biểu tượng
 * kèm nhãn nhỏ (kiểu navigation rail) để nhường chỗ cho nội dung.
 */
export function AdminSidebar({ items, home }: { items: AdminNavItem[]; home: string }) {
  const pathname = usePathname();
  return <nav aria-label="Điều hướng quản trị" className="flex flex-col gap-1">
    {items.map((item) => {
      // Trang chủ khu chỉ sáng khi đang ở đúng trang đó, không sáng theo mọi trang con.
      const active = item.href === home ? pathname === home : pathname === item.href || pathname.startsWith(`${item.href}/`);
      const Icon = ICONS[item.icon];
      const badge = item.badge ? (item.badge > 99 ? '99+' : String(item.badge)) : null;
      return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}
        className={`group relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-[10px] font-semibold leading-tight transition-colors duration-200
          sm:flex-row sm:justify-start sm:gap-3 sm:px-3 sm:text-left sm:text-sm ${active
            ? 'bg-honey-100 text-honey-800'
            : 'text-charcoal-600 hover:bg-honey-50 hover:text-honey-800'}`}>
        {/* Vạch chỉ mục đang mở: thêm tín hiệu ngoài màu nền. */}
        <span aria-hidden className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-honey-600 transition-opacity duration-200 ${active ? 'opacity-100' : 'opacity-0'}`} />
        <Icon className={`h-5 w-5 shrink-0 transition-transform duration-200 motion-safe:group-hover:scale-110 ${active ? 'text-honey-700' : 'text-charcoal-500 group-hover:text-honey-700'}`} aria-hidden />
        <span className="break-words">{item.label}</span>
        {badge && <span className="absolute right-1 top-1 min-w-5 rounded-full bg-honey-600 px-1.5 text-center text-[10px] font-bold leading-5 text-white tabular-nums sm:static sm:ml-auto sm:text-xs">
          {badge}<span className="sr-only"> việc đang chờ</span>
        </span>}
      </Link>;
    })}
  </nav>;
}
