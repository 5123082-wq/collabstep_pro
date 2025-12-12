import type { NextRequest } from 'next/server';
import { invitationsRepository, organizationsRepository, usersRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = typeof params.token === 'string' ? params.token.trim() : '';
  if (!token) {
    return jsonError('INVALID_REQUEST', { status: 400, details: 'Token is required' });
  }

  try {
    const invite = await invitationsRepository.findOrganizationInviteByToken(token);
    if (!invite) {
      return jsonError('NOT_FOUND', { status: 404 });
    }

    if (!invite.inviteeEmail) {
      return jsonError('INVALID_REQUEST', { status: 400, details: 'Invite does not have an email' });
    }

    const [organization, inviter] = await Promise.all([
      organizationsRepository.findById(invite.organizationId),
      usersRepository.findById(invite.inviterId),
    ]);

    if (!organization) {
      return jsonError('NOT_FOUND', { status: 404, details: 'Organization not found' });
    }

    return jsonOk({
      email: invite.inviteeEmail,
      organization: { id: organization.id, name: organization.name },
      inviter: inviter
        ? { id: inviter.id, name: inviter.name, email: inviter.email, avatarUrl: inviter.avatarUrl ?? null }
        : null,
    });
  } catch (error) {
    console.error('[Invites] Error prefill org invite:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}


