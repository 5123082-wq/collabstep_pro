import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { organizationsRepository, usersRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const { orgId } = params;

  const email = request.nextUrl.searchParams.get('email')?.trim().toLowerCase();
  if (!email) {
    return jsonError('INVALID_REQUEST', { status: 400, details: 'Email required' });
  }

  try {
    const member = await organizationsRepository.findMember(orgId, user.id);
    if (!member || !['owner', 'admin'].includes(member.role) || member.status !== 'active') {
      return jsonError('FORBIDDEN', { status: 403 });
    }

    const found = await usersRepository.findByEmail(email);
    if (!found) {
      return jsonOk({ user: null });
    }

    return jsonOk({
      user: {
        id: found.id,
        name: found.name,
        email: found.email,
        avatarUrl: found.avatarUrl ?? null
      }
    });
  } catch (error) {
    console.error('[Invitee Lookup] Error:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}


