import type { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbProjectsRepository, organizationsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function GET(_request: NextRequest, { params }: { params: { orgId: string } }) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const { orgId } = params;

  try {
    const member = await organizationsRepository.findMember(orgId, user.id);
    if (!member || !['owner', 'admin'].includes(member.role) || member.status !== 'active') {
      return jsonError('FORBIDDEN', { status: 403 });
    }

    const projects = await dbProjectsRepository.listForUser(user.id, orgId);

    return jsonOk({
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
      })),
    });
  } catch (error) {
    console.error('[Organization Projects] Error listing:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}


