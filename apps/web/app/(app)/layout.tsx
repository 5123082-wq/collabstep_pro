import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import AppLayoutClient from '@/components/app/AppLayoutClient';
import { getDemoSessionFromCookies } from '@/lib/auth/demo-session.server';
import { getCurrentSession } from '@/lib/auth/session';
import type { DemoSession } from '@/lib/auth/demo-session';

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Check both NextAuth and demo sessions (matching middleware logic)
  const nextAuthSession = await getCurrentSession();
  const demoSession = getDemoSessionFromCookies();

  // Use NextAuth session if available, otherwise fall back to demo session
  let session: DemoSession | null = null;

  if (nextAuthSession?.user) {
    // Convert NextAuth session to DemoSession format
    session = {
      userId: nextAuthSession.user.id,
      email: nextAuthSession.user.email || '',
      role: (nextAuthSession.user.role as 'admin' | 'user') || 'user',
      issuedAt: Date.now() // Required field for DemoSession
    };
  } else if (demoSession) {
    session = demoSession;
  }

  if (!session) {
    redirect('/login?toast=auth-required');
  }

  return <AppLayoutClient session={session}>{children}</AppLayoutClient>;
}
