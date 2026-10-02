import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { parseCollectionInput } from '@/lib/content/collection-input';
import { paginated, parseChoice, parsePagination, parseSearch } from '@/lib/pagination';
import { getStaffSession } from '@/server/auth/staff-session';
import { invalidateCollections } from '@/server/content/invalidate';
import { prisma } from '@/server/db/client';

export const dynamic = 'force-dynamic';

/** Mặc định theo thứ tự hiển thị trên website; luôn kèm id để phân trang ổn định. */
const SORTS: Record<string, Prisma.CollectionOrderByWithRelationInput[]> = {
  manual: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
  newest: [{ createdAt: 'desc' }, { id: 'desc' }],
  title: [{ title: 'asc' }, { id: 'asc' }],
  products: [{ products: { _count: 'desc' } }, { sortOrder: 'asc' }, { id: 'asc' }],
};
const STATUS: Record<string, Prisma.CollectionWhereInput> = { active: { isActive: true }, hidden: { isActive: false } };
/** Đang hiện thật trên website: phải đang bán và bật vị trí đó, giống cột "Hiển thị" của bảng. */
const PLACEMENT: Record<string, Prisma.CollectionWhereInput> = {
  menu: { isActive: true, showInMenu: true },
  home: { isActive: true, showOnHome: true },
};

export async function GET(request: Request) {
  if (!(await getStaffSession())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const searchParams = new URL(request.url).searchParams;
  const { page, limit, skip, take } = parsePagination(searchParams, 10, 50);
  const search = parseSearch(searchParams);
  // Ghép bằng AND: trạng thái và vị trí hiển thị cùng đặt isActive, trộn chung một object sẽ ghi đè nhau.
  const where: Prisma.CollectionWhereInput = { AND: [
    search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { slug: { contains: search, mode: 'insensitive' } }] } : {},
    parseChoice(searchParams, 'filter', STATUS) ?? {},
    parseChoice(searchParams, 'placement', PLACEMENT) ?? {},
  ] };
  const orderBy = parseChoice(searchParams, 'sort', SORTS) ?? SORTS.manual;
  const [rows, total] = await Promise.all([
    prisma.collection.findMany({ where, include: { _count: { select: { products: true } } }, orderBy, skip, take }),
    prisma.collection.count({ where }),
  ]);
  return NextResponse.json({ ...paginated(rows.map(({ _count, ...row }) => ({ ...row, productCount: _count.products })), total, page, limit) },
    { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!(await getStaffSession())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  }
  try {
    const raw = await request.text();
    if (raw.length > 12000) return NextResponse.json({ error: 'Dữ liệu quá lớn' }, { status: 413 });
    const data = parseCollectionInput(JSON.parse(raw));
    const created = await prisma.collection.create({ data });
    invalidateCollections(created.slug);
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Slug đã tồn tại' }, { status: 409 });
    }
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    if (error instanceof Error && /không hợp lệ/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Collection create failed:', error);
    return NextResponse.json({ error: 'Không tạo được bộ sưu tập' }, { status: 500 });
  }
}
