import { NextRequest } from 'next/server';
import { performerProfilesRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const specialization = searchParams.get('specialization') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    try {
        const performers = await performerProfilesRepository.listPublic({
            ...(specialization ? { specialization } : {}),
            limit,
            offset
        });
        return jsonOk({ performers });
    } catch (error) {
        console.error('[Performers Catalog] Error listing:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}

