/** Chờ trước lần thử thứ 2, 3, 4, 5: lỗi thoáng qua được gửi lại ngay trong lần chạy, sự cố dài thì giãn dần. */
const BACKOFF_MS = [30_000, 2 * 60_000, 10 * 60_000, 60 * 60_000];

export function retryEmailJob(attempts: number, now = Date.now()) {
  const delay = BACKOFF_MS[Math.min(Math.max(attempts, 1), BACKOFF_MS.length) - 1];
  return { status: attempts >= 5 ? 'failed' : 'pending', nextAttemptAt: new Date(now + delay) };
}
