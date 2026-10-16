import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!['manager', 'admin', 'owner'].includes(user.role)) {
    return NextResponse.json({ error: 'You do not have permission to delete purchases.' }, { status: 403 });
  }
  if (!pool) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });

  const { id } = await params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const purchaseResult = await client.query(
      'SELECT id, reference_no FROM purchases WHERE id = $1 FOR UPDATE',
      [id]
    );
    const purchase = purchaseResult.rows[0];
    if (!purchase) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Purchase not found.' }, { status: 404 });
    }

    const itemsResult = await client.query(
      'SELECT product_id, quantity_kg FROM purchase_items WHERE purchase_id = $1 FOR UPDATE',
      [id]
    );

    // Lock and validate every affected product before changing stock.
    const totals = new Map<string, number>();
    for (const item of itemsResult.rows) {
      totals.set(item.product_id, (totals.get(item.product_id) || 0) + Number(item.quantity_kg));
    }
    for (const [productId, quantityKg] of totals) {
      const productResult = await client.query(
        'SELECT id, name, stock_kg FROM products WHERE id = $1 FOR UPDATE',
        [productId]
      );
      const product = productResult.rows[0];
      if (!product || Number(product.stock_kg) + 0.0001 < quantityKg) {
        await client.query('ROLLBACK');
        return NextResponse.json({
          error: `Cannot delete this purchase because its stock has already been sold or removed. Product: ${product?.name || 'unknown'}.`
        }, { status: 409 });
      }
    }

    for (const [productId, quantityKg] of totals) {
      await client.query(
        'UPDATE products SET stock_kg = stock_kg - $1, updated_at = NOW() WHERE id = $2',
        [quantityKg, productId]
      );
    }

    await client.query('DELETE FROM inventory_movements WHERE reference_type = $1 AND reference_id = $2', ['purchase', id]);
    await client.query('DELETE FROM payments WHERE purchase_id = $1', [id]);
    await client.query('DELETE FROM purchase_items WHERE purchase_id = $1', [id]);
    await client.query('DELETE FROM purchases WHERE id = $1', [id]);

    await client.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5::jsonb)',
      [user.id, 'delete', 'purchase', id, JSON.stringify({ referenceNo: purchase.reference_no, reversedStockProducts: totals.size })]
    );

    await client.query('COMMIT');
    return NextResponse.json({ ok: true, referenceNo: purchase.reference_no });
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    return NextResponse.json({ error: error?.message || 'Unable to delete purchase.' }, { status: 500 });
  } finally {
    client.release();
  }
}
