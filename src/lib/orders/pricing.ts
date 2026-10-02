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
    if (!variant || !variant.active) throw new Error(variant ? `Sản phẩm "${variant.name}" (${variant.size}) không còn bán, mẹ xóa khỏi giỏ giúp shop nhé`
      : 'Có sản phẩm trong giỏ không còn bán, mẹ xóa khỏi giỏ giúp shop nhé');
    // Nói rõ món nào thiếu hàng: trước đây cả giỏ chỉ báo "vượt quá tồn kho", khách không biết sửa dòng nào.
    if (variant.stock < quantity) {
      throw new Error(variant.stock > 0 ? `"${variant.name}" (${variant.size}) chỉ còn ${variant.stock} sản phẩm tồn kho, mẹ giảm số lượng giúp shop nhé`
        : `"${variant.name}" (${variant.size}) đã hết hàng (tồn kho 0), mẹ xóa khỏi giỏ giúp shop nhé`);
    }
    if (!Number.isSafeInteger(variant.price) || variant.price < 0) throw new Error('Giá không hợp lệ');
    return { variantId, productId: variant.productId, productName: variant.name, size: variant.size,
      quantity, unitPrice: variant.price, totalPrice: variant.price * quantity };
  });
  return { items, subtotal: items.reduce((sum, item) => sum + item.totalPrice, 0) };
}
