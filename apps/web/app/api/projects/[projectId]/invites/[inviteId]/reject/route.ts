import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { invitationsRepository, dbProjectsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function POST(
    request: NextRequest,
    { params }: { params: { projectId: string; inviteId: string } }
) {
    const user = await getCurrentUser();
    if (!user?.id) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    const { projectId, inviteId } = params;

    try {
        // Check permissions
        const member = await dbProjectsRepository.findMember(projectId, user.id);
        if (!member || member.role !== 'owner' || member.status !== 'active') {
            return jsonError('FORBIDDEN', { status: 403 });
        }

        await invitationsRepository.updateProjectInviteStatus(inviteId, 'rejected');
        
        return jsonOk({ success: true });

    } catch (error) {
        console.error('[Project Invite Reject] Error:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}

