import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, auditLogs } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

export const runtime = 'nodejs';

const schema = z.object({
  name: z.string().trim().refine(value => value.length > 0, 'Name is required.'),
  username: z.string().trim()
    .refine(value => value.length > 0, 'Username is required.')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username may contain letters, numbers, dots, underscores, and hyphens only.'),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
  role: z.enum(['manager', 'admin']),
});

async function adminActor() {
  const user = await getSessionUser();
  return user && ['owner', 'admin'].includes(user.role) ? user : null;
}

export async function GET() {
  const actor = await adminActor();
  if (!actor) return NextResponse.json({ error: 'Only an Admin can manage accounts.' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });

  const rows = await db.select({
    id: users.id,
    name: users.name,
    username: users.username,
    email: users.email,
    role: users.role,
    active: users.active,
    createdAt: users.createdAt,
  }).from(users).orderBy(desc(users.createdAt));

  return NextResponse.json({ users: rows });
}

export async function POST(req: NextRequest) {
  const actor = await adminActor();
  if (!actor) return NextResponse.json({ error: 'Only an Admin can create accounts.' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({
      error: 'Check the name, username, email address, password, and role.',
      details: parsed.error.flatten(),
    }, { status: 400 });
  }

  const values = parsed.data;
  try {
    const user = await db.transaction(async tx => {
      const [created] = await tx.insert(users).values({
        name: values.name,
        username: values.username.toLowerCase().trim(),
        email: values.email.toLowerCase().trim(),
        passwordHash: await hashPassword(values.password),
        role: values.role,
        active: true,
      }).returning({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        role: users.role,
        active: users.active,
      });

      await tx.insert(auditLogs).values({
        userId: actor.id,
        action: 'create',
        entityType: 'user',
        entityId: created.id,
        details: { username: created.username, email: created.email, role: created.role },
      });
      return created;
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'That username or email is already registered.' }, { status: 409 });
    }
    if (['42703', '22P02', '42704'].includes(error?.code)) {
      return NextResponse.json({ error: 'The database migrations are incomplete. Apply migrations 0001, 0002, and 0003, then try again.' }, { status: 500 });
    }
    console.error('Account creation failed:', error);
    return NextResponse.json({ error: 'Unable to create account. Check the database configuration and server logs.' }, { status: 500 });
  }
}
