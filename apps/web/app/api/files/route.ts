import { NextRequest } from 'next/server';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  organizationSubscriptionsRepository,
  organizationStorageUsageRepository,
  projectsRepository,
  usersRepository,
  tasksRepository,
  foldersRepository,
  type AttachmentEntityType
} from '@collabverse/api';
import { db } from '@collabverse/api/db/config';
import { attachments, files, projects } from '@collabverse/api/db/schema';
import { put } from '@vercel/blob';
import { eq } from 'drizzle-orm';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { flags } from '@/lib/flags';

const UploadJsonSchema = z.object({
  filename: z.string(),
  mimeType: z.string().default('application/octet-stream'),
  sizeBytes: z.number().int().nonnegative(),
  uploaderId: z.string().default('admin.demo@collabverse.test'),
  projectId: z.string().optional(),
  entityType: z.enum(['project', 'task', 'comment', 'document', 'project_chat']).optional(),
  entityId: z.string().optional()
});

type UploadPayload = {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploaderId: string;
  projectId?: string;
  entityType?: AttachmentEntityType;
  entityId?: string | null;
  sha256?: string;
  buffer?: Buffer;
};

const ENTITY_TYPES: AttachmentEntityType[] = ['project', 'task', 'comment', 'document', 'project_chat'];

function normalizeEntityType(value?: string | null): AttachmentEntityType | undefined {
  if (!value) {
    return undefined;
  }
  return ENTITY_TYPES.find((item) => item === value) ?? undefined;
}

async function extractUploadPayload(
  req: NextRequest
): Promise<UploadPayload | { error: 'missing_file' | 'invalid_payload' }> {
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return { error: 'missing_file' as const };
    }
    const projectId = typeof form.get('projectId') === 'string' ? (form.get('projectId') as string) : undefined;
    const entityType = normalizeEntityType(
      typeof form.get('entityType') === 'string' ? (form.get('entityType') as string) : undefined
    );
    const entityId = typeof form.get('entityId') === 'string' ? (form.get('entityId') as string) : undefined;
    const uploaderId = typeof form.get('uploaderId') === 'string' ? (form.get('uploaderId') as string) : 'admin.demo@collabverse.test';
    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    const payload: UploadPayload = {
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: buffer.length,
      uploaderId,
      sha256,
      buffer,
      ...(projectId ? { projectId } : {}),
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {})
    };
    return payload;
  }

  const parsed = UploadJsonSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return { error: 'invalid_payload' as const };
  }
  return { error: 'missing_file' as const };
}

