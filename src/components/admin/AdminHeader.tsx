'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { ChevronDown, LogOut, User as UserIcon, UserRoundCog } from 'lucide-react';
import { cloudinaryImage } from '@/lib/media/cloudinary-url';

/**
 * Header của khu quản trị/nhân viên: tên thương hiệu và nút tài khoản. Cao cố định h-16 để sidebar dính ngay bên dưới.
 * Menu tài khoản gồm trang thông tin tài khoản và đăng xuất.
 */
export function AdminHeader({ home, logoUrl, logoAlt, userName, userRole }: {
  home: string; logoUrl?: string; logoAlt?: string; userName: string; userRole: string;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Đóng menu khi bấm ra ngoài.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return <header className="sticky top-0 z-40 h-16 border-b border-cream-200 bg-white shadow-sm">
    <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6">
      <Link href={home} className="flex items-center gap-2">
        {logoUrl
          ? <img src={cloudinaryImage(logoUrl, { width: 300 })} alt={logoAlt || "T'Petie"} className="h-9 w-auto object-contain" />
          : <span className="font-heading text-lg font-bold text-honey-700">T&apos;Petie</span>}
      </Link>

      <div ref={menuRef} className="relative">
        <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-haspopup="menu"
          className="flex min-h-11 items-center gap-2 rounded-full border border-cream-300 bg-white px-3 text-sm font-semibold text-charcoal-800 hover:border-honey-300">
          <UserIcon className="h-4 w-4 text-honey-600" />
          <span className="hidden max-w-[160px] truncate sm:inline">{userName}</span>
          <ChevronDown className={`h-3.5 w-3.5 text-charcoal-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && <div role="menu" className="absolute right-0 mt-2 w-60 origin-top-right rounded-2xl border border-cream-200 bg-white py-2 shadow-2xl motion-safe:animate-scale-up">
          <div className="border-b border-cream-100 px-4 py-2">
            <p className="truncate text-sm font-bold text-charcoal-900">{userName}</p>
            <p className="text-[11px] text-charcoal-500">{userRole === 'admin' ? 'Quản trị viên' : 'Nhân viên'}</p>
          </div>
          <Link href={`${home}/account`} role="menuitem" onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-charcoal-800 hover:bg-honey-50">
            <UserRoundCog className="h-4 w-4 text-honey-600" />
            Tài khoản của tôi
          </Link>
          <button type="button" role="menuitem" onClick={() => void signOut({ callbackUrl: '/' })}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-blush-700 hover:bg-blush-50">
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>}
      </div>
    </div>
  </header>;
}
