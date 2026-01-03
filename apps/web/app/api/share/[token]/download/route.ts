import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { sharesRepository } from '@collabverse/api';
import { jsonError } from '@/lib/api/http';
import { flags } from '@/lib/flags';

/**
 * GET /api/share/[token]/download
 * Download endpoint - requires authentication
 * Returns presigned URL or redirects to download
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
): Promise<NextResponse> {
  if (!flags.PROJECT_ATTACHMENTS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  // Check authentication
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const token = params.token;

    // Find share with file info
    const shareWithFile = await sharesRepository.findByTokenWithFile(token);
    if (!shareWithFile) {
      return jsonError('SHARE_NOT_FOUND', { status: 404 });
    }

    // Check scope
    if (shareWithFile.scope !== 'download') {
      return jsonError('INVALID_SCOPE', { status: 403, details: 'Token does not allow download access' });
    }

    // Check expiration
    if (shareWithFile.expiresAt && shareWithFile.expiresAt < new Date()) {
      return jsonError('SHARE_EXPIRED', { status: 404 });
    }

    const file = shareWithFile.file;
    const storageUrl = file.storageUrl;

    // Proxy the blob response to enforce auth + TTL without exposing storageUrl
    const blobResponse = await fetch(storageUrl);
    if (!blobResponse.ok) {
      console.error('Failed to fetch blob for download:', blobResponse.status, blobResponse.statusText);
      return jsonError('BLOB_FETCH_FAILED', { status: 500 });
    }

    if (!blobResponse.body) {
      console.error('Blob response body is not readable');
      return jsonError('BLOB_STREAM_UNAVAILABLE', { status: 500 });
    }

    const mimeType = file.mimeType || 'application/octet-stream';
    const headers = new Headers();
    headers.set('Content-Type', mimeType);
    headers.set('Content-Disposition', `attachment; filename="${file.filename}"`);
    headers.set('Content-Length', file.sizeBytes.toString());
    headers.set('Cache-Control', 'private, max-age=0, no-store');

    return new NextResponse(blobResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error getting download URL:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
