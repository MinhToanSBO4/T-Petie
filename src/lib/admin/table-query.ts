/** Tham số danh sách của bảng quản trị (DataTable), dùng chung cho trình duyệt và test. */
export type TableOption = { value: string; label: string };
/** Một nhóm lọc, hiện thành một ô chọn. `key` là tên tham số gửi lên API; dòng đầu ("Tất cả …" hoặc `all`) là không lọc. */
export type TableFilter = { key: string; label: string; all?: string; options: TableOption[] };
/** `filters` chỉ gồm các nhóm đang lọc: tên tham số → giá trị. */
export type TableQuery = { page: number; limit: number; q: string; sort: string; filters: Record<string, string> };

/** Bỏ nhóm không lọc và xếp tên tham số cố định: cùng lựa chọn luôn ra cùng khóa bộ nhớ đệm. */
export function compactFilters(filters: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value).sort(([a], [b]) => (a < b ? -1 : 1)));
}

/** Tham số chung cho API danh sách (trang, từ khóa, sắp xếp, bộ lọc); `extra` là tham số cố định riêng của từng bảng. */
export function tableParams(query: TableQuery, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit), q: query.q });
  if (query.sort) params.set('sort', query.sort);
  for (const [name, value] of Object.entries({ ...query.filters, ...extra })) params.set(name, value);
  return params;
}
