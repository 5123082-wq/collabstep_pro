import { NextRequest, NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/auth/check-admin-role.server';
import {
    aiAgentConfigsDbRepository,
    aiAgentPromptVersionsDbRepository
} from '@collabverse/api';
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

const CreatePromptVersionSchema = z.object({
    systemPrompt: z.string().optional(),
    prompts: z.object({
        intake: z.string().optional(),
        logoCheck: z.string().optional(),
        generate: z.string().optional(),
        qa: z.string().optional(),
        followup: z.string().optional()
    }).optional()
});

// --- GET /api/admin/ai-agents/brandbook/prompts ---
// List all prompt versions for Brandbook agent

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
                details: 'Brandbook agent not found'
            });
        }

        const versions = await aiAgentPromptVersionsDbRepository.listByAgent(config.id);

        return jsonOk({
            agentId: config.id,
            versions
        });
    } catch (error) {
        console.error('Error fetching prompt versions:', error);
        return jsonError('INTERNAL_ERROR', {
            status: 500,
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

// --- POST /api/admin/ai-agents/brandbook/prompts ---
// Create a new prompt version (draft)

export async function POST(req: NextRequest) {
    const isAdmin = await isAdminUser();

    if (!isAdmin) {
        return jsonError('UNAUTHORIZED', { status: 401 });
    }

    try {
        const body = await req.json();
        const parsed = CreatePromptVersionSchema.safeParse(body);

        if (!parsed.success) {
            return jsonError('INVALID_PAYLOAD', {
                status: 400,
                details: parsed.error.message
            });
        }

        const config = await aiAgentConfigsDbRepository.findBySlug('brandbook');

        if (!config) {
            return jsonError('NOT_FOUND', {
                status: 404,
                details: 'Brandbook agent not found'
            });
        }

        const nextVersion = await aiAgentPromptVersionsDbRepository.getNextVersionNumber(config.id);

        const p = parsed.data.prompts;
        const prompts = p
            ? {
                ...(p.intake != null ? { intake: p.intake } : {}),
                ...(p.logoCheck != null ? { logoCheck: p.logoCheck } : {}),
                ...(p.generate != null ? { generate: p.generate } : {}),
                ...(p.qa != null ? { qa: p.qa } : {}),
                ...(p.followup != null ? { followup: p.followup } : {})
            }
            : null;

        const created = await aiAgentPromptVersionsDbRepository.create({
            id: crypto.randomUUID(),
            agentId: config.id,
            version: nextVersion,
            status: 'draft',
            systemPrompt: parsed.data.systemPrompt ?? null,
            prompts,
            createdBy: null
        });

        return jsonOk(created, 201);
    } catch (error) {
        console.error('Error creating prompt version:', error);
        return jsonError('INTERNAL_ERROR', {
            status: 500,
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
