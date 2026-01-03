import { NextRequest, NextResponse } from 'next/server';
import { fileTrashRepository, organizationsRepository } from '@collabverse/api';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { flags } from '@/lib/flags';

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!flags.PROJECT_ATTACHMENTS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  // Check authorization
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const organizationId = url.searchParams.get('organizationId');
    const projectId = url.searchParams.get('projectId');

    if (!organizationId) {
      return jsonError('ORGANIZATION_ID_REQUIRED', { status: 400 });
    }

    const member = await organizationsRepository.findMember(organizationId, auth.userId);
    if (!member || member.status !== 'active') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // List trash entries
    const trashEntries = await fileTrashRepository.listByOrganization(organizationId, {
      ...(projectId ? { projectId } : {}),
      includeRestored: false,
    });

    // Format response
    const files = trashEntries.map((entry) => ({
      id: entry.file.id,
      filename: entry.file.filename,
      mimeType: entry.file.mimeType,
      sizeBytes: Number(entry.file.sizeBytes),
      organizationId: entry.file.organizationId,
      projectId: entry.file.projectId,
      deletedAt: entry.deletedAt,
      expiresAt: entry.expiresAt,
      retentionDays: entry.retentionDays,
      deletedBy: entry.deletedBy,
    }));

    return jsonOk({ files });
  } catch (error) {
    console.error('Error fetching trash:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
