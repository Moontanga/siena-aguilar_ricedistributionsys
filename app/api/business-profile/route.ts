import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { businessProfile, auditLogs } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
export const runtime = 'nodejs';
const inputSchema = z.object({
  businessName: z.string().trim().min(1).max(180),
  contactNumber: z.string().trim().max(40).nullable().optional(),
  contactEmail: z.union([z.string().trim().email().max(254), z.literal(''), z.null()]).optional(),
  facebookUrl: z.union([z.string().trim().url().max(1000), z.literal(''), z.null()]).optional(),
  businessAddress: z.string().trim().max(2000).nullable().optional(),
});
export async function GET() {
  if (!db) return NextResponse.json({error:'Database is not configured.'},{status:503});
  try {
    const [profile] = await db.select().from(businessProfile).where(eq(businessProfile.id,'main')).limit(1);
    return NextResponse.json({profile: profile ?? {businessName:'Siena-Aguilar Rice Distributor',contactNumber:null,contactEmail:null,facebookUrl:null,businessAddress:null}} ,{headers:{'Cache-Control':'no-store'}});
  } catch (e:any) {
    console.error('Business profile read failed:',e);
    return NextResponse.json({error:'Business profile database is not ready. Apply db/migrations/0005_business_profile.sql in Neon.'},{status:503});
  }
}
export async function PATCH(req:NextRequest) {
  const actor = await getSessionUser();
  if (!actor || !['owner','admin','manager'].includes(actor.role)) return NextResponse.json({error:'Only an Admin, Owner, or Manager can edit business contact details.'},{status:403});
  if (!db) return NextResponse.json({error:'Database is not configured.'},{status:503});
  const parsed = inputSchema.safeParse(await req.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({error:parsed.error.issues[0]?.message || 'Check the business details.'},{status:400});
  const v = parsed.data;
  const facebook = v.facebookUrl?.trim() || null;
  if (facebook && !/^https:\/\/(www\.)?(facebook\.com|m\.facebook\.com)\//i.test(facebook)) return NextResponse.json({error:'Enter a valid HTTPS Facebook page or Messenger link.'},{status:400});
  try {
    const [profile] = await db.insert(businessProfile).values({id:'main',businessName:v.businessName,contactNumber:v.contactNumber?.trim()||null,contactEmail:v.contactEmail?.trim().toLowerCase()||null,facebookUrl:facebook,businessAddress:v.businessAddress?.trim()||null,updatedAt:new Date()}).onConflictDoUpdate({target:businessProfile.id,set:{businessName:v.businessName,contactNumber:v.contactNumber?.trim()||null,contactEmail:v.contactEmail?.trim().toLowerCase()||null,facebookUrl:facebook,businessAddress:v.businessAddress?.trim()||null,updatedAt:new Date()}}).returning();
    try { await db.insert(auditLogs).values({userId:actor.id,action:'update',entityType:'business_profile',entityId:'main',details:{fields:Object.keys(v)}}); } catch (e) { console.error('Business profile audit write failed:',e); }
    return NextResponse.json({profile});
  } catch (e:any) { console.error('Business profile update failed:',e); return NextResponse.json({error:'Unable to save business details. Check the Neon migration and server logs.'},{status:500}); }
}
