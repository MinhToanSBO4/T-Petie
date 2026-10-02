/**
 * Module tập trung xử lý đo lường Analytics (GA4, Microsoft Clarity)
 * Đảm bảo an toàn khi chạy trên môi trường SSR (Next.js)
 * Sự kiện thương mại điện tử theo chuẩn GA4: luôn kèm `currency` và mảng `items`, nếu không GA4 bỏ qua giá trị.
 */

import { EventName, AnalyticsEventParams, GA4Item, LoginMethod } from '@/types/analytics';

export type { LoginMethod };

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

const CURRENCY = 'VND';

/**
 * Gửi sự kiện chung tới GA4 (và Clarity). Không làm gì khi GA4 chưa được tải: chưa cấu hình mã đo lường,
 * hoặc người xem là admin/nhân viên (xem GoogleAnalytics).
 */
export function trackEvent(eventName: EventName, params?: AnalyticsEventParams) {
  if (typeof window === 'undefined') return;

  // Log ra console trong môi trường phát triển để dev dễ debug
  if (process.env.NODE_ENV === 'development') {
    console.log(`📊 [Analytics Track] -> ${eventName}`, params);
  }

  // GA4 gtag event
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }

  // Microsoft Clarity custom event
  if (typeof window.clarity === 'function') {
    window.clarity('event', eventName);
  }
}

/**
 * Đo lường khi xem chi tiết sản phẩm
 */
export function trackViewItem(product: {
  id: string;
  name: string;
  category: string;
  price: number;
}) {
  trackEvent('view_item', {
    currency: CURRENCY,
    value: product.price,
    items: [{ item_id: product.id, item_name: product.name, item_category: product.category, price: product.price, quantity: 1 }],
  });
}

/**
 * Đo lường khi bấm Thêm vào giỏ hàng
 */
export function trackAddToCart(item: {
  id: string;
  name: string;
  size: string;
  price: number;
  quantity: number;
}) {
  trackEvent('add_to_cart', {
    currency: CURRENCY,
    value: item.price * item.quantity,
    items: [{ item_id: item.id, item_name: item.name, item_variant: item.size, price: item.price, quantity: item.quantity }],
  });
}

/**
 * Đo lường khi tiến hành thanh toán
 */
export function trackBeginCheckout(items: GA4Item[], totalValue: number) {
  trackEvent('begin_checkout', {
    currency: CURRENCY,
    value: totalValue,
    items,
  });
}

/**
 * Đo lường khi đặt hàng thành công. GA4 gộp các lần gửi trùng `transaction_id` (ví dụ gửi lại cùng đơn).
 */
export function trackPurchase(orderId: string, totalValue: number, items: GA4Item[]) {
  trackEvent('purchase', {
    transaction_id: orderId,
    currency: CURRENCY,
    value: totalValue,
    items,
  });
}

/**
 * Đo lường khi mở modal đăng nhập
 */
export function trackLoginModalOpen(triggerSource: string = 'header') {
  trackEvent('login_modal_open', {
    source: triggerSource,
  });
}

/**
 * Đo lường khi đăng nhập thành công (Google / Facebook / Password)
 */
export function trackLogin(method: LoginMethod, userId?: string) {
  trackEvent('login', {
    method,
    user_id: userId,
  });
}

/**
 * Đo lường khi người dùng đăng xuất
 */
export function trackLogout() {
  trackEvent('logout');
}

