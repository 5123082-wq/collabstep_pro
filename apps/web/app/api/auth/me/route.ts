import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';

export async function GET() {
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

  return NextResponse.json({ authenticated: false }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}
