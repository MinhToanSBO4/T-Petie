import {
  patchToast, removeToast, upsertToast,
  type ToastAction, type ToastInput, type ToastItem, type ToastType,
} from '@/lib/toast-queue';

export type { ToastAction, ToastItem, ToastType };
export type ToastOptions = Omit<ToastInput, 'type' | 'message'>;
export type ToastPatch = Partial<Omit<ToastInput, 'id'>>;

/**
 * Kho thông báo của cả trang. Nằm ngoài React nên thông báo không mất khi trang hay component đổi (chuyển trang trong
 * lúc đang lưu vẫn thấy kết quả), và gọi được từ bất kỳ đâu trong mã trình duyệt. `Toaster` hiển thị danh sách này.
 *
 *   const id = toast.loading('Đang lưu sản phẩm…');
 *   toast.update(id, { progress: 40 });            // tiến độ, không mở lại nếu người dùng đã đóng
 *   toast.success('Đã lưu sản phẩm', { id });      // thay "Đang lưu…" tại chỗ
 */
let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();
/** Thông báo "đang xử lý" người dùng đã tự đóng: các bước tiến độ sau không mở lại, kết quả cuối vẫn hiện. */
const closedByUser = new Set<string>();
let sequence = 0;

function commit(next: ToastItem[]) {
  if (next === toasts) return;
  toasts = next;
  listeners.forEach((listener) => listener());
}

function show(type: ToastType, message: string, options: ToastOptions = {}): string {
  if (options.id && closedByUser.has(options.id)) {
    if (type === 'loading') return options.id;
    closedByUser.delete(options.id);
  }
  const result = upsertToast(toasts, { ...options, type, message }, () => `toast-${++sequence}`);
  commit(result.list);
  return result.id;
}

/** fetch() không tới được máy chủ: Chrome, Firefox, Safari mỗi nơi một câu, đều là TypeError. */
const NETWORK_FAILURE = /^(Failed to fetch|NetworkError when attempting to fetch resource\.?|Load failed|Network request failed)$/i;

/** Câu báo lỗi cho người dùng: nội dung lỗi (thường là lời máy chủ trả về), hoặc `fallback`; lỗi mạng có câu riêng. */
export function errorText(error: unknown, fallback = 'Có lỗi xảy ra, vui lòng thử lại.'): string {
  if (error instanceof TypeError && NETWORK_FAILURE.test(error.message)) {
    return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

export const toast = {
  success: (message: string, options?: ToastOptions) => show('success', message, options),
  error: (message: string, options?: ToastOptions) => show('error', message, options),
  warning: (message: string, options?: ToastOptions) => show('warning', message, options),
  info: (message: string, options?: ToastOptions) => show('info', message, options),
  love: (message: string, options?: ToastOptions) => show('love', message, options),
  /** Thao tác đang chạy: hiện tới khi được thay bằng kết quả (cùng id) hoặc bị đóng. */
  loading: (message: string, options?: ToastOptions) => show('loading', message, options),
  update(id: string, patch: ToastPatch) {
    commit(patchToast(toasts, id, patch));
  },
  dismiss(id: string, { byUser = false } = {}) {
    const current = toasts.find((item) => item.id === id);
    if (byUser && current?.type === 'loading') {
      if (closedByUser.size > 100) closedByUser.clear();
      closedByUser.add(id);
    }
    commit(removeToast(toasts, id));
  },
  /**
   * Hiện "đang xử lý" trong lúc chờ, rồi đổi thành kết quả. `error` dạng chuỗi chỉ dùng khi lỗi không kèm nội dung
   * (lỗi máy chủ trả về thường cụ thể hơn). Lỗi vẫn được ném lại cho nơi gọi.
   */
  async promise<T>(work: Promise<T>, messages: {
    loading: string;
    success: string | ((value: T) => string);
    error?: string | ((error: unknown) => string);
  }, options: ToastOptions = {}): Promise<T> {
    const id = show('loading', messages.loading, options);
    try {
      const value = await work;
      show('success', typeof messages.success === 'function' ? messages.success(value) : messages.success, { id });
      return value;
    } catch (error) {
      const text = typeof messages.error === 'function' ? messages.error(error) : errorText(error, messages.error);
      show('error', text, { id });
      throw error;
    }
  },
};

export function subscribeToasts(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export const getToasts = () => toasts;
const NONE: ToastItem[] = [];
export const getServerToasts = () => NONE;
