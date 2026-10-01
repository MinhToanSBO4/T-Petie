import Link from 'next/link';
import { CUSTOMER_ORDER_TABS, type CustomerOrderCounts, type CustomerOrderTab } from '@/lib/orders/customer-orders';

/** Thanh tab trạng thái của trang Đơn mua; cuộn ngang trên điện thoại, mỗi tab kèm số đơn. */
export function OrderTabs({ active, counts }: { active: CustomerOrderTab; counts: CustomerOrderCounts }) {
  return <nav aria-label="Lọc đơn theo trạng thái" className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
    <ul className="flex min-w-max gap-2 border-b border-cream-200 pb-3">
      {CUSTOMER_ORDER_TABS.map((tab) => {
        const current = tab.id === active;
        const count = counts[tab.id];
        const highlight = tab.id === 'to-review' && count > 0;
        return <li key={tab.id}>
          <Link href={tab.id === 'all' ? '/orders' : `/orders?tab=${tab.id}`} aria-current={current ? 'page' : undefined} scroll={false}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors ${current
              ? 'bg-charcoal-900 text-white' : 'bg-white text-charcoal-700 ring-1 ring-cream-200 hover:bg-cream-100'}`}>
            {tab.label}
            {count > 0 && <span className={`grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold ${current
              ? 'bg-white/20 text-white' : highlight ? 'bg-blush-500 text-white' : 'bg-cream-200 text-charcoal-700'}`}>{count}</span>}
          </Link>
        </li>;
      })}
    </ul>
  </nav>;
}
