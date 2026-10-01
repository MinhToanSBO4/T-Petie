import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/client';
import { getStaffSession } from '@/server/auth/staff-session';
import { deleteCloudinaryImage } from '@/server/media/cloudinary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Cập nhật mô tả ảnh (alt text). */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!(await getStaffSession())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  }
  const raw = await request.text();
  if (raw.length > 2000) return NextResponse.json({ error: 'Dữ liệu quá lớn' }, { status: 413 });
  let altText: unknown;
  try { altText = (JSON.parse(raw) as { altText?: unknown }).altText; }
  catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 }); }
  if (typeof altText !== 'string' || altText.length > 300) {
    return NextResponse.json({ error: 'Mô tả ảnh không hợp lệ' }, { status: 400 });
  }
  const asset = await prisma.mediaAsset.update({ where: { id: params.id }, data: { altText: altText.trim() || null } })
    .catch(() => null);
  if (!asset) return NextResponse.json({ error: 'Không tìm thấy ảnh' }, { status: 404 });
  return NextResponse.json({ asset });
}

/** Xóa ảnh khỏi thư viện và Cloudinary. */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!(await getStaffSession())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  }
  const asset = await prisma.mediaAsset.findUnique({ where: { id: params.id } });
  if (!asset) return NextResponse.json({ error: 'Không tìm thấy ảnh' }, { status: 404 });
  // Xóa ảnh đang được dùng sẽ làm vỡ ảnh trên website, nên chặn lại và báo đang dùng ở đâu.
  const [productUses, collectionUses, contentUses, feedbackUses] = await Promise.all([
    prisma.productImage.count({ where: { url: asset.url } }),
    prisma.collection.count({ where: { OR: [{ bannerUrl: asset.url }, { lookbookUrls: { has: asset.url } }] } }),
    prisma.$queryRaw<{ count: number }[]>`SELECT count(*)::int AS count FROM "site_content" WHERE strpos("data"::text, ${asset.url}) > 0`,
    prisma.customerTestimonial.count({ where: { imageUrl: asset.url } }),
  ]);
  const usedIn = [productUses && `${productUses} sản phẩm`, collectionUses && `${collectionUses} bộ sưu tập`,
    contentUses[0]?.count && 'nội dung trang chủ', feedbackUses && `${feedbackUses} feedback khách hàng`].filter(Boolean);
  if (usedIn.length) {
    return NextResponse.json({ error: `Ảnh đang được dùng ở ${usedIn.join(', ')}. Hãy gỡ ảnh khỏi các nơi đó trước khi xóa.` }, { status: 409 });
  }
  if (asset.publicId && !(await deleteCloudinaryImage(asset.publicId))) {
    return NextResponse.json({ error: 'Không xóa được ảnh trên Cloudinary' }, { status: 502 });
  }
  await prisma.mediaAsset.delete({ where: { id: asset.id } });
  return NextResponse.json({ ok: true });
}
