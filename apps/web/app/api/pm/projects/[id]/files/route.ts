import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { flags } from '@/lib/flags';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import {
  attachmentsRepository,
  filesRepository,
  projectsRepository,
  tasksRepository,
  commentsRepository,
  projectChatRepository,
  usersRepository
} from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

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
    const project = projectsRepository.findById(projectId);
    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', { status: 404 });
    }

    // Проверка доступа к проекту
    const role = getProjectRole(projectId, auth.userId);
    if (role === 'viewer') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Фильтр по источнику
    const url = new URL(req.url);
    const sourceFilter = url.searchParams.get('source') as FileSource | null;

    // Получение всех attachments проекта
    const attachments = attachmentsRepository.listByProject(projectId);
    const fileLookup = new Map(filesRepository.list().map((file) => [file.id, file] as const));

    // Получение задач проекта для получения названий
    const projectTasks = tasksRepository.list().filter((task) => task.projectId === projectId);
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
    const files: ProjectFile[] = [];

    for (const attachment of attachments) {
      const file = fileLookup.get(attachment.fileId);
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

      const uploader = await usersRepository.findById(file.uploaderId);

      files.push({
        id: file.id,
        filename: file.filename,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        uploadedAt: file.uploadedAt,
        uploaderId: file.uploaderId,
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
        url: file.storageUrl
      });
    }

    // Сортировка по дате загрузки (новые сначала)
    files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    return jsonOk({ files });
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
    const project = projectsRepository.findById(projectId);
    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', { status: 404 });
    }

    // Проверка доступа к проекту
    const role = getProjectRole(projectId, auth.userId);
    if (role === 'viewer') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Получение файла из form data
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return jsonError('File is required', { status: 400 });
    }

    // Создание файла через filesRepository
    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash('sha256').update(buffer).digest('hex');

    const fileObject = filesRepository.create({
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: buffer.length,
      uploaderId: auth.userId,
      sha256
    });

    // Привязка файла к проекту через attachmentsRepository
    const attachment = attachmentsRepository.create({
      projectId: projectId,
      fileId: fileObject.id,
      linkedEntity: 'project',
      entityId: null,
      createdBy: auth.userId
    });

    // Получение информации об авторе
    const uploader = await usersRepository.findById(fileObject.uploaderId);

    return jsonOk({
      file: {
        ...fileObject,
        uploader: uploader
          ? {
            id: uploader.id,
            name: uploader.name,
            email: uploader.email
          }
          : undefined,
        url: fileObject.storageUrl,
        source: 'project' as const
      },
      attachment
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

