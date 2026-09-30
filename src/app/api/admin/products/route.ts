import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { authOptions } from '@/server/auth/options';
import { isSameOrigin } from '@/server/security/origin';
import { paginated, parsePagination, parseSearch } from '@/lib/pagination';
import { prisma } from '@/server/db/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.status !== 'active' || !['admin', 'staff'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  }
  const searchParams = new URL(request.url).searchParams;
  const { page, limit, skip, take } = parsePagination(searchParams, 10, 50);
  const search = parseSearch(searchParams);
  const status = searchParams.get('filter') || '';
  const where = {
    ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } },
      { sku: { contains: search, mode: 'insensitive' as const } },
      { slug: { contains: search, mode: 'insensitive' as const } }] } : {}),
    ...(status === 'active' ? { isActive: true } : status === 'hidden' ? { isActive: false } : {}),
  };
  const [rows, total, collections] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take,
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
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin' || session.user.status !== 'active') {
    return NextResponse.json({ error: 'Chỉ quản trị viên được tạo sản phẩm' }, { status: 403 });
  }
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
      categoryId: 'girls', categoryName: 'Thời trang bé gái',
      variants: { create: [{ sku: `${sku}-${size}`, size: size.trim(), stock: Number(stock), price: BigInt(Number(price)) }] },
      ...(typeof imageUrl === 'string' && imageUrl ? { images: { create: [{ url: imageUrl, isPrimary: true, altText: name.trim() }] } } : {}),
    } });
    revalidateTag('products');
    return NextResponse.json({ id: product.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'SKU hoặc slug đã tồn tại' }, { status: 409 });
  }
}
