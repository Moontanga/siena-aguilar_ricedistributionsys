import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
export const runtime='nodejs';

export async function GET(req:NextRequest){
 const user=await getSessionUser();
 if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
 if(!['manager','admin','owner','employee'].includes(user.role))return NextResponse.json({error:'You do not have permission to access cashflow.'},{status:403});
 if(!pool)return NextResponse.json({error:'Database is not configured.'},{status:503});
 const from=req.nextUrl.searchParams.get('from');const to=req.nextUrl.searchParams.get('to');
 if((from&&!/^\d{4}-\d{2}-\d{2}$/.test(from))||(to&&!/^\d{4}-\d{2}-\d{2}$/.test(to))||(from&&to&&from>to))return NextResponse.json({error:'Invalid cashflow date range.'},{status:400});
 const client=await pool.connect();
 try{
  const daily=await client.query(`
   WITH days AS (
    SELECT generate_series(COALESCE($1::date, CURRENT_DATE - INTERVAL '6 days'), COALESCE($2::date, CURRENT_DATE), INTERVAL '1 day')::date AS day
   )
   SELECT to_char(d.day,'YYYY-MM-DD') AS date,
    COALESCE((SELECT SUM(s.total) FROM sales s WHERE s.deleted_at IS NULL AND s.status NOT IN ('cancelled','reversed') AND s.created_at >= d.day AND s.created_at < d.day + INTERVAL '1 day'),0)::text AS "salesRevenue",
    COALESCE((SELECT SUM(si.line_total - (si.quantity_kg * COALESCE(p.purchase_cost_per_kg,0))) FROM sale_items si JOIN sales s ON s.id=si.sale_id LEFT JOIN products p ON p.id=si.product_id WHERE s.deleted_at IS NULL AND s.status NOT IN ('cancelled','reversed') AND s.created_at >= d.day AND s.created_at < d.day + INTERVAL '1 day'),0)::text AS "grossProfit",
    COALESCE((SELECT SUM(pm.amount) FROM payments pm JOIN sales s ON s.id=pm.sale_id WHERE s.deleted_at IS NULL AND s.status NOT IN ('cancelled','reversed') AND pm.created_at >= d.day AND pm.created_at < d.day + INTERVAL '1 day'),0)::text AS "salesReceived",
    COALESCE((SELECT SUM(pm.amount) FROM payments pm JOIN sales s ON s.id=pm.sale_id WHERE s.deleted_at IS NULL AND s.status NOT IN ('cancelled','reversed') AND pm.method='cash' AND pm.created_at >= d.day AND pm.created_at < d.day + INTERVAL '1 day'),0)::text AS "cashReceived",
    COALESCE((SELECT SUM(pm.amount) FROM payments pm JOIN sales s ON s.id=pm.sale_id WHERE s.deleted_at IS NULL AND s.status NOT IN ('cancelled','reversed') AND pm.method='gcash' AND pm.created_at >= d.day AND pm.created_at < d.day + INTERVAL '1 day'),0)::text AS "gcashReceived",
    COALESCE((SELECT SUM(pm.amount) FROM payments pm JOIN purchases pu ON pu.id=pm.purchase_id WHERE pu.deleted_at IS NULL AND pu.status NOT IN ('cancelled','reversed') AND pm.created_at >= d.day AND pm.created_at < d.day + INTERVAL '1 day'),0)::text AS "purchasesPaid",
    COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.deleted_at IS NULL AND e.payment_method <> 'credit' AND e.created_at >= d.day AND e.created_at < d.day + INTERVAL '1 day'),0)::text AS "expensesPaid"
   FROM days d ORDER BY d.day
  `,[from||null,to||null]);
  const summary=await client.query(`
   SELECT
    COALESCE((SELECT SUM(pm.amount) FROM payments pm JOIN sales s ON s.id=pm.sale_id WHERE s.deleted_at IS NULL AND s.status NOT IN ('cancelled','reversed')),0)::text AS "salesReceived",
    COALESCE((SELECT SUM(pm.amount) FROM payments pm JOIN sales s ON s.id=pm.sale_id WHERE s.deleted_at IS NULL AND s.status NOT IN ('cancelled','reversed') AND pm.method='cash'),0)::text AS "cashReceived",
    COALESCE((SELECT SUM(pm.amount) FROM payments pm JOIN sales s ON s.id=pm.sale_id WHERE s.deleted_at IS NULL AND s.status NOT IN ('cancelled','reversed') AND pm.method='gcash'),0)::text AS "gcashReceived",
    COALESCE((SELECT SUM(pm.amount) FROM payments pm JOIN purchases pu ON pu.id=pm.purchase_id WHERE pu.deleted_at IS NULL AND pu.status NOT IN ('cancelled','reversed')),0)::text AS "purchasesPaid",
    COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.deleted_at IS NULL AND e.payment_method <> 'credit'),0)::text AS "expensesPaid"
  `);
  const values=(summary.rows[0]||{}) as Record<string,string>;
  const incoming=Number(values.salesReceived||0),purchaseOut=Number(values.purchasesPaid||0),expenseOut=Number(values.expensesPaid||0);
  const trend=daily.rows.map((r:any)=>({...r,netCashflow:Number(r.salesReceived||0)-Number(r.purchasesPaid||0)-Number(r.expensesPaid||0)}));
  return NextResponse.json({summary:{salesReceived:incoming,cashReceived:Number(values.cashReceived||0),gcashReceived:Number(values.gcashReceived||0),purchasesPaid:purchaseOut,expensesPaid:expenseOut,totalOutflow:purchaseOut+expenseOut,netCashflow:incoming-purchaseOut-expenseOut},daily:trend,period:'last_7_days',note:'Cashflow is derived from recorded payments and paid expenses; it is not a second copy of sales revenue.'});
 }catch(e:any){console.error('[cashflow:GET]',e?.message);return NextResponse.json({error:'Unable to load cashflow records.'},{status:500});}
 finally{client.release();}
}
