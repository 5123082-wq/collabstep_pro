import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import {
  tasksRepository,
  foldersRepository,
  projectsRepository
} from '@collabverse/api';
import { db } from '@collabverse/api/db/config';
import { files, projects } from '@collabverse/api/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { jsonError, jsonOk } from '@/lib/api/http';
import { flags } from '@/lib/flags';

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

  const auth = getAuthFromRequest(req);
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

    // Get organization ID from project
    const [dbProject] = await db
      .select({ organizationId: projects.organizationId })
      .from(projects)
      .where(eq(projects.id, task.projectId));

    if (!dbProject || !dbProject.organizationId) {
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
          eq(files.organizationId, dbProject.organizationId)
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

  const auth = getAuthFromRequest(req);
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

    // Get organization ID from project
    const [dbProject] = await db
      .select({ organizationId: projects.organizationId })
      .from(projects)
      .where(eq(projects.id, task.projectId));

    if (!dbProject || !dbProject.organizationId) {
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
          eq(files.organizationId, dbProject.organizationId)
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
      dbProject.organizationId,
      task.projectId,
      `${project.title || 'Project'} (${task.projectId})`,
      auth.userId
    );

    // Ensure task folder exists
    const taskFolder = await foldersRepository.ensureTaskFolder(
      dbProject.organizationId,
      task.projectId,
      taskId,
      `${task.title || 'Task'} (${taskId})`,
      auth.userId,
      projectFolder.id
    );

    // Ensure result folder exists
    const resultFolder = await foldersRepository.ensureResultFolder(
      dbProject.organizationId,
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
