import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { invitationsRepository, organizationsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function POST(
  _request: NextRequest,
  { params }: { params: { inviteId: string } }
) {
  const user = await getCurrentUser();
  if (!user?.id || !user.email) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  // Validate inviteId parameter
  const inviteId = params?.inviteId;
  if (!inviteId || typeof inviteId !== 'string' || inviteId.trim() === '') {
    console.error('[Invites] Invalid inviteId parameter:', inviteId);
    return jsonError('INVALID_REQUEST', { status: 400, details: 'Invalid invite ID' });
  }

  try {
    const invite = await invitationsRepository.findOrganizationInviteById(inviteId.trim());
    if (!invite) {
      console.error('[Invites] Invite not found:', inviteId);
      return jsonError('NOT_FOUND', { status: 404 });
    }

    // Ownership check: by inviteeUserId OR by inviteeEmail (for email-based invites pre-registration).
    const emailMatch = invite.inviteeEmail?.toLowerCase() === user.email.toLowerCase();
    const userMatch = invite.inviteeUserId === user.id;
    if (!userMatch && !emailMatch) {
      console.error('[Invites] Access denied:', {
        inviteId,
        inviteeEmail: invite.inviteeEmail,
        inviteeUserId: invite.inviteeUserId,
        userEmail: user.email,
        userId: user.id,
      });
      return jsonError('FORBIDDEN', { status: 403 });
    }

    if (invite.status !== 'pending') {
      console.error('[Invites] Invite is not pending:', {
        inviteId,
        status: invite.status,
        userEmail: user.email,
      });
      return jsonError('INVALID_REQUEST', { status: 400, details: `Invite is ${invite.status}` });
    }

    // Accept + link invite to user if it was email-only.
    const updatedInvite = await invitationsRepository.updateOrganizationInviteStatus(
      invite.id,
      'accepted',
      invite.inviteeUserId ? undefined : user.id
    );

    const organizationId = invite.organizationId;
    const member = await organizationsRepository.findMember(organizationId, user.id);
    if (!member) {
      await organizationsRepository.addMember({
        organizationId,
        userId: user.id,
        role: invite.role ?? 'member',
        status: 'active',
      });
    } else if (member.status === 'inactive') {
      // Reactivate existing member (role is preserved by policy).
      await organizationsRepository.updateMemberStatus(organizationId, member.id, 'active');
    } else if (member.status === 'blocked') {
      return jsonError('FORBIDDEN', {
        status: 403,
        details: 'Your access to this organization is blocked. Please contact an organization admin.'
      });
    }

    return jsonOk({ success: true, invite: updatedInvite ?? invite });
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
      console.error('[Invites] Database schema missing `role` column. Migration required.');
      return jsonError('DATABASE_SCHEMA_OUTDATED', {
        status: 503,
        details: 'Database migration required: the `organization_invite.role` column is missing. Please run database migrations.',
      });
    }
    
    console.error('[Invites] Error accepting:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}


