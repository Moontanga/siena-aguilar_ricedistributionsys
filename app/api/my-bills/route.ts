import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';
const allowedFrequencies = ['weekly','monthly','quarterly','yearly'];
const validDate = (v: unknown) => typeof v === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(v);
const fields = 'id, title, amount, billing_type AS "billingType", frequency, next_due_date AS "nextDueDate", interval_days AS "intervalDays", notes, status, last_paid_at AS "lastPaidAt", created_at AS "createdAt", updated_at AS "updatedAt"';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!pool) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
  try {
    const result = await pool.query(`SELECT ${fields} FROM personal_bills WHERE user_id=$1 ORDER BY CASE WHEN status='active' THEN 0 ELSE 1 END, next_due_date NULLS LAST, created_at DESC LIMIT 500`, [user.id]);
    return NextResponse.json({ bills: result.rows });
  } catch (e:any) {
    console.error('[my-bills:GET]', e?.message);
    return NextResponse.json({ error: 'My Bills is not ready. Apply db/migrations/0008_personal_bills.sql to the connected Neon database.' }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!pool) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
  const b = await req.json().catch(() => null);
  const title = typeof b?.title === 'string' ? b.title.trim() : '';
  const amount = Number(b?.amount);
  const type = b?.billingType;
  const frequency = b?.frequency;
  if (!title || title.length > 180 || !Number.isFinite(amount) || amount < 0 || !['single','renewal'].includes(type)) return NextResponse.json({ error: 'Enter a title, valid payment amount, and payment type.' }, { status: 400 });
  if (type === 'renewal' && (!allowedFrequencies.includes(frequency) || !validDate(b?.nextDueDate))) return NextResponse.json({ error: 'Renewal bills need a frequency and next due date.' }, { status: 400 });
  try {
    const result = await pool.query(
      `INSERT INTO personal_bills (user_id,title,amount,billing_type,frequency,next_due_date,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${fields}`,
      [user.id,title,amount.toFixed(2),type,type==='renewal'?frequency:null,type==='renewal'?b.nextDueDate:null,typeof b?.notes==='string'?b.notes.trim().slice(0,2000):null]
    );
    return NextResponse.json({ bill: result.rows[0] }, { status: 201 });
  } catch (e:any) {
    console.error('[my-bills:POST]',e?.message);
    return NextResponse.json({ error: 'Could not save this bill. Check that the personal bills migration has been applied.' }, { status: 503 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!pool) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
  const b = await req.json().catch(() => null);
  if (typeof b?.id !== 'string') return NextResponse.json({ error: 'Bill ID is required.' }, { status: 400 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query('SELECT * FROM personal_bills WHERE id=$1 AND user_id=$2 FOR UPDATE', [b.id,user.id]);
    const bill = found.rows[0];
    if (!bill) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Bill not found.' }, { status: 404 }); }
    if (b.markPaid === true) {
      if (bill.billing_type === 'single') {
        await client.query("UPDATE personal_bills SET status='paid',last_paid_at=now(),updated_at=now() WHERE id=$1 AND user_id=$2", [bill.id,user.id]);
      } else {
        await client.query(`UPDATE personal_bills SET last_paid_at=now(), next_due_date=GREATEST(COALESCE(next_due_date,CURRENT_DATE),CURRENT_DATE) + CASE frequency WHEN 'weekly' THEN INTERVAL '7 days' WHEN 'monthly' THEN INTERVAL '1 month' WHEN 'quarterly' THEN INTERVAL '3 months' WHEN 'yearly' THEN INTERVAL '1 year' ELSE INTERVAL '1 month' END, status='active', updated_at=now() WHERE id=$1 AND user_id=$2`, [bill.id,user.id]);
      }
    } else {
      const title = typeof b.title === 'string' ? b.title.trim() : '';
      const amount = Number(b.amount);
      const type = b.billingType;
      const frequency = b.frequency;
      if (!title || title.length > 180 || !Number.isFinite(amount) || amount < 0 || !['single','renewal'].includes(type)) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Enter a title, valid amount, and payment type.' }, { status: 400 }); }
      if (type === 'renewal' && (!allowedFrequencies.includes(frequency) || !validDate(b.nextDueDate))) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Renewal bills need a frequency and next due date.' }, { status: 400 }); }
      await client.query(`UPDATE personal_bills SET title=$1,amount=$2,billing_type=$3,frequency=$4,next_due_date=$5,notes=$6,status=CASE WHEN $3='single' AND status='paid' THEN 'paid' ELSE 'active' END,updated_at=now() WHERE id=$7 AND user_id=$8`, [title,amount.toFixed(2),type,type==='renewal'?frequency:null,type==='renewal'?b.nextDueDate:null,typeof b.notes==='string'?b.notes.trim().slice(0,2000):null,b.id,user.id]);
    }
    const result = await client.query(`SELECT ${fields} FROM personal_bills WHERE id=$1 AND user_id=$2`, [b.id,user.id]);
    await client.query('COMMIT');
    return NextResponse.json({ bill: result.rows[0] });
  } catch (e:any) {
    await client.query('ROLLBACK').catch(()=>{});
    console.error('[my-bills:PATCH]',e?.message);
    return NextResponse.json({ error: 'Could not update this bill.' }, { status: 500 });
  } finally { client.release(); }
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!pool) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Bill ID is required.' }, { status: 400 });
  try {
    const result = await pool.query('DELETE FROM personal_bills WHERE id=$1 AND user_id=$2 RETURNING id',[id,user.id]);
    if (!result.rowCount) return NextResponse.json({ error: 'Bill not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e:any) {
    console.error('[my-bills:DELETE]',e?.message);
    return NextResponse.json({ error: 'Could not delete this bill.' }, { status: 500 });
  }
}
