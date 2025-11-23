import { NextRequest } from 'next/server';
import { performerProfilesRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function GET(
    request: NextRequest,
    { params }: { params: { userId: string } }
) {
    const { userId } = params;
    try {
        const profile = await performerProfilesRepository.findByUserId(userId);
        
        if (!profile || !profile.isPublic) {
            return jsonError('NOT_FOUND', { status: 404 });
        }

        return jsonOk({ profile });

    } catch (error) {
        console.error('[Performers Catalog] Error fetching:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}