export async function GET(req: NextRequest) {
  if (!flags.PROJECT_ATTACHMENTS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  return jsonError('NOT_SUPPORTED', { status: 405 });
}

export async function POST(req: NextRequest) {
  if (!flags.PROJECT_ATTACHMENTS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const payload = await extractUploadPayload(req);
    if ('error' in payload) {
      return jsonError(payload.error === 'missing_file' ? 'FILE_REQUIRED' : 'INVALID_PAYLOAD', { status: 400 });
    }

    if (!payload.buffer) {
      return jsonError('FILE_REQUIRED', { status: 400 });
    }

    if (!payload.projectId) {
      return jsonError('PROJECT_ID_REQUIRED', { status: 400 });
    }

    const projectId = payload.projectId;
    const project = await projectsRepository.findById(projectId);
    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', { status: 404 });
    }

    const role = await getProjectRole(projectId, auth.userId, auth.email);
    if (role === 'viewer') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    const [dbProject] = await db
      .select({ organizationId: projects.organizationId })
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!dbProject || !dbProject.organizationId) {
      return jsonError('PROJECT_HAS_NO_ORGANIZATION', { status: 400 });
    }

    const organizationId = dbProject.organizationId;
    const projectFolderName = `${project.title || 'Project'} (${projectId})`;
    let taskForFolder: ReturnType<typeof tasksRepository.findById> | null = null;

    if (payload.entityType === 'task' && payload.entityId) {
      const task = tasksRepository.findById(payload.entityId);
      if (!task) {
        return jsonError('TASK_NOT_FOUND', { status: 404 });
      }
      if (task.projectId !== projectId) {
        return jsonError('TASK_PROJECT_MISMATCH', { status: 400 });
      }
      taskForFolder = task;
    }

    const plan = await organizationSubscriptionsRepository.getPlanForOrganization(organizationId);
    const usage = await organizationStorageUsageRepository.get(organizationId);

    if (plan.fileSizeLimitBytes && payload.sizeBytes > plan.fileSizeLimitBytes) {
      return jsonError('FILE_SIZE_EXCEEDED', {
        status: 413,
        details: `File size ${payload.sizeBytes} exceeds limit ${plan.fileSizeLimitBytes}`
      });
    }

    if (plan.storageLimitBytes) {
      const newTotalBytes = Number(usage.totalBytes) + payload.sizeBytes;
      if (newTotalBytes > plan.storageLimitBytes) {
        return jsonError('STORAGE_LIMIT_EXCEEDED', {
          status: 403,
          details: `Storage limit would be exceeded: ${newTotalBytes} > ${plan.storageLimitBytes}`
        });
      }
    }

    const sanitizedFilename = payload.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `projects/${projectId}/${crypto.randomUUID()}-${sanitizedFilename}`;

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      console.error('BLOB_READ_WRITE_TOKEN is not set');
      return jsonError('BLOB_CONFIG_ERROR', { status: 500 });
    }

    const blobResult = await put(storageKey, payload.buffer, {
      access: 'public',
      contentType: payload.mimeType,
      token: blobToken,
    });

    // Handle folder assignment for task files
    let folderId: string | null = null;
    let taskIdForFile: string | null = null;

    if (payload.entityType === 'task' && payload.entityId && taskForFolder) {
      taskIdForFile = payload.entityId;

      // Ensure project folder exists
      const projectFolder = await foldersRepository.ensureProjectFolder(
        organizationId,
        projectId,
        projectFolderName,
        auth.userId
      );

      // Ensure task folder exists
      const taskFolder = await foldersRepository.ensureTaskFolder(
        organizationId,
        projectId,
        payload.entityId,
        `${taskForFolder.title || 'Task'} (${payload.entityId})`,
        auth.userId,
        projectFolder.id
      );

      folderId = taskFolder.id;
    }

    const [createdFile] = await db
      .insert(files)
      .values({
        organizationId,
        projectId,
        uploadedBy: auth.userId,
        filename: payload.filename,
        mimeType: payload.mimeType,
        sizeBytes: payload.sizeBytes,
        storageKey: blobResult.pathname,
        storageUrl: blobResult.url,
        sha256: payload.sha256 ?? null,
        description: null,
        folderId,
        taskId: taskIdForFile,
      })
      .returning();

    if (!createdFile) {
      return jsonError('FAILED_TO_CREATE_FILE', { status: 500 });
    }

    let attachment = null;
    if (payload.entityType) {
      const [createdAttachment] = await db
        .insert(attachments)
        .values({
          projectId,
          fileId: createdFile.id,
          linkedEntity: payload.entityType,
          entityId: payload.entityId || null,
          createdBy: auth.userId,
        })
        .returning();

      attachment = createdAttachment ?? null;
    }

    await organizationStorageUsageRepository.increment(organizationId, payload.sizeBytes);

    const uploader = await usersRepository.findById(auth.userId);

    return jsonOk({
      file: {
        id: createdFile.id,
        uploaderId: createdFile.uploadedBy,
        filename: createdFile.filename,
        mimeType: createdFile.mimeType,
        sizeBytes: Number(createdFile.sizeBytes),
        storageUrl: createdFile.storageUrl,
        uploadedAt: createdFile.createdAt?.toISOString() || new Date().toISOString(),
        uploader: uploader
          ? {
              id: uploader.id,
              name: uploader.name,
              email: uploader.email
            }
          : undefined
      },
      attachment
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
