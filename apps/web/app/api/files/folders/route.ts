import { NextRequest } from 'next/server';
import { eq, and, desc, count } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@collabverse/api/db/config';
import { folders, files } from '@collabverse/api/db/schema';
import { organizationsRepository } from '@collabverse/api';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { flags } from '@/lib/flags';

const CreateFolderSchema = z.object({
  name: z.string().min(1).max(255),
  organizationId: z.string(),
  projectId: z.string().optional(),
  taskId: z.string().optional(),
  parentId: z.string().nullable().optional(),
  type: z.enum(['project', 'task', 'result', 'custom']).default('custom'),
});

export async function GET(req: NextRequest) {
  if (!flags.PROJECT_ATTACHMENTS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');
    const projectId = searchParams.get('projectId');

    if (!organizationId) {
      return jsonError('ORGANIZATION_ID_REQUIRED', { status: 400 });
    }

    // Check membership
    const member = await organizationsRepository.findMember(organizationId, auth.userId);
    if (!member || member.status !== 'active') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Build conditions
    const conditions = [eq(folders.organizationId, organizationId)];
    if (projectId) {
      conditions.push(eq(folders.projectId, projectId));
    }

    // Fetch folders
    const foldersData = await db
      .select()
      .from(folders)
      .where(and(...conditions))
      .orderBy(desc(folders.createdAt));

    // Get file counts per folder using proper count aggregate
    const fileCounts = await db
      .select({
        folderId: files.folderId,
        fileCount: count(files.id),
      })
      .from(files)
      .where(eq(files.organizationId, organizationId))
      .groupBy(files.folderId);

    const fileCountMap = new Map<string, number>();
    fileCounts.forEach((row) => {
      if (row.folderId) {
        fileCountMap.set(row.folderId, Number(row.fileCount));
      }
    });

    const foldersWithCounts = foldersData.map((folder) => ({
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
      fileCount: fileCountMap.get(folder.id) ?? 0,
    }));

    return jsonOk({ folders: foldersWithCounts });
  } catch (error) {
    console.error('Error fetching folders:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!flags.PROJECT_ATTACHMENTS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = CreateFolderSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('INVALID_PAYLOAD', { status: 400, details: parsed.error.message });
    }

    const { name, organizationId, projectId, taskId, parentId, type } = parsed.data;

    // Check membership
    const member = await organizationsRepository.findMember(organizationId, auth.userId);
    if (!member || member.status !== 'active') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Validate parent folder if provided
    if (parentId) {
      const [parentFolder] = await db
        .select()
        .from(folders)
        .where(and(
          eq(folders.id, parentId),
          eq(folders.organizationId, organizationId)
        ))
        .limit(1);

      if (!parentFolder) {
        return jsonError('PARENT_FOLDER_NOT_FOUND', { status: 404 });
      }
    }

    // Create folder
    const [created] = await db
      .insert(folders)
      .values({
        name,
        organizationId,
        projectId: projectId ?? null,
        taskId: taskId ?? null,
        parentId: parentId ?? null,
        type,
        createdBy: auth.userId,
      })
      .returning();

    if (!created) {
      return jsonError('FAILED_TO_CREATE_FOLDER', { status: 500 });
    }

    return jsonOk({
      folder: {
        id: created.id,
        organizationId: created.organizationId,
        projectId: created.projectId,
        taskId: created.taskId,
        parentId: created.parentId,
        name: created.name,
        type: created.type ?? 'custom',
        createdBy: created.createdBy,
        createdAt: created.createdAt?.toISOString() ?? new Date().toISOString(),
        updatedAt: created.updatedAt?.toISOString() ?? new Date().toISOString(),
        fileCount: 0,
      },
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

