import 'server-only';
import { prisma } from '@/server/db/client';

/**
 * Thông tin tài khoản mà phiên đăng nhập cần kiểm tra ở mỗi request (vai trò, trạng thái khóa, dấu vân tay mật khẩu,
 * hồ sơ hiển thị). Trước đây mỗi request đều truy vấn database; chuyển tab nhanh tạo hàng loạt truy vấn giống hệt nhau.
 * - Các request cùng lúc của một tài khoản dùng chung một truy vấn.
 * - Kết quả được giữ SNAPSHOT_TTL_MS trong bộ nhớ tiến trình. Mọi chỗ sửa tài khoản trong ứng dụng gọi
 *   `forgetUserSnapshot` nên thay đổi có hiệu lực ngay trên máy chủ đó; máy chủ khác (nhiều instance trên Vercel)
 *   chậm tối đa SNAPSHOT_TTL_MS, ví dụ tài khoản vừa bị khóa còn dùng được thêm vài giây.
 */
export const SNAPSHOT_TTL_MS = 15_000;
const MAX_ENTRIES = 2_000;

const userSelect = {
  role: true, status: true, password: true, phone: true, address: true, city: true, points: true,
  babyName: true, babyBirthDate: true, babyWeight: true, babyHeight: true, babyGender: true, recommendedSize: true,
} as const;

type UserSnapshot = Awaited<ReturnType<typeof loadSnapshot>>;
type Store = {
  entries: Map<string, { value: UserSnapshot; expiresAt: number }>;
  pending: Map<string, Promise<UserSnapshot>>;
  /** Tăng mỗi lần tài khoản bị sửa: kết quả của truy vấn bắt đầu trước lần sửa không được giữ lại. */
  generation: Map<string, number>;
};

// Lưu trên globalThis để route handler và trang (các bundle khác nhau của Next) dùng chung một bộ nhớ.
const globalStore = globalThis as unknown as { __tpetieUserSnapshots?: Store };
const store: Store = globalStore.__tpetieUserSnapshots ??= { entries: new Map(), pending: new Map(), generation: new Map() };

function loadSnapshot(id: string) {
  return prisma.user.findUnique({ where: { id }, select: userSelect });
}

/** Đọc thông tin tài khoản cho phiên; `fresh` bỏ qua bản đang giữ (dùng khi vừa đăng nhập). */
export async function readUserSnapshot(id: string, { fresh = false } = {}): Promise<UserSnapshot> {
  const cached = store.entries.get(id);
  if (!fresh && cached && cached.expiresAt > Date.now()) return cached.value;
  const generation = store.generation.get(id) ?? 0;
  let pending = fresh ? undefined : store.pending.get(id);
  if (!pending) {
    const started = loadSnapshot(id).finally(() => { if (store.pending.get(id) === started) store.pending.delete(id); });
    pending = started;
    store.pending.set(id, started);
  }
  const value = await pending;
  if ((store.generation.get(id) ?? 0) === generation) {
    if (store.entries.size >= MAX_ENTRIES) {
      const now = Date.now();
      for (const [key, entry] of store.entries) if (entry.expiresAt <= now) store.entries.delete(key);
      if (store.entries.size >= MAX_ENTRIES) store.entries.clear();
    }
    store.entries.set(id, { value, expiresAt: Date.now() + SNAPSHOT_TTL_MS });
  }
  return value;
}

/** Gọi sau khi sửa tài khoản (khóa/mở khóa, đổi vai trò, đặt lại mật khẩu, sửa hồ sơ, xóa). */
export function forgetUserSnapshot(id: string) {
  store.entries.delete(id);
  store.pending.delete(id);
  store.generation.set(id, (store.generation.get(id) ?? 0) + 1);
}
