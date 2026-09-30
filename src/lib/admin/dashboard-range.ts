/**
 * Khoảng thời gian của trang tổng quan, tính theo giờ Việt Nam (UTC+7, không có giờ mùa hè)
 * để "hôm nay" và từng cột ngày khớp với ngày chủ shop thấy, không lệch theo múi giờ máy chủ.
 */
export const DASHBOARD_RANGES = {
  '7d': { label: '7 ngày', unit: 'day', count: 7 },
  '30d': { label: '30 ngày', unit: 'day', count: 30 },
  '90d': { label: '90 ngày', unit: 'day', count: 90 },
  '12m': { label: '12 tháng', unit: 'month', count: 12 },
} as const;

export type DashboardRangeKey = keyof typeof DASHBOARD_RANGES;
export const DEFAULT_RANGE: DashboardRangeKey = '30d';

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function parseRange(value: string | null | undefined): DashboardRangeKey {
  return value && Object.prototype.hasOwnProperty.call(DASHBOARD_RANGES, value) ? value as DashboardRangeKey : DEFAULT_RANGE;
}

const pad = (value: number) => String(value).padStart(2, '0');

/** Khóa cột theo cùng định dạng với to_char trong SQL: YYYY-MM-DD hoặc YYYY-MM. */
function bucketKey(vnMs: number, unit: 'day' | 'month') {
  const date = new Date(vnMs);
  const month = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
  return unit === 'month' ? month : `${month}-${pad(date.getUTCDate())}`;
}

function bucketStarts(startVnMs: number, unit: 'day' | 'month', count: number) {
  const start = new Date(startVnMs);
  return Array.from({ length: count }, (_, index) => unit === 'day'
    ? startVnMs + index * DAY_MS
    : Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1));
}

export type DashboardPeriod = {
  key: DashboardRangeKey;
  unit: 'day' | 'month';
  from: Date; to: Date;
  /** Kỳ trước cùng độ dài đã trôi qua, để so sánh công bằng khi kỳ hiện tại chưa kết thúc. */
  prevFrom: Date; prevTo: Date;
  keys: string[]; prevKeys: string[];
};

export function resolvePeriod(key: DashboardRangeKey, now = new Date()): DashboardPeriod {
  const { unit, count } = DASHBOARD_RANGES[key];
  // Các trường UTC của mốc này chính là giờ đồng hồ tại Việt Nam.
  const vnNow = new Date(now.getTime() + VN_OFFSET_MS);
  const year = vnNow.getUTCFullYear();
  const month = vnNow.getUTCMonth();
  const fromVn = unit === 'day'
    ? Date.UTC(year, month, vnNow.getUTCDate()) - (count - 1) * DAY_MS
    : Date.UTC(year, month - (count - 1), 1);
  const prevFromVn = unit === 'day' ? fromVn - count * DAY_MS : Date.UTC(year, month - (2 * count - 1), 1);
  const from = new Date(fromVn - VN_OFFSET_MS);
  const prevFrom = new Date(prevFromVn - VN_OFFSET_MS);
  return {
    key, unit, from, to: now, prevFrom,
    prevTo: new Date(prevFrom.getTime() + (now.getTime() - from.getTime())),
    keys: bucketStarts(fromVn, unit, count).map((start) => bucketKey(start, unit)),
    prevKeys: bucketStarts(prevFromVn, unit, count).map((start) => bucketKey(start, unit)),
  };
}

/** Nhãn trục ngắn gọn: "25/09" cho ngày, "09/2026" cho tháng. */
export function bucketLabel(key: string) {
  const [year, month, day] = key.split('-');
  return day ? `${day}/${month}` : `${month}/${year}`;
}

/**
 * Phần trăm thay đổi so với kỳ trước. Trả về null khi kỳ trước bằng 0 và kỳ này có số liệu,
 * vì "tăng vô hạn %" không có nghĩa với người đọc.
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}
