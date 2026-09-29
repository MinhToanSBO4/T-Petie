/**
 * Module tập trung xử lý đo lường Analytics (GA4, GTM, Microsoft Clarity)
 * Đảm bảo an toàn khi chạy trên môi trường SSR (Next.js)
 */

import { EventName, AnalyticsEventParams, GA4Item, LoginMethod } from '@/types/analytics';

export type { LoginMethod };

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

/**
 * Gửi sự kiện chung tới GTM & GA4
 */
export function trackEvent(eventName: EventName, params?: AnalyticsEventParams) {
  if (typeof window === 'undefined') return;

  // Log ra console trong môi trường phát triển để dev dễ debug
  if (process.env.NODE_ENV === 'development') {
    console.log(`📊 [Analytics Track] -> ${eventName}`, params);
  }

  // GTM dataLayer push
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...params,
  });

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
    item_id: product.id,
    item_name: product.name,
    item_category: product.category,
    price: product.price,
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
    item_id: item.id,
    item_name: item.name,
    item_variant: item.size,
    price: item.price,
    quantity: item.quantity,
    value: item.price * item.quantity,
  });
}

/**
 * Đo lường khi tiến hành thanh toán
 */
export function trackBeginCheckout(items: GA4Item[], totalValue: number) {
  trackEvent('begin_checkout', {
    value: totalValue,
    items,
  });
}

/**
 * Đo lường khi hoàn tất thanh toán giả lập
 */
export function trackPurchase(orderId: string, totalValue: number, items: GA4Item[]) {
  trackEvent('purchase', {
    transaction_id: orderId,
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

