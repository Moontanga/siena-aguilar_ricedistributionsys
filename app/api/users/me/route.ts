import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, auditLogs } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

export const runtime = 'nodejs';
const schema = z.object({
  name: z.string().trim().refine(v => v.length > 0, 'Name is required.').optional(),
  username: z.string().trim().refine(v => v.length > 0, 'Username is required.').optional(),
  email: z.string().trim().email('Enter a valid email address.').optional(),
  password: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  const actor = await getSessionUser();
  if (!actor) return NextResponse.json({ error: 'Authentication required. Please sign in again.' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid profile details.' }, { status: 400 });
  const v = parsed.data;
  if (v.password !== undefined && v.password.length === 0) return NextResponse.json({ error: 'If you enter a new password, it cannot be empty.' }, { status: 400 });
  const values: Record<string, any> = { updatedAt: new Date() };
  if (v.name !== undefined) values.name = v.name;
  if (v.username !== undefined) values.username = v.username.toLowerCase().trim();
  if (v.email !== undefined) values.email = v.email.toLowerCase().trim();
  if (v.password !== undefined) values.passwordHash = await hashPassword(v.password);
  if (Object.keys(values).length === 1) return NextResponse.json({ error: 'Enter at least one profile change.' }, { status: 400 });
  try {
    const [updated] = await db.update(users).set(values).where(eq(users.id, actor.id)).returning({ id: users.id, name: users.name, username: users.username, email: users.email, role: users.role, active: users.active });
    if (!updated) return NextResponse.json({ error: 'Your account was not found.' }, { status: 404 });
    try { await db.insert(auditLogs).values({ userId: actor.id, action: 'update_profile', entityType: 'user', entityId: actor.id, details: { changedFields: Object.keys(v).filter(k => k !== 'password').concat(v.password ? ['password'] : []) } }); }
    catch (auditError) { console.error('Profile audit write failed:', auditError); }
    return NextResponse.json({ user: updated });
  } catch (error: any) {
    console.error('Profile update failed:', error);
    if (error?.code === '23505') return NextResponse.json({ error: 'That username or email is already registered to another account.' }, { status: 409 });
    if (['42703', '42P01', '42704'].includes(error?.code)) return NextResponse.json({ error: 'The database schema is out of date. Run db/migrations/0004_account_profile_repair.sql in Neon.' }, { status: 503 });
    return NextResponse.json({ error: 'Unable to update your profile. Check the database connection and Vercel logs.' }, { status: 500 });
  }
}
