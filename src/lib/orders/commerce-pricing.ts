export type ShippingPolicy = { shippingFee: number; freeShippingThreshold: number };
export type CouponRule = {
  code: string;
  type: string;
  value: number;
  minSubtotal: number;
  active: boolean;
  requiresLogin: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
};

export function calculateTotals(subtotal: number, policy: ShippingPolicy, coupon: CouponRule | null, authenticated: boolean, now = new Date()) {
  if (!Number.isSafeInteger(subtotal) || subtotal < 0 ||
      !Number.isSafeInteger(policy.shippingFee) || policy.shippingFee < 0 ||
      !Number.isSafeInteger(policy.freeShippingThreshold) || policy.freeShippingThreshold < 0) {
    throw new Error('Giá trị thanh toán không hợp lệ');
  }
  const shippingFee = subtotal >= policy.freeShippingThreshold ? 0 : policy.shippingFee;
  let discount = 0;
  if (coupon) {
    if (!coupon.active) throw new Error('Mã giảm giá không hợp lệ');
    if (coupon.startsAt && now < coupon.startsAt) throw new Error('Mã giảm giá chưa có hiệu lực');
    if (coupon.expiresAt && now > coupon.expiresAt) throw new Error('Mã giảm giá đã hết hạn');
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) throw new Error('Mã giảm giá đã hết lượt sử dụng');
    if (subtotal < coupon.minSubtotal) throw new Error('Đơn hàng chưa đạt giá trị tối thiểu của mã giảm giá');
    if (coupon.requiresLogin && !authenticated) throw new Error('Vui lòng đăng nhập để dùng mã giảm giá');
    if (coupon.type === 'FIXED') discount = coupon.value;
    else if (coupon.type === 'PERCENT') discount = Math.round(subtotal * coupon.value / 100);
    else throw new Error('Mã giảm giá không hợp lệ');
    if (!Number.isSafeInteger(discount) || discount < 0) throw new Error('Giá trị mã giảm giá không hợp lệ');
    discount = Math.min(discount, subtotal);
  }
  const total = subtotal + shippingFee - discount;
  if (!Number.isSafeInteger(total) || total < 0) throw new Error('Tổng tiền không hợp lệ');
  return { subtotal, shippingFee, discount, total };
}
