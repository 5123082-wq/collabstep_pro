import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { flags } from '@/lib/flags';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import {
  brandbookAgentArtifactsRepository,
  brandbookAgentRunsRepository,
  organizationStorageUsageRepository,
  projectsRepository
} from '@collabverse/api';
import { db } from '@collabverse/api/db/config';
import { files, folders } from '@collabverse/api/db/schema';

const BRANDBOOK_ROOT_FOLDER = 'AI Generations';
const BRANDBOOK_CHILD_FOLDER = 'Brandbook';

async function ensureOrganizationFolder(params: {
  organizationId: string;
  name: string;
  parentId?: string | null;
  createdBy: string;
}): Promise<{ id: string }> {
  const conditions = [
    eq(folders.organizationId, params.organizationId),
    eq(folders.name, params.name),
    eq(folders.type, 'custom')
  ];

  if (params.parentId) {
    conditions.push(eq(folders.parentId, params.parentId));
  } else {
    conditions.push(isNull(folders.parentId));
  }

  conditions.push(isNull(folders.projectId));

  const [existing] = await db
    .select()
    .from(folders)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(folders)
    .values({
      organizationId: params.organizationId,
      projectId: null,
      taskId: null,
      parentId: params.parentId ?? null,
      name: params.name,
      type: 'custom',
      createdBy: params.createdBy
    })
    .returning();

  if (!created) {
    throw new Error('Failed to create organization folder');
  }

  return created;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { runId: string; artifactId: string } }
): Promise<NextResponse> {
  if (!flags.AI_V1) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }
  if (!flags.PROJECT_ATTACHMENTS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const runId = params.runId;
  const artifactId = params.artifactId;
  if (!runId || !artifactId) {
    return jsonError('INVALID_REQUEST', { status: 400 });
  }

  const run = await brandbookAgentRunsRepository.findById(runId);
  if (!run) {
    return jsonError('RUN_NOT_FOUND', { status: 404 });
  }

  if (run.projectId) {
    const role = await getProjectRole(run.projectId, auth.userId, auth.email);
    const members = await projectsRepository.listMembers(run.projectId);
    const isMember = members.some((member) => member.userId === auth.userId);
    if (!isMember && role !== 'owner') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    if (role === 'viewer') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }
  } else {
    if (run.createdBy !== auth.userId) {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }
  }

  const artifact = await brandbookAgentArtifactsRepository.findById(artifactId);
  if (!artifact || artifact.runId !== runId) {
    return jsonError('ARTIFACT_NOT_FOUND', { status: 404 });
  }

  if (artifact.kind !== 'preview') {
    return jsonError('INVALID_ARTIFACT', { status: 400 });
  }

  if (artifact.fileId) {
    return jsonOk({ fileId: artifact.fileId, alreadySaved: true });
  }

  if (!artifact.storageKey || !artifact.storageUrl || !artifact.filename || !artifact.mimeType || artifact.sizeBytes == null) {
    return jsonError('ARTIFACT_NOT_READY', { status: 409 });
  }

  let urlObj: URL;
  try {
    urlObj = new URL(artifact.storageUrl);
    if (!urlObj.hostname.endsWith('.blob.vercel-storage.com')) {
      return jsonError('INVALID_BLOB_URL', { status: 400 });
    }
  } catch (error) {
    return jsonError('INVALID_BLOB_URL', { status: 400 });
  }

  const storagePrefix = `organizations/${run.organizationId}/`;
  if (!artifact.storageKey.startsWith(storagePrefix)) {
    return jsonError('INVALID_STORAGE_KEY', { status: 400 });
  }

  const rootFolder = await ensureOrganizationFolder({
    organizationId: run.organizationId,
    name: BRANDBOOK_ROOT_FOLDER,
    createdBy: auth.userId
  });

  const brandbookFolder = await ensureOrganizationFolder({
    organizationId: run.organizationId,
    name: BRANDBOOK_CHILD_FOLDER,
    parentId: rootFolder.id,
    createdBy: auth.userId
  });

  const [createdFile] = await db
    .insert(files)
    .values({
      organizationId: run.organizationId,
      projectId: null,
      uploadedBy: auth.userId,
      filename: artifact.filename,
      mimeType: artifact.mimeType,
      sizeBytes: Number(artifact.sizeBytes),
      storageKey: artifact.storageKey,
      storageUrl: artifact.storageUrl,
      sha256: null,
      description: null,
      folderId: brandbookFolder.id,
      taskId: null,
    })
    .returning();

  if (!createdFile) {
    return jsonError('FAILED_TO_CREATE_FILE', { status: 500 });
  }

  await organizationStorageUsageRepository.increment(run.organizationId, Number(artifact.sizeBytes));
  await brandbookAgentArtifactsRepository.update(artifact.id, { fileId: createdFile.id });

  return jsonOk({
    fileId: createdFile.id
  });
}
