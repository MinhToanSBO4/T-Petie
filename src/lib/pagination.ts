/** Trang lớn hơn mức này chỉ có thể do gõ tay/tấn công; chặn để OFFSET khổng lồ không làm chậm database. */
export const MAX_PAGE = 10_000;

/** Chuẩn hóa tham số phân trang cho các API quản trị. */
export function parsePagination(searchParams: URLSearchParams, defaultLimit = 10, maxLimit = 100) {
  const page = Math.min(MAX_PAGE, Math.max(1, Math.floor(Number(searchParams.get('page'))) || 1));
  const limit = Math.min(maxLimit, Math.max(1, Math.floor(Number(searchParams.get('limit'))) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

/** Từ khóa tìm kiếm đã cắt gọn, dùng cho các truy vấn `contains`. */
export function parseSearch(searchParams: URLSearchParams, maxLength = 100) {
  return (searchParams.get('q') || '').trim().slice(0, maxLength);
}

/**
 * Giá trị khai báo sẵn trong `choices` cho tham số `name` (cách sắp xếp, bộ lọc...); giá trị lạ trả về undefined để API
 * dùng mặc định. Chỉ nhận khóa riêng của bảng nên "__proto__", "constructor"... không lọt vào truy vấn.
 */
export function parseChoice<T>(searchParams: URLSearchParams, name: string, choices: Record<string, T>): T | undefined {
  const value = searchParams.get(name);
  return value !== null && Object.hasOwn(choices, value) ? choices[value] : undefined;
}

/**
 * Chia một trang (skip/take) cho các nhóm dòng nối tiếp nhau đã biết số dòng, để mỗi nhóm truy vấn với thứ tự riêng
 * (ví dụ mã còn hạn trước, mã đã hết hạn sau) mà phân trang vẫn liền mạch.
 */
export function splitPage(skip: number, take: number, sizes: number[]) {
  let offset = skip;
  let remaining = take;
  return sizes.map((size) => {
    const part = { skip: Math.min(offset, size), take: 0 };
    part.take = Math.min(remaining, size - part.skip);
    offset -= part.skip;
    remaining -= part.take;
    return part;
  });
}

export type Paginated<T> = { items: T[]; total: number; page: number; pages: number };

export function paginated<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}
