import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { organizationsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function GET(
    request: NextRequest,
    { params }: { params: { orgId: string } }
) {
    const user = await getCurrentUser();
    if (!user?.id) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    const { orgId } = params;

    try {
        // Check access
        const member = await organizationsRepository.findMember(orgId, user.id);
        if (!member || member.status !== 'active') {
            return jsonError('FORBIDDEN', { status: 403 });
        }

        const members = await organizationsRepository.listMembers(orgId);
        return jsonOk({ members });

    } catch (error) {
        console.error('[Organization Members] Error listing:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}

