const amount = (value: unknown, max: number) => Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= max;

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
  return { code, type: input.type, value: Number(input.value), minSubtotal: BigInt(Number(input.minSubtotal)),
    active: input.active, requiresLogin: input.requiresLogin };
}
