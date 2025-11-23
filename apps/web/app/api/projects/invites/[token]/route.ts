import { NextRequest } from 'next/server';
import { invitationsRepository, dbProjectsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function GET(
    request: NextRequest,
    { params }: { params: { token: string } }
) {
    const { token } = params;

    try {
        const invite = await invitationsRepository.findProjectInviteByToken(token);
        
        if (!invite || ['expired', 'revoked'].includes(invite.status)) {
            return jsonError('NOT_FOUND', { status: 404, details: 'Invite not found or expired' });
        }

        // Return preview data
        const project = await dbProjectsRepository.findById(invite.projectId);
        if (!project) {
            return jsonError('NOT_FOUND', { status: 404, details: 'Project not found' });
        }

        const previewData = {
            name: project.name,
            description: project.description,
            stage: project.stage,
            inviteStatus: invite.status
        };

        return jsonOk({ preview: previewData, inviteId: invite.id });

    } catch (error) {
        console.error('[Project Invite Preview] Error:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}

