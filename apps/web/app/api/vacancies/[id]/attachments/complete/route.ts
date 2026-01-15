import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@collabverse/api/db/config';
import { files, vacancyAttachments } from '@collabverse/api/db/schema';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonOk } from '@/lib/api/http';
import {
  organizationStorageUsageRepository,
  organizationSubscriptionsRepository,
  organizationsRepository,
  vacanciesRepository
} from '@collabverse/api';

const CompleteUploadSchema = z.object({
  storageKey: z.string().min(1),
  url: z.string().url(),
  filename: z.string().min(1),
  mimeType: z.string().default('application/octet-stream'),
  sizeBytes: z.number().int().nonnegative()
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const parsed = CompleteUploadSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return jsonError('INVALID_PAYLOAD', { status: 400, details: parsed.error.message });
    }

    const { storageKey, url, filename, mimeType, sizeBytes } = parsed.data;

    const vacancy = await vacanciesRepository.findById(params.id);
    if (!vacancy) {
      return jsonError('NOT_FOUND', { status: 404 });
    }

    const member = await organizationsRepository.findMember(vacancy.organizationId, user.id);
    if (!member || member.status !== 'active' || !['owner', 'admin'].includes(member.role)) {
      return jsonError('FORBIDDEN', { status: 403, details: 'Only owners and admins can attach files' });
    }

    let urlObj: URL;
    try {
      urlObj = new URL(url);
      if (!urlObj.hostname.endsWith('.blob.vercel-storage.com')) {
        return jsonError('INVALID_BLOB_URL', { status: 400, details: 'URL must be from Vercel Blob storage' });
      }
    } catch (error) {
      return jsonError('INVALID_URL', { status: 400, details: 'Invalid URL format' });
    }

    if (!storageKey.startsWith(`vacancies/${vacancy.id}/`)) {
      return jsonError('INVALID_STORAGE_KEY', {
        status: 400,
        details: 'storageKey must start with vacancies/<vacancyId>/'
      });
    }

    const urlPathname = urlObj.pathname.replace(/^\//, '');
    if (urlPathname !== storageKey) {
      return jsonError('PATHNAME_MISMATCH', {
        status: 400,
        details: `URL pathname (${urlPathname}) does not match storageKey (${storageKey})`
      });
    }

    const plan = await organizationSubscriptionsRepository.getPlanForOrganization(vacancy.organizationId);
    const usage = await organizationStorageUsageRepository.get(vacancy.organizationId);

    if (plan.fileSizeLimitBytes && sizeBytes > plan.fileSizeLimitBytes) {
      return jsonError('FILE_SIZE_EXCEEDED', {
        status: 413,
        details: `File size ${sizeBytes} exceeds limit ${plan.fileSizeLimitBytes}`
      });
    }

    if (plan.storageLimitBytes) {
      const newTotalBytes = Number(usage.totalBytes) + sizeBytes;
      if (newTotalBytes > plan.storageLimitBytes) {
        return jsonError('STORAGE_LIMIT_EXCEEDED', {
          status: 403,
          details: `Storage limit would be exceeded: ${newTotalBytes} > ${plan.storageLimitBytes}`
        });
      }
    }

    const [createdFile] = await db
      .insert(files)
      .values({
        organizationId: vacancy.organizationId,
        projectId: null,
        uploadedBy: user.id,
        filename,
        mimeType,
        sizeBytes,
        storageKey,
        storageUrl: url,
        sha256: null,
        description: null,
        folderId: null,
        taskId: null
      })
      .returning();

    if (!createdFile) {
      return jsonError('FAILED_TO_CREATE_FILE', { status: 500 });
    }

    const [createdAttachment] = await db
      .insert(vacancyAttachments)
      .values({
        vacancyId: vacancy.id,
        fileId: createdFile.id,
        createdBy: user.id
      })
      .returning();

    if (!createdAttachment) {
      await db.delete(files).where(eq(files.id, createdFile.id));
      return jsonError('FAILED_TO_CREATE_ATTACHMENT', { status: 500 });
    }

    await organizationStorageUsageRepository.increment(vacancy.organizationId, sizeBytes);

    return jsonOk({
      attachment: {
        id: createdAttachment.id,
        fileId: createdFile.id,
        filename: createdFile.filename,
        url: createdFile.storageUrl,
        sizeBytes: Number(createdFile.sizeBytes),
        uploadedAt: createdAttachment.createdAt?.toISOString() ?? new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Vacancy Attachments] Error completing upload:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
