import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import {
  projectsRepository,
  usersRepository,
  organizationSubscriptionsRepository,
  organizationStorageUsageRepository,
  tasksRepository,
  foldersRepository,
  type AttachmentEntityType
} from '@collabverse/api';
import { eq } from 'drizzle-orm';
import { db } from '@collabverse/api/db/config';
import { files, attachments, projects } from '@collabverse/api/db/schema';
import { jsonError, jsonOk } from '@/lib/api/http';
import { flags } from '@/lib/flags';

const CompleteUploadSchema = z.object({
  storageKey: z.string().min(1),
  url: z.string().url(),
  projectId: z.string(),
  entityType: z.enum(['project', 'task', 'comment', 'document', 'project_chat']).optional(),
  entityId: z.string().optional().nullable(),
  filename: z.string().min(1),
  mimeType: z.string().default('application/octet-stream'),
  sizeBytes: z.number().int().nonnegative(),
  uploaderId: z.string()
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Проверка feature flag
  if (!flags.PROJECT_ATTACHMENTS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  // Проверка авторизации
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    // Валидация входных данных
    const body = await req.json().catch(() => null);
    const parsed = CompleteUploadSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('INVALID_PAYLOAD', { status: 400, details: parsed.error.message });
    }

    const { storageKey, url, projectId, entityType, entityId, filename, mimeType, sizeBytes, uploaderId } =
      parsed.data;

    // Проверка, что uploaderId совпадает с текущим пользователем
    if (uploaderId !== auth.userId) {
      return jsonError('UNAUTHORIZED', { status: 403 });
    }

    // Валидация blob URL: должен быть из Vercel Blob storage
    let urlObj: URL;
    try {
      urlObj = new URL(url);
      const hostname = urlObj.hostname;
      // Проверяем, что хост соответствует Vercel Blob storage
      if (!hostname.endsWith('.blob.vercel-storage.com')) {
        return jsonError('INVALID_BLOB_URL', { status: 400, details: 'URL must be from Vercel Blob storage' });
      }
    } catch (error) {
      return jsonError('INVALID_URL', { status: 400, details: 'Invalid URL format' });
    }

    // Валидация storageKey: должен соответствовать формату projects/<projectId>/...
    if (!storageKey.startsWith(`projects/${projectId}/`)) {
      return jsonError('INVALID_STORAGE_KEY', {
        status: 400,
        details: 'storageKey must start with projects/<projectId>/'
      });
    }

    // КРИТИЧНО: Проверка соответствия url.pathname с storageKey
    // Извлекаем pathname из URL (убираем ведущий слэш)
    const urlPathname = urlObj.pathname.replace(/^\//, '');
    if (urlPathname !== storageKey) {
      return jsonError('PATHNAME_MISMATCH', {
        status: 400,
        details: `URL pathname (${urlPathname}) does not match storageKey (${storageKey})`
      });
    }

    // Проверка существования проекта
    const project = await projectsRepository.findById(projectId);
    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', { status: 404 });
    }

    // Проверка доступа к проекту
    const role = await getProjectRole(projectId, auth.userId, auth.email);
    if (role === 'viewer') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Get organization ID from project (need to query DB)
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

    if (entityType === 'task' && entityId) {
      const task = tasksRepository.findById(entityId);
      if (!task) {
        return jsonError('TASK_NOT_FOUND', { status: 404 });
      }
      if (task.projectId !== projectId) {
        return jsonError('TASK_PROJECT_MISMATCH', { status: 400 });
      }
      taskForFolder = task;
    }

    // Check subscription limits (race condition check)
    const plan = await organizationSubscriptionsRepository.getPlanForOrganization(organizationId);
    const usage = await organizationStorageUsageRepository.get(organizationId);

    // Check file size limit
    if (plan.fileSizeLimitBytes && sizeBytes > plan.fileSizeLimitBytes) {
      return jsonError('FILE_SIZE_EXCEEDED', {
        status: 413,
        details: `File size ${sizeBytes} exceeds limit ${plan.fileSizeLimitBytes}`
      });
    }

    // Check storage limit
    if (plan.storageLimitBytes) {
      const newTotalBytes = Number(usage.totalBytes) + sizeBytes;
      if (newTotalBytes > plan.storageLimitBytes) {
        return jsonError('STORAGE_LIMIT_EXCEEDED', {
          status: 403,
          details: `Storage limit would be exceeded: ${newTotalBytes} > ${plan.storageLimitBytes}`
        });
      }
    }

    // Handle folder assignment for task files
    let folderId: string | null = null;
    let taskIdForFile: string | null = null;

    if (entityType === 'task' && entityId && taskForFolder) {
      taskIdForFile = entityId;

      // Ensure project folder exists
      const projectFolder = await foldersRepository.ensureProjectFolder(
        organizationId,
        projectId,
        projectFolderName,
        uploaderId
      );

      // Ensure task folder exists
      const taskFolder = await foldersRepository.ensureTaskFolder(
        organizationId,
        projectId,
        entityId,
        `${taskForFolder.title || 'Task'} (${entityId})`,
        uploaderId,
        projectFolder.id
      );

      folderId = taskFolder.id;
    }

    // Create file in database
    const [createdFile] = await db
      .insert(files)
      .values({
        organizationId,
        projectId: projectId || null,
        uploadedBy: uploaderId,
        filename,
        mimeType,
        sizeBytes,
        storageKey: storageKey,
        storageUrl: url,
        sha256: null, // TODO: calculate if needed
        description: null,
        folderId,
        taskId: taskIdForFile,
      })
      .returning();

    if (!createdFile) {
      return jsonError('FAILED_TO_CREATE_FILE', { status: 500 });
    }

    // Create attachment if needed
    let createdAttachment = null;
    if (projectId && entityType && createdFile) {
      const [attachment] = await db
        .insert(attachments)
        .values({
          fileId: createdFile.id,
          projectId,
          linkedEntity: entityType as AttachmentEntityType,
          entityId: entityId ?? null,
          createdBy: uploaderId,
        })
        .returning();

      createdAttachment = attachment;
    }

    // Update storage usage
    await organizationStorageUsageRepository.increment(organizationId, sizeBytes);

    // Get uploader info
    const uploader = await usersRepository.findById(uploaderId);

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
      attachment: createdAttachment
    });
  } catch (error) {
    console.error('Error completing upload:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
