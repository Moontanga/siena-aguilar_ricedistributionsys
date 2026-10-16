import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/password';
import { z } from 'zod';
import { db } from '@/lib/db';
import { users, auditLogs } from '@/db/schema';
import { or, sql } from 'drizzle-orm';
import { createSession } from '@/lib/auth';
export const runtime = 'nodejs';
const schema = z.object({ username: z.string().trim().min(1), password: z.string().min(1) });
export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({ error: 'Database is not configured. Check DATABASE_URL in Vercel environment variables.' }, { status: 503 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter your username (or registered email) and password.' }, { status: 400 });

  const login = parsed.data.username.trim().toLowerCase();
  try {
    const [user] = await db.select().from(users)
      .where(or(sql`lower(${users.username}) = ${login}`, sql`lower(${users.email}) = ${login}`))
      .limit(1);

    if (!user || !user.active || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: 'The username/email or password is incorrect, or the account is inactive.' }, { status: 401 });
    }

    try {
      await createSession({ id: user.id, name: user.name, username: user.username, email: user.email, role: user.role });
    } catch (error) {
      console.error('Session creation failed:', error);
      return NextResponse.json({ error: 'Login configuration problem. Check that SESSION_SECRET is set in Vercel and contains at least 32 characters.' }, { status: 503 });
    }

    // Audit logging must not block a valid login if the audit table needs repair.
    try { await db.insert(auditLogs).values({ userId: user.id, action: 'login', entityType: 'session', details: { method: 'password' } }); }
    catch (auditError) { console.error('Login audit write failed:', auditError); }

    return NextResponse.json({ user: { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role } });
  } catch (error: any) {
    console.error('Login database error:', error);
    if (['42703', '42P01', '42704'].includes(error?.code)) {
      return NextResponse.json({ error: 'The database schema is out of date. Run db/migrations/0004_account_profile_repair.sql in the Neon SQL Editor, then retry.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Unable to sign in because the database request failed. Check the Vercel function logs and DATABASE_URL.' }, { status: 500 });
  }
}
