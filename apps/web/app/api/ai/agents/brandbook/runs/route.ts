import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { flags } from '@/lib/flags';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { db } from '@collabverse/api/db/config';
import { projects } from '@collabverse/api/db/schema';
import {
  brandbookAgentMessagesRepository,
  brandbookAgentRunsRepository,
  createBrandbookRunMock,
  organizationsRepository,
  type BrandbookAgentRunInput
} from '@collabverse/api';

const CreateBrandbookRunSchema = z.object({
  organizationId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  taskId: z.string().min(1).optional(),
  logoFileId: z.string().min(1).optional(),
  productBundle: z.enum(['merch_basic', 'office_basic']),
  preferences: z.array(z.string()).optional(),
  outputLanguage: z.string().min(1).optional(),
  watermarkText: z.string().min(1).optional(),
  contactBlock: z.string().min(1).optional()
});

const ProjectIdSchema = z.string().min(1);
const OrganizationIdSchema = z.string().min(1);

const STARTER_MESSAGES = [
  'Запуск создан. Я помогу собрать логотип и уточнения для брендбука.',
  'Лучше всего подходят PNG с прозрачностью и минимум 800px по короткой стороне. Форматы: png, jpg, bmp (webp — опционально).',
  'Вы можете загрузить файл, вставить logoFileId, прикрепить ссылку из Документов или попросить демо-мокап без логотипа.'
];

async function resolveProjectOrganization(projectId: string): Promise<string | null> {
  const [dbProject] = await db
    .select({ organizationId: projects.organizationId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  return dbProject?.organizationId ?? null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!flags.AI_V1) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateBrandbookRunSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('INVALID_PAYLOAD', { status: 400, details: parsed.error.message });
  }

  const {
    organizationId: rawOrganizationId,
    projectId,
    taskId,
    logoFileId,
    productBundle,
    preferences,
    outputLanguage,
    watermarkText,
    contactBlock
  } = parsed.data;

  let organizationId = rawOrganizationId?.trim() ?? '';

  if (projectId) {
    const projectOrganizationId = await resolveProjectOrganization(projectId);
    if (!projectOrganizationId) {
      return jsonError('PROJECT_NOT_FOUND', { status: 404 });
    }

    if (organizationId && organizationId !== projectOrganizationId) {
      return jsonError('ORGANIZATION_MISMATCH', { status: 400 });
    }

    organizationId = projectOrganizationId;

    const role = await getProjectRole(projectId, auth.userId, auth.email);
    if (role === 'viewer') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }
  } else {
    const parsedOrganizationId = OrganizationIdSchema.safeParse(organizationId);
    if (!parsedOrganizationId.success) {
      return jsonError('ORGANIZATION_ID_REQUIRED', { status: 400, details: parsedOrganizationId.error.message });
    }

    const member = await organizationsRepository.findMember(parsedOrganizationId.data, auth.userId);
    if (!member || member.status !== 'active') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    organizationId = parsedOrganizationId.data;
  }

  const runInput: BrandbookAgentRunInput = {
    productBundle,
    ...(projectId !== undefined ? { projectId } : {}),
    ...(taskId !== undefined ? { taskId } : {}),
    ...(logoFileId !== undefined ? { logoFileId } : {}),
    ...(preferences !== undefined ? { preferences } : {}),
    ...(outputLanguage !== undefined ? { outputLanguage } : {}),
    ...(watermarkText !== undefined ? { watermarkText } : {}),
    ...(contactBlock !== undefined ? { contactBlock } : {})
  };

  // TODO: Add analytics hooks for brandbook runs.
  const run = await createBrandbookRunMock(runInput);

  await brandbookAgentRunsRepository.create({
    id: run.runId,
    organizationId,
    createdBy: auth.userId,
    status: run.status,
    productBundle,
    ...(projectId ? { projectId } : {}),
    ...(taskId ? { taskId } : {}),
    ...(logoFileId ? { logoFileId } : {}),
    ...(preferences ? { preferences } : {}),
    ...(outputLanguage ? { outputLanguage } : {}),
    ...(watermarkText ? { watermarkText } : {}),
    ...(contactBlock ? { contactBlock } : {}),
    ...(run.metadata?.pipelineType ? { pipelineType: run.metadata.pipelineType } : {}),
    ...(run.metadata?.outputFormat ? { outputFormat: run.metadata.outputFormat } : {}),
    ...(run.metadata?.previewFormat ? { previewFormat: run.metadata.previewFormat } : {})
  });

  await Promise.all(
    STARTER_MESSAGES.map((content) =>
      brandbookAgentMessagesRepository.create({
        runId: run.runId,
        role: 'assistant',
        content
      })
    )
  );

  return jsonOk(run);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!flags.AI_V1) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get('organizationId')?.trim() ?? '';
  const projectId = searchParams.get('projectId')?.trim() ?? '';

  if (!organizationId && !projectId) {
    return jsonError('INVALID_REQUEST', { status: 400, details: 'organizationId or projectId is required' });
  }

  let resolvedOrganizationId = organizationId;

  if (projectId) {
    const parsedProjectId = ProjectIdSchema.safeParse(projectId);
    if (!parsedProjectId.success) {
      return jsonError('INVALID_REQUEST', { status: 400, details: parsedProjectId.error.message });
    }

    const projectOrganizationId = await resolveProjectOrganization(parsedProjectId.data);
    if (!projectOrganizationId) {
      return jsonError('PROJECT_NOT_FOUND', { status: 404 });
    }

    if (resolvedOrganizationId && resolvedOrganizationId !== projectOrganizationId) {
      return jsonError('ORGANIZATION_MISMATCH', { status: 400 });
    }

    resolvedOrganizationId = projectOrganizationId;

    const role = await getProjectRole(parsedProjectId.data, auth.userId, auth.email);
    if (role === 'viewer') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }
  } else {
    const parsedOrganizationId = OrganizationIdSchema.safeParse(resolvedOrganizationId);
    if (!parsedOrganizationId.success) {
      return jsonError('INVALID_REQUEST', { status: 400, details: parsedOrganizationId.error.message });
    }

    const member = await organizationsRepository.findMember(parsedOrganizationId.data, auth.userId);
    if (!member || member.status !== 'active') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    resolvedOrganizationId = parsedOrganizationId.data;
  }

  const runs = await brandbookAgentRunsRepository.listByUser({
    organizationId: resolvedOrganizationId,
    createdBy: auth.userId,
    ...(projectId ? { projectId } : {})
  });

  return jsonOk({
    runs: runs.map((run) => ({
      id: run.id,
      status: run.status,
      productBundle: run.productBundle,
      createdAt: run.createdAt instanceof Date ? run.createdAt.toISOString() : run.createdAt,
      ...(run.projectId ? { projectId: run.projectId } : {})
    }))
  });
}
