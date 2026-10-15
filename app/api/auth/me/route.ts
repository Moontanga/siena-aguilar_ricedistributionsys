import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
export async function GET() { const user = await getSessionUser(); return user ? NextResponse.json({user}) : NextResponse.json({user:null},{status:401}); }
