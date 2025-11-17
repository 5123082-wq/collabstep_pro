import { NextRequest, NextResponse } from 'next/server';
import { decodeDemoSession, DEMO_SESSION_COOKIE } from '@/lib/auth/demo-session';

export function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(DEMO_SESSION_COOKIE);
  const session = decodeDemoSession(sessionCookie?.value ?? null);

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }

  return NextResponse.json(
    { email: session.email, userId: session.userId, role: session.role, authenticated: true },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
