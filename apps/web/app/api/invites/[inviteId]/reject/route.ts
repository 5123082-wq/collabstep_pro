import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { invitationsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function POST(
  _request: NextRequest,
  { params }: { params: { inviteId: string } }
) {
  const user = await getCurrentUser();
  if (!user?.id || !user.email) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const invite = await invitationsRepository.findOrganizationInviteById(params.inviteId);
    if (!invite) {
      return jsonError('NOT_FOUND', { status: 404 });
    }

    const emailMatch = invite.inviteeEmail?.toLowerCase() === user.email.toLowerCase();
    const userMatch = invite.inviteeUserId === user.id;
    if (!userMatch && !emailMatch) {
      return jsonError('FORBIDDEN', { status: 403 });
    }

    if (invite.status !== 'pending') {
      return jsonError('INVALID_REQUEST', { status: 400, details: `Invite is ${invite.status}` });
    }

    const updated = await invitationsRepository.updateOrganizationInviteStatus(invite.id, 'rejected');
    return jsonOk({ success: true, invite: updated ?? invite });
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
    
    console.error('[Invites] Error rejecting:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}


