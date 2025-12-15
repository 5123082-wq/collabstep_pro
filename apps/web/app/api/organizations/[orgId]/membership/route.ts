import { NextRequest } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonOk } from '@/lib/api/http';
import { organizationsRepository, type OrganizationMember } from '@collabverse/api';

type OrgMembership = Pick<OrganizationMember, 'role' | 'status'>;

export async function GET(
  _request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const { orgId } = params;

  try {
    const member = await organizationsRepository.findMember(orgId, user.id);
    if (!member || member.status !== 'active') {
      return jsonOk({ member: null as OrgMembership | null });
    }

    const membership: OrgMembership = { role: member.role, status: member.status };
    return jsonOk({ member: membership });
  } catch (error) {
    console.error('[Organization Membership] Error fetching:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}


