/**
 * Tham số pool kết nối Prisma theo nơi ứng dụng chạy. Hàm thuần (không đọc biến môi trường) để test được.
 *
 * - Máy chủ chạy lâu (`next dev`, `next start`): một tiến trình phục vụ mọi request, nên cần vài kết nối
 *   song song. Trước đây chỉ có 1 kết nối: chuyển tab liên tục làm các truy vấn xếp hàng quá 10 giây và lỗi
 *   "Timed out fetching a new connection from the connection pool".
 * - Lúc build: Next dựng nhiều trang song song.
 * - Vercel (serverless): nên dùng transaction pooler của Supabase (cổng 6543). Pooler gom kết nối nên mỗi
 *   instance giữ được vài kết nối; với session pooler (5432) mỗi kết nối chiếm một kết nối thật của database,
 *   nên chỉ giữ 1 và cảnh báo để đổi sang 6543.
 * Tham số đã có sẵn trong chuỗi kết nối luôn được giữ nguyên, nên vẫn chỉnh tay được khi cần.
 */
export const POOL_DEFAULTS = {
  server: { connectionLimit: 5, poolTimeout: 20 },
  build: { connectionLimit: 5, poolTimeout: 30 },
  serverlessTransaction: { connectionLimit: 5, poolTimeout: 20 },
  serverlessSession: { connectionLimit: 1, poolTimeout: 20 },
} as const;

export type RuntimeKind = 'server' | 'build' | 'serverless';

export function isTransactionPooler(url: URL) {
  return url.port === '6543' || url.searchParams.get('pgbouncer') === 'true';
}

export function resolveConnectionUrl(raw: string, runtime: RuntimeKind): { url: string; warning?: string } {
  const url = new URL(raw);
  const params = url.searchParams;
  const transaction = isTransactionPooler(url);
  // Transaction pooler không giữ prepared statement giữa các truy vấn; thiếu cờ này Prisma sẽ gặp lỗi
  // "prepared statement \"s0\" already exists".
  if (url.port === '6543' && !params.has('pgbouncer')) params.set('pgbouncer', 'true');
  const defaults = runtime === 'build' ? POOL_DEFAULTS.build
    : runtime === 'server' ? POOL_DEFAULTS.server
      : transaction ? POOL_DEFAULTS.serverlessTransaction : POOL_DEFAULTS.serverlessSession;
  if (!params.has('connection_limit')) params.set('connection_limit', String(defaults.connectionLimit));
  if (!params.has('pool_timeout')) params.set('pool_timeout', String(defaults.poolTimeout));
  const warning = runtime === 'serverless' && !transaction && /\.pooler\.supabase\.com$/i.test(url.hostname)
    ? 'CONNECTION_STRING đang dùng session pooler (cổng 5432) trên môi trường serverless. Nên đổi sang transaction pooler (cổng 6543, pgbouncer=true) để tránh hết kết nối.'
    : undefined;
  return { url: url.toString(), warning };
}
