/**
 * Cấu hình Navigation cho Header Desktop & Mobile Bottom Bar
 */

export interface SubNavItem {
  label: string;
  href: string;
  description?: string;
  badge?: string;
}

export interface NavItem {
  label: string;
  href: string;
  badge?: string;
  badgeColor?: string;
  icon?: string;
  children?: SubNavItem[];
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  {
    label: 'Trang Chủ',
    href: '/',
    children: [
      { label: 'Bộ Sưu Tập Nổi Bật', href: '/#collections' },
      { label: 'Sản Phẩm Bán Chạy Nhất', href: '/#best-seller' },
      { label: 'Ưu Đãi Độc Quyền', href: '/#flash-sale' },
    ],
  },
  {
    label: 'Sản Phẩm',
    href: '/girls',
    children: [
      { label: 'Tất cả sản phẩm', href: '/girls' },
      { label: 'Áo bé gái', href: '/girls/tops' },
      { label: 'Quần bé gái', href: '/girls/bottoms' },
      { label: 'Váy bé gái', href: '/girls/dresses' },
      { label: 'Set đồ', href: '/girls/sets' },
    ],
  },
  {
    label: 'Bộ Sưu Tập',
    href: '/collections',
    children: [],
  },
  {
    label: 'Ưu Đãi',
    href: '/sale',
    badge: 'Hot',
    badgeColor: 'bg-blush-500',
  },
  {
    label: 'Về Chúng Tôi',
    href: '/about',
  },
];

export const MOBILE_BOTTOM_NAV: NavItem[] = [
  { label: 'Trang Chủ', href: '/', icon: 'Home' },
  { label: 'Sản Phẩm', href: '/girls', icon: 'Shirt' },
  { label: 'Bộ Sưu Tập', href: '/collections', icon: 'Sparkles' },
  { label: 'Ưu Đãi', href: '/sale', icon: 'Percent', badge: 'Hot' },
  { label: 'Về Chúng Tôi', href: '/about', icon: 'Heart' },
];
