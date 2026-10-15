import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';

// Pre-hash with SHA-256 so passwords longer than bcrypt's 72-byte input limit
// are still verified in full. Legacy bcrypt hashes are still accepted.
function normalizeForBcrypt(password: string) {
  const digest = createHash('sha256').update(password, 'utf8').digest('hex');
  return `sha256:${digest}`;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(normalizeForBcrypt(password), 12);
}

export async function verifyPassword(password: string, storedHash: string) {
  if (await bcrypt.compare(password, storedHash).catch(() => false)) return true;
  return bcrypt.compare(normalizeForBcrypt(password), storedHash).catch(() => false);
}
