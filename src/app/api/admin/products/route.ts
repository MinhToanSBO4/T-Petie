import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getStaffSession, requireAdminApi } from '@/server/auth/staff-session';
import { isSameOrigin } from '@/server/security/origin';
import { Prisma } from '@prisma/client';
import { paginated, parseChoice, parsePagination, parseSearch } from '@/lib/pagination';
import { normalizeText } from '@/lib/catalog/filters';
import { MIN_PRICE, parseSubcategory, PRODUCT_TYPES } from '@/lib/content/product-input';
import { ADMIN_PRODUCT_INCLUDE, toAdminProductRow } from '@/server/catalog/admin-product';
import { prisma } from '@/server/db/client';
import { LOW_STOCK_THRESHOLD } from '@/server/admin/dashboard';

export const dynamic = 'force-dynamic';

/** Cách sắp xếp bảng sản phẩm; luôn kèm id để phân trang ổn định khi trùng giá hoặc thời điểm. */
const SORTS: Record<string, Prisma.ProductOrderByWithRelationInput[]> = {
  newest: [{ createdAt: 'desc' }, { id: 'desc' }],
  updated: [{ updatedAt: 'desc' }, { id: 'desc' }],
  name: [{ name: 'asc' }, { id: 'asc' }],
  'price-asc': [{ basePrice: 'asc' }, { id: 'asc' }],
  'price-desc': [{ basePrice: 'desc' }, { id: 'desc' }],
};

/** Đang bán/đang ẩn tách riêng để kết hợp được với bộ lọc bên dưới, ví dụ "đang bán mà hết hàng". */
const STATUS: Record<string, Prisma.ProductWhereInput> = { active: { isActive: true }, hidden: { isActive: false } };

/** Bộ lọc của bảng sản phẩm quản trị (truy soát nhanh hàng sắp hết, hết hàng, thiếu ảnh...). */
const FILTERS: Record<string, Prisma.ProductWhereInput> = {
  ...STATUS,
  'low-stock': { variants: { some: { isActive: true, stock: { gt: 0, lte: LOW_STOCK_THRESHOLD } } } },
  'out-of-stock': { variants: { none: { isActive: true, stock: { gt: 0 } } } },
  sale: { isSale: true },
  'best-seller': { isBestSeller: true },
  new: { isNewArrival: true },
  'no-image': { images: { none: {} } },
};

/** Lọc theo bộ sưu tập: mã bộ sưu tập, hoặc "none" là chưa thuộc bộ sưu tập nào; mã sai định dạng thì bỏ qua. */
function collectionWhere(value: string | null): Prisma.ProductWhereInput {
  if (value === 'none') return { collectionId: null };
  return value && /^[\w-]{1,64}$/.test(value) ? { collectionId: value } : {};
}

/**
 * Mã các sản phẩm khớp từ khóa, không phân biệt dấu ("ao so mi" tìm được "Áo Sơ Mi"). Catalog chỉ vài trăm sản phẩm nên
 * so khớp trên danh sách tên/mã gọn nhẹ thay vì ILIKE của database (ILIKE vẫn phân biệt dấu).
 */
async function matchingProductIds(search: string) {
  const tokens = normalizeText(search).split(' ').filter(Boolean);
  const rows = await prisma.product.findMany({ select: { id: true, name: true, sku: true, slug: true } });
  return rows.filter((row) => {
    const text = normalizeText(`${row.name} ${row.sku} ${row.slug}`);
    return tokens.every((token) => text.includes(token));
  }).map((row) => row.id);
}

export async function GET(request: Request) {
  if (!(await getStaffSession())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const searchParams = new URL(request.url).searchParams;
  const { page, limit, skip, take } = parsePagination(searchParams, 10, 50);
  const search = parseSearch(searchParams);
  const where: Prisma.ProductWhereInput = { AND: [
    parseChoice(searchParams, 'status', STATUS) ?? {},
    parseChoice(searchParams, 'filter', FILTERS) ?? {},
    collectionWhere(searchParams.get('collection')),
    ...(search ? [{ id: { in: await matchingProductIds(search) } }] : []),
  ] };
  const orderBy = parseChoice(searchParams, 'sort', SORTS) ?? SORTS.newest;
  const [rows, total, collections] = await Promise.all([
    prisma.product.findMany({ where, orderBy, skip, take, include: ADMIN_PRODUCT_INCLUDE }),
    prisma.product.count({ where }),
    prisma.collection.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      select: { id: true, title: true } }),
  ]);
  return NextResponse.json({ collections, ...paginated(rows.map(toAdminProductRow), total, page, limit) },
    { headers: { 'Cache-Control': 'no-store' } });
}

