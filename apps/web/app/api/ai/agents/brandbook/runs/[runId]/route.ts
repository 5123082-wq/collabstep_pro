import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import {
  brandbookAgentArtifactsRepository,
  brandbookAgentMessagesRepository,
  brandbookAgentRunsRepository,
  organizationsRepository
} from '@collabverse/api';

export async function GET(
  req: NextRequest,
  { params }: { params: { runId: string } }
): Promise<NextResponse> {
  if (!flags.AI_V1) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const runId = params.runId;
  if (!runId) {
    return jsonError('INVALID_REQUEST', { status: 400 });
  }

  const run = await brandbookAgentRunsRepository.findById(runId);
  if (!run) {
    return jsonError('RUN_NOT_FOUND', { status: 404 });
  }

  if (run.projectId) {
    const role = await getProjectRole(run.projectId, auth.userId, auth.email);
    if (role === 'viewer') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }
  } else {
    const member = await organizationsRepository.findMember(run.organizationId, auth.userId);
    if (!member || member.status !== 'active') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }
  }

  const [messages, artifacts] = await Promise.all([
    brandbookAgentMessagesRepository.listByRun(runId),
    brandbookAgentArtifactsRepository.listByRun(runId)
  ]);

  const metadata = run.pipelineType && run.outputFormat && run.previewFormat
    ? {
        pipelineType: run.pipelineType,
        outputFormat: run.outputFormat,
        previewFormat: run.previewFormat
      }
    : undefined;

  return jsonOk({
    run: {
      id: run.id,
      status: run.status,
      organizationId: run.organizationId,
      ...(run.projectId ? { projectId: run.projectId } : {}),
      ...(run.taskId ? { taskId: run.taskId } : {}),
      input: {
        productBundle: run.productBundle,
        ...(run.projectId ? { projectId: run.projectId } : {}),
        ...(run.taskId ? { taskId: run.taskId } : {}),
        ...(run.logoFileId ? { logoFileId: run.logoFileId } : {}),
        ...(run.preferences ? { preferences: run.preferences } : {}),
        ...(run.outputLanguage ? { outputLanguage: run.outputLanguage } : {}),
        ...(run.watermarkText ? { watermarkText: run.watermarkText } : {}),
        ...(run.contactBlock ? { contactBlock: run.contactBlock } : {})
      },
      ...(metadata ? { metadata } : {}),
      createdAt: run.createdAt instanceof Date ? run.createdAt.toISOString() : run.createdAt,
      updatedAt: run.updatedAt instanceof Date ? run.updatedAt.toISOString() : run.updatedAt
    },
    messages: messages.map((message) => ({
      id: message.id,
      runId: message.runId,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt instanceof Date ? message.createdAt.toISOString() : message.createdAt
    })),
    artifacts: artifacts.map((artifact) => ({
      id: artifact.id,
      runId: artifact.runId,
      fileId: artifact.fileId,
      kind: artifact.kind,
      createdAt: artifact.createdAt instanceof Date ? artifact.createdAt.toISOString() : artifact.createdAt
    }))
  });
}
