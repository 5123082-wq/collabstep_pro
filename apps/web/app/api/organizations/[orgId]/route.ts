import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { organizationsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function GET(
    _request: NextRequest,
    { params }: { params: { orgId: string } }
) {
    const user = await getCurrentUser();
    if (!user?.id) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    const { orgId } = params;

    try {
        // Check membership
        const member = await organizationsRepository.findMember(orgId, user.id);
            if (!member || member.status !== 'active') {
            return jsonError('FORBIDDEN', { status: 403 });
        }

        const organization = await organizationsRepository.findById(orgId);
        if (!organization) {
            return jsonError('NOT_FOUND', { status: 404 });
        }
        
        return jsonOk({ organization });

    } catch (error) {
        console.error('[Organization] Error fetching:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { orgId: string } }
) {
    const user = await getCurrentUser();
    if (!user?.id) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    const { orgId } = params;

    try {
        const body = await request.json();

        // Check permissions (only owner or admin can update)
        const member = await organizationsRepository.findMember(orgId, user.id);
        if (!member || member.status !== 'active' || !['owner', 'admin'].includes(member.role)) {
            return jsonError('FORBIDDEN', { status: 403 });
        }

        const updatedOrg = await organizationsRepository.update(orgId, {
            name: body.name,
            description: body.description,
            isPublicInDirectory: body.isPublicInDirectory
        });

        return jsonOk({ organization: updatedOrg });

    } catch (error) {
        console.error('[Organization] Error updating:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}

