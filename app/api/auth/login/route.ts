import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { users, auditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createSession } from '@/lib/auth';
export const runtime = 'nodejs';
const schema = z.object({ email: z.string().email().max(255), password: z.string().min(1).max(200) });
export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({error:'Database is not configured.'},{status:503});
  const parsed = schema.safeParse(await req.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({error:'Enter a valid email and password.'},{status:400});
  const email = parsed.data.email.toLowerCase().trim();
  const [user] = await db.select().from(users).where(eq(users.email,email)).limit(1);
  // Use a generic error to avoid revealing whether an account exists.
  if (!user || !user.active || !(await bcrypt.compare(parsed.data.password,user.passwordHash))) return NextResponse.json({error:'Invalid email or password.'},{status:401});
  await createSession({id:user.id,name:user.name,email:user.email,role:user.role});
  await db.insert(auditLogs).values({userId:user.id,action:'login',entityType:'session',details:{method:'password'}});
  return NextResponse.json({user:{id:user.id,name:user.name,email:user.email,role:user.role}});
}
