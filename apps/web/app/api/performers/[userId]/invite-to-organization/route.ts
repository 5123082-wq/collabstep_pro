import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { organizationsRepository, invitationsRepository, usersRepository } from '@collabverse/api';
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

    const { userId: inviteeUserIdRaw } = params;
    const inviteeUserIdTrimmed = typeof inviteeUserIdRaw === 'string' ? inviteeUserIdRaw.trim() : '';
    if (!inviteeUserIdTrimmed) {
        return jsonError('INVALID_REQUEST', { status: 400, details: 'Invitee userId required' });
    }

    try {
        const body = await request.json();
        const { organizationId, projectId } = body;

        if (!organizationId) {
            return jsonError('INVALID_REQUEST', { status: 400, details: 'Organization ID required' });
        }

        // Hard guard: do not allow email to be passed as "userId" in this route.
        // If someone accidentally sends email here, try to resolve to canonical id; otherwise reject.
        const inviteeUser =
            inviteeUserIdTrimmed.includes('@')
                ? await usersRepository.findByEmail(inviteeUserIdTrimmed.toLowerCase())
                : await usersRepository.findById(inviteeUserIdTrimmed);
        const inviteeUserId = inviteeUser?.id ?? null;
        if (!inviteeUserId) {
            return jsonError('INVALID_REQUEST', { status: 400, details: 'Invitee user not found' });
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
        const message = error instanceof Error ? error.message : String(error);
        const causeMessage =
            typeof (error as { cause?: unknown })?.cause === 'object' && (error as { cause?: { message?: unknown } }).cause
                ? String((error as { cause?: { message?: unknown } }).cause?.message ?? '')
                : '';
        const causeCode =
            typeof (error as { cause?: unknown })?.cause === 'object' && (error as { cause?: { code?: unknown } }).cause
                ? String((error as { cause?: { code?: unknown } }).cause?.code ?? '')
                : '';
        
        // Graceful degradation: if database schema is missing the `role` column (migration not applied),
        // return a clear error message instead of 500.
        const isMissingRoleColumn =
            message.includes('column "role" does not exist') ||
            causeMessage.includes('column "role" does not exist') ||
            (causeCode === '42703' && (message.toLowerCase().includes('role') || causeMessage.toLowerCase().includes('role')));
        
        if (isMissingRoleColumn) {
            console.error('[Performers Catalog] Database schema missing `role` column. Migration required.');
            return jsonError('DATABASE_SCHEMA_OUTDATED', {
                status: 503,
                details: 'Database migration required: the `organization_invite.role` column is missing. Please run database migrations.',
            });
        }
        
        console.error('[Performers Catalog] Error inviting:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}
