export function parseLoginIdentifier(raw: string | undefined | null): { email: string } | { username: string } | null {
  const value = raw?.trim().toLowerCase();
  if (!value || value.length > 254) return null;
  if (value.includes('@')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? { email: value } : null;
  }
  return /^[a-z][a-z0-9_]{2,31}$/.test(value) ? { username: value } : null;
}

/**
 * Trang quay lại sau khi đăng nhập: chỉ nhận đường dẫn trong website ("/orders"), chặn "//evil.com",
 * "https://..." hay "/\\evil" để liên kết đăng nhập không bị lợi dụng chuyển khách sang trang lừa đảo.
 */
export function safeCallbackPath(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 500 || !raw.startsWith('/') || raw.startsWith('//') || /[\\\s]/.test(raw)) return null;
  return raw;
}
