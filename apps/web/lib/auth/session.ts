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

  // If we have a user ID, fetch full user data from database
  if (session.user.id) {
    const user = await usersRepository.findById(session.user.id);
    if (user) {
      return {
        ...user,
        role: session.user.role || 'user'
      };
    }
  }

  return session.user;
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
