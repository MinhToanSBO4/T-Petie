import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getStaffSession, requireAdminApi } from '@/server/auth/staff-session';
import { isSameOrigin } from '@/server/security/origin';
import type { Prisma } from '@prisma/client';
import { paginated, parseChoice, parsePagination, parseSearch } from '@/lib/pagination';
import { normalizeText } from '@/lib/catalog/filters';
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
    prisma.product.findMany({ where, orderBy, skip, take,
      include: { images: { orderBy: { sortOrder: 'asc' } }, variants: { orderBy: { size: 'asc' } } } }),
    prisma.product.count({ where }),
    prisma.collection.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      select: { id: true, title: true } }),
  ]);
  return NextResponse.json({ collections, ...paginated(rows.map((row) => ({
    id: row.id, slug: row.slug, sku: row.sku, name: row.name, active: row.isActive,
    price: Number(row.basePrice), description: row.description || '',
    originalPrice: row.originalPrice === null ? null : Number(row.originalPrice),
    discountPercent: row.discountPercent, collectionId: row.collectionId,
    isBestSeller: row.isBestSeller, isNewArrival: row.isNewArrival, isSale: row.isSale,
    images: row.images.map((image) => ({ id: image.id, url: image.url })),
    variants: row.variants.map((variant) => ({ id: variant.id, size: variant.size, stock: variant.stock,
      price: Number(variant.price), weightRange: variant.weightRange || '', ageRange: variant.ageRange || '' })),
  })), total, page, limit) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: 'Chỉ quản trị viên được tạo sản phẩm' }, { status: 403 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 }); }
  const { name, sku, slug, price, size, stock, imageUrl } = body;
  if (typeof name !== 'string' || name.trim().length < 2 || name.length > 150 ||
    typeof sku !== 'string' || !/^[A-Za-z0-9-]{3,50}$/.test(sku) ||
    typeof slug !== 'string' || !/^[a-z0-9-]{3,100}$/.test(slug) ||
    !Number.isSafeInteger(price) || Number(price) < 0 ||
    typeof size !== 'string' || !size.trim() || size.length > 50 ||
    !Number.isInteger(stock) || Number(stock) < 0 || Number(stock) > 100000) {
    return NextResponse.json({ error: 'Thông tin sản phẩm không hợp lệ' }, { status: 400 });
  }
  if (imageUrl && (typeof imageUrl !== 'string' || !/^https:\/\/res\.cloudinary\.com\//.test(imageUrl))) {
    return NextResponse.json({ error: 'Ảnh phải là URL HTTPS trên Cloudinary' }, { status: 400 });
  }
  try {
    const product = await prisma.product.create({ data: {
      name: name.trim(), sku: sku.trim(), slug: slug.trim(), basePrice: BigInt(Number(price)),
      categoryName: 'Thời trang bé gái',
      // Database mới chưa có danh mục: tạo danh mục gốc ở lần thêm sản phẩm đầu tiên.
      category: { connectOrCreate: { where: { id: 'girls' }, create: { id: 'girls', name: 'Thời trang bé gái', slug: 'girls' } } },
      variants: { create: [{ sku: `${sku.trim()}-${size.trim()}`, size: size.trim(), stock: Number(stock), price: BigInt(Number(price)) }] },
      ...(typeof imageUrl === 'string' && imageUrl ? { images: { create: [{ url: imageUrl, isPrimary: true, altText: name.trim() }] } } : {}),
    } });
    revalidateTag('products');
    return NextResponse.json({ id: product.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'SKU hoặc slug đã tồn tại' }, { status: 409 });
  }
}
