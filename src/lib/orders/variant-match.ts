export function findRequestedVariant<T extends { productId: string; size: string }>(variants: T[], productId: string, label: string): T | undefined {
  const candidates = variants.filter((variant) => variant.productId === productId);
  return candidates.find((variant) => variant.size === label) ||
    candidates.find((variant) => label.startsWith(`${variant.size} (`));
}

/** Nhãn size lưu trong giỏ ("Size 2 (10 - 12kg)"); giỏ hàng gộp món theo sản phẩm + nhãn này. */
export function cartSizeLabel(size: string, weightRange: string | null | undefined) {
  return `${size} (${weightRange || ''})`;
}
