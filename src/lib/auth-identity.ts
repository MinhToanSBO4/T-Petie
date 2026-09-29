export function parseLoginIdentifier(raw: string | undefined | null): { email: string } | { username: string } | null {
  const value = raw?.trim().toLowerCase();
  if (!value || value.length > 254) return null;
  if (value.includes('@')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? { email: value } : null;
  }
  return /^[a-z][a-z0-9_]{2,31}$/.test(value) ? { username: value } : null;
}
