import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const COOKIE_NAME = 'siena_session';
function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters.');
  return new TextEncoder().encode(value);
}
export type SessionUser = { id: string; name: string; username: string; email: string; role: 'owner'|'manager'|'admin'|'employee'|'cashier'|'inventory' };
export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ name: user.name, email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(user.id).setIssuedAt().setIssuer('siena-aguilar').setAudience('siena-app').setExpirationTime('30d').sign(secret());
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60 });
}
export async function clearSession() { const jar = await cookies(); jar.set(COOKIE_NAME, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 }); }
export async function getSessionUser(): Promise<SessionUser|null> {
  const jar = await cookies(); const token = jar.get(COOKIE_NAME)?.value; if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: 'siena-aguilar', audience: 'siena-app' });
    if (!payload.sub) return null;
    if (!db) return null;
    const [user] = await db.select({id:users.id,name:users.name,username:users.username,email:users.email,role:users.role,active:users.active}).from(users).where(eq(users.id,payload.sub)).limit(1);
    if (!user || !user.active) return null;
    return {id:user.id,name:user.name,username:user.username,email:user.email,role:user.role};
  } catch { return null; }
}
export async function requireRole(roles: SessionUser['role'][]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error('UNAUTHENTICATED');
  if (!roles.includes(user.role)) throw new Error('FORBIDDEN');
  return user;
}
