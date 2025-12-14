import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { organizationsRepository, type OrganizationMember } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { orgId: string; memberId: string } }
) {
    const user = await getCurrentUser();
    if (!user?.id) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    const { orgId, memberId } = params;

    try {
        // Check if current user has permission (owner or admin)
        const currentMember = await organizationsRepository.findMember(orgId, user.id);
        if (!currentMember || !['owner', 'admin'].includes(currentMember.role) || currentMember.status !== 'active') {
            return jsonError('FORBIDDEN', { status: 403, details: 'Only owners and admins can update member roles' });
        }

        const body = (await request.json().catch(() => ({}))) as { role?: unknown; status?: unknown };
        const role = body.role;
        const status = body.status;

        const hasRole = role !== undefined;
        const hasStatus = status !== undefined;
        if (!hasRole && !hasStatus) {
            return jsonError('INVALID_REQUEST', { status: 400, details: 'No changes provided' });
        }

        if (hasRole && (typeof role !== 'string' || !['owner', 'admin', 'member', 'viewer'].includes(role))) {
            return jsonError('INVALID_REQUEST', { status: 400, details: 'Invalid role' });
        }

        if (hasStatus && (typeof status !== 'string' || !['active', 'inactive', 'blocked'].includes(status))) {
            return jsonError('INVALID_REQUEST', { status: 400, details: 'Invalid status' });
        }

        // Prevent changing owner role (only one owner allowed)
        const targetMember = await organizationsRepository.findMemberById(orgId, memberId);
        if (!targetMember) {
            return jsonError('NOT_FOUND', { status: 404, details: 'Member not found' });
        }

        if (targetMember.role === 'owner') {
            // Owners are immutable via this endpoint.
            if (hasRole) {
                return jsonError('FORBIDDEN', { status: 403, details: 'Cannot change owner role' });
            }
            if (hasStatus) {
                return jsonError('FORBIDDEN', { status: 403, details: 'Cannot change owner status' });
            }
        }

        if (hasRole) {
            await organizationsRepository.updateMemberRole(orgId, memberId, role as OrganizationMember['role']);
        }
        if (hasStatus) {
            await organizationsRepository.updateMemberStatus(orgId, memberId, status as OrganizationMember['status']);
        }

        const updated = await organizationsRepository.findMemberById(orgId, memberId);
        return jsonOk({ member: updated });

    } catch (error) {
        console.error('[Organization Member] Error updating:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: { orgId: string; memberId: string } }
) {
    const user = await getCurrentUser();
    if (!user?.id) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    const { orgId, memberId } = params;

    try {
        // Check if current user has permission (owner or admin)
        const currentMember = await organizationsRepository.findMember(orgId, user.id);
        if (!currentMember || !['owner', 'admin'].includes(currentMember.role) || currentMember.status !== 'active') {
            return jsonError('FORBIDDEN', { status: 403, details: 'Only owners and admins can remove members' });
        }

        // Prevent removing owner
        const targetMember = await organizationsRepository.findMemberById(orgId, memberId);
        if (!targetMember) {
            return jsonError('NOT_FOUND', { status: 404, details: 'Member not found' });
        }

        if (targetMember.role === 'owner') {
            return jsonError('FORBIDDEN', { status: 403, details: 'Cannot remove organization owner' });
        }

        // Soft-remove: keep history and allow reactivation.
        await organizationsRepository.updateMemberStatus(orgId, memberId, 'inactive');

        return jsonOk({ success: true, member: { ...targetMember, status: 'inactive' } });

    } catch (error) {
        console.error('[Organization Member] Error removing:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}
