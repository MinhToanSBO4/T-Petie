'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUpDown, ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';
import { markAdminPagesStale } from '@/client/admin-freshness';
import { compactFilters, type TableFilter, type TableOption, type TableQuery } from '@/lib/admin/table-query';

export { tableParams, type TableFilter, type TableOption, type TableQuery } from '@/lib/admin/table-query';

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  className?: string;
  render: (row: T) => React.ReactNode;
};

export type TablePage<T> = { items: T[]; total: number; page: number; pages: number };

type Snapshot = { page: number; query: string; sort: string; filters: Record<string, string>; reloadKey: number };
type CachedPage = { data: TablePage<unknown>; loadedAt: number };
/**
 * Bộ nhớ đệm của bảng quản trị, nằm trong bộ nhớ tab trình duyệt nên mất khi F5.
 * - snapshots: trang/từ khóa/cách sắp xếp/bộ lọc đang xem, để quay lại đúng chỗ.
 * - pages: dữ liệu từng trang đã tải; xem lại không gửi truy vấn nào lên máy chủ.
 * Dữ liệu chỉ tải lại khi bấm "Làm mới", sau khi chính người dùng sửa dữ liệu (reloadKey đổi), hoặc F5.
 */
const snapshots = new Map<string, Snapshot>();
const pageStore = new Map<string, Map<string, CachedPage>>();
/** Request đang chờ theo cùng tham số: bấm nhanh, dựng lại hay StrictMode đều dùng chung một lần gọi. */
const inflight = new Map<string, Promise<TablePage<unknown>>>();
/** Xóa dữ liệu đã lưu của các bảng có khóa bắt đầu bằng `prefix` (ví dụ mọi tab của trang đơn hàng sau khi đổi trạng thái). */
export function clearTableCache(prefix: string) {
  for (const key of Array.from(pageStore.keys())) if (key.startsWith(prefix)) pageStore.delete(key);
}
const pageCache = (table: string) => {
  if (!pageStore.has(table)) pageStore.set(table, new Map());
  return pageStore.get(table)!;
};

const selectBase = 'min-h-11 w-full rounded-xl border text-sm sm:w-auto';

/**
 * Bảng quản trị dùng chung: tìm kiếm, sắp xếp, lọc, phân trang phía máy chủ và thanh nút chức năng.
 * Mỗi trang chỉ tải đúng số dòng cần hiển thị.
 */
