import type { Session } from 'next-auth';
import { auth } from './config';
import { redirect } from 'next/navigation';
import { getDemoSessionFromCookies } from './demo-session.server';
import { usersRepository } from '@collabverse/api';

type AppSessionUser = {
  id?: string;
  email?: string;
  role?: string;
  roles?: string[];
};

type AppSession = {
  user?: AppSessionUser;
  expires: string;
};

function isEmailLike(value: unknown): value is string {
  return typeof value === 'string' && value.includes('@');
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export async function getCurrentSession() {
  // Check both NextAuth and demo sessions
  let nextAuthSession: Session | null = null;
  try {
    // `auth` has multiple overloads (middleware wrapper + session getter).
    // Here we only want the "session getter" signature.
    nextAuthSession = await (auth as unknown as () => Promise<Session | null>)();
  } catch {
    // In some contexts (e.g. Jest/unit tests) Next.js request scope is not available.
    // Treat it as "no NextAuth session" and fall back to demo session.
    nextAuthSession = null;
  }
  const demoSession = getDemoSessionFromCookies();

  // Return NextAuth session if available
  if (nextAuthSession) {
    return nextAuthSession as unknown as AppSession;
  }

  // Return demo session converted to NextAuth-like session
  if (demoSession) {
    const session: AppSession = {
      user: {
        id: demoSession.userId,
        email: demoSession.email,
        role: demoSession.role
      },
      expires: new Date(demoSession.issuedAt + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };
    return session;
  }

  return null;
}

export async function getCurrentUser() {
  const session = await getCurrentSession();

  if (!session?.user) {
    return null;
  }

  const sessionUserId = session.user.id;
  const sessionEmail = session.user.email;

  // Primary: canonical id (UUID/string id) -> usersRepository.findById
  if (sessionUserId && !isEmailLike(sessionUserId)) {
    const user = await usersRepository.findById(sessionUserId);
    if (user) {
      return { ...user, role: session.user.role || 'user' };
    }
  }

  // Secondary: if session id is email-like OR DB lookup by id failed -> try resolve by email.
  // This prevents legacy/demo sessions from leaking `id=email` into write paths.
  if (typeof sessionEmail === 'string' && sessionEmail.trim()) {
    const user = await usersRepository.findByEmail(normalizeEmail(sessionEmail));
    if (user) {
      return { ...user, role: session.user.role || 'user' };
    }
  } else if (sessionUserId && isEmailLike(sessionUserId)) {
    const user = await usersRepository.findByEmail(normalizeEmail(sessionUserId));
    if (user) {
      return { ...user, role: session.user.role || 'user' };
    }
  }

  // If we cannot resolve a canonical user record, treat it as unauthenticated
  // to avoid creating records keyed by email.
  return null;
}

export async function isAdmin() {
  const user = await getCurrentUser();
  return user?.role === 'admin';
}

export async function requireAuth() {
  const session = await getCurrentSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}
