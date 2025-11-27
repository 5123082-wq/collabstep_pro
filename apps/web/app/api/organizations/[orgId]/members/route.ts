import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { organizationsRepository, usersRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

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
        // Check access
        const member = await organizationsRepository.findMember(orgId, user.id);
        if (!member || member.status !== 'active') {
            return jsonError('FORBIDDEN', { status: 403 });
        }

        const members = await organizationsRepository.listMembers(orgId);

        // Enrich members with user data
        const membersWithUsers = await Promise.all(
            members.map(async (member) => {
                const userData = await usersRepository.findById(member.userId);
                return {
                    ...member,
                    user: userData ? {
                        id: userData.id,
                        name: userData.name,
                        email: userData.email,
                        image: userData.avatarUrl,
                    } : null,
                };
            })
        );

        return jsonOk({ members: membersWithUsers });

    } catch (error) {
        console.error('[Organization Members] Error listing:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}

