import { NextRequest } from 'next/server';
import { z } from 'zod';
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonOk } from '@/lib/api/http';
import {
  organizationStorageUsageRepository,
  organizationSubscriptionsRepository,
  organizationsRepository,
  vacanciesRepository
} from '@collabverse/api';

const UploadUrlSchema = z.object({
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

  const parsed = UploadUrlSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError('INVALID_PAYLOAD', { status: 400, details: parsed.error.message });
  }

  const vacancy = await vacanciesRepository.findById(params.id);
  if (!vacancy) {
    return jsonError('NOT_FOUND', { status: 404 });
  }

  const member = await organizationsRepository.findMember(vacancy.organizationId, user.id);
  if (!member || member.status !== 'active' || !['owner', 'admin'].includes(member.role)) {
    return jsonError('FORBIDDEN', { status: 403, details: 'Only owners and admins can attach files' });
  }

  const { filename, mimeType, sizeBytes } = parsed.data;
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

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    console.error('BLOB_READ_WRITE_TOKEN is not set');
    return jsonError('BLOB_CONFIG_ERROR', { status: 500 });
  }

  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const pathname = `vacancies/${vacancy.id}/${crypto.randomUUID()}-${sanitizedFilename}`;

  const tokenOptions: Parameters<typeof generateClientTokenFromReadWriteToken>[0] = {
    token: blobToken,
    pathname,
    allowedContentTypes: [mimeType],
    validUntil: Date.now() + 60 * 60 * 1000
  };

  if (sizeBytes > 0) {
    tokenOptions.maximumSizeInBytes = sizeBytes;
  }

  const clientToken = await generateClientTokenFromReadWriteToken(tokenOptions);

  return jsonOk({ token: clientToken, pathname });
}
