import { NextRequest } from 'next/server';
import { z } from 'zod';
import { userTemplatesRepository, projectsRepository, type CreateUserTemplateInput } from '@collabverse/api';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { jsonOk, jsonError } from '@/lib/api/http';

export const dynamic = 'force-dynamic';

const SaveProjectAsTemplateSchema = z.object({
  projectId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(255),
  kind: z.string().trim().max(50).optional(),
  summary: z.string().trim().max(500).optional(),
  projectType: z.enum(['product', 'marketing', 'operations', 'service', 'internal']).optional(),
  projectStage: z.enum(['discovery', 'design', 'build', 'launch', 'support']).optional(),
  projectVisibility: z.enum(['private', 'public']).optional()
});

export async function POST(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = SaveProjectAsTemplateSchema.safeParse(body);
    
    if (!parsed.success) {
      return jsonError('INVALID_PAYLOAD', { 
        status: 400,
        details: JSON.stringify(parsed.error.flatten())
      });
    }

    // Verify project exists and user has access
    const project = await projectsRepository.findById(parsed.data.projectId);
    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', { status: 404 });
    }

    // Verify user is the owner or has access
    if (project.ownerId !== auth.userId) {
      const hasAccess = await projectsRepository.hasAccess(parsed.data.projectId, auth.userId);
      if (!hasAccess) {
        return jsonError('FORBIDDEN', { status: 403 });
      }
    }

    // Filter out undefined values to satisfy exactOptionalPropertyTypes
    const createInput: CreateUserTemplateInput = {
      title: parsed.data.title
    };
    
    if (parsed.data.kind !== undefined) createInput.kind = parsed.data.kind;
    if (parsed.data.summary !== undefined) {
      createInput.summary = parsed.data.summary;
    } else if (project.description) {
      createInput.summary = project.description;
    }
    
    if (parsed.data.projectType !== undefined) createInput.projectType = parsed.data.projectType;
    if (parsed.data.projectStage !== undefined) createInput.projectStage = parsed.data.projectStage;
    if (parsed.data.projectVisibility !== undefined) createInput.projectVisibility = parsed.data.projectVisibility;

    // Create template from project data
    const template = await userTemplatesRepository.create(createInput, auth.userId);

    return jsonOk({ item: template }, { status: 201 });
  } catch (error) {
    console.error('[API /pm/templates/from-project] Ошибка при создании шаблона из проекта:', error);
    return jsonError(
      error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR',
      { status: 500 }
    );
  }
}

