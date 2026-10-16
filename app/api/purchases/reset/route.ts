import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';

// Clears purchase history and its dependent rows, but intentionally preserves
// current product stock. Stock is a live balance after sales/adjustments; subtracting
// every historical receipt would incorrectly remove rice that has already been sold.
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!['owner', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Only an owner or admin can clear all purchase history.' }, { status: 403 });
  }
  if (!pool) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('LOCK TABLE purchases IN ACCESS EXCLUSIVE MODE');
    const countResult = await client.query('SELECT COUNT(*)::int AS count FROM purchases');
    const purchaseCount = Number(countResult.rows[0]?.count || 0);
    const paymentResult = await client.query(
      'SELECT COUNT(*)::int AS count FROM payments WHERE purchase_id IN (SELECT id FROM purchases)'
    );
    const paymentCount = Number(paymentResult.rows[0]?.count || 0);

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'bulk_permanent_delete', 'purchase', NULL, $2::jsonb)`,
      [user.id, JSON.stringify({
        purchaseRecordsDeleted: purchaseCount,
        purchasePaymentsDeleted: paymentCount,
        inventoryStockPreserved: true
      })]
    );

    await client.query('DELETE FROM payments WHERE purchase_id IN (SELECT id FROM purchases)');
    await client.query(
      `DELETE FROM inventory_movements
       WHERE reference_type = 'purchase'
          OR reference_id IN (SELECT id FROM purchases)`
    );
    await client.query('DELETE FROM purchase_items WHERE purchase_id IN (SELECT id FROM purchases)');
    await client.query('DELETE FROM purchases');

    await client.query('COMMIT');
    return NextResponse.json({
      ok: true,
      purchasesDeleted: purchaseCount,
      purchasePaymentsDeleted: paymentCount,
      inventoryPreserved: true
    });
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    return NextResponse.json({ error: error?.message || 'Unable to clear purchase history.' }, { status: 500 });
  } finally {
    client.release();
  }
}
