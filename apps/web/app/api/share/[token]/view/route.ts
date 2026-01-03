import { NextRequest, NextResponse } from 'next/server';
import { sharesRepository } from '@collabverse/api';
import { jsonError } from '@/lib/api/http';
import { flags } from '@/lib/flags';

/**
 * GET /api/share/[token]/view
 * Public view endpoint - no authentication required
 * Streams file content from Vercel Blob storage
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
): Promise<NextResponse> {
  if (!flags.PROJECT_ATTACHMENTS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  try {
    const token = params.token;

    // Find share with file info
    const shareWithFile = await sharesRepository.findByTokenWithFile(token);
    if (!shareWithFile) {
      return jsonError('SHARE_NOT_FOUND', { status: 404 });
    }

    // Check scope
    if (shareWithFile.scope !== 'view') {
      return jsonError('INVALID_SCOPE', { status: 403, details: 'Token does not allow view access' });
    }

    // Check expiration
    if (shareWithFile.expiresAt && shareWithFile.expiresAt < new Date()) {
      return jsonError('SHARE_EXPIRED', { status: 404 });
    }

    const file = shareWithFile.file;
    const storageUrl = file.storageUrl;

    // Fetch file from Vercel Blob storage
    const blobResponse = await fetch(storageUrl);
    if (!blobResponse.ok) {
      console.error('Failed to fetch blob:', blobResponse.status, blobResponse.statusText);
      return jsonError('BLOB_FETCH_FAILED', { status: 500 });
    }

    // Determine content disposition
    const mimeType = file.mimeType || 'application/octet-stream';
    const isImage = mimeType.startsWith('image/');
    const isPdf = mimeType === 'application/pdf';
    const contentDisposition = isImage || isPdf ? 'inline' : 'attachment';

    // Stream the file (proxy response.body without loading into memory)
    const headers = new Headers();
    headers.set('Content-Type', mimeType);
    headers.set('Content-Disposition', `${contentDisposition}; filename="${file.filename}"`);
    headers.set('Content-Length', file.sizeBytes.toString());
    headers.set('Cache-Control', 'public, max-age=3600');

    // Return streaming response by proxying the blob response body
    return new NextResponse(blobResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error viewing shared file:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

