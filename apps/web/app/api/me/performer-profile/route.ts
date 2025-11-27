import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { performerProfilesRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function GET(_request: NextRequest) {
    void _request;
    const user = await getCurrentUser();
    if (!user?.id) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    const profile = await performerProfilesRepository.findByUserId(user.id);

    // It's okay if profile is null, just return null data
    return jsonOk({ profile });
}

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user?.id) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    try {
        const body = await request.json();

        // Validation could be improved with Zod
        // For now, simple object construction
        const profileData = {
            userId: user.id,
            specialization: body.specialization,
            skills: body.skills, // jsonb
            bio: body.bio,
            rate: body.rate,
            employmentType: body.employmentType,
            location: body.location,
            timezone: body.timezone,
            isPublic: body.isPublic ?? false
        };

        const profile = await performerProfilesRepository.upsert(profileData);
        return jsonOk({ profile });

    } catch (error) {
        console.error('[Performer Profile] Error upserting profile:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}
