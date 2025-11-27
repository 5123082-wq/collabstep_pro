import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { invitationsRepository, dbProjectsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function POST(
    _request: NextRequest,
    { params }: { params: { projectId: string; inviteId: string } }
) {
    const user = await getCurrentUser();
    if (!user?.id) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    const { projectId, inviteId } = params;

    try {
        // Check permissions (Owner of project)
        const member = await dbProjectsRepository.findMember(projectId, user.id);
        if (!member || member.role !== 'owner' || member.status !== 'active') {
            return jsonError('FORBIDDEN', { status: 403, details: 'Only project owner can approve invites' });
        }

        const invite = await invitationsRepository.findProjectInviteById(inviteId);
        if (!invite || invite.projectId !== projectId) {
            return jsonError('NOT_FOUND', { status: 404 });
        }

        // Transactional approve
        const result = await invitationsRepository.approveProjectInviteAndAddMember(inviteId, 'contributor'); // Default role
        
        return jsonOk({ success: true, member: result.member });

    } catch (error) {
        console.error('[Project Invite Approve] Error:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}

