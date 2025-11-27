import { NextRequest } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { decodeDemoSession, DEMO_SESSION_COOKIE } from '@/lib/auth/demo-session';
import { organizationsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';
type NewOrganizationInput = Parameters<typeof organizationsRepository.create>[0];

async function getUserId(request: NextRequest): Promise<string | null> {
    // 1. Try NextAuth session (DB/OAuth)
    const session = await getCurrentSession();
    if (session?.user?.id) {
        return session.user.id;
    }

    // 2. Fallback to legacy/demo session
    const sessionCookie = request.cookies.get(DEMO_SESSION_COOKIE);
    const demoSession = decodeDemoSession(sessionCookie?.value ?? null);
    if (demoSession?.userId) {
        return demoSession.userId;
    }

    return null;
}

export async function GET(request: NextRequest) {
    const userId = await getUserId(request);
    if (!userId) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    try {
        const organizations = await organizationsRepository.listForUser(userId);
        return jsonOk({ organizations });
    } catch (error) {
        console.error('[Organizations] Error listing:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const userId = await getUserId(request);
    
    if (!userId) {
        console.error('[Organizations] Unauthorized access attempt');
        console.error('[Organizations] Cookies:', request.cookies.getAll());
        return jsonError('UNAUTHORIZED', { status: 401, details: 'No user session found. Please log in first.' });
    }

    console.log('[Organizations] Creating organization for user:', userId);

    try {
        const body = await request.json();
        
        if (!body.name) {
            return jsonError('INVALID_REQUEST', { status: 400, details: 'Name is required' });
        }

        const orgData: NewOrganizationInput = {
            ownerId: userId,
            name: body.name,
            description: body.description,
            type: body.type === 'open' ? 'open' : 'closed', // default closed if invalid
            isPublicInDirectory: body.isPublicInDirectory ?? (body.type === 'open'),
        };

        // Note: Repository create method is transactional (creates org + owner member)
        const organization = await organizationsRepository.create(orgData);
        return jsonOk({ organization });

    } catch (error: unknown) {
        console.error('[Organizations] Error creating:', error);
        const message = error instanceof Error ? error.message : String(error);
        return jsonError('INTERNAL_ERROR', { status: 500, details: message });
    }
}
