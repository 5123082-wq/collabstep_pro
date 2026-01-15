import { NextRequest } from 'next/server';
import { z } from 'zod';
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonOk } from '@/lib/api/http';

const UploadUrlSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().default('application/octet-stream'),
  sizeBytes: z.number().int().nonnegative()
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const parsed = UploadUrlSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError('INVALID_PAYLOAD', { status: 400, details: parsed.error.message });
  }

  const { filename, mimeType, sizeBytes } = parsed.data;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    console.error('BLOB_READ_WRITE_TOKEN is not set');
    return jsonError('BLOB_CONFIG_ERROR', { status: 500 });
  }

  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const pathname = `performers/${user.id}/${crypto.randomUUID()}-${sanitizedFilename}`;

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
