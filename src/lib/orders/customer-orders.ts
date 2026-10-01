import type { OrderStatus } from './status';

/**
 * Các tab của trang Đơn mua, chia theo việc khách cần làm (tham khảo Shopee/Lazada):
 * chờ shop xác nhận, đang chuẩn bị, đang giao, chờ đánh giá, đã xong, đã hủy.
 */
export const CUSTOMER_ORDER_TABS = [
  { id: 'all', label: 'Tất cả', statuses: null },
  { id: 'pending', label: 'Chờ xác nhận', statuses: ['PENDING'] },
  { id: 'preparing', label: 'Đang chuẩn bị', statuses: ['CONFIRMED', 'PROCESSING'] },
  { id: 'shipping', label: 'Đang giao', statuses: ['SHIPPING'] },
  { id: 'to-review', label: 'Chờ đánh giá', statuses: ['COMPLETED'] },
  { id: 'completed', label: 'Hoàn tất', statuses: ['COMPLETED'] },
  { id: 'cancelled', label: 'Đã hủy', statuses: ['CANCELLED'] },
] as const satisfies readonly { id: string; label: string; statuses: readonly OrderStatus[] | null }[];

export type CustomerOrderTab = (typeof CUSTOMER_ORDER_TABS)[number]['id'];
export type CustomerOrderCounts = Record<CustomerOrderTab, number>;

export function parseOrderTab(value: string | null | undefined): CustomerOrderTab {
  return CUSTOMER_ORDER_TABS.find((tab) => tab.id === value)?.id || 'all';
}

export function tabStatuses(tab: CustomerOrderTab): readonly OrderStatus[] | null {
  return CUSTOMER_ORDER_TABS.find((entry) => entry.id === tab)?.statuses || null;
}

/** Số đơn của từng tab từ số đơn theo trạng thái; tab chờ đánh giá được đếm riêng. */
export function countOrderTabs(byStatus: Partial<Record<string, number>>, toReview: number): CustomerOrderCounts {
  const sum = (statuses: readonly string[] | null) => statuses
    ? statuses.reduce((total, status) => total + (byStatus[status] || 0), 0)
    : Object.values(byStatus).reduce<number>((total, count) => total + (count || 0), 0);
  return Object.fromEntries(CUSTOMER_ORDER_TABS.map((tab) =>
    [tab.id, tab.id === 'to-review' ? toReview : sum(tab.statuses)])) as CustomerOrderCounts;
}

const FLOW: { status: OrderStatus; label: string }[] = [
  { status: 'PENDING', label: 'Đặt hàng thành công' },
  { status: 'CONFIRMED', label: 'Shop đã xác nhận' },
  { status: 'PROCESSING', label: 'Đang chuẩn bị hàng' },
  { status: 'SHIPPING', label: 'Đang giao hàng' },
  { status: 'COMPLETED', label: 'Đã nhận hàng' },
];

export type TimelineStep = { status: OrderStatus; label: string; at: string | null; state: 'done' | 'current' | 'upcoming' };

/**
 * Dòng thời gian hành trình đơn: các bước đã qua có thời gian lấy từ lịch sử trạng thái,
 * bước hiện tại được đánh dấu, các bước sau để mờ. Đơn hủy chỉ hiện các bước đã đi qua rồi bước hủy.
 */
export function buildOrderTimeline(status: string, events: { status: string; createdAt: Date | string }[],
  createdAt: Date | string): TimelineStep[] {
  const firstAt = (target: string) => {
    const event = events.find((entry) => entry.status === target);
    if (event) return new Date(event.createdAt).toISOString();
    return target === 'PENDING' ? new Date(createdAt).toISOString() : null;
  };
  if (status === 'CANCELLED') {
    const reached = FLOW.filter((step) => step.status === 'PENDING' || events.some((event) => event.status === step.status));
    return [...reached.map((step) => ({ ...step, at: firstAt(step.status), state: 'done' as const })),
      { status: 'CANCELLED', label: 'Đơn đã hủy', at: firstAt('CANCELLED'), state: 'current' }];
  }
  const index = Math.max(0, FLOW.findIndex((step) => step.status === status));
  return FLOW.map((step, position) => ({
    ...step,
    at: position <= index ? firstAt(step.status) : null,
    state: position < index || status === 'COMPLETED' ? 'done' : position === index ? 'current' : 'upcoming',
  }));
}
