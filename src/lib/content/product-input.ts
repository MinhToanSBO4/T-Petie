import type { ProductSubcategory } from '@/types/product';

export type ProductPatchInput = {
  name?: string; description?: string | null; originalPrice?: bigint | null;
  discountPercent?: number; collectionId?: string | null;
  subcategory?: ProductSubcategory | null; subcategoryName?: string | null;
  material?: string; colorName?: string | null;
  isActive?: boolean; isBestSeller?: boolean; isNewArrival?: boolean; isSale?: boolean;
};

export type VariantInput = { size: string; price: bigint; stock: number; weightRange: string | null; ageRange: string | null };
/**
 * Sửa một size. `expectedStock` là tồn kho lúc mở form: máy chủ chỉ ghi `stock` khi tồn kho trong database vẫn bằng số đó,
 * để đơn hàng đặt trong lúc đang sửa không bị ghi đè (trước đây lưu sản phẩm đưa tồn kho về số cũ, gây bán vượt).
 */
export type VariantPatchInput = {
  stock?: number; expectedStock?: number; price?: bigint;
  weightRange?: string | null; ageRange?: string | null; isActive?: boolean;
};

/** Loại sản phẩm dùng cho trang /girls/tops, /bottoms, /dresses, /sets và bộ lọc "Loại". */
export const PRODUCT_TYPES: { value: ProductSubcategory; label: string }[] = [
  { value: 'ao', label: 'Áo' }, { value: 'quan', label: 'Quần' }, { value: 'vay', label: 'Váy' }, { value: 'set-do', label: 'Set đồ' },
];

/** Giá bán thấp nhất được chấp nhận: ô giá để trống (thành 0) không được lưu thành sản phẩm 0đ. */
export const MIN_PRICE = 1000;
const PRICE_MAX = 1_000_000_000;
const isPrice = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= MIN_PRICE && Number(value) <= PRICE_MAX;
const isStock = (value: unknown) => Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 100000;
const PRICE_ERROR = `phải là số nguyên từ ${MIN_PRICE.toLocaleString('vi-VN')}đ`;

function optionalText(value: unknown, max: number, label = 'Thông tin sản phẩm'): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.length > max) throw new Error(`${label} không hợp lệ (tối đa ${max} ký tự)`);
  return value.trim() || null;
}

/** Loại sản phẩm: một trong PRODUCT_TYPES, hoặc null/"" để bỏ loại. */
export function parseSubcategory(value: unknown): ProductSubcategory | null {
  if (value === null || value === '') return null;
  const found = PRODUCT_TYPES.find((type) => type.value === value);
  if (!found) throw new Error('Loại sản phẩm không hợp lệ');
  return found.value;
}

/** Các trường sản phẩm được phép sửa; trường vắng mặt giữ nguyên giá trị hiện có. Giá hiển thị tự tính từ giá các size. */
export function parseProductPatch(raw: unknown): ProductPatchInput {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Thông tin sản phẩm không hợp lệ');
  const input = raw as Record<string, unknown>;
  const patch: ProductPatchInput = {};
  if (input.name !== undefined) {
    if (typeof input.name !== 'string' || input.name.trim().length < 2 || input.name.length > 150) {
      throw new Error('Tên sản phẩm cần 2–150 ký tự');
    }
    patch.name = input.name.trim();
  }
  if (input.description !== undefined) {
    if (input.description !== null && (typeof input.description !== 'string' || input.description.length > 5000)) {
      throw new Error('Mô tả sản phẩm tối đa 5000 ký tự');
    }
    patch.description = input.description === null ? null : String(input.description).trim() || null;
  }
  if (input.originalPrice !== undefined) {
    if (input.originalPrice === null || input.originalPrice === '') patch.originalPrice = null;
    else if (!isPrice(input.originalPrice)) throw new Error(`Giá gốc ${PRICE_ERROR}, hoặc bỏ trống`);
    else patch.originalPrice = BigInt(Number(input.originalPrice));
  }
  if (input.discountPercent !== undefined) {
    if (!Number.isInteger(input.discountPercent) || Number(input.discountPercent) < 0 || Number(input.discountPercent) > 100) {
      throw new Error('Phần trăm giảm giá phải từ 0 đến 100');
    }
    patch.discountPercent = Number(input.discountPercent);
  }
  if (input.collectionId !== undefined) {
    if (input.collectionId === null || input.collectionId === '') patch.collectionId = null;
    else if (typeof input.collectionId !== 'string' || input.collectionId.length > 100) throw new Error('Bộ sưu tập không hợp lệ');
    else patch.collectionId = input.collectionId;
  }
  if (input.subcategory !== undefined) patch.subcategory = parseSubcategory(input.subcategory);
  if (input.subcategoryName !== undefined) patch.subcategoryName = optionalText(input.subcategoryName, 50, 'Tên loại');
  if (input.material !== undefined) patch.material = optionalText(input.material, 200, 'Chất liệu') || '';
  if (input.colorName !== undefined) patch.colorName = optionalText(input.colorName, 100, 'Tên màu');
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
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Thông tin size không hợp lệ');
  const input = raw as Record<string, unknown>;
  if (typeof input.size !== 'string' || !input.size.trim() || input.size.trim().length > 50) {
    throw new Error('Tên size cần 1–50 ký tự');
  }
  const size = input.size.trim();
  if (!isPrice(input.price)) throw new Error(`Giá của ${size} ${PRICE_ERROR}`);
  if (!isStock(input.stock)) throw new Error(`Tồn kho của ${size} phải là số nguyên từ 0 đến 100000`);
  return { size, price: BigInt(Number(input.price)), stock: Number(input.stock),
    weightRange: optionalText(input.weightRange, 100, 'Cân nặng'), ageRange: optionalText(input.ageRange, 100, 'Độ tuổi') };
}

/** Sửa tồn kho, giá, cân nặng/độ tuổi gợi ý hoặc bật/tắt bán một biến thể. */
export function parseVariantPatch(raw: unknown): VariantPatchInput {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Thông tin size không hợp lệ');
  const input = raw as Record<string, unknown>;
  const patch: VariantPatchInput = {};
  if (input.stock !== undefined) {
    if (!isStock(input.stock)) throw new Error('Tồn kho phải là số nguyên từ 0 đến 100000');
    if (!isStock(input.expectedStock)) throw new Error('Thiếu tồn kho ban đầu, tải lại trang rồi thử lại');
    patch.stock = Number(input.stock);
    patch.expectedStock = Number(input.expectedStock);
  }
  if (input.price !== undefined) {
    if (!isPrice(input.price)) throw new Error(`Giá size ${PRICE_ERROR}`);
    patch.price = BigInt(Number(input.price));
  }
  if (input.weightRange !== undefined) patch.weightRange = optionalText(input.weightRange, 100, 'Cân nặng');
  if (input.ageRange !== undefined) patch.ageRange = optionalText(input.ageRange, 100, 'Độ tuổi');
  if (input.isActive !== undefined) {
    if (typeof input.isActive !== 'boolean') throw new Error('Trạng thái size không hợp lệ');
    patch.isActive = input.isActive;
  }
  if (Object.keys(patch).length === 0) throw new Error('Không có thay đổi hợp lệ');
  return patch;
}
