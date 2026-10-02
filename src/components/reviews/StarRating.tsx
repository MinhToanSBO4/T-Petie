import { Star } from 'lucide-react';

/** Hiển thị số sao (có hỗ trợ nửa sao cho điểm trung bình), kèm nhãn cho trình đọc màn hình. */
export function StarRating({ value, size = 'size-4', className = 'text-honey-500' }: {
  value: number; size?: string; className?: string;
}) {
  const rounded = Math.round(value * 2) / 2;
  return <span role="img" aria-label={`${value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} trên 5 sao`}
    className={`inline-flex items-center gap-0.5 ${className}`}>
    {[1, 2, 3, 4, 5].map((star) => {
      const fill = rounded >= star ? 'full' : rounded >= star - 0.5 ? 'half' : 'empty';
      return <span key={star} className={`relative inline-block ${size}`} aria-hidden>
        <Star className={`absolute inset-0 ${size} text-cream-300`} fill="currentColor" strokeWidth={0} />
        {fill !== 'empty' && <span className={`absolute inset-0 overflow-hidden ${fill === 'half' ? 'w-1/2' : 'w-full'}`}>
          <Star className={size} fill="currentColor" strokeWidth={0} />
        </span>}
      </span>;
    })}
  </span>;
}
