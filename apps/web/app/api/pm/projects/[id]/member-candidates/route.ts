import { NextRequest, NextResponse } from 'next/server';
import { dbProjectsRepository, organizationsRepository, projectsRepository, usersRepository } from '@collabverse/api';
import { flags } from '@/lib/flags';
import { getAuthFromRequestWithSession, getProjectRole } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';

type CandidateRelationship = 'project_member' | 'organization_member' | 'platform_user';

function normalizeQuery(input: string | null): string {
  return input?.trim().toLowerCase() ?? '';
}

function matchesQuery(
  query: string,
  user: {
    name: string;
    email: string;
    title?: string;
  }
): boolean {
  if (!query) {
    return true;
  }

  return (
    user.name.toLowerCase().includes(query) ||
    user.email.toLowerCase().includes(query) ||
    (user.title ? user.title.toLowerCase().includes(query) : false)
  );
}

function relationshipRank(relationship: CandidateRelationship): number {
  if (relationship === 'organization_member') {
    return 0;
  }
  if (relationship === 'platform_user') {
    return 1;
  }
  return 2;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS || !flags.PM_PROJECT_CARD) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = await getAuthFromRequestWithSession(request);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const projectId = params.id;

  try {
    const projectRole = await getProjectRole(projectId, auth.userId, auth.email);
    if (projectRole !== 'owner' && projectRole !== 'admin') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    const project = await projectsRepository.findById(projectId);
    if (!project) {
      return jsonError('NOT_FOUND', { status: 404 });
    }

    const query = normalizeQuery(request.nextUrl.searchParams.get('q'));
    const legacyProject = await dbProjectsRepository.findById(projectId);
    const organizationId = legacyProject?.organizationId ?? null;
    const projectMembers = await projectsRepository.listMembers(projectId);
    const projectMemberIds = new Set(projectMembers.map((member) => member.userId));
    projectMemberIds.add(project.ownerId);

    const organizationMembers = organizationId
      ? await organizationsRepository.listMembers(organizationId)
      : [];
    const activeOrganizationMemberIds = new Set(
      organizationMembers
        .filter((member) => member.status === 'active')
        .map((member) => member.userId)
    );

    const allUsers = await usersRepository.list();
    const candidates = allUsers
      .filter((user) => user.id !== auth.userId)
      .filter((user) => matchesQuery(query, user))
      .map((user) => {
        const inProject = projectMemberIds.has(user.id);
        const inOrganization = organizationId ? activeOrganizationMemberIds.has(user.id) : null;

        let relationship: CandidateRelationship = 'platform_user';
        if (inProject) {
          relationship = 'project_member';
        } else if (inOrganization) {
          relationship = 'organization_member';
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl ?? null,
          ...(user.title ? { title: user.title } : {}),
          relationship,
          inProject,
          inOrganization,
        };
      })
      .sort((left, right) => {
        const byRelationship = relationshipRank(left.relationship) - relationshipRank(right.relationship);
        if (byRelationship !== 0) {
          return byRelationship;
        }
        return left.name.localeCompare(right.name, 'ru', { sensitivity: 'base' });
      })
      .slice(0, 20);

    return jsonOk({
      items: candidates,
      ...(organizationId ? { organizationId } : {})
    });
  } catch (error) {
    console.error('[Project Member Candidates] Error:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
