/**
 * Hai khu làm việc nội bộ: /admin của quản trị viên và /staff của nhân viên. Mỗi vai trò chỉ dùng khu của mình;
 * mở nhầm khu kia (liên kết cũ, gõ tay) thì được đưa sang trang tương ứng thay vì báo lỗi.
 */
export type BackOfficeRole = 'admin' | 'staff';

/** Mục nhân viên dùng được, cùng tên đường dẫn ở hai khu (/admin/orders ↔ /staff/orders). */
export const STAFF_SECTIONS = ['orders', 'products', 'collections', 'content', 'reviews', 'feedback', 'account'] as const;

const AREA_ROOT: Record<BackOfficeRole, string> = { admin: '/admin', staff: '/staff' };

export function isBackOfficeRole(role: unknown): role is BackOfficeRole {
  return role === 'admin' || role === 'staff';
}

/** Trang chủ khu làm việc của vai trò; null với khách hàng. */
export function backOfficeHome(role: unknown): string | null {
  return isBackOfficeRole(role) ? AREA_ROOT[role] : null;
}

/** Khu chứa đường dẫn. So theo từng đoạn: "/staffing" không thuộc khu nào, "/admin/staff" thuộc khu admin. */
export function areaOf(path: string): BackOfficeRole | null {
  for (const role of ['admin', 'staff'] as const) {
    const root = AREA_ROOT[role];
    if (path === root || (path.startsWith(root) && ['/', '?', '#'].includes(path.charAt(root.length)))) return role;
  }
  return null;
}

/**
 * Đường dẫn tương ứng trong khu của `role`: nhân viên mở "/admin/orders?tab=X" sang "/staff/orders?tab=X". Mục nhân
 * viên không có (tổng quan, khách hàng, nhân sự, xuất dữ liệu...) và đường dẫn ngoài khu nội bộ về trang chủ khu.
 */
export function pathInArea(role: BackOfficeRole, path: string): string {
  const area = areaOf(path);
  if (area === role) return path;
  if (!area) return AREA_ROOT[role];
  const rest = path.slice(AREA_ROOT[area].length);
  const section = /^\/([^/?#]+)/.exec(rest)?.[1];
  if (!section) return AREA_ROOT[role];
  if (role === 'staff' && !(STAFF_SECTIONS as readonly string[]).includes(section)) return AREA_ROOT.staff;
  return `${AREA_ROOT[role]}${rest}`;
}

/**
 * Trang mở sau khi đăng nhập. Quản trị viên và nhân viên luôn vào khu làm việc của mình (liên kết quay lại chỉ được
 * giữ khi trỏ vào khu nội bộ, và được đổi sang đúng khu); khách hàng quay lại trang đang xem dở.
 * `callbackUrl` phải đã qua safeCallbackPath.
 */
export function landingPath(role: unknown, callbackUrl: string | null): string {
  if (!isBackOfficeRole(role)) return callbackUrl || '/';
  return callbackUrl ? pathInArea(role, callbackUrl) : AREA_ROOT[role];
}
