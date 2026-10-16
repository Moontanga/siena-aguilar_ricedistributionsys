import { NextRequest, NextResponse } from 'next/server';
import { and, gte, lte, isNull, sql, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { sales, purchases, products, expenses, saleItems } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const user=await getSessionUser();
 if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
 if(!['manager','admin','owner'].includes(user.role))return NextResponse.json({error:'You do not have permission to access business records.'},{status:403});
 if(!db)return NextResponse.json({error:'Database is not configured.'},{status:503});
 const from=req.nextUrl.searchParams.get('from');const to=req.nextUrl.searchParams.get('to');
 const dateFilter=(column:any)=>and(from?gte(column,new Date(from+'T00:00:00.000Z')):undefined,to?lte(column,new Date(to+'T23:59:59.999Z')):undefined);
 const [salesTotals]=await db.select({count:sql<number>`count(*)::int`,total:sql<string>`coalesce(sum(${sales.total}),0)`,paid:sql<string>`coalesce(sum(${sales.paidAmount}),0)`,discount:sql<string>`coalesce(sum(${sales.discount}),0)`,delivery:sql<string>`coalesce(sum(${sales.deliveryFee}),0)`}).from(sales).where(and(isNull(sales.deletedAt),dateFilter(sales.createdAt),sql`${sales.status} NOT IN ('cancelled','reversed')`));
 const [purchaseTotals]=await db.select({count:sql<number>`count(*)::int`,total:sql<string>`coalesce(sum(${purchases.total}),0)`,paid:sql<string>`coalesce(sum(${purchases.paidAmount}),0)`}).from(purchases).where(and(isNull(purchases.deletedAt),dateFilter(purchases.createdAt),sql`${purchases.status} NOT IN ('cancelled','reversed')`));
 const [expenseTotals]=await db.select({total:sql<string>`coalesce(sum(${expenses.amount}),0)`}).from(expenses).where(and(isNull(expenses.deletedAt),dateFilter(expenses.createdAt)));
 const [inventory]=await db.select({products:sql<number>`count(*)::int`,stockKg:sql<string>`coalesce(sum(${products.stockKg}),0)`,stockCost:sql<string>`coalesce(sum(${products.stockKg} * ${products.purchaseCostPerKg}),0)`,potentialRevenue:sql<string>`coalesce(sum((${products.stockKg}/nullif(${products.sackWeightKg},0)) * coalesce(${products.sellingPricePerSack},${products.sellingPricePerKg}*${products.sackWeightKg})),0)`}).from(products).where(eq(products.active,true));
 const sold=await db.select({revenue:sql<string>`coalesce(sum(${saleItems.lineTotal}),0)`,baseCost:sql<string>`coalesce(sum(${saleItems.quantityKg} * ${products.purchaseCostPerKg}),0)`}).from(saleItems).innerJoin(sales,eq(saleItems.saleId,sales.id)).leftJoin(products,eq(saleItems.productId,products.id)).where(and(isNull(sales.deletedAt),dateFilter(sales.createdAt),sql`${sales.status} NOT IN ('cancelled','reversed')`));
 const revenue=Number(sold[0]?.revenue||0);const baseCost=Number(sold[0]?.baseCost||0);
 return NextResponse.json({period:{from:from??null,to:to??null},sales:salesTotals,purchases:purchaseTotals,expenses:expenseTotals,inventory,profit:{salesRevenue:revenue,baseCostSold:baseCost,grossProfit:revenue-baseCost,potentialRevenue:Number(inventory?.potentialRevenue||0),potentialGrossProfit:Number(inventory?.potentialRevenue||0)-Number(inventory?.stockCost||0)}});
}