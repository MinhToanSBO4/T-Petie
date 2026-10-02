/**
 * Module tập trung xử lý đo lường Analytics (GA4, Microsoft Clarity)
 * Đảm bảo an toàn khi chạy trên môi trường SSR (Next.js)
 * Sự kiện thương mại điện tử theo chuẩn GA4: luôn kèm `currency` và mảng `items`, nếu không GA4 bỏ qua giá trị.
 */

import { EventName, AnalyticsEventParams, GA4Item, LoginMethod } from '@/types/analytics';

export type { LoginMethod };

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

const CURRENCY = 'VND';
const MAX_QUEUED_EVENTS = 50;
const queuedEvents: [EventName, AnalyticsEventParams | undefined][] = [];

/**
 * Gửi sự kiện chung tới GA4 (và Clarity). GA4 khởi tạo sau khi biết phiên đăng nhập (xem GoogleAnalytics), nên sự kiện
 * phát sinh trước đó (ví dụ view_item khi vừa mở trang sản phẩm) được giữ lại và gửi ngay khi GA4 sẵn sàng. Với admin/
 * nhân viên hoặc khi chưa cấu hình mã đo lường, GA4 không khởi tạo và hàng đợi không bao giờ được gửi.
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
  } else if (queuedEvents.length < MAX_QUEUED_EVENTS) {
    queuedEvents.push([eventName, params]);
  }

  // Microsoft Clarity custom event
  if (typeof window.clarity === 'function') {
    window.clarity('event', eventName);
  }
}

/**
 * Khởi tạo GA4 (gtag + config, lượt xem trang đầu tiên) rồi gửi các sự kiện đang chờ. Gọi từ GoogleAnalytics khi đã
 * xác định người xem là khách; gọi lại nhiều lần không khởi tạo lại.
 */
export function initGoogleAnalytics(measurementId: string) {
  if (typeof window === 'undefined' || typeof window.gtag === 'function') return;
  const dataLayer = (window.dataLayer = window.dataLayer || []);
  // gtag.js chỉ xử lý đối tượng `arguments` trong dataLayer, nên dùng function thường như đoạn mã chuẩn của Google.
  window.gtag = function gtag() {
    dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId);
  for (const [eventName, params] of queuedEvents.splice(0)) window.gtag('event', eventName, params);
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

