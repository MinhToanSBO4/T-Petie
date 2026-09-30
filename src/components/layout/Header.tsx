'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import {
  ShoppingBag,
  Search,
  Heart,
  X,
  User as UserIcon,
  LogOut,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { MAIN_NAV_ITEMS, type SubNavItem } from '@/lib/constants/navigation';

export function Header({ logoUrl, logoAlt, collectionNav = [] }: {
  logoUrl?: string; logoAlt?: string; collectionNav?: SubNavItem[];
} = {}) {
  const pathname = usePathname();
  const { totalItems, openMiniCart, cartBounceTrigger } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const [hidden, setHidden] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [hoveredNavIndex, setHoveredNavIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigation = MAIN_NAV_ITEMS.map((item) => item.href === '/collections'
    ? { ...item, children: collectionNav } : item);
  const { scrollY } = useScroll();
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Đóng user menu khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ẩn khi cuộn xuống, hiện khi cuộn lên
  useMotionValueEvent(scrollY, 'change', (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (latest > previous && latest > 120) {
      setHidden(true);
      setIsUserMenuOpen(false);
      setHoveredNavIndex(null);
    } else {
      setHidden(false);
    }
  });

  const handleMouseEnter = (index: number) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredNavIndex(index);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredNavIndex(null);
    }, 150);
  };

  return (
    <>
      {/* Header Chính */}
      <motion.header
        variants={{
          visible: { y: 0 },
          hidden: { y: '-100%' },
        }}
        animate={hidden ? 'hidden' : 'visible'}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="sticky top-0 z-50 bg-white border-b border-cream-200 shadow-sm"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo Brand (Ngoài cùng bên trái) */}
          <Link href="/" className="flex items-center group py-1">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={logoAlt || "T'Petie - Made for little souls"}
                className="h-10 sm:h-12 w-auto object-contain group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <span className="font-heading font-bold text-xl sm:text-2xl text-honey-700 group-hover:text-honey-600 transition-colors">T&apos;Petie</span>
            )}
          </Link>

          {/* Navigation Menu Desktop (Thứ tự: Trang Chủ | Về Chúng Tôi | Bộ Sưu Tập | Ưu Đãi) */}
          <nav className="hidden md:flex items-center space-x-6 lg:space-x-8 text-sm font-semibold">
            {navigation.map((item, index) => {
              const isExactActive = pathname === item.href;
              const isSubActive = item.href !== '/' && pathname.startsWith(item.href);
              const isActive = isExactActive || isSubActive;
              const hasChildren = Boolean(item.children && item.children.length > 0);
              const isHovered = hoveredNavIndex === index;

              return (
                <div
                  key={item.href}
                  className="relative group py-2"
                  onMouseEnter={() => handleMouseEnter(index)}
                  onMouseLeave={handleMouseLeave}
                >
                  <Link
                    href={item.href}
                    onClick={() => setHoveredNavIndex(null)}
                    className={`relative flex items-center space-x-1.5 py-1 transition-colors ${
                      isActive ? 'text-honey-600 font-bold' : 'text-charcoal-700 hover:text-honey-600'
                    }`}
                  >
                    {item.icon === 'Heart' && (
                      <Heart className="w-3.5 h-3.5 text-blush-500 fill-blush-100" />
                    )}
                    <span>{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-bold text-white px-1.5 py-0.2 rounded-full leading-tight shadow-2xs ${
                          item.badgeColor || 'bg-honey-500'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {hasChildren && (
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-charcoal-400 transition-transform duration-200 ${
                          isHovered ? 'rotate-180 text-honey-600' : 'group-hover:text-honey-600'
                        }`}
                      />
                    )}

                    {isActive && (
                      <motion.div
                        layoutId="nav-underline"
                        className="absolute left-0 right-0 -bottom-1 h-0.5 bg-honey-500 rounded-full"
                      />
                    )}
                  </Link>

                  {/* Sub-menu (Dropdown) khi hover - 100% Solid White, Shadow Đậm, Z-index Cao, Độ Tương Phản Tốt */}
                  {hasChildren && (
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.97 }}
                          transition={{ duration: 0.16, ease: 'easeOut' }}
                          className="absolute left-0 top-full pt-1.5 z-50 min-w-[220px] max-w-[260px]"
                        >
                          <div className="bg-white rounded-2xl shadow-2xl border border-cream-300/90 ring-1 ring-black/5 p-1.5 space-y-0.5">
                            {item.children?.map((sub) => {
                              const isSubCurrent = pathname === sub.href;
                              return (
                                <Link
                                  key={sub.href}
                                  href={sub.href}
                                  onClick={() => setHoveredNavIndex(null)}
                                  className={`group/sub flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
                                    isSubCurrent
                                      ? 'bg-honey-50 text-honey-900 font-bold'
                                      : 'hover:bg-cream-100 text-charcoal-800 hover:text-honey-700'
                                  }`}
                                >
                                  <span className="text-xs font-semibold leading-tight text-charcoal-900 group-hover/sub:text-honey-700">
                                    {sub.label}
                                  </span>
                                  {sub.badge && (
                                    <span className="text-[9px] font-bold bg-honey-100 text-honey-800 px-1.5 py-0.5 rounded-full ml-2 shrink-0">
                                      {sub.badge}
                                    </span>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Action Icons (Right Actions) */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* TÌM KIẾM: Giữ nguyên icon kính lúp */}
            <button
              onClick={() => setIsSearchOpen(true)}
              data-track="open-search"
              className="p-2 rounded-full hover:bg-cream-100 text-charcoal-700 transition-colors"
              aria-label="Tìm kiếm sản phẩm"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* TÀI KHOẢN: Nút "Tài Khoản" chuẩn hoá / User Dropdown */}
            {isAuthenticated && user ? (
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-1.5 p-1 sm:px-2.5 sm:py-1 rounded-full bg-cream-100 hover:bg-honey-100 border border-cream-300 transition-all text-xs font-bold text-charcoal-800"
                >
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-tr from-amber-400 to-rose-300 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      (user.name || 'Q').charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="hidden md:inline max-w-[140px] truncate">
                    👤 {user.name || "Mẹ T'Petie"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-charcoal-400" />
                </button>

                {/* Dropdown Menu Tài Khoản Đã Đăng Nhập */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-cream-300/90 ring-1 ring-black/5 py-2 z-50 animate-scale-up">
                    <div className="px-3.5 py-2 border-b border-cream-100">
                      <p className="text-xs font-bold text-charcoal-900 truncate">{user.name || "Mẹ T'Petie"}</p>
                      {user.email && <p className="text-[10px] text-charcoal-500 font-mono truncate">{user.email}</p>}
                    </div>

                    <div className="py-1 text-xs text-charcoal-900">
                      {user.role !== 'user' && (
                        <Link
                          href={user.role === 'admin' ? '/admin' : '/admin/products'}
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center space-x-2 px-3.5 py-2 hover:bg-honey-50 font-bold text-honey-700"
                        >
                          <ShieldCheck className="w-4 h-4 text-honey-600" />
                          <span>Trang quản trị</span>
                        </Link>
                      )}
                      <Link
                        href="/dashboard"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center space-x-2 px-3.5 py-2 hover:bg-cream-100 font-semibold text-charcoal-900"
                      >
                        <UserIcon className="w-4 h-4 text-honey-600" />
                        <span>Thông tin cá nhân</span>
                      </Link>
                    </div>

                    <div className="pt-1 border-t border-cream-100">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-blush-600 hover:bg-blush-50 text-left transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full border border-cream-300 hover:border-honey-300 bg-white hover:bg-cream-50 text-xs font-bold text-charcoal-700 transition-all active:scale-95 shadow-2xs"
              >
                <UserIcon className="w-3.5 h-3.5 text-honey-600" />
                <span className="hidden sm:inline">Tài Khoản</span>
              </Link>
            )}

            {/* GIỎ HÀNG: Giữ nguyên text "Giỏ hàng", icon và badge số lượng đếm */}
            <motion.button
              key={cartBounceTrigger}
              animate={cartBounceTrigger > 0 ? { scale: [1, 1.25, 0.95, 1.1, 1] } : {}}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              onClick={openMiniCart}
              data-track="open-mini-cart"
              className="relative flex items-center space-x-1.5 bg-cream-100 hover:bg-honey-100 border border-cream-300 px-3 py-1.5 rounded-full transition-colors active:scale-95"
              aria-label="Mở giỏ hàng"
            >
              <ShoppingBag className="w-4 h-4 text-honey-600" />
              <span className="text-xs font-bold text-charcoal-800 hidden sm:inline">Giỏ hàng</span>
              <span className="bg-honey-500 text-white rounded-full min-w-5 h-5 px-1.5 text-[11px] font-bold flex items-center justify-center">
                {totalItems}
              </span>
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Modal Tìm Kiếm Nhanh */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/40 backdrop-blur-sm flex items-start justify-center pt-16 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg bg-white rounded-3xl p-5 shadow-2xl border border-cream-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <h3 className="font-heading font-bold text-charcoal-900 text-sm">Tìm Kiếm Đồ Cho Bé Yêu</h3>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-1 rounded-full hover:bg-cream-100 text-charcoal-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) {
                  setIsSearchOpen(false);
                  window.location.href = `/girls?q=${encodeURIComponent(searchQuery.trim())}`;
                }
              }}
              className="mt-4 relative"
            >
              <input
                type="text"
                placeholder="Nhập tên váy, áo sơ mi, chất vải organic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-cream-50 border border-cream-300 text-sm focus:outline-none focus:border-honey-500"
              />
              <button type="submit" aria-label="Thực hiện tìm kiếm" className="absolute left-3.5 top-3.5 hover:text-honey-600 transition-colors">
                <Search className="w-4 h-4 text-charcoal-400 hover:text-honey-600" />
              </button>
            </form>
            <div className="mt-4">
              <span className="text-xs font-semibold text-charcoal-600 block mb-2">Gợi ý tìm kiếm phổ biến:</span>
              <div className="flex flex-wrap gap-2">
                {['Váy công chúa', 'Áo cổ sen', 'Quần bloomer', 'Thô đũi organic', 'Đồ sơ sinh'].map((keyword) => (
                  <button
                    key={keyword}
                    onClick={() => {
                      setSearchQuery(keyword);
                      setIsSearchOpen(false);
                      window.location.href = `/girls?q=${encodeURIComponent(keyword)}`;
                    }}
                    className="text-xs px-3 py-1.5 rounded-full bg-cream-100 hover:bg-honey-100 text-charcoal-700 font-medium transition-colors"
                  >
                    🔍 {keyword}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
