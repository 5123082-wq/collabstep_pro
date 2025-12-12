import { getCurrentUser } from '@/lib/auth/session';
import { invitationsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const invites = await invitationsRepository.listOrganizationInvitesForInvitee(user.id, user.email);
    const count = invites.filter((invite) => invite.status === 'pending').length;
    return jsonOk({ count });
  } catch (error) {
    // In some environments the database schema can be behind migrations (e.g. missing `organization_invite.role`).
    // We degrade gracefully to avoid breaking the whole UI/topbar polling.
    const message = error instanceof Error ? error.message : String(error);
    const causeMessage =
      typeof (error as { cause?: unknown })?.cause === 'object' && (error as { cause?: { message?: unknown } }).cause
        ? String((error as { cause?: { message?: unknown } }).cause?.message ?? '')
        : '';
    const causeCode =
      typeof (error as { cause?: unknown })?.cause === 'object' && (error as { cause?: { code?: unknown } }).cause
        ? String((error as { cause?: { code?: unknown } }).cause?.code ?? '')
        : '';
    const isMissingRoleColumn =
      message.includes('column "role" does not exist') ||
      causeMessage.includes('column "role" does not exist') ||
      (causeCode === '42703' && (message.toLowerCase().includes('role') || causeMessage.toLowerCase().includes('role')));
    if (isMissingRoleColumn) {
      return jsonOk({ count: 0 });
    }
    console.error('[Invites] Error counting unread:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}


