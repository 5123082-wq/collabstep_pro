import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';
import { createHash, randomUUID } from 'node:crypto';
import { eq, and, isNull } from 'drizzle-orm';
import { flags } from '@/lib/flags';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import {
  projectsRepository,
  tasksRepository,
  commentsRepository,
  projectChatRepository,
  usersRepository,
  organizationStorageUsageRepository,
  foldersRepository
} from '@collabverse/api';
import { db } from '@collabverse/api/db/config';
import { attachments, files, fileTrash, projects } from '@collabverse/api/db/schema';
import { jsonError, jsonOk } from '@/lib/api/http';
import { put } from '@vercel/blob';
import { resolveOrganizationPlan } from '@/lib/api/resolve-organization-plan';

type FileSource = 'tasks' | 'comments' | 'chat' | 'project' | 'documents';

interface ProjectFile {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploaderId: string;
  uploader?: {
    id: string;
    name: string;
    email: string;
  };
  source: FileSource;
  sourceEntityId?: string;
  sourceEntityTitle?: string;
  url?: string;
  folderId?: string | null;
  taskId?: string | null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  // Проверка feature flag
  if (!flags.PM_NAV_PROJECTS_AND_TASKS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  // Проверка авторизации
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const projectId = params.id;

  try {
    // Проверка существования проекта
    const project = await projectsRepository.findById(projectId);
    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', { status: 404 });
    }

    // Проверка доступа к проекту
    const role = await getProjectRole(projectId, auth.userId);
    if (role === 'viewer') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Фильтр по источнику
    const url = new URL(req.url);
    const sourceFilter = url.searchParams.get('source') as FileSource | null;

    // Получение всех attachments проекта из БД (исключая файлы в корзине)
    const dbAttachments = await db
      .select({
        attachment: attachments,
        file: files,
      })
      .from(attachments)
      .innerJoin(files, eq(attachments.fileId, files.id))
      .leftJoin(fileTrash, and(
        eq(fileTrash.fileId, files.id),
        isNull(fileTrash.restoredAt)
      ))
      .where(
        and(
          eq(attachments.projectId, projectId),
          // Exclude files in trash
          isNull(fileTrash.id)
        )
      );

    // Получение задач проекта для получения названий
    const allTasks = await tasksRepository.list();
    const projectTasks = allTasks.filter((task) => task.projectId === projectId);
    const taskLookup = new Map(projectTasks.map((task) => [task.id, task] as const));

    // Получение комментариев для получения информации
    const commentLookup = new Map<string, { body: string }>();
    // Собираем все комментарии из всех задач проекта
    projectTasks.forEach((task) => {
      const taskComments = commentsRepository.listByTask(projectId, task.id);
      // Рекурсивно собираем все комментарии (включая ответы)
      const collectComments = (comments: typeof taskComments) => {
        comments.forEach((comment) => {
          commentLookup.set(comment.id, { body: comment.body });
          if (comment.children && comment.children.length > 0) {
            collectComments(comment.children);
          }
        });
      };
      collectComments(taskComments);
    });

    // Получение сообщений чата
    const chatMessages = projectChatRepository.listByProject(projectId, { page: 1, pageSize: 1000 });
    const chatMessageLookup = new Map(
      chatMessages.messages.map((msg) => [msg.id, { body: msg.body }] as const)
    );

    // Группировка файлов по источникам
    const projectFiles: ProjectFile[] = [];

    for (const item of dbAttachments) {
      const attachment = item.attachment;
      const file = item.file;
      if (!file) continue;

      let source: FileSource;
      let sourceEntityId: string | undefined;
      let sourceEntityTitle: string | undefined;

      switch (attachment.linkedEntity) {
        case 'task':
          source = 'tasks';
          sourceEntityId = attachment.entityId ?? undefined;
          if (sourceEntityId) {
            const task = taskLookup.get(sourceEntityId);
            sourceEntityTitle = task?.title;
          }
          break;
        case 'comment':
          source = 'comments';
          sourceEntityId = attachment.entityId ?? undefined;
          if (sourceEntityId) {
            const comment = commentLookup.get(sourceEntityId);
            sourceEntityTitle = comment ? `Комментарий: ${comment.body.slice(0, 50)}...` : undefined;
          }
          break;
        case 'project_chat':
          source = 'chat';
          sourceEntityId = attachment.entityId ?? undefined;
          if (sourceEntityId) {
            const chatMsg = chatMessageLookup.get(sourceEntityId);
            sourceEntityTitle = chatMsg ? `Сообщение: ${chatMsg.body.slice(0, 50)}...` : undefined;
          }
          break;
        case 'project':
          source = 'project';
          break;
        case 'document':
          source = 'documents';
          sourceEntityId = attachment.entityId ?? undefined;
          break;
        default:
          source = 'project';
      }

      // Применяем фильтр по источнику
      if (sourceFilter && source !== sourceFilter) {
        continue;
      }

      const uploader = await usersRepository.findById(file.uploadedBy);

      projectFiles.push({
        id: file.id,
        filename: file.filename,
        mimeType: file.mimeType,
        sizeBytes: Number(file.sizeBytes),
        uploadedAt: file.createdAt?.toISOString() || new Date().toISOString(),
        uploaderId: file.uploadedBy,
        ...(uploader
          ? {
            uploader: {
              id: uploader.id,
              name: uploader.name,
              email: uploader.email
            }
          }
          : {}),
        source,
        ...(sourceEntityId ? { sourceEntityId } : {}),
        ...(sourceEntityTitle ? { sourceEntityTitle } : {}),
        url: file.storageUrl,
        folderId: file.folderId ?? null,
        taskId: file.taskId ?? null
      });
    }

    // Сортировка по дате загрузки (новые сначала)
    projectFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    return jsonOk({ files: projectFiles });
  } catch (error) {
    console.error('Error fetching project files:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  // Проверка feature flag
  if (!flags.PM_NAV_PROJECTS_AND_TASKS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  // Проверка авторизации
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const projectId = params.id;

  try {
    // Проверка существования проекта
    const project = await projectsRepository.findById(projectId);
    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', { status: 404 });
    }

    // Проверка доступа к проекту
    const role = await getProjectRole(projectId, auth.userId);
    if (role === 'viewer') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Получение файла из form data
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return jsonError('File is required', { status: 400 });
    }

    // Get organization ID from project
    const [dbProject] = await db
      .select({ organizationId: projects.organizationId })
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!dbProject || !dbProject.organizationId) {
      return jsonError('PROJECT_HAS_NO_ORGANIZATION', { status: 400 });
    }
    const organizationId = dbProject.organizationId;

    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash('sha256').update(buffer).digest('hex');

    const plan = await resolveOrganizationPlan(organizationId);
    const usage = await organizationStorageUsageRepository.get(organizationId);

    if (plan.fileSizeLimitBytes && buffer.length > plan.fileSizeLimitBytes) {
      return jsonError('FILE_SIZE_EXCEEDED', {
        status: 413,
        details: `File size ${buffer.length} exceeds limit ${plan.fileSizeLimitBytes}`
      });
    }

    if (plan.storageLimitBytes) {
      const newTotalBytes = Number(usage.totalBytes) + buffer.length;
      if (newTotalBytes > plan.storageLimitBytes) {
        return jsonError('STORAGE_LIMIT_EXCEEDED', {
          status: 403,
          details: `Storage limit would be exceeded: ${newTotalBytes} > ${plan.storageLimitBytes}`
        });
      }
    }

    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `projects/${projectId}/${randomUUID()}-${sanitizedFilename}`;

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      console.error('BLOB_READ_WRITE_TOKEN is not set');
      return jsonError('BLOB_CONFIG_ERROR', { status: 500 });
    }

