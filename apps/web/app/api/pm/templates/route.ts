import { NextRequest } from 'next/server';
import { z } from 'zod';
import { userTemplatesRepository, type CreateUserTemplateInput } from '@collabverse/api';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { jsonOk, jsonError } from '@/lib/api/http';

export const dynamic = 'force-dynamic';

const CreateUserTemplateSchema = z.object({
  title: z.string().trim().min(1).max(255),
  kind: z.string().trim().max(50).optional(),
  summary: z.string().trim().max(500).optional(),
  projectType: z.enum(['product', 'marketing', 'operations', 'service', 'internal']).optional(),
  projectStage: z.enum(['discovery', 'design', 'build', 'launch', 'support']).optional(),
  projectVisibility: z.enum(['private', 'public']).optional()
});

export async function GET(request: Request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const templates = await userTemplatesRepository.list(auth.userId);
    return jsonOk({ items: templates });
  } catch (error) {
    console.error('[API /pm/templates] Ошибка при получении шаблонов:', error);
    return jsonError(
      error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR',
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = CreateUserTemplateSchema.safeParse(body);
    
    if (!parsed.success) {
      return jsonError('INVALID_PAYLOAD', { 
        status: 400,
        details: JSON.stringify(parsed.error.flatten())
      });
    }

    // Filter out undefined values to satisfy exactOptionalPropertyTypes
    const createInput: CreateUserTemplateInput = {
      title: parsed.data.title
    };
    if (parsed.data.kind !== undefined) createInput.kind = parsed.data.kind;
    if (parsed.data.summary !== undefined) createInput.summary = parsed.data.summary;
    if (parsed.data.projectType !== undefined) createInput.projectType = parsed.data.projectType;
    if (parsed.data.projectStage !== undefined) createInput.projectStage = parsed.data.projectStage;
    if (parsed.data.projectVisibility !== undefined) createInput.projectVisibility = parsed.data.projectVisibility;
    
    const template = await userTemplatesRepository.create(createInput, auth.userId);
    return jsonOk({ item: template }, { status: 201 });
  } catch (error) {
    console.error('[API /pm/templates] Ошибка при создании шаблона:', error);
    return jsonError(
      error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR',
      { status: 500 }
    );
  }
}

