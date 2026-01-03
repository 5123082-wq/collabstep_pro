import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import { foldersRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';
import { flags } from '@/lib/flags';
import { db } from '@collabverse/api/db/config';
import { files, fileTrash } from '@collabverse/api/db/schema';
import { eq, and, isNull, sql, inArray } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const { id: projectId } = params;

    // Check access to project
    const role = await getProjectRole(projectId, auth.userId, auth.email);
    if (role === 'viewer') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Get all folders for project
    const folders = await foldersRepository.listByProject(projectId);

    const projectFolder = folders.find((folder) => folder.type === 'project') ?? null;

    // Get file counts for each folder (excluding files in trash)
    const folderIds = folders.map((f) => f.id);
    const fileCounts = folderIds.length > 0
      ? await db
          .select({
            folderId: files.folderId,
            count: sql<number>`cast(count(*) as integer)`
          })
          .from(files)
          .leftJoin(fileTrash, and(
            eq(fileTrash.fileId, files.id),
            isNull(fileTrash.restoredAt)
          ))
          .where(
            and(
              inArray(files.folderId, folderIds),
              eq(files.projectId, projectId),
              isNull(fileTrash.id)
            )
          )
          .groupBy(files.folderId)
      : [];

    const fileCountMap = new Map<string, number>();
    fileCounts.forEach((fc) => {
      if (fc.folderId) {
        fileCountMap.set(fc.folderId, fc.count);
      }
    });

    if (projectFolder) {
      const [unassignedCount] = await db
        .select({
          count: sql<number>`cast(count(*) as integer)`
        })
        .from(files)
        .leftJoin(fileTrash, and(
          eq(fileTrash.fileId, files.id),
          isNull(fileTrash.restoredAt)
        ))
        .where(
          and(
            eq(files.projectId, projectId),
            isNull(files.folderId),
            isNull(fileTrash.id)
          )
        );

      const currentCount = fileCountMap.get(projectFolder.id) ?? 0;
      fileCountMap.set(projectFolder.id, currentCount + (unassignedCount?.count ?? 0));
    }

    return jsonOk({
      folders: folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        type: folder.type,
        projectId: folder.projectId,
        taskId: folder.taskId,
        parentId: folder.parentId,
        createdBy: folder.createdBy,
        createdAt: folder.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: folder.updatedAt?.toISOString() || new Date().toISOString(),
        fileCount: fileCountMap.get(folder.id) ?? 0
      }))
    });
  } catch (error) {
    console.error('Error getting project folders:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
