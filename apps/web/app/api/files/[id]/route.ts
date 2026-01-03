import { NextRequest } from 'next/server';
import { eq, and, isNull } from 'drizzle-orm';
import {
  fileTrashRepository,
  organizationSubscriptionsRepository,
  organizationsRepository
} from '@collabverse/api';
import { db } from '@collabverse/api/db/config';
import { files, fileTrash } from '@collabverse/api/db/schema';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { flags } from '@/lib/flags';

async function hasFileAccess(
  file: typeof files.$inferSelect,
  auth: { userId: string; email: string }
): Promise<boolean> {
  if (file.projectId) {
    const role = await getProjectRole(file.projectId, auth.userId, auth.email);
    return role !== 'viewer';
  }

  const member = await organizationsRepository.findMember(file.organizationId, auth.userId);
  return Boolean(member && member.status === 'active');
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!flags.PROJECT_ATTACHMENTS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = getAuthFromRequest(_req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    // Check if file exists and is not in trash
    const [result] = await db
      .select({
        file: files,
        trash: fileTrash,
      })
      .from(files)
      .leftJoin(fileTrash, and(
        eq(fileTrash.fileId, files.id),
        isNull(fileTrash.restoredAt)
      ))
      .where(
        and(
          eq(files.id, params.id),
          // File is not in trash (trash entry is null or restored)
          isNull(fileTrash.id)
        )
      );

    if (!result || !result.file) {
      return jsonError('FILE_NOT_FOUND', { status: 404 });
    }

    const canAccess = await hasFileAccess(result.file, auth);
    if (!canAccess) {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    return jsonOk({ file: result.file });
  } catch (error) {
    console.error('Error fetching file:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!flags.PROJECT_ATTACHMENTS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  // Check authorization
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    // Find file
    const [file] = await db
      .select()
      .from(files)
      .where(eq(files.id, params.id));

    if (!file) {
      return jsonError('FILE_NOT_FOUND', { status: 404 });
    }

    const canAccess = await hasFileAccess(file, auth);
    if (!canAccess) {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Check if already in trash
    const existingTrash = await fileTrashRepository.findByFileId(params.id);
    if (existingTrash) {
      return jsonError('FILE_ALREADY_IN_TRASH', { status: 400 });
    }

    // Get organization's subscription plan for retention days
    const subscription = await organizationSubscriptionsRepository.getPlanForOrganization(file.organizationId);
    const retentionDays = subscription.trashRetentionDays ?? null;

    // Calculate expiresAt
    const deletedAt = new Date();
    const expiresAt = typeof retentionDays === 'number'
      ? new Date(deletedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000)
      : null; // null means never expire (unlimited retention)

    // Create trash entry (soft delete)
    await fileTrashRepository.create({
      fileId: params.id,
      organizationId: file.organizationId,
      deletedBy: auth.userId,
      deletedAt,
      expiresAt,
      retentionDays: retentionDays ?? null,
    });

    return jsonOk({ ok: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
