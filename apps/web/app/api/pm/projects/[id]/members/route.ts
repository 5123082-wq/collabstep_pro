import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequestWithSession, getProjectRole } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { projectsRepository, usersRepository } from '@collabverse/api';
import { notifyProjectAccessGranted } from '@/lib/notifications/event-generator';

const MANAGE_ROLES = new Set(['owner', 'admin']);

type ProjectMemberRole = 'admin' | 'member' | 'viewer';

function fallbackName(id: string): string {
  const trimmed = id.trim();
  if (trimmed.includes('@')) {
    return trimmed.split('@')[0] || trimmed;
  }
  return trimmed.slice(0, 8);
}

function normalizeProjectMemberRole(input: unknown): ProjectMemberRole | null {
  if (typeof input !== 'string') {
    return null;
  }

  const normalized = input.trim().toLowerCase();
  if (normalized === 'admin') {
    return 'admin';
  }
  if (normalized === 'member') {
    return 'member';
  }
  if (normalized === 'viewer' || normalized === 'guest') {
    return 'viewer';
  }

  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = await getAuthFromRequestWithSession(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const projectId = params.id;

  try {
    const role = await getProjectRole(projectId, auth.userId, auth.email);
    if (role === 'viewer') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    const project = await projectsRepository.findById(projectId);
    if (!project) {
      return jsonError('NOT_FOUND', { status: 404 });
    }

    const members = await projectsRepository.listMembers(projectId);
    const memberIds = Array.from(
      new Set([
        project.ownerId,
        ...members.map((member) => member.userId)
      ])
    );
    const users = await usersRepository.findMany(memberIds);
    const usersMap = new Map(users.map((user) => [user.id, user]));

    const responseMembers = memberIds.map((userId) => {
      const user = usersMap.get(userId) ?? null;
      const membership = members.find((member) => member.userId === userId) ?? null;
      const resolvedRole = userId === project.ownerId ? 'owner' : membership?.role ?? 'member';

      return {
        id: userId,
        name: user?.name || fallbackName(userId),
        email: user?.email || '',
        role: resolvedRole,
        ...(user?.avatarUrl ? { avatarUrl: user.avatarUrl } : {})
      };
    });

    return jsonOk({ members: responseMembers });
  } catch (error) {
    console.error('Error fetching project members:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = await getAuthFromRequestWithSession(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const projectId = params.id;

  try {
    const role = await getProjectRole(projectId, auth.userId, auth.email);
    if (!MANAGE_ROLES.has(role)) {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    const project = await projectsRepository.findById(projectId);
    if (!project) {
      return jsonError('NOT_FOUND', { status: 404 });
    }

    const body = await req.json();
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    if (!userId) {
      return jsonError('INVALID_REQUEST', { status: 400, details: 'userId is required' });
    }

    const targetUser = await usersRepository.findById(userId);
    if (!targetUser) {
      return jsonError('NOT_FOUND', { status: 404, details: 'User not found' });
    }

    if (project.ownerId === userId) {
      return jsonOk({
        member: {
          userId,
          role: 'owner'
        },
        alreadyMember: true
      });
    }

    const normalizedRole = normalizeProjectMemberRole(body.role) ?? 'member';
    const existingMember = projectsRepository.getMember(projectId, userId);
    if (existingMember) {
      return jsonOk({
        member: existingMember,
        alreadyMember: true
      });
    }

    const member = projectsRepository.upsertMember(projectId, userId, normalizedRole);
    if (userId !== auth.userId) {
      await notifyProjectAccessGranted(projectId, userId);
    }

    return jsonOk({
      member,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        ...(targetUser.avatarUrl ? { avatarUrl: targetUser.avatarUrl } : {})
      },
      alreadyMember: false
    });
  } catch (error) {
    console.error('Error adding project member:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
