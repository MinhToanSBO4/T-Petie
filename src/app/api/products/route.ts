import { NextResponse } from 'next/server';
import { getCatalogListing } from '@/server/catalog/listing';
import { parseCatalogParams } from '@/lib/catalog/filters';
import { defaultSortFor, parseScopeParam } from '@/lib/catalog/scope';

export const dynamic = 'force-dynamic';

/**
 * Danh mục công khai theo trang: lọc, sắp xếp và cắt trang trên máy chủ (danh sách sản phẩm đã cache), cùng tham số
 * URL với trang danh sách. `scope` giới hạn phạm vi (`sale`, `type:ao`, `collection:<slug>`), `limit` 0–48
 * (0 chỉ đếm, dùng cho số "Xem N sản phẩm" trong bảng lọc), `facets=1` kèm số lượng cho từng lựa chọn lọc.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const scope = parseScopeParam(url.searchParams.get('scope'));
  const filters = parseCatalogParams(url.searchParams, defaultSortFor(scope));
  const rawLimit = Number(url.searchParams.get('limit'));
  const limit = url.searchParams.has('limit') && Number.isInteger(rawLimit) ? Math.max(0, Math.min(48, rawLimit)) : 24;
  const listing = await getCatalogListing(scope, filters, { limit, facets: url.searchParams.get('facets') === '1' });
  return NextResponse.json(
    { products: listing.items, total: listing.total, page: listing.page, pages: listing.pages, limit,
      ...(url.searchParams.get('facets') === '1' ? { facets: listing.facets } : {}) },
    // Không để CDN giữ bản cũ: sửa sản phẩm trong trang quản trị phải hiện ngay (dữ liệu đã cache ở máy chủ, xóa theo tag).
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
