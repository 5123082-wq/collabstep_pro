import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbProjectsRepository, organizationsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function POST(
  _request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const orgId = params.orgId;
  if (!orgId || typeof orgId !== 'string') {
    return jsonError('INVALID_REQUEST', { status: 400, details: 'Invalid organization id' });
  }

  try {
    const member = await organizationsRepository.findMember(orgId, user.id);
    if (!member) {
      // Idempotent: user is not a member, nothing to do.
      return jsonOk({ success: true });
    }

    if (member.role === 'owner') {
      return jsonError('FORBIDDEN', { status: 403, details: 'Owner cannot leave organization' });
    }

    await organizationsRepository.updateMemberStatus(orgId, member.id, 'inactive');

    // Remove access to DB-backed org projects (project_member -> removed).
    await dbProjectsRepository.removeUserFromOrganizationProjects(orgId, user.id);

    return jsonOk({ success: true });
  } catch (error) {
    console.error('[Organization Leave] Error:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}


