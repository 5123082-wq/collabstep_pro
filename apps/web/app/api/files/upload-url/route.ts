import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import {
  projectsRepository,
  organizationSubscriptionsRepository,
  organizationStorageUsageRepository
} from '@collabverse/api';
import { db } from '@collabverse/api/db/config';
import { projects } from '@collabverse/api/db/schema';
import { eq } from 'drizzle-orm';
import { jsonError, jsonOk } from '@/lib/api/http';
import { flags } from '@/lib/flags';

const UploadUrlSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().default('application/octet-stream'),
  sizeBytes: z.number().int().nonnegative(),
  projectId: z.string(),
  entityType: z.enum(['project', 'task', 'comment', 'document', 'project_chat']).optional(),
  entityId: z.string().optional()
});

// Этот endpoint генерирует signed upload token для прямой загрузки в Vercel Blob
// Клиент использует upload() из @vercel/blob/client с полученным token
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
    const parsed = UploadUrlSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('INVALID_PAYLOAD', { status: 400, details: parsed.error.message });
    }

    const { filename, mimeType, sizeBytes, projectId } = parsed.data;

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

    // Check subscription limits
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

    // Генерация уникального пути для файла (storageKey формируется сервером)
    const fileId = crypto.randomUUID();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const pathname = `projects/${projectId}/${fileId}-${sanitizedFilename}`;

    // Получение токена из переменных окружения
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      console.error('BLOB_READ_WRITE_TOKEN is not set');
      return jsonError('BLOB_CONFIG_ERROR', { status: 500 });
    }

    // Генерация client token для прямой загрузки
    // НЕ используем onUploadCompleted callback, так как endpoint /api/files/complete требует сессию
    // Клиент сам вызовет /api/files/complete после успешной загрузки
    const tokenOptions: Parameters<typeof generateClientTokenFromReadWriteToken>[0] = {
      token: blobToken,
      pathname,
      allowedContentTypes: [mimeType],
      validUntil: Date.now() + 60 * 60 * 1000 // 1 hour from now
    };

    // Добавляем maximumSizeInBytes только если sizeBytes > 0
    if (sizeBytes > 0) {
      tokenOptions.maximumSizeInBytes = sizeBytes;
    }

    const clientToken = await generateClientTokenFromReadWriteToken(tokenOptions);

    return jsonOk({
      token: clientToken,
      pathname,
      storageKey: pathname // для обратной совместимости
    });
  } catch (error) {
    console.error('Error generating upload token:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
