import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { usersRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';
import { z } from 'zod';

const updateProfileSchema = z.object({
    name: z.string().min(2).optional(),
    title: z.string().optional(),
    department: z.string().optional(),
    location: z.string().optional(),
    timezone: z.string().optional(),
    image: z.string().url().optional().or(z.literal('')),
});

export async function GET() {
    const user = await getCurrentUser();
    if (!user?.id) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    const dbUser = await usersRepository.findById(user.id);

    if (!dbUser) {
        return jsonError('NOT_FOUND', { status: 404 });
    }

    return jsonOk({
        profile: {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            image: dbUser.avatarUrl,
            title: dbUser.title,
            department: dbUser.department,
            location: dbUser.location,
            timezone: dbUser.timezone,
        }
    });
}

export async function PATCH(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user?.id) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    try {
        const body = await request.json();
        const validatedData = updateProfileSchema.parse(body);

        // Explicitly type updateData as Partial<WorkspaceUser> to match repository expectation
        const updateData: any = {};
        if (validatedData.name !== undefined) updateData.name = validatedData.name;
        // Обрабатываем пустую строку как null для avatarUrl
        if (validatedData.image !== undefined) {
          updateData.avatarUrl = validatedData.image === '' ? null : validatedData.image;
        }
        if (validatedData.title !== undefined) updateData.title = validatedData.title;
        if (validatedData.department !== undefined) updateData.department = validatedData.department;
        if (validatedData.location !== undefined) updateData.location = validatedData.location;
        if (validatedData.timezone !== undefined) updateData.timezone = validatedData.timezone;

        const updatedUser = await usersRepository.update(user.id, updateData);

        if (!updatedUser) {
            return jsonError('UPDATE_FAILED', { status: 500 });
        }

        return jsonOk({
            profile: {
                id: updatedUser.id,
                name: updatedUser.name,
                image: updatedUser.avatarUrl,
                title: updatedUser.title,
                department: updatedUser.department,
                location: updatedUser.location,
                timezone: updatedUser.timezone,
            }
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return jsonError('VALIDATION_ERROR', { status: 400, details: JSON.stringify(error.errors) });
        }
        console.error('[Profile API] Error updating profile:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}
