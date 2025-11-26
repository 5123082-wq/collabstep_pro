import { auth } from "./config"
import { redirect } from "next/navigation"
import { getDemoSessionFromCookies } from './demo-session.server';
import { usersRepository } from '@collabverse/api';

export async function getCurrentSession() {
    // Check both NextAuth and demo sessions
    const nextAuthSession = await auth();
    const demoSession = getDemoSessionFromCookies();

    // Return NextAuth session if available
    if (nextAuthSession) {
        return nextAuthSession;
    }

    // Return demo session converted to NextAuth format
    if (demoSession) {
        return {
            user: {
                id: demoSession.userId,
                email: demoSession.email,
                role: demoSession.role,
            },
            expires: new Date(demoSession.issuedAt + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        };
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
                role: session.user.role || 'user',
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
