import { NextRequest, NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/auth/check-admin-role.server';
import {
    aiAgentConfigsDbRepository,
    aiAgentPromptVersionsDbRepository
} from '@collabverse/api';

// --- Helpers ---

function jsonError(code: string, options: { status: number; details?: string }) {
    return NextResponse.json(
        { error: { code, details: options.details } },
        { status: options.status }
    );
}

function jsonOk<T>(data: T) {
    return NextResponse.json(data, { status: 200 });
}

// --- GET /api/admin/ai-agents/brandbook ---
// Get Brandbook agent config with active prompt version

export async function GET() {
    const isAdmin = await isAdminUser();

    if (!isAdmin) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    try {
        const config = await aiAgentConfigsDbRepository.findBySlug('brandbook');

        if (!config) {
            return jsonError('NOT_FOUND', {
                status: 404,
                details: 'Brandbook agent config not found. Run migration 0020_ai_agents.sql'
            });
        }

        const publishedPrompt = await aiAgentPromptVersionsDbRepository.findPublished(config.id);
        const allPrompts = await aiAgentPromptVersionsDbRepository.listByAgent(config.id);

        return jsonOk({
            config,
            publishedPrompt,
            promptVersions: allPrompts
        });
    } catch (error) {
        console.error('Error fetching brandbook agent config:', error);
        return jsonError('INTERNAL_ERROR', {
            status: 500,
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

// --- PATCH /api/admin/ai-agents/brandbook ---
// Update Brandbook agent config

export async function PATCH(req: NextRequest) {
    const isAdmin = await isAdminUser();

    if (!isAdmin) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    try {
        const body = await req.json();
        const config = await aiAgentConfigsDbRepository.findBySlug('brandbook');

        if (!config) {
            return jsonError('NOT_FOUND', { status: 404 });
        }

        const { name, description, enabled, limits, parameters } = body;

        const updated = await aiAgentConfigsDbRepository.update(config.id, {
            name: name ?? undefined,
            description: description ?? undefined,
            enabled: enabled ?? undefined,
            limits: limits ?? undefined,
            parameters: parameters ?? undefined
        });

        return jsonOk(updated);
    } catch (error) {
        console.error('Error updating brandbook agent config:', error);
        return jsonError('INTERNAL_ERROR', {
            status: 500,
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
