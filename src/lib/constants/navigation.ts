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
    href: '/be-gai',
    children: [
      { label: 'Tất cả sản phẩm', href: '/be-gai' },
      { label: 'Áo bé gái', href: '/be-gai/ao' },
      { label: 'Quần bé gái', href: '/be-gai/quan' },
      { label: 'Váy bé gái', href: '/be-gai/vay' },
      { label: 'Set đồ', href: '/be-gai/set-do' },
    ],
  },
  {
    label: 'Bộ Sưu Tập',
    href: '/bo-suu-tap',
    badge: 'Mới',
    badgeColor: 'bg-honey-500',
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
    href: '/ve-chung-toi',
  },
];

export const MOBILE_BOTTOM_NAV: NavItem[] = [
  { label: 'Trang Chủ', href: '/', icon: 'Home' },
  { label: 'Sản Phẩm', href: '/be-gai', icon: 'Shirt' },
  { label: 'Bộ Sưu Tập', href: '/bo-suu-tap', icon: 'Sparkles', badge: 'Mới' },
  { label: 'Ưu Đãi', href: '/sale', icon: 'Percent', badge: 'Hot' },
  { label: 'Về Chúng Tôi', href: '/ve-chung-toi', icon: 'Heart' },
];
