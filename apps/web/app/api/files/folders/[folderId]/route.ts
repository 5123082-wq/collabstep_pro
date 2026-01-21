import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@collabverse/api/db/config';
import { folders, files } from '@collabverse/api/db/schema';
import { organizationsRepository, fileTrashRepository, projectsRepository } from '@collabverse/api';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { flags } from '@/lib/flags';
import { resolveOrganizationPlan } from '@/lib/api/resolve-organization-plan';

const UpdateFolderSchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { folderId: string } }
) {
  if (!flags.PROJECT_ATTACHMENTS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const [folder] = await db
      .select()
      .from(folders)
      .where(eq(folders.id, params.folderId))
      .limit(1);

    if (!folder) {
      return jsonError('FOLDER_NOT_FOUND', { status: 404 });
    }

    // Check membership
    const member = await organizationsRepository.findMember(folder.organizationId, auth.userId);
    if (!member || member.status !== 'active') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    return jsonOk({
      folder: {
        id: folder.id,
        organizationId: folder.organizationId,
        projectId: folder.projectId,
        taskId: folder.taskId,
        parentId: folder.parentId,
        name: folder.name,
        type: folder.type ?? 'custom',
        createdBy: folder.createdBy,
        createdAt: folder.createdAt?.toISOString() ?? new Date().toISOString(),
        updatedAt: folder.updatedAt?.toISOString() ?? new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching folder:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { folderId: string } }
) {
  if (!flags.PROJECT_ATTACHMENTS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = UpdateFolderSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('INVALID_PAYLOAD', { status: 400, details: parsed.error.message });
    }

    const [folder] = await db
      .select()
      .from(folders)
      .where(eq(folders.id, params.folderId))
      .limit(1);

    if (!folder) {
      return jsonError('FOLDER_NOT_FOUND', { status: 404 });
    }

    // Check membership
    const member = await organizationsRepository.findMember(folder.organizationId, auth.userId);
    if (!member || member.status !== 'active') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Only allow renaming custom folders
    if (folder.type !== 'custom' && parsed.data.name) {
      return jsonError('CANNOT_RENAME_SYSTEM_FOLDER', { status: 400 });
    }

    // Update folder
    const [updated] = await db
      .update(folders)
      .set({
        ...(parsed.data.name ? { name: parsed.data.name } : {}),
        updatedAt: new Date(),
      })
      .where(eq(folders.id, params.folderId))
      .returning();

    if (!updated) {
      return jsonError('FAILED_TO_UPDATE_FOLDER', { status: 500 });
    }

    return jsonOk({
      folder: {
        id: updated.id,
        organizationId: updated.organizationId,
        projectId: updated.projectId,
        taskId: updated.taskId,
        parentId: updated.parentId,
        name: updated.name,
        type: updated.type ?? 'custom',
        createdBy: updated.createdBy,
        createdAt: updated.createdAt?.toISOString() ?? new Date().toISOString(),
        updatedAt: updated.updatedAt?.toISOString() ?? new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error updating folder:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { folderId: string } }
) {
  if (!flags.PROJECT_ATTACHMENTS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const [folder] = await db
      .select()
      .from(folders)
      .where(eq(folders.id, params.folderId))
      .limit(1);

    if (!folder) {
      return jsonError('FOLDER_NOT_FOUND', { status: 404 });
    }

    // Check membership
    const member = await organizationsRepository.findMember(folder.organizationId, auth.userId);
    if (!member || member.status !== 'active') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Only allow deleting custom folders
    if (folder.type !== 'custom') {
      return jsonError('CANNOT_DELETE_SYSTEM_FOLDER', { status: 400 });
    }

    // Get all files in this folder and move them to trash
    const folderFiles = await db
      .select()
      .from(files)
      .where(eq(files.folderId, params.folderId));

    // Get subscription for retention days
    const subscription = await resolveOrganizationPlan(folder.organizationId);
    const retentionDays = subscription.trashRetentionDays ?? null;

    // Track files that belong to projects for notification purposes
    const projectFileMap = new Map<string, { fileIds: string[]; projectTitle: string; ownerId: string }>();
    
    // Move files to trash and track project files
    for (const file of folderFiles) {
      const deletedAt = new Date();
      const expiresAt = typeof retentionDays === 'number'
        ? new Date(deletedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000)
        : null;

      await fileTrashRepository.create({
        fileId: file.id,
        organizationId: file.organizationId,
        deletedBy: auth.userId,
        deletedAt,
        expiresAt,
        retentionDays: retentionDays ?? null,
      });

      // If file belongs to a project, track it for notification
      if (file.projectId) {
        if (!projectFileMap.has(file.projectId)) {
          // Fetch project info to get owner
          const project = await projectsRepository.findById(file.projectId);
          if (project) {
            projectFileMap.set(file.projectId, {
              fileIds: [],
              projectTitle: project.title,
              ownerId: project.ownerId,
            });
          }
        }
        const projectInfo = projectFileMap.get(file.projectId);
        if (projectInfo) {
          projectInfo.fileIds.push(file.id);
        }
      }
    }

    // Log notification info for project owners (for future notification system)
    if (projectFileMap.size > 0) {
      for (const [projectId, info] of projectFileMap.entries()) {
        console.log('[Folder Deletion] Files from project deleted:', {
          projectId,
          projectTitle: info.projectTitle,
          ownerId: info.ownerId,
          fileCount: info.fileIds.length,
          fileIds: info.fileIds,
          deletedBy: auth.userId,
          folderId: params.folderId,
          folderName: folder.name,
          // TODO: Create notification for project owner about deleted files
          // Notification should include: project title, file count, deleted by user, restore option
        });
      }
    }

    // Delete the folder (files will be orphaned but in trash)
    await db
      .delete(folders)
      .where(eq(folders.id, params.folderId));

    return jsonOk({ 
      ok: true, 
      filesMovedToTrash: folderFiles.length,
      projectsAffected: projectFileMap.size,
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
