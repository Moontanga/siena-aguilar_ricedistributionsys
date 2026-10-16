import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { expenses, auditLogs } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';
const expenseInput = z.object({
  category: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(2000),
  amount: z.number().positive(),
  paymentMethod: z.enum(['cash','gcash','maya','bank_transfer','credit','other']).default('cash'),
  reference: z.string().max(120).optional().nullable()
});
const allowed = (role: string) => ['manager','admin','owner'].includes(role);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!allowed(user.role)) return NextResponse.json({ error: 'You do not have permission to edit expenses.' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const [existing] = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: 'Expense not found.' }, { status: 404 });

  if (body?.restore === true) {
    if (!existing.deletedAt) return NextResponse.json({ error: 'This expense is not in Trash.' }, { status: 409 });
    const [restored] = await db.update(expenses).set({ deletedAt: null, deletedBy: null }).where(eq(expenses.id, id)).returning();
    await db.insert(auditLogs).values({ userId: user.id, action: 'restore', entityType: 'expense', entityId: id, details: { amount: existing.amount, category: existing.category } });
    return NextResponse.json({ expense: restored });
  }

  if (existing.deletedAt) return NextResponse.json({ error: 'Restore this expense before editing it.' }, { status: 409 });
  const parsed = expenseInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid expense data.', details: parsed.error.flatten() }, { status: 400 });
  const [updated] = await db.update(expenses).set({
    category: parsed.data.category,
    description: parsed.data.description,
    amount: parsed.data.amount.toFixed(2),
    paymentMethod: parsed.data.paymentMethod,
    reference: parsed.data.reference || null
  }).where(eq(expenses.id, id)).returning();
  await db.insert(auditLogs).values({ userId: user.id, action: 'update', entityType: 'expense', entityId: id, details: { before: { category: existing.category, description: existing.description, amount: existing.amount }, after: { category: updated.category, description: updated.description, amount: updated.amount } } });
  return NextResponse.json({ expense: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!allowed(user.role)) return NextResponse.json({ error: 'You do not have permission to delete expenses.' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
  const { id } = await params;
  const permanent = req.nextUrl.searchParams.get('permanent') === 'true';
  const [existing] = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: 'Expense not found.' }, { status: 404 });

  if (permanent) {
    if (!existing.deletedAt) return NextResponse.json({ error: 'Move this expense to Trash before permanently deleting it.' }, { status: 409 });
    await db.insert(auditLogs).values({ userId: user.id, action: 'permanent_delete', entityType: 'expense', entityId: id, details: { category: existing.category, description: existing.description, amount: existing.amount } });
    await db.delete(expenses).where(eq(expenses.id, id));
    return NextResponse.json({ success: true, permanentlyDeleted: true });
  }

  if (existing.deletedAt) return NextResponse.json({ error: 'This expense is already in Trash.' }, { status: 409 });
  await db.update(expenses).set({ deletedAt: new Date(), deletedBy: user.id }).where(eq(expenses.id, id));
  await db.insert(auditLogs).values({ userId: user.id, action: 'trash', entityType: 'expense', entityId: id, details: { category: existing.category, description: existing.description, amount: existing.amount } });
  return NextResponse.json({ success: true, trashed: true });
}
