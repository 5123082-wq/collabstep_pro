import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { flags } from '@/lib/flags';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import {
  createBrandbookRunMock,
  projectsRepository,
  type BrandbookAgentRunInput
} from '@collabverse/api';

const CreateBrandbookRunSchema = z.object({
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
    projectId,
    taskId,
    logoFileId,
    productBundle,
    preferences,
    outputLanguage,
    watermarkText,
    contactBlock
  } = parsed.data;

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

  if (projectId) {
    const project = await projectsRepository.findById(projectId);
    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', { status: 404 });
    }

    const role = await getProjectRole(projectId, auth.userId, auth.email);
    if (role === 'viewer') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }
  }

  // TODO: Add analytics hooks for brandbook runs.
  const run = await createBrandbookRunMock(runInput);

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
  const projectId = searchParams.get('projectId');
  const parsedProjectId = ProjectIdSchema.safeParse(projectId);
  if (!parsedProjectId.success) {
    return jsonError('INVALID_REQUEST', { status: 400, details: parsedProjectId.error.message });
  }

  const project = await projectsRepository.findById(parsedProjectId.data);
  if (!project) {
    return jsonError('PROJECT_NOT_FOUND', { status: 404 });
  }

  const role = await getProjectRole(parsedProjectId.data, auth.userId, auth.email);
  if (role === 'viewer') {
    return jsonError('ACCESS_DENIED', { status: 403 });
  }

  return jsonOk({
    runs: []
  });
}
