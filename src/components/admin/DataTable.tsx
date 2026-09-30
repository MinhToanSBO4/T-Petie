'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
};

export type TablePage<T> = { items: T[]; total: number; page: number; pages: number };
export type TableQuery = { page: number; limit: number; q: string; filter: string };
export type TableFilter = { value: string; label: string };

type Snapshot = { page: number; query: string; filter: string; reloadKey: number };
type CachedPage = { data: TablePage<unknown>; loadedAt: number };
/**
 * Bộ nhớ đệm của bảng quản trị, nằm trong bộ nhớ tab trình duyệt nên mất khi F5.
 * - snapshots: trang/từ khóa/bộ lọc đang xem, để quay lại đúng chỗ.
 * - pages: dữ liệu từng trang đã tải; xem lại không gửi truy vấn nào lên máy chủ.
 * Dữ liệu chỉ tải lại khi bấm "Làm mới", sau khi chính người dùng sửa dữ liệu (reloadKey đổi), hoặc F5.
 */
const snapshots = new Map<string, Snapshot>();
const pageStore = new Map<string, Map<string, CachedPage>>();
/** Request đang chờ theo cùng tham số: bấm nhanh, dựng lại hay StrictMode đều dùng chung một lần gọi. */
const inflight = new Map<string, Promise<TablePage<unknown>>>();
const pageCache = (table: string) => {
  if (!pageStore.has(table)) pageStore.set(table, new Map());
  return pageStore.get(table)!;
};

/**
 * Bảng quản trị dùng chung: tìm kiếm, lọc, phân trang phía máy chủ và thanh nút chức năng.
 * Mỗi trang chỉ tải đúng số dòng cần hiển thị.
 */
export function DataTable<T extends { id: string }>({
  columns, fetchPage, toolbar, searchPlaceholder, emptyText, onRowClick, filters, pageSize = 10, reloadKey = 0, stateKey,
}: {
  columns: Column<T>[];
  fetchPage: (query: TableQuery) => Promise<TablePage<T>>;
  toolbar?: React.ReactNode;
  searchPlaceholder?: string;
  emptyText?: string;
  onRowClick?: (row: T) => void;
  filters?: TableFilter[];
  pageSize?: number;
  reloadKey?: number;
  /** Mặc định là đường dẫn trang; chỉ cần đặt khi một trang có nhiều bảng. */
  stateKey?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const key = stateKey || pathname;
  const saved = snapshots.get(key);
  const [page, setPage] = useState(saved?.page ?? 1);
  const [query, setQuery] = useState(saved?.query ?? '');
  const [debouncedQuery, setDebouncedQuery] = useState(saved?.query ?? '');
  const [filter, setFilter] = useState(saved?.filter ?? '');
  const cacheId = (target: number) => JSON.stringify([target, pageSize, debouncedQuery, filter]);
  const initial = pageCache(key).get(JSON.stringify([saved?.page ?? 1, pageSize, saved?.query ?? '', saved?.filter ?? '']));
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
    if (cached && !force) {
      latestRequest.current += 1; // bỏ qua mọi phản hồi cũ còn đang chờ
      setData(cached.data as TablePage<T>); setLoadedAt(cached.loadedAt); setLoading(false); setError('');
      return;
    }
    const request = ++latestRequest.current;
    setLoading(true); setError('');
    const inflightId = `${key}|${cacheId(page)}`;
    let pending = inflight.get(inflightId);
    if (!pending) {
      pending = (fetcher.current({ page, limit: pageSize, q: debouncedQuery, filter }) as Promise<TablePage<unknown>>)
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
      if (request === latestRequest.current) setError(loadError instanceof Error ? loadError.message : 'Không tải được dữ liệu');
    } finally { if (request === latestRequest.current) setLoading(false); }
    // cacheId phụ thuộc đúng các giá trị trong danh sách bên dưới.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, page, pageSize, debouncedQuery, filter]);

  /** Nút "Làm mới": bỏ các trang đã lưu của bảng này rồi tải lại trang đang xem. */
  const refresh = useCallback(() => {
    pageCache(key).clear();
    void load(true);
  }, [key, load]);

  useEffect(() => {
    if (reloadKey !== handledReload.current) {
      handledReload.current = reloadKey;
      refresh();
      // Vừa sửa dữ liệu: trang dựng từ máy chủ đang lưu trong trình duyệt (ví dụ Tổng quan) cũng đã cũ.
      router.refresh();
      return;
    }
    void load(false);
  }, [load, reloadKey, refresh, router]);
  useEffect(() => { snapshots.set(key, { page, query: debouncedQuery, filter, reloadKey }); }, [key, page, debouncedQuery, filter, reloadKey]);

  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {searchPlaceholder && <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-charcoal-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder}
            className="min-h-11 w-64 rounded-xl border border-cream-300 bg-white pl-9 pr-3 text-sm" />
        </label>}
        {filters && filters.length > 0 && <select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }}
          className="min-h-11 rounded-xl border border-cream-300 bg-white px-3 text-sm">
          <option value="">Tất cả</option>
          {filters.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {loadedAt && <span className="text-xs text-charcoal-500">Cập nhật lúc {new Date(loadedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>}
        <button type="button" onClick={refresh} disabled={loading} title="Tải lại dữ liệu mới nhất từ máy chủ"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cream-300 bg-white px-3 text-sm font-semibold text-charcoal-700 transition-colors hover:border-honey-300 hover:text-honey-700 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'motion-safe:animate-spin' : ''}`} aria-hidden />Làm mới
        </button>
        {toolbar}
      </div>
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
