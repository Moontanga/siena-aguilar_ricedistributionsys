import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/password';
import { z } from 'zod';
import { db } from '@/lib/db';
import { users, auditLogs } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { createSession } from '@/lib/auth';
export const runtime = 'nodejs';
const schema = z.object({ username: z.string().trim().min(1), password: z.string().min(1) });
export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({error:'Database is not configured.'},{status:503});
  const parsed = schema.safeParse(await req.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({error:'Enter your username and password.'},{status:400});
  const login = parsed.data.username.toLowerCase().trim();
  const [user] = await db.select().from(users).where(or(eq(users.username,login),eq(users.email,login))).limit(1);
  if (!user || !user.active || !(await verifyPassword(parsed.data.password,user.passwordHash))) return NextResponse.json({error:'Invalid username or password.'},{status:401});
  await createSession({id:user.id,name:user.name,email:user.email,role:user.role});
  await db.insert(auditLogs).values({userId:user.id,action:'login',entityType:'session',details:{method:'password'}});
  return NextResponse.json({user:{id:user.id,name:user.name,username:user.username,email:user.email,role:user.role}});
}
