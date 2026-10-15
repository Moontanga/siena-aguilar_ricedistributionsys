import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { products } from '@/db/schema';
export const runtime = 'nodejs';
export async function GET() {
  if (!db) return NextResponse.json({ error: 'Catalog is temporarily unavailable.' }, { status: 503 });
  const rows = await db.select({id:products.id,sku:products.sku,name:products.name,category:products.category,description:products.description,sackWeightKg:products.sackWeightKg,sellingPricePerKg:products.sellingPricePerKg,sellingPricePerSack:products.sellingPricePerSack,stockKg:products.stockKg}).from(products).where(eq(products.active,true)).orderBy(asc(products.name));
  return NextResponse.json({products:rows.map(p=>({...p,available:Number(p.stockKg)>0,stockKg:undefined}))}, { headers: { 'Cache-Control': 'no-store' } });
}
