/**
 * Utilities định dạng tiền tệ, chuỗi và xử lý giao diện
 */

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

export function formatPriceCompact(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}đ`;
}

/** Số tiền rút gọn cho trục biểu đồ và thẻ số liệu: 850k, 12,5 tr, 1,2 tỷ. */
export function formatVNDShort(amount: number): string {
  const units: [number, string][] = [[1e9, ' tỷ'], [1e6, ' tr'], [1e3, 'k']];
  const unit = units.find(([size]) => Math.abs(amount) >= size);
  if (!unit) return `${amount.toLocaleString('vi-VN')}đ`;
  return `${(amount / unit[0]).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}${unit[1]}`;
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