export function DataTable<T extends { id: string }>({
  columns, fetchPage, toolbar, searchPlaceholder, emptyText, onRowClick, sorts, filters, pageSize = 10, reloadKey = 0, stateKey, onData,
  alwaysRevalidate = false,
}: {
  columns: Column<T>[];
  fetchPage: (query: TableQuery) => Promise<TablePage<T>>;
  toolbar?: React.ReactNode;
  searchPlaceholder?: string;
  emptyText?: string;
  onRowClick?: (row: T) => void;
  /** Cách sắp xếp API hỗ trợ; phương án đầu tiên là mặc định. */
  sorts?: TableOption[];
  filters?: TableFilter[];
  pageSize?: number;
  reloadKey?: number;
  /** Mặc định là đường dẫn trang; chỉ cần đặt khi một trang có nhiều bảng. */
  stateKey?: string;
  /** Nhận các dòng đang hiển thị mỗi khi dữ liệu đổi (ví dụ để chọn tất cả trên trang). */
  onData?: (rows: T[]) => void;
  /** Hiện ngay trang đã lưu nhưng vẫn tải bản mới ngầm mỗi lần mở (dữ liệu có thể đổi từ phía khác). */
  alwaysRevalidate?: boolean;
}) {
  const pathname = usePathname();
  const key = stateKey || pathname;
  const saved = snapshots.get(key);
  const defaultSort = sorts?.[0]?.value ?? '';
  // Cách sắp xếp đã lưu không còn trong danh sách (bảng vừa đổi phương án) thì về mặc định.
  const savedSort = saved && sorts?.some((item) => item.value === saved.sort) ? saved.sort : defaultSort;
  const [page, setPage] = useState(saved?.page ?? 1);
  const [query, setQuery] = useState(saved?.query ?? '');
  const [debouncedQuery, setDebouncedQuery] = useState(saved?.query ?? '');
  const [sort, setSort] = useState(savedSort);
  const [filterValues, setFilterValues] = useState<Record<string, string>>(saved?.filters ?? {});
  const cacheId = (target: number) => JSON.stringify([target, pageSize, debouncedQuery, sort, filterValues]);
  const initial = pageCache(key).get(JSON.stringify([saved?.page ?? 1, pageSize, saved?.query ?? '', savedSort, saved?.filters ?? {}]));
  const [data, setData] = useState<TablePage<T> | null>((initial?.data as TablePage<T> | undefined) ?? null);
  const [loadedAt, setLoadedAt] = useState<number | null>(initial?.loadedAt ?? null);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState('');
  // reloadKey = 0: vừa mở trang (dùng dữ liệu đã lưu). Khác lần trước: vừa sửa dữ liệu, phải tải mới.
  const handledReload = useRef(reloadKey === 0 ? 0 : saved?.reloadKey ?? reloadKey);
  const fetcher = useRef(fetchPage);
  fetcher.current = fetchPage;
  // Chỉ nhận kết quả của lần tải mới nhất: gõ tìm kiếm nhanh không bị kết quả cũ về sau ghi đè.
  const latestRequest = useRef(0);

  useEffect(() => {
    if (query === debouncedQuery) return;
    const timer = setTimeout(() => { setDebouncedQuery(query); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [query, debouncedQuery]);

  const load = useCallback(async (force: boolean) => {
    const cached = pageCache(key).get(cacheId(page));
    // Dữ liệu hay thay đổi từ phía khác (như trạng thái đơn): vẫn hiện ngay bản đã lưu nhưng luôn tải lại ngầm.
    const background = Boolean(cached && !force && alwaysRevalidate);
    if (cached && !force) {
      latestRequest.current += 1; // bỏ qua mọi phản hồi cũ còn đang chờ
      setData(cached.data as TablePage<T>); setLoadedAt(cached.loadedAt); setLoading(false); setError('');
      if (!background) return;
    }
    const request = ++latestRequest.current;
    if (!background) { setLoading(true); setError(''); }
    const inflightId = `${key}|${cacheId(page)}`;
    let pending = inflight.get(inflightId);
    if (!pending) {
      pending = (fetcher.current({ page, limit: pageSize, q: debouncedQuery, sort, filters: filterValues }) as Promise<TablePage<unknown>>)
        .finally(() => inflight.delete(inflightId));
      inflight.set(inflightId, pending);
    }
    try {
      const result = await pending as TablePage<T>;
      if (request !== latestRequest.current) return;
      const entry = { data: result as TablePage<unknown>, loadedAt: Date.now() };
      pageCache(key).set(cacheId(page), entry);
      setData(result); setLoadedAt(entry.loadedAt);
    } catch (loadError) {
      // Tải ngầm lỗi thì giữ nguyên dữ liệu đang hiện, không làm phiền người dùng.
      if (request === latestRequest.current && !background) setError(loadError instanceof Error ? loadError.message : 'Không tải được dữ liệu');
    } finally { if (request === latestRequest.current) setLoading(false); }
    // cacheId phụ thuộc đúng các giá trị trong danh sách bên dưới.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, page, pageSize, debouncedQuery, sort, filterValues, alwaysRevalidate]);

  /** Nút "Làm mới": bỏ các trang đã lưu của bảng này rồi tải lại trang đang xem. */
  const refresh = useCallback(() => {
    pageCache(key).clear();
    void load(true);
  }, [key, load]);
  useEffect(() => {
    if (reloadKey !== handledReload.current) {
      handledReload.current = reloadKey;
      refresh();
      // Vừa sửa dữ liệu: trang dựng từ máy chủ đang lưu trong trình duyệt (ví dụ Tổng quan) cũng đã cũ và sẽ được
      // làm mới khi mở. Không gọi router.refresh() ở đây vì lệnh đó dựng lại trang đang xem (mất nút "Hoàn tác").
      markAdminPagesStale();
      return;
    }
    void load(false);
  }, [load, reloadKey, refresh]);
  useEffect(() => { snapshots.set(key, { page, query: debouncedQuery, sort, filters: filterValues, reloadKey }); },
    [key, page, debouncedQuery, sort, filterValues, reloadKey]);
  const onDataRef = useRef(onData);
  onDataRef.current = onData;
  useEffect(() => { onDataRef.current?.(data?.items ?? []); }, [data]);

  const changeSort = (value: string) => { setSort(value); setPage(1); };
  const changeFilter = (name: string, value: string) => { setFilterValues((current) => compactFilters({ ...current, [name]: value })); setPage(1); };
  const resetView = () => { setSort(defaultSort); setFilterValues({}); setPage(1); };
  const customized = sort !== defaultSort || Object.keys(filterValues).length > 0;
  const sortOptions = sorts && sorts.length > 1 ? sorts : null;
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  return <div className="space-y-4">
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {searchPlaceholder && <label className="relative w-full sm:w-80 lg:w-96">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-charcoal-400" aria-hidden />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder}
            className="min-h-11 w-full rounded-xl border border-cream-300 bg-white pl-9 pr-3 text-sm" />
        </label>}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {loadedAt && <span className="text-xs text-charcoal-500">Cập nhật lúc {new Date(loadedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>}
          <button type="button" onClick={refresh} disabled={loading} title="Tải lại dữ liệu mới nhất từ máy chủ"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cream-300 bg-white px-3 text-sm font-semibold text-charcoal-700 transition-colors hover:border-honey-300 hover:text-honey-700 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'motion-safe:animate-spin' : ''}`} aria-hidden />Làm mới
          </button>
          {toolbar}
        </div>
      </div>
      {(sortOptions || Boolean(filters?.length)) && <div className="flex flex-wrap items-center gap-2">
        {sortOptions && <label className="relative w-full sm:w-auto">
          <ArrowUpDown className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-charcoal-400" aria-hidden />
          <select aria-label="Sắp xếp" title="Sắp xếp" value={sort} onChange={(event) => changeSort(event.target.value)}
            className={`${selectBase} border-cream-300 bg-white pl-9 pr-3`}>
            {sortOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>}
        {filters?.map((group) => {
          const value = filterValues[group.key] ?? '';
          // Nhóm đang lọc được tô nhẹ để không quên mình đang xem một phần dữ liệu.
          return <select key={group.key} aria-label={group.label} title={group.label} value={value}
            onChange={(event) => changeFilter(group.key, event.target.value)}
            className={`${selectBase} px-3 ${value ? 'border-honey-400 bg-honey-50' : 'border-cream-300 bg-white'}`}>
            <option value="">{group.all ?? `Tất cả ${group.label.toLocaleLowerCase('vi-VN')}`}</option>
            {group.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>;
        })}
        {customized && <button type="button" onClick={resetView}
          className="min-h-11 rounded-xl px-3 text-sm font-semibold text-honey-700 hover:bg-honey-50">Đặt lại</button>}
      </div>}
    </div>

    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

    <div className="overflow-x-auto rounded-2xl border border-cream-200 bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-cream-50 text-xs uppercase tracking-wide text-charcoal-600">
          <tr>{columns.map((column) => <th key={column.key} className={`px-4 py-3 font-bold ${column.className || ''}`}>{column.header}</th>)}</tr>
        </thead>
        {/* Lần đầu: khung shimmer. Tải lại: giữ dòng cũ, làm mờ nhẹ, không nhảy bố cục. */}
        <tbody aria-busy={loading} className={`transition-opacity duration-200 ${loading && data ? 'opacity-60' : ''}`}>
          {!data && loading && Array.from({ length: Math.min(pageSize, 5) }, (_, index) => <tr key={index} className="border-t border-cream-100">
            <td colSpan={columns.length} className="px-4 py-3"><div className="shimmer h-6 rounded-lg" /></td>
          </tr>)}
          {(data?.items || []).map((row) => <tr key={row.id}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={`border-t border-cream-100 ${onRowClick ? 'cursor-pointer transition-colors hover:bg-honey-50' : ''}`}>
            {columns.map((column) => <td key={column.key} className={`px-4 py-3 align-middle ${column.className || ''}`}>
              {column.render(row)}
            </td>)}
          </tr>)}
        </tbody>
      </table>
      {loading && <p role="status" className="sr-only">Đang tải…</p>}
      {!loading && (data?.items.length || 0) === 0 && <p className="p-6 text-sm text-charcoal-500">{emptyText || 'Không có dữ liệu.'}</p>}
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-charcoal-600">
      <span>{total} bản ghi · trang {data?.page ?? 1}/{pages}</span>
      <div className="flex items-center gap-2">
        <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}
          className="flex min-h-11 items-center gap-1 rounded-xl border border-cream-300 px-3 font-semibold disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" /> Trước
        </button>
        <button type="button" disabled={page >= pages || loading} onClick={() => setPage((current) => current + 1)}
          className="flex min-h-11 items-center gap-1 rounded-xl border border-cream-300 px-3 font-semibold disabled:opacity-40">
          Sau <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>;
}
