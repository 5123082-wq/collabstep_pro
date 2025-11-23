import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbProjectsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function GET(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user?.id) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || undefined;

    try {
        const projects = await dbProjectsRepository.listForUser(user.id, organizationId);
        return jsonOk({ projects });
    } catch (error) {
        console.error('[Projects] Error listing:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user?.id) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    try {
        const body = await request.json();
        
        if (!body.name || !body.organizationId) {
            return jsonError('INVALID_REQUEST', { status: 400, details: 'Name and Organization ID required' });
        }

        // TODO: Check if user is member of organization (and has permissions)
        // For now relying on repo logic or assuming if they can see org they can create (simplified)

        const project = await dbProjectsRepository.create({
            organizationId: body.organizationId,
            ownerId: user.id,
            name: body.name,
            description: body.description,
            stage: body.stage,
            visibility: 'organization' // Default
        });

        return jsonOk({ project });

    } catch (error) {
        console.error('[Projects] Error creating:', error);
        return jsonError('INTERNAL_ERROR', { status: 500 });
    }
}