/** Kiểm tra form tạo sản phẩm; trả về thông báo cho đúng ô bị sai thay vì một câu chung. */
function createInputError(body: Record<string, unknown>): string | null {
  const { name, sku, slug, price, size, stock, subcategory } = body;
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 150) return 'Tên sản phẩm cần 2–150 ký tự';
  if (typeof sku !== 'string' || !/^[A-Z0-9-]{3,50}$/.test(sku.trim())) {
    return 'Mã sản phẩm (SKU) cần 3–50 ký tự, chỉ gồm chữ không dấu, số và dấu gạch ngang (ví dụ TP-VAY-001)';
  }
  if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim()) || slug.trim().length < 3 || slug.trim().length > 100) {
    return 'Đường dẫn (slug) cần 3–100 ký tự, chữ thường không dấu, số và dấu gạch ngang (ví dụ vay-hoa-nhi)';
  }
  if (!PRODUCT_TYPES.some((type) => type.value === subcategory)) return 'Chọn loại sản phẩm (áo, quần, váy hoặc set đồ)';
  if (!Number.isSafeInteger(price) || Number(price) < MIN_PRICE || Number(price) > 1_000_000_000) {
    return `Giá bán phải là số nguyên từ ${MIN_PRICE.toLocaleString('vi-VN')}đ`;
  }
  if (typeof size !== 'string' || !size.trim() || size.trim().length > 50) return 'Tên size cần 1–50 ký tự';
  if (!Number.isInteger(stock) || Number(stock) < 0 || Number(stock) > 100000) return 'Tồn kho phải là số nguyên từ 0 đến 100000';
  return null;
}

/**
 * Tạo sản phẩm với size đầu tiên. Sản phẩm mới ở trạng thái ẩn: chưa có ảnh/mô tả thì không lên cửa hàng,
 * người tạo bật "Đang bán" sau khi thêm ảnh và các size còn lại.
 */
export async function POST(request: Request) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: 'Chỉ quản trị viên được tạo sản phẩm' }, { status: 403 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== 'object') throw new Error();
  } catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 }); }
  const inputError = createInputError(body);
  if (inputError) return NextResponse.json({ error: inputError }, { status: 400 });
  const name = String(body.name).trim();
  const sku = String(body.sku).trim();
  const slug = String(body.slug).trim();
  const size = String(body.size).trim();
  const price = BigInt(Number(body.price));
  const subcategory = parseSubcategory(body.subcategory);
  try {
    const product = await prisma.product.create({ data: {
      name, sku, slug, basePrice: price, isActive: false,
      categoryName: 'Thời trang bé gái',
      subcategory, subcategoryName: PRODUCT_TYPES.find((type) => type.value === subcategory)?.label ?? null,
      // Database mới chưa có danh mục: tạo danh mục gốc ở lần thêm sản phẩm đầu tiên.
      category: { connectOrCreate: { where: { id: 'girls' }, create: { id: 'girls', name: 'Thời trang bé gái', slug: 'girls' } } },
      variants: { create: [{ sku: `${sku}-${size}`, size, stock: Number(body.stock), price }] },
    }, include: ADMIN_PRODUCT_INCLUDE });
    revalidateTag('products');
    return NextResponse.json({ id: product.id, product: toAdminProductRow(product) }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = String((error.meta?.target as string[] | string | undefined) ?? '');
      const field = target.includes('slug') ? 'Đường dẫn (slug)' : 'Mã sản phẩm (SKU)';
      return NextResponse.json({ error: `${field} đã được dùng cho sản phẩm khác` }, { status: 409 });
    }
    console.error('Product create failed:', error);
    return NextResponse.json({ error: 'Không tạo được sản phẩm, vui lòng thử lại' }, { status: 500 });
  }
}
