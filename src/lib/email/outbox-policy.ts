export function retryEmailJob(attempts: number, now = Date.now()) {
  return { status: attempts >= 5 ? 'failed' : 'pending', nextAttemptAt: new Date(now + Math.min(60_000 * 2 ** Math.max(0, attempts - 1), 60 * 60_000)) };
}
