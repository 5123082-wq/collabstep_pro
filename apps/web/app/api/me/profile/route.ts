import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { usersRepository } from '@collabverse/api';
import type { WorkspaceUser } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';
import { z } from 'zod';

const updateProfileSchema = z.object({
    name: z.union([
        z.string().min(2, 'Имя должно содержать минимум 2 символа'),
        z.literal('')
    ]).optional(),
    title: z.string().optional(),
    department: z.string().optional(),
    location: z.string().optional(),
    timezone: z.string().optional(),
    image: z.string().url().optional().or(z.literal('')),
});
type UserUpdatePayload = Partial<WorkspaceUser>;

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
            name: dbUser.name ?? null,
            email: dbUser.email ?? '',
            image: dbUser.avatarUrl || null,
            title: dbUser.title ?? null,
            department: dbUser.department ?? null,
            location: dbUser.location ?? null,
            timezone: dbUser.timezone ?? null,
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

        const updateData: UserUpdatePayload = {};
        let avatarWasCleared = false;
        if (validatedData.name !== undefined) {
            // Обрабатываем пустую строку как отсутствие обновления имени, иначе обрезаем пробелы
            const trimmedName = validatedData.name === '' ? undefined : validatedData.name.trim();
            if (trimmedName && trimmedName.length < 2) {
                return jsonError('VALIDATION_ERROR', { 
                    status: 400, 
                    details: 'Имя должно содержать минимум 2 символа или быть пустым' 
                });
            }
            if (trimmedName !== undefined) {
                updateData.name = trimmedName;
            }
        }
        // Обрабатываем пустую строку как сброс аватара
        if (validatedData.image !== undefined) {
          avatarWasCleared = validatedData.image === '';
          updateData.avatarUrl = avatarWasCleared ? '' : validatedData.image;
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
                image: avatarWasCleared ? null : updatedUser.avatarUrl || null,
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
