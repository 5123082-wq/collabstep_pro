import { NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { createProjectFromTemplateSchema } from '@/lib/schemas/project-from-template';
import {
  organizationsRepository,
  projectTemplateService,
  ProjectTemplateValidationError
} from '@collabverse/api';

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeStartDate(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  if (!DATE_ONLY_RE.test(value)) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toISOString();
}

export async function POST(request: Request) {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS || !flags.PM_PROJECTS_LIST) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = getAuthFromRequest(request);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createProjectFromTemplateSchema.safeParse({
      ...body,
      startDate: normalizeStartDate(body?.startDate)
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const member = await organizationsRepository.findMember(parsed.data.organizationId, auth.userId);
    if (!member || member.status !== 'active') {
      return jsonError('ORGANIZATION_ACCESS_DENIED', { status: 403 });
    }

    const { project, tasks } = await projectTemplateService.createProjectFromTemplate({
      templateId: parsed.data.templateId,
      ownerId: auth.userId,
      organizationId: parsed.data.organizationId,
      ...(parsed.data.projectTitle && { projectTitle: parsed.data.projectTitle }),
      ...(parsed.data.projectDescription && { projectDescription: parsed.data.projectDescription }),
      ...(parsed.data.startDate && { startDate: parsed.data.startDate }),
      ...(parsed.data.selectedTaskIds && { selectedTaskIds: parsed.data.selectedTaskIds })
    });

    return jsonOk({ project, tasks });
  } catch (error) {
    if (error instanceof ProjectTemplateValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[API /projects/from-template] Error creating project:', error);
    return jsonError('PROJECT_FROM_TEMPLATE_FAILED', {
      status: 500,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
