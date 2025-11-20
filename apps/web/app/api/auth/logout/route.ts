import { NextResponse } from 'next/server';
import { DEMO_SESSION_COOKIE } from '@/lib/auth/demo-session';
import { signOut } from '@/lib/auth/config';

export async function POST() {
  await signOut({ redirect: false });
  const response = NextResponse.json({ success: true });
  response.cookies.delete(DEMO_SESSION_COOKIE);
  return response;
}
