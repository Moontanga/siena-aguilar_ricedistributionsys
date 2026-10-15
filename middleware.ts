import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'siena_session';
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/login' || pathname.startsWith('/api/auth/login') || pathname.startsWith('/_next/') || pathname === '/manifest.json' || pathname === '/icon.svg' || pathname === '/favicon.ico') return NextResponse.next();
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    if (pathname.startsWith('/api/')) return NextResponse.json({error:'Authentication required.'},{status:401});
    return NextResponse.redirect(new URL('/login', req.url));
  }
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    if (pathname.startsWith('/api/')) return NextResponse.json({error:'Authentication is not configured.'},{status:503});
    return NextResponse.redirect(new URL('/login?error=configuration', req.url));
  }
  try { await jwtVerify(token, new TextEncoder().encode(secret), {issuer:'siena-aguilar',audience:'siena-app'}); return NextResponse.next(); }
  catch { if (pathname.startsWith('/api/')) return NextResponse.json({error:'Authentication required.'},{status:401}); return NextResponse.redirect(new URL('/login',req.url)); }
}
export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
