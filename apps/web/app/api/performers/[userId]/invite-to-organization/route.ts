import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { organizationsRepository, invitationsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';
import { nanoid } from 'nanoid';

export async function POST(
    request: NextRequest,
    { params }: { params: { userId: string } }
) {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    const { userId: inviteeUserId } = params;

    try {
        const body = await request.json();
        const { organizationId, projectId } = body;

        if (!organizationId) {
            return jsonError('INVALID_REQUEST', { status: 400, details: 'Organization ID required' });
        }

        // Check if inviter is admin/owner of organization
        const orgMember = await organizationsRepository.findMember(organizationId, currentUser.id);
        if (!orgMember || !['owner', 'admin'].includes(orgMember.role)) {
            return jsonError('FORBIDDEN', { status: 403 });
        }

        // 1. Create Organization Invite if not member
        const existingMember = await organizationsRepository.findMember(organizationId, inviteeUserId);
        if (!existingMember) {
            await invitationsRepository.createOrganizationInvite({
                organizationId,
                inviterId: currentUser.id,
                inviteeUserId,
                source: 'performer_catalog',
                token: nanoid(32),
                status: 'pending'
            });
        }

        // 2. If Project ID provided, create Project Invite
        if (projectId) {
            await invitationsRepository.createProjectInvite({
                projectId,
                organizationId,
                inviterId: currentUser.id,
                inviteeUserId,
                source: 'performer_catalog',
                token: nanoid(32),
                status: 'invited'
            });
        }

        return jsonOk({ success: true });

    } catch (error) {
        console.error('[Performers Catalog] Error inviting:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}
