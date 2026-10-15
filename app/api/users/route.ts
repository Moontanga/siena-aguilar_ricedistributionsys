import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, auditLogs } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
export const runtime = 'nodejs';
const schema = z.object({name:z.string().trim().min(2).max(160),email:z.string().email().max(255),password:z.string().min(12).max(200),role:z.enum(['manager','admin'])});
async function owner(){const u=await getSessionUser();return u&&['owner','admin'].includes(u.role)?u:null;}
export async function GET(){const actor=await owner();if(!actor)return NextResponse.json({error:'Only an Admin can manage accounts.'},{status:403});if(!db)return NextResponse.json({error:'Database is not configured.'},{status:503});const rows=await db.select({id:users.id,name:users.name,email:users.email,role:users.role,active:users.active,createdAt:users.createdAt}).from(users).orderBy(desc(users.createdAt));return NextResponse.json({users:rows});}
export async function POST(req:NextRequest){const actor=await owner();if(!actor)return NextResponse.json({error:'Only an Admin can create accounts.'},{status:403});if(!db)return NextResponse.json({error:'Database is not configured.'},{status:503});const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'Enter a valid name, email, role and password (minimum 12 characters).',details:parsed.error.flatten()},{status:400});const v=parsed.data;try{const [user]=await db.insert(users).values({name:v.name,email:v.email.toLowerCase().trim(),passwordHash:await bcrypt.hash(v.password,12),role:v.role,active:true}).returning({id:users.id,name:users.name,email:users.email,role:users.role,active:users.active});await db.insert(auditLogs).values({userId:actor.id,action:'create',entityType:'user',entityId:user.id,details:{email:user.email,role:user.role}});return NextResponse.json({user},{status:201});}catch(e:any){return NextResponse.json({error:e?.code==='23505'?'An account with that email already exists.':'Unable to create account.'},{status:e?.code==='23505'?409:500});}}
