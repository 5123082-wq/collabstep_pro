import { NextRequest, NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/auth/check-admin-role.server';
import { aiAgentPromptVersionsDbRepository } from '@collabverse/api';

// --- Helpers ---

function jsonError(code: string, options: { status: number; details?: string }) {
    return NextResponse.json(
        { error: { code, details: options.details } },
        { status: options.status }
    );
}

function jsonOk<T>(data: T, status = 200) {
    return NextResponse.json(data, { status });
}

type RouteParams = { params: Promise<{ versionId: string }> };

// --- POST /api/admin/ai-agents/brandbook/prompts/[versionId]/publish ---
// Publish a prompt version (archive previous published ones)

export async function POST(
    _req: NextRequest,
    context: RouteParams
) {
    const isAdmin = await isAdminUser();

    if (!isAdmin) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    const { versionId } = await context.params;

    try {
        const existing = await aiAgentPromptVersionsDbRepository.findById(versionId);

        if (!existing) {
            return jsonError('NOT_FOUND', {
                status: 404,
                details: 'Prompt version not found'
            });
        }

        if (existing.status === 'published') {
            return jsonError('ALREADY_PUBLISHED', {
                status: 400,
                details: 'This version is already published'
            });
        }

        if (existing.status === 'archived') {
            return jsonError('ARCHIVED', {
                status: 400,
                details: 'Cannot publish an archived version. Create a new version instead.'
            });
        }

        const published = await aiAgentPromptVersionsDbRepository.publish(versionId);

        if (!published) {
            return jsonError('PUBLISH_FAILED', {
                status: 500,
                details: 'Failed to publish version'
            });
        }

        return jsonOk({
            success: true,
            version: published
        });
    } catch (error) {
        console.error('Error publishing prompt version:', error);
        return jsonError('INTERNAL_ERROR', {
            status: 500,
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
