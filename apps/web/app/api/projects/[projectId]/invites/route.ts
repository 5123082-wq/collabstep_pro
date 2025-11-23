import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { invitationsRepository, dbProjectsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';
import { nanoid } from 'nanoid';

export async function GET(
    request: NextRequest,
    { params }: { params: { projectId: string } }
) {
    const user = await getCurrentUser();
    if (!user?.id) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending_owner_approval etc.

    try {
        // Check permissions (Owner/Manager of project)
        const member = await dbProjectsRepository.findMember(projectId, user.id);
        if (!member || !['owner', 'manager'].includes(member.role) || member.status !== 'active') {
            return jsonError('FORBIDDEN', { status: 403 });
        }

        const invites = await invitationsRepository.listProjectInvites(projectId, status || undefined);
        return jsonOk({ invites });

    } catch (error) {
        console.error('[Project Invites] Error listing:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { projectId: string } }
) {
    const user = await getCurrentUser();
    if (!user?.id) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    const { projectId } = params;

    try {
        // Check permissions (Owner/Manager of project)
        const member = await dbProjectsRepository.findMember(projectId, user.id);
        if (!member || !['owner', 'manager'].includes(member.role) || member.status !== 'active') {
            return jsonError('FORBIDDEN', { status: 403 });
        }

        const body = await request.json();
        const { email, source, organizationId } = body;

        // Should probably fetch project to get orgId if not passed
        let orgId = organizationId;
        if (!orgId) {
            const project = await dbProjectsRepository.findById(projectId);
            if (!project) return jsonError('NOT_FOUND', { status: 404 });
            orgId = project.organizationId;
        }
        
        if (!orgId) {
             return jsonError('INVALID_REQUEST', { status: 400, details: 'Project not linked to organization' });
        }

        // Creating invite
        const invite = await invitationsRepository.createProjectInvite({
            projectId,
            organizationId: orgId,
            inviterId: user.id,
            inviteeEmail: email,
            source: source || 'email',
            token: nanoid(32),
            status: 'invited'
        });

        return jsonOk({ invite });

    } catch (error) {
        console.error('[Project Invites] Error creating:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}
