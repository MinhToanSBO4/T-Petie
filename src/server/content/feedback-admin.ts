import 'server-only';
import { prisma } from '@/server/db/client';

/** Lỗi kiểm tra dữ liệu feedback được phép hiển thị cho quản trị viên. */
export class FeedbackInputError extends Error {}

/**
 * Ảnh feedback phải nằm trong thư viện media (để trang thư viện biết ảnh đang được dùng và không cho xóa);
 * kích thước ảnh lấy từ thư viện để khung hiển thị đúng tỉ lệ, không bị nhảy bố cục.
 * Sản phẩm liên quan phải tồn tại.
 */
export async function resolveFeedbackImages(imageUrls: string[], productIds: string[]) {
  const [assets, products] = await Promise.all([
    prisma.mediaAsset.findMany({ where: { url: { in: imageUrls } }, select: { url: true, width: true, height: true } }),
    productIds.length ? prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true } }) : Promise.resolve([]),
  ]);
  if (assets.length !== new Set(imageUrls).size) throw new FeedbackInputError('Ảnh feedback phải được tải lên thư viện ảnh trước');
  if (products.length !== new Set(productIds).size) throw new FeedbackInputError('Sản phẩm liên quan không hợp lệ');
  return new Map(assets.map((asset) => [asset.url, { imageWidth: asset.width, imageHeight: asset.height }]));
}
