import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { invitationsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function POST(
    request: NextRequest,
    { params }: { params: { token: string } }
) {
    const user = await getCurrentUser();
    if (!user?.id) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    const { token } = params;

    try {
        const invite = await invitationsRepository.findProjectInviteByToken(token);
        
        if (!invite || ['expired', 'revoked'].includes(invite.status)) {
            return jsonError('NOT_FOUND', { status: 404, details: 'Invite not found or expired' });
        }

        // Transition status
        // If already accepted, return ok (idempotent)
        if (invite.status === 'accepted_by_user' || invite.status === 'pending_owner_approval') {
            return jsonOk({ success: true, status: invite.status });
        }

        // Logic: invited/previewing -> accepted_by_user -> pending_owner_approval
        // Note: For now we skip straight to pending_owner_approval or accepted_by_user depending on logic
        // Plan says: accepted_by_user -> pending_owner_approval
        
        await invitationsRepository.updateProjectInviteStatus(
            invite.id, 
            'pending_owner_approval',
            user.id // Link user
        );

        return jsonOk({ success: true, status: 'pending_owner_approval' });

    } catch (error) {
        console.error('[Project Invite Accept] Error:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}

