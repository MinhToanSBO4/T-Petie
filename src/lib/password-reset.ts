import { createHmac, randomBytes } from 'node:crypto';

export function createTemporaryPassword(): string {
  return randomBytes(24).toString('base64url');
}

export function credentialFingerprint(passwordHash: string | null, secret: string): string {
  return createHmac('sha256', secret).update(passwordHash || '').digest('hex');
}
