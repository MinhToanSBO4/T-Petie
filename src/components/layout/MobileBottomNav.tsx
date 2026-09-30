'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Heart, Sparkles, Percent, ShoppingBag, Shirt } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { totalItems, openMiniCart } = useCart();

  const navItems = [
    { label: 'Trang Chủ', href: '/', icon: Home },
    { label: 'Sản Phẩm', href: '/girls', icon: Shirt },
    { label: 'Bộ Sưu Tập', href: '/collections', icon: Sparkles, badge: 'Mới' },
    { label: 'Ưu Đãi', href: '/sale', icon: Percent, badge: 'Hot' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-cream-200 px-2 py-1.5 md:hidden flex justify-around items-center shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            data-track={`mobile-nav-${item.href.replace('/', '') || 'home'}`}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all relative ${
              isActive ? 'text-honey-600 font-bold' : 'text-charcoal-600 hover:text-honey-600 font-medium'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              {item.badge && (
                <span className="absolute -top-1.5 -right-2 bg-honey-500 text-white text-[8px] font-bold px-1 py-0.2 rounded-full">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </Link>
        );
      })}

      {/* Nút Giỏ Hàng Nổi Trên Mobile */}
      <button
        onClick={openMiniCart}
        data-track="mobile-open-cart"
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl text-charcoal-600 hover:text-honey-600 font-medium relative"
      >
        <div className="relative">
          <ShoppingBag className="w-5 h-5" />
          {totalItems > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-honey-500 text-white text-[9px] font-bold min-w-4 h-4 rounded-full flex items-center justify-center px-1">
              {totalItems}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5">Giỏ ({totalItems})</span>
      </button>
    </div>
  );
}
