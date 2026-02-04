import { getAuthFromRequestWithSession, getProjectRole } from "@/lib/api/finance-access";
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  tasksRepository,
  foldersRepository,
  projectsRepository,
  organizationsRepository
} from '@collabverse/api';
import { db } from '@collabverse/api/db/config';
import { files, projects } from '@collabverse/api/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { jsonError, jsonOk } from '@/lib/api/http';
import { flags } from '@/lib/flags';
import type { Project } from '@collabverse/api';

/**
 * Ensures project exists in legacy `project` table and returns organizationId.
 * If project doesn't exist in the table, it tries to find user's primary organization
 * and creates the record.
 */
async function ensureProjectInLegacyTable(
  projectId: string,
  project: Project,
  userId: string
): Promise<string | null> {
  // First, try to get existing record
  const [dbProject] = await db
    .select({ organizationId: projects.organizationId })
    .from(projects)
    .where(eq(projects.id, projectId));

  if (dbProject?.organizationId) {
    return dbProject.organizationId;
  }

  // Project not in legacy table or has no organizationId - find user's organization
  const userOrgs = await organizationsRepository.listForUser(userId);
  if (!userOrgs || userOrgs.length === 0) {
    console.error(`[TaskResults] User ${userId} has no organizations`);
    return null;
  }

  // Use first organization (primary) or the one where user is owner
  const primaryOrg = userOrgs.find(org => org.ownerId === userId) ?? userOrgs[0];
  if (!primaryOrg) {
    return null;
  }

  const organizationId = primaryOrg.id;
  const now = new Date();

  // Insert or update the legacy project record
  if (dbProject) {
    // Record exists but organizationId is null - update it
    await db
      .update(projects)
      .set({
        organizationId,
        updatedAt: now
      })
      .where(eq(projects.id, projectId));
  } else {
    // Record doesn't exist - create it
    await db.insert(projects).values({
      id: projectId,
      organizationId,
      ownerId: project.ownerId,
      name: project.title,
      description: project.description ?? null,
      visibility: project.visibility === 'public' ? 'public' : 'private',
      createdAt: now,
      updatedAt: now
    });
  }

  console.log(`[TaskResults] Synced project ${projectId} to legacy table with organizationId ${organizationId}`);
  return organizationId;
}

const SetResultsSchema = z.object({
  fileIds: z.array(z.string()).min(1)
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!flags.PROJECT_ATTACHMENTS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = await getAuthFromRequestWithSession(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const { id: taskId } = params;

    // Get task
    const task = tasksRepository.findById(taskId);
    if (!task) {
      return jsonError('TASK_NOT_FOUND', { status: 404 });
    }

    // Check access to task's project
    const role = await getProjectRole(task.projectId, auth.userId, auth.email);
    if (role === 'viewer') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Get project to find organization ID
    const project = await projectsRepository.findById(task.projectId);
    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', { status: 404 });
    }

    // Get or create organization ID in legacy table
    const organizationId = await ensureProjectInLegacyTable(task.projectId, project, auth.userId);
    if (!organizationId) {
      return jsonError('PROJECT_HAS_NO_ORGANIZATION', { status: 400 });
    }

    // Find result folder
    const resultFolder = await foldersRepository.findResultFolder(taskId);
    if (!resultFolder) {
      // No result folder means no results yet
      return jsonOk({ files: [] });
    }

    // Get files from result folder
    const resultFiles = await db
      .select()
      .from(files)
      .where(
        and(
          eq(files.folderId, resultFolder.id),
          eq(files.organizationId, organizationId)
        )
      )
      .orderBy(files.createdAt);

    return jsonOk({
      files: resultFiles.map((file) => ({
        id: file.id,
        filename: file.filename,
        mimeType: file.mimeType,
        sizeBytes: Number(file.sizeBytes),
        uploadedAt: file.createdAt?.toISOString() || new Date().toISOString(),
        uploadedBy: file.uploadedBy
      }))
    });
  } catch (error) {
    console.error('Error getting task results:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!flags.PROJECT_ATTACHMENTS) {
    return jsonError('FEATURE_DISABLED', { status: 404 });
  }

  const auth = await getAuthFromRequestWithSession(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const { id: taskId } = params;

    // Validate request body
    const body = await req.json().catch(() => null);
    const parsed = SetResultsSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('INVALID_PAYLOAD', { status: 400, details: parsed.error.message });
    }

    const { fileIds } = parsed.data;

    // Get task
    const task = tasksRepository.findById(taskId);
    if (!task) {
      return jsonError('TASK_NOT_FOUND', { status: 404 });
    }

    // Check access to task's project (must not be viewer)
    const role = await getProjectRole(task.projectId, auth.userId, auth.email);
    if (role === 'viewer') {
      return jsonError('ACCESS_DENIED', { status: 403 });
    }

    // Get project to find organization ID
    const project = await projectsRepository.findById(task.projectId);
    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', { status: 404 });
    }

    // Get or create organization ID in legacy table
    const organizationId = await ensureProjectInLegacyTable(task.projectId, project, auth.userId);
    if (!organizationId) {
      return jsonError('PROJECT_HAS_NO_ORGANIZATION', { status: 400 });
    }

    // Verify all files belong to the same project and organization
    const filesToMove = await db
      .select()
      .from(files)
      .where(
        and(
          inArray(files.id, fileIds),
          eq(files.projectId, task.projectId),
          eq(files.organizationId, organizationId)
        )
      );

    if (filesToMove.length !== fileIds.length) {
      return jsonError('SOME_FILES_NOT_FOUND_OR_WRONG_PROJECT', {
        status: 400,
        details: 'Some files do not exist or do not belong to this project'
      });
    }

    // Ensure project folder exists
    const projectFolder = await foldersRepository.ensureProjectFolder(
      organizationId,
      task.projectId,
      `${project.title || 'Project'} (${task.projectId})`,
      auth.userId
    );

    // Ensure task folder exists
    const taskFolder = await foldersRepository.ensureTaskFolder(
      organizationId,
      task.projectId,
      taskId,
      `${task.title || 'Task'} (${taskId})`,
      auth.userId,
      projectFolder.id
    );

    // Ensure result folder exists
    const resultFolder = await foldersRepository.ensureResultFolder(
      organizationId,
      task.projectId,
      taskId,
      auth.userId,
      taskFolder.id
    );

    // Move files to result folder
    const updatedFiles = await db
      .update(files)
      .set({
        folderId: resultFolder.id,
        taskId: taskId,
        updatedAt: new Date()
      })
      .where(
        and(
          inArray(files.id, fileIds),
          eq(files.projectId, task.projectId)
        )
      )
      .returning();

    return jsonOk({
      files: updatedFiles.map((file) => ({
        id: file.id,
        filename: file.filename,
        mimeType: file.mimeType,
        sizeBytes: Number(file.sizeBytes),
        uploadedAt: file.createdAt?.toISOString() || new Date().toISOString(),
        uploadedBy: file.uploadedBy
      }))
    });
  } catch (error) {
    console.error('Error setting task results:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
