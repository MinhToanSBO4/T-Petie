import { createHash, randomBytes } from 'node:crypto';
export type TokenPurpose = 'verify' | 'reset';
export const createAccountToken = () => randomBytes(32).toString('hex');
export const tokenDigest = (raw: string) => createHash('sha256').update(raw).digest('hex');
export const tokenExpired = (expires: Date, now = new Date()) => expires.getTime() <= now.getTime();
export function tokenPurpose(identifier: string, purpose: TokenPurpose) {
  return identifier.startsWith(`${purpose}:`) && identifier.length > purpose.length + 1 ? identifier.slice(purpose.length + 1) : null;
}
export function eligibleCustomer(user: { role: string; status: string; deletedAt: Date | null } | null) {
  return Boolean(user && user.role === 'user' && user.status === 'active' && !user.deletedAt);
}
export function requiresEmailVerification(user: { role: string; emailVerificationRequired: boolean; emailVerified: Date | null }) {
  return user.role === 'user' && user.emailVerificationRequired && !user.emailVerified;
}
