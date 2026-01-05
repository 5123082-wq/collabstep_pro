import { NextRequest } from 'next/server';
import { z } from 'zod';
import { userTemplatesRepository, type UpdateUserTemplateInput } from '@collabverse/api';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { jsonOk, jsonError } from '@/lib/api/http';

export const dynamic = 'force-dynamic';

const UpdateUserTemplateSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  kind: z.string().trim().max(50).optional(),
  summary: z.string().trim().max(500).optional(),
  projectType: z.enum(['product', 'marketing', 'operations', 'service', 'internal']).optional(),
  projectStage: z.enum(['discovery', 'design', 'build', 'launch', 'support']).optional(),
  projectVisibility: z.enum(['private', 'public']).optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Не переданы поля для обновления'
});

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = UpdateUserTemplateSchema.safeParse(body);
    
    if (!parsed.success) {
      return jsonError('INVALID_PAYLOAD', { 
        status: 400,
        details: JSON.stringify(parsed.error.flatten())
      });
    }

    // Filter out undefined values to satisfy exactOptionalPropertyTypes
    const updateInput: UpdateUserTemplateInput = {};
    if (parsed.data.title !== undefined) updateInput.title = parsed.data.title;
    if (parsed.data.kind !== undefined) updateInput.kind = parsed.data.kind;
    if (parsed.data.summary !== undefined) updateInput.summary = parsed.data.summary;
    if (parsed.data.projectType !== undefined) updateInput.projectType = parsed.data.projectType;
    if (parsed.data.projectStage !== undefined) updateInput.projectStage = parsed.data.projectStage;
    if (parsed.data.projectVisibility !== undefined) updateInput.projectVisibility = parsed.data.projectVisibility;
    
    const updated = await userTemplatesRepository.update(params.id, updateInput, auth.userId);
    if (!updated) {
      return jsonError('NOT_FOUND', { status: 404 });
    }

    return jsonOk({ item: updated });
  } catch (error) {
    console.error('[API /pm/templates/[id]] Ошибка при обновлении шаблона:', error);
    return jsonError(
      error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR',
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const deleted = await userTemplatesRepository.delete(params.id, auth.userId);
    if (!deleted) {
      return jsonError('NOT_FOUND', { status: 404 });
    }

    return jsonOk({ success: true });
  } catch (error) {
    console.error('[API /pm/templates/[id]] Ошибка при удалении шаблона:', error);
    return jsonError(
      error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR',
      { status: 500 }
    );
  }
}

