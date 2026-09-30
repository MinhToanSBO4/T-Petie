/** Chuẩn hóa tham số phân trang cho các API quản trị. */
export function parsePagination(searchParams: URLSearchParams, defaultLimit = 10, maxLimit = 100) {
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number(searchParams.get('limit')) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

/** Từ khóa tìm kiếm đã cắt gọn, dùng cho các truy vấn `contains`. */
export function parseSearch(searchParams: URLSearchParams, maxLength = 100) {
  return (searchParams.get('q') || '').trim().slice(0, maxLength);
}

export type Paginated<T> = { items: T[]; total: number; page: number; pages: number };

export function paginated<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}
