import { NextRequest } from 'next/server';
import { and, eq, isNull, desc } from 'drizzle-orm';
import { db } from '@collabverse/api/db/config';
import { files, fileTrash, users, projects, folders } from '@collabverse/api/db/schema';
import { organizationsRepository } from '@collabverse/api';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { flags } from '@/lib/flags';

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  if (!flags.PROJECT_ATTACHMENTS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const { orgId } = params;

  try {
    // Check if user is a member of the organization
    const member = await organizationsRepository.findMember(orgId, auth.userId);
    if (!member || member.status !== 'active') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Get query params for filtering
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get('folderId');
    const projectId = searchParams.get('projectId');

    // Build query conditions
    const conditions = [
      eq(files.organizationId, orgId),
    ];

    if (folderId) {
      conditions.push(eq(files.folderId, folderId));
    }

    if (projectId) {
      conditions.push(eq(files.projectId, projectId));
    }

    // Fetch files with related data, excluding files in trash
    const filesData = await db
      .select({
        file: files,
        uploader: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        project: {
          id: projects.id,
          name: projects.name,
        },
        folder: {
          id: folders.id,
          name: folders.name,
          type: folders.type,
        },
        trash: fileTrash,
      })
      .from(files)
      .leftJoin(users, eq(files.uploadedBy, users.id))
      .leftJoin(projects, eq(files.projectId, projects.id))
      .leftJoin(folders, eq(files.folderId, folders.id))
      .leftJoin(fileTrash, and(
        eq(fileTrash.fileId, files.id),
        isNull(fileTrash.restoredAt)
      ))
      .where(and(...conditions))
      .orderBy(desc(files.createdAt));

    // Filter out files that are in trash
    const activeFiles = filesData
      .filter((row) => !row.trash)
      .map((row) => ({
        id: row.file.id,
        organizationId: row.file.organizationId,
        projectId: row.file.projectId,
        taskId: row.file.taskId,
        uploadedBy: row.file.uploadedBy,
        filename: row.file.filename,
        mimeType: row.file.mimeType,
        sizeBytes: Number(row.file.sizeBytes),
        storageKey: row.file.storageKey,
        storageUrl: row.file.storageUrl,
        sha256: row.file.sha256,
        description: row.file.description,
        folderId: row.file.folderId,
        createdAt: row.file.createdAt?.toISOString() ?? new Date().toISOString(),
        updatedAt: row.file.updatedAt?.toISOString() ?? new Date().toISOString(),
        uploader: row.uploader ? {
          id: row.uploader.id,
          name: row.uploader.name ?? '',
          email: row.uploader.email,
        } : undefined,
        project: row.project ? {
          id: row.project.id,
          title: row.project.name ?? '',
        } : undefined,
        folder: row.folder ? {
          id: row.folder.id,
          name: row.folder.name,
          type: row.folder.type,
        } : undefined,
      }));

    return jsonOk({ files: activeFiles });
  } catch (error) {
    console.error('Error fetching organization files:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

