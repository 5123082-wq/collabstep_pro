import { getCurrentUser } from '@/lib/auth/session';
import { dbProjectsRepository, inviteThreadsRepository, invitationsRepository, organizationsRepository, usersRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function GET() {
  const user = await getCurrentUser();
  const userId = user?.id;
  const userEmail = user?.email;
  if (!userId) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const invites = await invitationsRepository.listOrganizationInvitesForInvitee(userId, userEmail);

    const result = await Promise.all(invites.map(async (invite) => {
      const [organization, inviter] = await Promise.all([
        organizationsRepository.findById(invite.organizationId),
        usersRepository.findById(invite.inviterId),
      ]);

      const thread = inviteThreadsRepository.ensureThreadForInvite({
        orgInviteId: invite.id,
        organizationId: invite.organizationId,
        createdByUserId: invite.inviterId,
        ...(invite.inviteeUserId ? { inviteeUserId: invite.inviteeUserId } : {}),
        ...(invite.inviteeEmail ? { inviteeEmail: invite.inviteeEmail } : {}),
      });

      const previewProjectIds = Array.isArray(thread.previewProjectIds) ? thread.previewProjectIds : [];
      const previewProjects = previewProjectIds.length
        ? await Promise.all(
          previewProjectIds.map(async (projectId) => {
            const project = await dbProjectsRepository.findById(projectId);
            const activeInviteForUser = await invitationsRepository.findActiveProjectInviteForUser(projectId, userId);
            const activeInviteForEmail = userEmail
              ? await invitationsRepository.findActiveProjectInviteForEmail(projectId, userEmail)
              : null;
            const activeInvite = activeInviteForUser ?? activeInviteForEmail;
            return project
              ? {
                id: project.id,
                name: project.name,
                previewInviteToken: activeInvite?.token ?? null,
              }
              : null;
          })
        )
        : [];
      const previewProjectsClean = previewProjects.filter(
        (item): item is { id: string; name: string; previewInviteToken: string | null } => Boolean(item)
      );

      return {
        invite,
        organization: organization ? { id: organization.id, name: organization.name } : null,
        inviter: inviter
          ? { id: inviter.id, name: inviter.name, email: inviter.email, avatarUrl: inviter.avatarUrl ?? null }
          : null,
        threadId: thread.id,
        previewProjects: previewProjectsClean,
      };
    }));

    return jsonOk({ invites: result });
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
    // return empty list instead of 500.
    const isMissingRoleColumn =
      message.includes('column "role" does not exist') ||
      causeMessage.includes('column "role" does not exist') ||
      (causeCode === '42703' && (message.toLowerCase().includes('role') || causeMessage.toLowerCase().includes('role')));
    
    if (isMissingRoleColumn) {
      console.error('[Invites] Database schema missing `role` column. Migration required. Returning empty list.');
      return jsonOk({ invites: [] });
    }
    
    console.error('[Invites] Error listing:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}


