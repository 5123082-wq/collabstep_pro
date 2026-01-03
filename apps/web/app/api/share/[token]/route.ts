import { NextRequest, NextResponse } from 'next/server';
import { sharesRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';
import { flags } from '@/lib/flags';
import { getAuthFromRequest } from '@/lib/api/finance-access';

/**
 * DELETE /api/share/[token]
 * Revoke a share link
 */
export async function DELETE(
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

    // Find share to check ownership
    const share = await sharesRepository.findByToken(token);
    if (!share) {
      return jsonError('SHARE_NOT_FOUND', { status: 404 });
    }

    // Check if user created this share or has admin access
    // TODO: Add admin check if needed
    if (share.createdBy !== auth.userId) {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Revoke share
    const revoked = await sharesRepository.revokeByToken(token);
    if (!revoked) {
      return jsonError('SHARE_NOT_FOUND', { status: 404 });
    }

    return jsonOk({ revoked: true });
  } catch (error) {
    console.error('Error revoking share link:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

