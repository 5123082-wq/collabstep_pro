import { NextRequest, NextResponse } from 'next/server';
import { decodeDemoSession, DEMO_SESSION_COOKIE } from '@/lib/auth/demo-session';
import { getCurrentSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  // 1. Check NextAuth session (DB/OAuth)
  const session = await getCurrentSession();
  if (session?.user) {
    return NextResponse.json(
      {
        email: session.user.email,
        userId: session.user.id,
        role: session.user.role,
        roles: session.user.roles,
        authenticated: true
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // 2. Fallback to legacy/demo session
  const sessionCookie = request.cookies.get(DEMO_SESSION_COOKIE);
  const demoSession = decodeDemoSession(sessionCookie?.value ?? null);

  if (demoSession) {
    return NextResponse.json(
      { email: demoSession.email, userId: demoSession.userId, role: demoSession.role, authenticated: true },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json({ authenticated: false }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}
