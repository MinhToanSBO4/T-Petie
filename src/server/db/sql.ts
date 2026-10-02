import 'server-only';
import { Prisma } from '@prisma/client';

/** Schema của ứng dụng, lấy từ tham số `schema` của CONNECTION_STRING (mặc định `public`). */
function appSchema() {
  try {
    const schema = new URL(process.env.CONNECTION_STRING || '').searchParams.get('schema') || 'public';
    return /^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(schema) ? schema : 'public';
  } catch {
    return 'public';
  }
}

const SCHEMA = appSchema();

type AppTable = 'orders' | 'order_items' | 'order_status_events' | 'customer_testimonials' | 'site_content'
  | 'rate_limit_counters' | 'product_images';

/**
 * Tên bảng kèm schema cho câu SQL viết tay (`$queryRaw`/`$executeRaw`). Truy vấn model của Prisma luôn tự ghi schema,
 * còn SQL viết tay dựa vào search_path của kết nối; qua transaction pooler của Supabase (Vercel), mỗi giao dịch có thể
 * chạy trên một kết nối chưa đặt search_path và trỏ nhầm sang schema public.
 */
export function table(name: AppTable) {
  return Prisma.raw(`"${SCHEMA}"."${name}"`);
}
