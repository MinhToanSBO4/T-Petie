const amount = (value: unknown, max: number) => Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= max;

/**
 * Ngày hiệu lực tùy chọn; trả về null khi để trống. Giao diện gửi mốc ISO có múi giờ. Chuỗi không có múi giờ
 * (giá trị thô của ô datetime-local, "2026-10-31T23:59") được hiểu là giờ Việt Nam: máy chủ Vercel chạy UTC,
 * đọc như giờ máy chủ làm mã hết hạn trễ 7 tiếng và mỗi lần lưu lại lệch thêm 7 tiếng.
 */
export function optionalDate(value: unknown): Date | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 40) throw new Error('Thông tin mã giảm giá không hợp lệ');
  const local = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(value);
  const date = new Date(local ? `${value}+07:00` : value);
  if (Number.isNaN(date.getTime())) throw new Error('Thông tin mã giảm giá không hợp lệ');
  return date;
}

/** Giới hạn lượt dùng tùy chọn; trả về null khi để trống. */
function optionalUsageLimit(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 1_000_000) {
    throw new Error('Thông tin mã giảm giá không hợp lệ');
  }
  return Number(value);
}

export function parseCommerceSettings(input: Record<string, unknown>) {
  if (!amount(input.shippingFee, 1_000_000) || !amount(input.freeShippingThreshold, 100_000_000)) {
    throw new Error('Phí vận chuyển hoặc ngưỡng miễn phí không hợp lệ');
  }
  return { shippingFee: BigInt(Number(input.shippingFee)), freeShippingThreshold: BigInt(Number(input.freeShippingThreshold)) };
}

export function parseCouponInput(input: Record<string, unknown>) {
  const code = typeof input.code === 'string' ? input.code.trim().toUpperCase() : '';
  if (!/^[A-Z0-9_-]{3,30}$/.test(code) ||
      (input.type !== 'FIXED' && input.type !== 'PERCENT') ||
      !amount(input.value, input.type === 'PERCENT' ? 100 : 100_000_000) || Number(input.value) < 1 ||
      !amount(input.minSubtotal, 100_000_000) ||
      typeof input.active !== 'boolean' || typeof input.requiresLogin !== 'boolean') {
    throw new Error('Thông tin mã giảm giá không hợp lệ');
  }
  const startsAt = optionalDate(input.startsAt);
  const expiresAt = optionalDate(input.expiresAt);
  if (startsAt && expiresAt && startsAt >= expiresAt) throw new Error('Thời gian hiệu lực của mã giảm giá không hợp lệ');
  return { code, type: input.type, value: Number(input.value), minSubtotal: BigInt(Number(input.minSubtotal)),
    active: input.active, requiresLogin: input.requiresLogin,
    startsAt, expiresAt, usageLimit: optionalUsageLimit(input.usageLimit) };
}
