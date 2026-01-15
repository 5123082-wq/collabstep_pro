import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { performerProfilesRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';
import { z } from 'zod';

const PerformerProfileSchema = z.object({
    specialization: z.string().optional(),
    skills: z.array(z.string()).optional(),
    bio: z.string().optional(),
    rate: z.number().optional(),
    employmentType: z.string().optional(),
    location: z.string().optional(),
    timezone: z.string().optional(),
    isPublic: z.boolean().optional(),
    languages: z.array(z.string()).optional(),
    workFormats: z.array(z.string()).optional(),
    work_formats: z.array(z.string()).optional(),
    portfolioEnabled: z.boolean().optional(),
    portfolio_enabled: z.boolean().optional(),
    handle: z.string().optional()
});

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
        const parsed = PerformerProfileSchema.parse(body);

        const workFormats = parsed.workFormats ?? parsed.work_formats;
        const portfolioEnabled = parsed.portfolioEnabled ?? parsed.portfolio_enabled;

        const profileData = {
            userId: user.id,
            ...(parsed.specialization !== undefined ? { specialization: parsed.specialization } : {}),
            ...(parsed.skills !== undefined ? { skills: parsed.skills } : {}),
            ...(parsed.bio !== undefined ? { bio: parsed.bio } : {}),
            ...(parsed.rate !== undefined ? { rate: parsed.rate } : {}),
            ...(parsed.employmentType !== undefined ? { employmentType: parsed.employmentType } : {}),
            ...(parsed.location !== undefined ? { location: parsed.location } : {}),
            ...(parsed.timezone !== undefined ? { timezone: parsed.timezone } : {}),
            ...(parsed.isPublic !== undefined ? { isPublic: parsed.isPublic } : {}),
            ...(parsed.languages !== undefined ? { languages: parsed.languages } : {}),
            ...(workFormats !== undefined ? { workFormats } : {}),
            ...(portfolioEnabled !== undefined ? { portfolioEnabled } : {}),
            ...(parsed.handle !== undefined ? { handle: parsed.handle } : {})
        };

        const profile = await performerProfilesRepository.upsert(profileData);
        return jsonOk({ profile });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return jsonError('VALIDATION_ERROR', { status: 400, details: JSON.stringify(error.errors) });
        }
        console.error('[Performer Profile] Error upserting profile:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}
