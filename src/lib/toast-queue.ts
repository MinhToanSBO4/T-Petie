/**
 * Hàng đợi thông báo nổi ở góc màn hình (toast), viết thuần để kiểm thử (tests/toast-queue.test.mjs): thêm hoặc cập
 * nhật theo id, gộp thông báo trùng, giới hạn số thông báo hiện cùng lúc và thời gian hiện theo độ dài nội dung.
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'love' | 'loading';

/** Nút trong thông báo: `href` để chuyển trang (`download` khi là file tải về), hoặc `onClick`. */
export type ToastAction = { label: string; href?: string; download?: boolean; onClick?: () => void };

export type ToastInput = {
  type: ToastType;
  message: string;
  /** Cùng id thì thay thông báo cũ tại chỗ, ví dụ "Đang lưu…" thành "Đã lưu". */
  id?: string;
  description?: string;
  /** Mili giây; Infinity giữ tới khi người dùng đóng hoặc mã gọi cập nhật. */
  duration?: number;
  /** 0–100: thanh tiến độ khi tải ảnh, tạo file… */
  progress?: number | null;
  action?: ToastAction | null;
};

export type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration: number;
  progress: number | null;
  action: ToastAction | null;
  /** Tăng mỗi lần nội dung đổi: đồng hồ tự đóng chạy lại từ đầu. */
  version: number;
};

export const MAX_VISIBLE_TOASTS = 4;
/** Thông báo "đang xử lý" không được cập nhật trong chừng này thì tự đóng, phòng khi thao tác bị bỏ dở giữa chừng. */
export const LOADING_TIMEOUT_MS = 120_000;

const MIN_DURATION: Record<Exclude<ToastType, 'loading'>, number> = {
  success: 3_500, info: 3_500, love: 3_500, warning: 5_000, error: 6_000,
};

/** Đủ thời gian để đọc: khoảng 55 ms mỗi ký tự, tối đa 12 giây. Lỗi hiện lâu hơn thông báo thành công. */
export function toastDuration(type: ToastType, message: string, description = ''): number {
  if (type === 'loading') return LOADING_TIMEOUT_MS;
  return Math.min(12_000, Math.max(MIN_DURATION[type], 1_500 + (message.length + description.length) * 55));
}

export function clampProgress(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function upsertToast(list: readonly ToastItem[], input: ToastInput, newId: () => string): { list: ToastItem[]; id: string } {
  const existing = input.id !== undefined
    ? list.find((toast) => toast.id === input.id)
    // Cùng nội dung còn đang hiện (bấm lại một nút nhiều lần): làm mới thông báo cũ thay vì xếp chồng bản giống hệt.
    : list.find((toast) => toast.type === input.type && toast.message === input.message && toast.description === input.description);
  const fields = {
    type: input.type,
    message: input.message,
    description: input.description,
    duration: input.duration ?? toastDuration(input.type, input.message, input.description),
    progress: clampProgress(input.progress),
    action: input.action ?? null,
  };
  if (existing) {
    const updated: ToastItem = { ...existing, ...fields, version: existing.version + 1 };
    return { list: list.map((toast) => (toast.id === existing.id ? updated : toast)), id: existing.id };
  }
  const created: ToastItem = { id: input.id ?? newId(), ...fields, version: 0 };
  const next = [...list, created];
  // Quá số lượng: bỏ thông báo cũ nhất, trừ thông báo đang theo dõi một thao tác chưa xong.
  while (next.length > MAX_VISIBLE_TOASTS) {
    const oldest = next.findIndex((toast) => toast.type !== 'loading' && toast !== created);
    if (oldest === -1) break;
    next.splice(oldest, 1);
  }
  return { list: next, id: created.id };
}

/** Sửa vài trường (thường là tiến độ) của thông báo đang hiện; thông báo đã đóng thì không mở lại. */
export function patchToast(list: readonly ToastItem[], id: string, patch: Partial<Omit<ToastInput, 'id'>>): ToastItem[] {
  const current = list.find((toast) => toast.id === id);
  if (!current) return list as ToastItem[];
  const contentChanged = patch.type !== undefined || patch.message !== undefined || patch.description !== undefined;
  return upsertToast(list, {
    type: current.type,
    message: current.message,
    description: current.description,
    progress: current.progress,
    action: current.action,
    // Chỉ đổi tiến độ thì giữ thời gian hiện đã tính; đổi nội dung thì tính lại theo nội dung mới.
    ...(contentChanged ? {} : { duration: current.duration }),
    ...patch,
    id,
  }, () => id).list;
}

export function removeToast(list: readonly ToastItem[], id: string): ToastItem[] {
  return list.some((toast) => toast.id === id) ? list.filter((toast) => toast.id !== id) : list as ToastItem[];
}
