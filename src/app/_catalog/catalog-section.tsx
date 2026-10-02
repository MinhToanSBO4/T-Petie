import { CatalogView } from '@/components/catalog/CatalogView';
import { catalogParamsFrom, parseCatalogParams } from '@/lib/catalog/filters';
import { defaultSortFor, type CatalogScope } from '@/lib/catalog/scope';
import { getCatalogListing } from '@/server/catalog/listing';

export type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Danh sách sản phẩm dựng trên máy chủ theo bộ lọc trên URL: chỉ đúng một trang (24 thẻ) được gửi xuống trình duyệt,
 * HTML có sẵn sản phẩm cho khách và máy tìm kiếm.
 */
export async function CatalogSection({ scope, searchParams, basePath, emptyText, layout }: {
  scope: CatalogScope; searchParams: SearchParams; basePath: string; emptyText?: string; layout?: 'sidebar' | 'compact';
}) {
  const filters = parseCatalogParams(catalogParamsFrom(searchParams), defaultSortFor(scope));
  const listing = await getCatalogListing(scope, filters);
  return <CatalogView listing={listing} filters={filters} scope={scope} basePath={basePath} emptyText={emptyText} layout={layout} />;
}
