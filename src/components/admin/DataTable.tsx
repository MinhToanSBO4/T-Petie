'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
};

export type TablePage<T> = { items: T[]; total: number; page: number; pages: number };
export type TableQuery = { page: number; limit: number; q: string; filter: string };
export type TableFilter = { value: string; label: string };

/**
 * Bảng quản trị dùng chung: tìm kiếm, lọc, phân trang phía máy chủ và thanh nút chức năng.
 * Mỗi trang chỉ tải đúng số dòng cần hiển thị.
 */
export function DataTable<T extends { id: string }>({
  columns, fetchPage, toolbar, searchPlaceholder, emptyText, onRowClick, filters, pageSize = 10, reloadKey = 0,
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
}) {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [data, setData] = useState<TablePage<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fetcher = useRef(fetchPage);
  fetcher.current = fetchPage;

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedQuery(query); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await fetcher.current({ page, limit: pageSize, q: debouncedQuery, filter });
      setData(result);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Không tải được dữ liệu'); }
    finally { setLoading(false); }
  }, [page, pageSize, debouncedQuery, filter]);

  useEffect(() => { void load(); }, [load, reloadKey]);

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
      {toolbar}
    </div>

    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

    <div className="overflow-x-auto rounded-2xl border border-cream-200 bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-cream-50 text-xs uppercase tracking-wide text-charcoal-600">
          <tr>{columns.map((column) => <th key={column.key} className={`px-4 py-3 font-bold ${column.className || ''}`}>{column.header}</th>)}</tr>
        </thead>
        <tbody>
          {(data?.items || []).map((row) => <tr key={row.id}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={`border-t border-cream-100 ${onRowClick ? 'cursor-pointer hover:bg-cream-50' : ''}`}>
            {columns.map((column) => <td key={column.key} className={`px-4 py-3 align-middle ${column.className || ''}`}>
              {column.render(row)}
            </td>)}
          </tr>)}
        </tbody>
      </table>
      {loading && <p className="p-4 text-sm text-charcoal-500">Đang tải…</p>}
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
