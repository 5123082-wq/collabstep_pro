import { NextRequest } from 'next/server';
import { fileTrashRepository, organizationsRepository } from '@collabverse/api';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import { db } from '@collabverse/api/db/config';
import { files } from '@collabverse/api/db/schema';
import { eq } from 'drizzle-orm';
import { jsonError, jsonOk } from '@/lib/api/http';
import { flags } from '@/lib/flags';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!flags.PROJECT_ATTACHMENTS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  // Check authorization
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const [file] = await db
      .select()
      .from(files)
      .where(eq(files.id, params.id));

    if (!file) {
      return jsonError('FILE_NOT_FOUND', { status: 404 });
    }

    if (file.projectId) {
      const role = await getProjectRole(file.projectId, auth.userId, auth.email);
      if (role === 'viewer') {
        return jsonError('ACCESS_DENIED', { status: 403 });
      }
    } else {
      const member = await organizationsRepository.findMember(file.organizationId, auth.userId);
      if (!member || member.status !== 'active') {
        return jsonError('ACCESS_DENIED', { status: 403 });
      }
    }

    // Restore file from trash
    const restored = await fileTrashRepository.restore(params.id);

    if (!restored) {
      return jsonError('FILE_NOT_IN_TRASH', { status: 404 });
    }

    return jsonOk({ ok: true });
  } catch (error) {
    console.error('Error restoring file:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
