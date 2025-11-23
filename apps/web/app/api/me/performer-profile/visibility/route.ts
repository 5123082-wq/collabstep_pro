import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { performerProfilesRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function PATCH(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user?.id) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    try {
        const body = await request.json();
        const isPublic = body.isPublic;

        if (typeof isPublic !== 'boolean') {
            return jsonError('INVALID_REQUEST', { status: 400, details: 'isPublic must be boolean' });
        }

        const profile = await performerProfilesRepository.updateVisibility(user.id, isPublic);
        
        if (!profile) {
            // Profile doesn't exist yet
            return jsonError('NOT_FOUND', { status: 404, details: 'Profile not found. Create one first.' });
        }

        return jsonOk({ profile });

    } catch (error) {
        console.error('[Performer Profile] Error updating visibility:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}

