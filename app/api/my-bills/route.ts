import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';
const allowedFrequencies = ['weekly','monthly','quarterly','yearly'];
const validDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const fields = 'id, title, reference_number AS "referenceNumber", amount, billing_type AS "billingType", frequency, next_due_date AS "nextDueDate", interval_days AS "intervalDays", notes, status, last_paid_at AS "lastPaidAt", created_at AS "createdAt", updated_at AS "updatedAt"';

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
      `INSERT INTO personal_bills (user_id,title,reference_number,amount,billing_type,frequency,next_due_date,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${fields}`,
      [user.id,title,typeof b?.referenceNumber==='string'?b.referenceNumber.trim().slice(0,180)||null:null,amount.toFixed(2),type,type==='renewal'?frequency:null,type==='renewal'?b.nextDueDate:null,typeof b?.notes==='string'?b.notes.trim().slice(0,2000):null]
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
  try {
    // Use one atomic UPDATE per action. This is reliable with Neon serverless Pool
    // and avoids a separate connection/transaction failing before a simple edit.
    if (b.markPaid === true) {
      const paid = await pool.query(
        `UPDATE personal_bills SET
          status=CASE WHEN billing_type='single' THEN 'paid' ELSE 'active' END,
          last_paid_at=now(),
          next_due_date=CASE WHEN billing_type='single' THEN next_due_date ELSE GREATEST(COALESCE(next_due_date,CURRENT_DATE),CURRENT_DATE) + CASE frequency WHEN 'weekly' THEN INTERVAL '7 days' WHEN 'monthly' THEN INTERVAL '1 month' WHEN 'quarterly' THEN INTERVAL '3 months' WHEN 'yearly' THEN INTERVAL '1 year' ELSE INTERVAL '1 month' END END,
          updated_at=now()
         WHERE id=$1 AND user_id=$2 RETURNING id`,
        [b.id,user.id]
      );
      if (!paid.rowCount) return NextResponse.json({ error: 'Bill not found.' }, { status: 404 });
    } else {
      const title = typeof b.title === 'string' ? b.title.trim() : '';
      const amount = Number(b.amount);
      const type = b.billingType;
      const frequency = b.frequency;
      const referenceNumber = typeof b.referenceNumber === 'string' ? b.referenceNumber.trim().slice(0,180) || null : null;
      if (!title || title.length > 180 || !Number.isFinite(amount) || amount < 0 || !['single','renewal'].includes(type)) {
        return NextResponse.json({ error: 'Enter a title, valid amount, and payment type.' }, { status: 400 });
      }
      if (type === 'renewal' && (!allowedFrequencies.includes(frequency) || !validDate(b.nextDueDate))) {
        return NextResponse.json({ error: 'Renewal bills need a frequency and next due date.' }, { status: 400 });
      }
      const updated = await pool.query(
        `UPDATE personal_bills SET title=$1, reference_number=$2, amount=$3, billing_type=$4, frequency=$5, next_due_date=$6, notes=$7,
          status=CASE WHEN $4='single' AND status='paid' THEN 'paid' ELSE 'active' END, updated_at=now()
         WHERE id=$8 AND user_id=$9 RETURNING id`,
        [title,referenceNumber,amount.toFixed(2),type,type==='renewal'?frequency:null,type==='renewal'?b.nextDueDate:null,typeof b.notes==='string'?b.notes.trim().slice(0,2000):null,b.id,user.id]
      );
      if (!updated.rowCount) return NextResponse.json({ error: 'Bill not found.' }, { status: 404 });
    }
    const result = await pool.query(`SELECT ${fields} FROM personal_bills WHERE id=$1 AND user_id=$2`, [b.id,user.id]);
    return NextResponse.json({ bill: result.rows[0] });
  } catch (e:any) {
    console.error('[my-bills:PATCH]', e?.message);
    return NextResponse.json({ error: 'Could not update this bill. Please try again; if it continues, the database migration may be pending.' }, { status: 500 });
  }
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
