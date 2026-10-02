/** Số trang cần hiện: trang đầu, cuối và hai bên trang hiện tại; khoảng trống thành "…". */
export function pageWindow(page: number, pages: number): (number | 'gap')[] {
  const wanted = new Set([1, pages, page - 1, page, page + 1].filter((value) => value >= 1 && value <= pages));
  // Gần đầu/cuối thì hiện đủ 5 số để thanh không co giãn.
  if (page <= 3) [2, 3, 4].forEach((value) => value <= pages && wanted.add(value));
  if (page >= pages - 2) [pages - 3, pages - 2, pages - 1].forEach((value) => value >= 1 && wanted.add(value));
  const sorted = [...wanted].sort((a, b) => a - b);
  return sorted.flatMap((value, index) => index > 0 && value - sorted[index - 1] > 1 ? ['gap' as const, value] : [value]);
}
