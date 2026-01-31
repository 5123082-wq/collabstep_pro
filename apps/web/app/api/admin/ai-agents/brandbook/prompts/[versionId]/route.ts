import { NextRequest, NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/auth/check-admin-role.server';
import { aiAgentPromptVersionsDbRepository, type AIAgentPrompts } from '@collabverse/api';
import { z } from 'zod';

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

// --- Schemas ---

const UpdatePromptVersionSchema = z.object({
    systemPrompt: z.string().optional(),
    prompts: z.object({
        intake: z.string().optional(),
        logoCheck: z.string().optional(),
        generate: z.string().optional(),
        qa: z.string().optional(),
        followup: z.string().optional()
    }).optional()
});

type RouteParams = { params: Promise<{ versionId: string }> };

// --- GET /api/admin/ai-agents/brandbook/prompts/[versionId] ---
// Get a specific prompt version

export async function GET(
    _req: NextRequest,
    context: RouteParams
) {
    const isAdmin = await isAdminUser();

    if (!isAdmin) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    const { versionId } = await context.params;

    try {
        const version = await aiAgentPromptVersionsDbRepository.findById(versionId);

        if (!version) {
            return jsonError('NOT_FOUND', {
                status: 404,
                details: 'Prompt version not found'
            });
        }

        return jsonOk(version);
    } catch (error) {
        console.error('Error fetching prompt version:', error);
        return jsonError('INTERNAL_ERROR', {
            status: 500,
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

// --- PATCH /api/admin/ai-agents/brandbook/prompts/[versionId] ---
// Update a prompt version (only draft versions)

export async function PATCH(
    req: NextRequest,
    context: RouteParams
) {
    const isAdmin = await isAdminUser();

    if (!isAdmin) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    const { versionId } = await context.params;

    try {
        const body = await req.json();
        const parsed = UpdatePromptVersionSchema.safeParse(body);

        if (!parsed.success) {
            return jsonError('INVALID_PAYLOAD', {
                status: 400,
                details: parsed.error.message
            });
        }

        const existing = await aiAgentPromptVersionsDbRepository.findById(versionId);

        if (!existing) {
            return jsonError('NOT_FOUND', {
                status: 404,
                details: 'Prompt version not found'
            });
        }

        if (existing.status !== 'draft') {
            return jsonError('FORBIDDEN', {
                status: 403,
                details: 'Only draft versions can be edited'
            });
        }

        const p = parsed.data.prompts;
        const prompts: AIAgentPrompts | null = p
            ? {
                ...(p.intake != null ? { intake: p.intake } : {}),
                ...(p.logoCheck != null ? { logoCheck: p.logoCheck } : {}),
                ...(p.generate != null ? { generate: p.generate } : {}),
                ...(p.qa != null ? { qa: p.qa } : {}),
                ...(p.followup != null ? { followup: p.followup } : {})
            }
            : null;

        const updated = await aiAgentPromptVersionsDbRepository.update(versionId, {
            systemPrompt: parsed.data.systemPrompt ?? null,
            prompts
        });

        return jsonOk(updated);
    } catch (error) {
        console.error('Error updating prompt version:', error);
        return jsonError('INTERNAL_ERROR', {
            status: 500,
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

// --- DELETE /api/admin/ai-agents/brandbook/prompts/[versionId] ---
// Delete a prompt version (only draft versions)

export async function DELETE(
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

        if (existing.status !== 'draft') {
            return jsonError('FORBIDDEN', {
                status: 403,
                details: 'Only draft versions can be deleted'
            });
        }

        const deleted = await aiAgentPromptVersionsDbRepository.delete(versionId);

        if (!deleted) {
            return jsonError('DELETE_FAILED', {
                status: 500,
                details: 'Failed to delete version'
            });
        }

        return jsonOk({ success: true });
    } catch (error) {
        console.error('Error deleting prompt version:', error);
        return jsonError('INTERNAL_ERROR', {
            status: 500,
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
