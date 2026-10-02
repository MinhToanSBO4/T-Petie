import { Check } from 'lucide-react';
import type { TimelineStep } from '@/lib/orders/customer-orders';
import { formatDateVN } from '@/lib/utils/formatters';

/**
 * Hành trình đơn hàng: ngang trên máy tính, dọc trên điện thoại. Bước đã qua có dấu tích và thời gian,
 * bước hiện tại được tô đậm, bước sau để mờ.
 */
export function OrderTimeline({ steps }: { steps: TimelineStep[] }) {
  const connector = (next: TimelineStep) => next.status === 'CANCELLED' ? 'bg-blush-300'
    : next.state !== 'upcoming' ? 'bg-sage-500' : 'bg-cream-300';
  return <ol className="flex flex-col gap-0 sm:flex-row" aria-label="Hành trình đơn hàng">
    {steps.map((step, index) => {
      const reached = step.state !== 'upcoming';
      const isCancel = step.status === 'CANCELLED';
      const dot = isCancel ? 'bg-blush-500 text-white' : reached ? 'bg-sage-600 text-white' : 'bg-white text-charcoal-400 ring-2 ring-cream-300';
      return <li key={step.status} aria-current={step.state === 'current' ? 'step' : undefined}
        className="relative flex flex-1 gap-3 pb-5 last:pb-0 sm:flex-col sm:items-center sm:gap-2 sm:pb-0 sm:text-center">
        {index < steps.length - 1 && <span aria-hidden className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 sm:left-[calc(50%+18px)] sm:top-[15px] sm:h-0.5 sm:w-[calc(100%-36px)] ${
          connector(steps[index + 1])}`} />}
        <span className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${dot}`}>
          {reached && !isCancel ? <Check className="size-4" aria-hidden /> : isCancel ? '×' : index + 1}
        </span>
        <span className="min-w-0 pt-1 sm:pt-0">
          <span className={`block text-sm ${step.state === 'current' ? 'font-bold text-charcoal-900' : reached ? 'font-semibold text-charcoal-800' : 'text-charcoal-500'}`}>
            {step.label}
          </span>
          {step.at && <time dateTime={step.at} className="block text-xs text-charcoal-500">{formatDateVN(step.at, true)}</time>}
        </span>
      </li>;
    })}
  </ol>;
}
