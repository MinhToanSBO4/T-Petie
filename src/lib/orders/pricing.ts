export type RequestedItem = { variantId: string; quantity: number };
export type PricedVariant = { id: string; productId: string; name: string; size: string; price: number; stock: number; active: boolean };

export function priceOrder(requested: RequestedItem[], variants: PricedVariant[]) {
  if (!Array.isArray(requested) || requested.length === 0 || requested.length > 30) throw new Error('Giỏ hàng không hợp lệ');
  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  const seen = new Set<string>();
  const items = requested.map(({ variantId, quantity }) => {
    if (seen.has(variantId)) throw new Error('Sản phẩm bị trùng trong giỏ hàng');
    seen.add(variantId);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error('Số lượng không hợp lệ');
    const variant = byId.get(variantId);
    if (!variant || !variant.active) throw new Error('Sản phẩm không còn bán');
    if (variant.stock < quantity) throw new Error('Số lượng vượt quá tồn kho');
    if (!Number.isSafeInteger(variant.price) || variant.price < 0) throw new Error('Giá không hợp lệ');
    return { variantId, productId: variant.productId, productName: variant.name, size: variant.size,
      quantity, unitPrice: variant.price, totalPrice: variant.price * quantity };
  });
  return { items, subtotal: items.reduce((sum, item) => sum + item.totalPrice, 0) };
}
