import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.status !== 'active' || !['admin', 'staff'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  }
  const rows = await prisma.product.findMany({ orderBy: { createdAt: 'desc' }, take: 200,
    include: { images: { orderBy: { sortOrder: 'asc' } }, variants: { orderBy: { size: 'asc' } } } });
  return NextResponse.json({ products: rows.map((row) => ({
    id: row.id, slug: row.slug, sku: row.sku, name: row.name, active: row.isActive,
    price: Number(row.basePrice), images: row.images.map((image) => ({ id: image.id, url: image.url })),
    variants: row.variants.map((variant) => ({ id: variant.id, size: variant.size, stock: variant.stock, price: Number(variant.price) })),
  })) });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin' || session.user.status !== 'active') {
    return NextResponse.json({ error: 'Chỉ quản trị viên được tạo sản phẩm' }, { status: 403 });
  }
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
  if (imageUrl && (typeof imageUrl !== 'string' || !/^https:\/\/(res\.cloudinary\.com|i\.ibb\.co)\//.test(imageUrl))) {
    return NextResponse.json({ error: 'Ảnh phải là URL HTTPS trên CDN' }, { status: 400 });
  }
  try {
    const product = await prisma.product.create({ data: {
      name: name.trim(), sku: sku.trim(), slug: slug.trim(), basePrice: BigInt(Number(price)),
      categoryId: 'be-gai', categoryName: 'Thời trang bé gái',
      variants: { create: [{ sku: `${sku}-${size}`, size: size.trim(), stock: Number(stock), price: BigInt(Number(price)) }] },
      ...(typeof imageUrl === 'string' && imageUrl ? { images: { create: [{ url: imageUrl, isPrimary: true, altText: name.trim() }] } } : {}),
    } });
    revalidateTag('products');
    return NextResponse.json({ id: product.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'SKU hoặc slug đã tồn tại' }, { status: 409 });
  }
}
