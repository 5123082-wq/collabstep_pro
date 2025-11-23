import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { organizationsRepository, invitationsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';
import { nanoid } from 'nanoid';

export async function POST(
    request: NextRequest,
    { params }: { params: { orgId: string } }
) {
    const user = await getCurrentUser();
    if (!user?.id) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    const { orgId } = params;

    try {
        // Check access (Owner or Admin can invite)
        const member = await organizationsRepository.findMember(orgId, user.id);
        if (!member || !['owner', 'admin'].includes(member.role) || member.status !== 'active') {
            return jsonError('FORBIDDEN', { status: 403, details: 'Only owners and admins can invite' });
        }

        const body = await request.json();
        const source = body.source; // 'email' | 'link'

        // 1. Create Invite
        if (source === 'email') {
            if (!body.email) return jsonError('INVALID_REQUEST', { status: 400, details: 'Email required' });

            const invite = await invitationsRepository.createOrganizationInvite({
                organizationId: orgId,
                inviterId: user.id,
                inviteeEmail: body.email,
                source: 'email',
                token: nanoid(32), // Generate token for email link as well
                status: 'pending'
            });
            
            // TODO: Send email here (mock for now)
            console.log(`[Email Mock] Sending invite to ${body.email} for org ${orgId} with token ${invite.token}`);

            return jsonOk({ invite });

        } else if (source === 'link') {
            const invite = await invitationsRepository.createOrganizationInvite({
                organizationId: orgId,
                inviterId: user.id,
                source: 'link',
                token: nanoid(32),
                status: 'pending'
            });
            
            return jsonOk({ invite, link: `/invite/org/${invite.token}` }); // client constructs full URL
        }

        return jsonError('INVALID_REQUEST', { status: 400, details: 'Invalid source' });

    } catch (error) {
        console.error('[Organization Invites] Error creating:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}

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
        if (!member || !['owner', 'admin'].includes(member.role)) {
            return jsonError('FORBIDDEN', { status: 403 });
        }

        const invites = await invitationsRepository.listPendingOrganizationInvites(orgId);
        return jsonOk({ invites });

    } catch (error) {
        console.error('[Organization Invites] Error listing:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}

