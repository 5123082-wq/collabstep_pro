import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import {
  organizationsRepository,
  organizationStorageUsageRepository,
  projectsRepository,
  DEFAULT_WORKSPACE_ID
} from '@collabverse/api';
import { db } from '@collabverse/api/db/config';
import { projects, files, folders, fileTrash } from '@collabverse/api/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { jsonError, jsonOk } from '@/lib/api/http';

async function resolveProject(projectId: string) {
  let apiProject = await projectsRepository.findById(projectId);
  if (!apiProject) {
    apiProject = await projectsRepository.findByKey(DEFAULT_WORKSPACE_ID, projectId);
  }
  return apiProject;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS || !flags.PM_PROJECT_CARD) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const project = await resolveProject(params.id);
  if (!project) {
    return jsonError('NOT_FOUND', { status: 404 });
  }

  const hasAccess = await projectsRepository.hasAccess(project.id, auth.userId);
  if (!hasAccess) {
    return jsonError('ACCESS_DENIED', { status: 403 });
  }

  const [dbProject] = await db
    .select({ organizationId: projects.organizationId })
    .from(projects)
    .where(eq(projects.id, project.id));

  return jsonOk({
    projectId: project.id,
    organizationId: dbProject?.organizationId ?? null
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS || !flags.PM_PROJECT_CARD) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const project = await resolveProject(params.id);
  if (!project) {
    return jsonError('NOT_FOUND', { status: 404 });
  }

  const role = await getProjectRole(project.id, auth.userId, auth.email);
  if (role !== 'owner' && role !== 'admin') {
    return jsonError('ACCESS_DENIED', { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const organizationId = typeof body.organizationId === 'string' ? body.organizationId.trim() : '';
  if (!organizationId) {
    return jsonError('ORGANIZATION_REQUIRED', { status: 400 });
  }

  const member = await organizationsRepository.findMember(organizationId, auth.userId);
  if (!member || member.status !== 'active') {
    return jsonError('ORGANIZATION_ACCESS_DENIED', { status: 403 });
  }

  const [dbProject] = await db
    .select({ organizationId: projects.organizationId })
    .from(projects)
    .where(eq(projects.id, project.id));

  const previousOrganizationId = dbProject?.organizationId ?? null;
  if (previousOrganizationId === organizationId) {
    return jsonOk({
      projectId: project.id,
      organizationId,
      previousOrganizationId
    });
  }

  await db.transaction(async (tx) => {
    const now = new Date();
    if (dbProject) {
      await tx
        .update(projects)
        .set({
          organizationId,
          ownerId: project.ownerId,
          name: project.title,
          description: project.description ?? null,
          visibility: project.visibility === 'public' ? 'public' : 'private',
          updatedAt: now
        })
        .where(eq(projects.id, project.id));
    } else {
      await tx.insert(projects).values({
        id: project.id,
        organizationId,
        ownerId: project.ownerId,
        name: project.title,
        description: project.description ?? null,
        visibility: project.visibility === 'public' ? 'public' : 'private',
        createdAt: now,
        updatedAt: now
      });
    }

    const projectFiles = await tx
      .select({ id: files.id })
      .from(files)
      .where(eq(files.projectId, project.id));
    const fileIds = projectFiles.map((file) => file.id);

    await tx.update(folders).set({ organizationId }).where(eq(folders.projectId, project.id));
    await tx.update(files).set({ organizationId }).where(eq(files.projectId, project.id));

    if (fileIds.length > 0) {
      await tx.update(fileTrash).set({ organizationId }).where(inArray(fileTrash.fileId, fileIds));
    }
  });

  if (previousOrganizationId && previousOrganizationId !== organizationId) {
    await organizationStorageUsageRepository.recalculate(previousOrganizationId);
  }
  await organizationStorageUsageRepository.recalculate(organizationId);

  return jsonOk({
    projectId: project.id,
    organizationId,
    previousOrganizationId
  });
}