    const blobResult = await put(storageKey, buffer, {
      access: 'public',
      contentType: file.type || 'application/octet-stream',
      token: blobToken,
    });

    // Убеждаемся, что существует папка проекта (type='project')
    const projectFolder = await foldersRepository.ensureProjectFolder(
      organizationId,
      projectId,
      `${project.title || 'Project'} (${projectId})`,
      auth.userId
    );

    const [createdFile] = await db
      .insert(files)
      .values({
        organizationId,
        projectId,
        uploadedBy: auth.userId,
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: buffer.length,
        storageKey: blobResult.pathname,
        storageUrl: blobResult.url,
        sha256,
        description: null,
        folderId: projectFolder.id,
        taskId: null,
      })
      .returning();

    if (!createdFile) {
      return jsonError('FAILED_TO_CREATE_FILE', { status: 500 });
    }

    // Привязка файла к проекту через attachments
    const [createdAttachment] = await db
      .insert(attachments)
      .values({
        fileId: createdFile.id,
        projectId: projectId,
        linkedEntity: 'project',
        entityId: null,
        createdBy: auth.userId,
      })
      .returning();

    // Получение информации об авторе
    const uploader = await usersRepository.findById(auth.userId);

    await organizationStorageUsageRepository.increment(organizationId, buffer.length);

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
          : undefined,
        url: createdFile.storageUrl,
        source: 'project' as const
      },
      attachment: createdAttachment
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
