export type ProductPatchInput = {
  name?: string; description?: string | null; basePrice?: bigint; originalPrice?: bigint | null;
  discountPercent?: number; collectionId?: string | null;
  isActive?: boolean; isBestSeller?: boolean; isNewArrival?: boolean; isSale?: boolean;
};

export type VariantInput = { size: string; price: bigint; stock: number; weightRange: string | null; ageRange: string | null };
export type VariantPatchInput = { stock?: number; price?: bigint };

const PRICE_MAX = 1_000_000_000;
const isPrice = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= PRICE_MAX;
const isStock = (value: unknown) => Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 100000;

function optionalText(value: unknown, max: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.length > max) throw new Error('Thông tin sản phẩm không hợp lệ');
  return value.trim() || null;
}

/** Các trường sản phẩm được phép sửa; trường vắng mặt giữ nguyên giá trị hiện có. */
export function parseProductPatch(raw: unknown): ProductPatchInput {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Thông tin sản phẩm không hợp lệ');
  const input = raw as Record<string, unknown>;
  const patch: ProductPatchInput = {};
  if (input.name !== undefined) {
    if (typeof input.name !== 'string' || input.name.trim().length < 2 || input.name.length > 150) {
      throw new Error('Tên sản phẩm không hợp lệ');
    }
    patch.name = input.name.trim();
  }
  if (input.description !== undefined) {
    if (input.description !== null && (typeof input.description !== 'string' || input.description.length > 5000)) {
      throw new Error('Mô tả sản phẩm không hợp lệ');
    }
    patch.description = input.description === null ? null : String(input.description).trim() || null;
  }
  if (input.basePrice !== undefined) {
    if (!isPrice(input.basePrice)) throw new Error('Giá sản phẩm không hợp lệ');
    patch.basePrice = BigInt(Number(input.basePrice));
  }
  if (input.originalPrice !== undefined) {
    if (input.originalPrice === null || input.originalPrice === '') patch.originalPrice = null;
    else if (!isPrice(input.originalPrice)) throw new Error('Giá gốc không hợp lệ');
    else patch.originalPrice = BigInt(Number(input.originalPrice));
  }
  if (input.discountPercent !== undefined) {
    if (!Number.isInteger(input.discountPercent) || Number(input.discountPercent) < 0 || Number(input.discountPercent) > 100) {
      throw new Error('Phần trăm giảm giá không hợp lệ');
    }
    patch.discountPercent = Number(input.discountPercent);
  }
  if (input.collectionId !== undefined) {
    if (input.collectionId === null || input.collectionId === '') patch.collectionId = null;
    else if (typeof input.collectionId !== 'string' || input.collectionId.length > 100) throw new Error('Bộ sưu tập không hợp lệ');
    else patch.collectionId = input.collectionId;
  }
  for (const flag of ['isActive', 'isBestSeller', 'isNewArrival', 'isSale'] as const) {
    if (input[flag] === undefined) continue;
    if (typeof input[flag] !== 'boolean') throw new Error('Trạng thái hiển thị không hợp lệ');
    patch[flag] = input[flag] as boolean;
  }
  if (Object.keys(patch).length === 0) throw new Error('Không có thay đổi hợp lệ');
  return patch;
}

/** Biến thể mới của sản phẩm đã có. */
export function parseVariantInput(raw: unknown): VariantInput {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Thông tin biến thể không hợp lệ');
  const input = raw as Record<string, unknown>;
  if (typeof input.size !== 'string' || !input.size.trim() || input.size.length > 50 ||
      !isPrice(input.price) || !isStock(input.stock)) {
    throw new Error('Thông tin biến thể không hợp lệ');
  }
  return { size: input.size.trim(), price: BigInt(Number(input.price)), stock: Number(input.stock),
    weightRange: optionalText(input.weightRange, 100), ageRange: optionalText(input.ageRange, 100) };
}

/** Sửa tồn kho và/hoặc giá của một biến thể. */
export function parseVariantPatch(raw: unknown): VariantPatchInput {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Thông tin biến thể không hợp lệ');
  const input = raw as Record<string, unknown>;
  const patch: VariantPatchInput = {};
  if (input.stock !== undefined) {
    if (!isStock(input.stock)) throw new Error('Tồn kho không hợp lệ');
    patch.stock = Number(input.stock);
  }
  if (input.price !== undefined) {
    if (!isPrice(input.price)) throw new Error('Giá biến thể không hợp lệ');
    patch.price = BigInt(Number(input.price));
  }
  if (Object.keys(patch).length === 0) throw new Error('Không có thay đổi hợp lệ');
  return patch;
}
