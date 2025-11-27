import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { organizationsRepository } from '@collabverse/api';
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

        const body = await request.json();
        const { role } = body;

        if (!role || !['owner', 'admin', 'member', 'viewer'].includes(role)) {
            return jsonError('INVALID_REQUEST', { status: 400, details: 'Invalid role' });
        }

        // Prevent changing owner role (only one owner allowed)
        const targetMember = await organizationsRepository.findMemberById(orgId, memberId);
        if (!targetMember) {
            return jsonError('NOT_FOUND', { status: 404, details: 'Member not found' });
        }

        if (targetMember.role === 'owner') {
            return jsonError('FORBIDDEN', { status: 403, details: 'Cannot change owner role' });
        }

        // Update role using repository method
        const updatedMember = await organizationsRepository.updateMemberRole(orgId, memberId, role);

        return jsonOk({ member: updatedMember });

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

        // Remove member using repository method
        await organizationsRepository.removeMember(orgId, memberId);

        return jsonOk({ success: true });

    } catch (error) {
        console.error('[Organization Member] Error removing:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}
