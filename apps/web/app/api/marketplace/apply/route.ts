import { NextResponse } from 'next/server';
import {
  isAdminUserId,
  organizationsRepository,
  projectsRepository,
  tasksRepository,
  workspacesRepository,
  type Project,
  type ProjectMember
} from '@collabverse/api';
import { db } from '@collabverse/api/db/config';
import { projects } from '@collabverse/api/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthFromRequestWithSession } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { flags } from '@/lib/flags';
import { ensureCatalogTargetPmContext } from '@/lib/marketplace/catalog-pm-bridge';
import { resolveCatalogReusePlan } from '@/lib/marketplace/reuse-plan';
import { marketplaceApplySchema } from '@/lib/schemas/marketplace-apply';

async function upsertOrganizationProject(input: {
  projectId: string;
  organizationId: string;
  ownerId: string;
  title: string;
  description?: string;
  visibility: 'private' | 'public';
}): Promise<void> {
  const now = new Date();
  await db
    .insert(projects)
    .values({
      id: input.projectId,
      organizationId: input.organizationId,
      ownerId: input.ownerId,
      name: input.title,
      ...(input.description ? { description: input.description } : {}),
      visibility: input.visibility === 'public' ? 'public' : 'private',
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: projects.id,
      set: {
        organizationId: input.organizationId,
        ownerId: input.ownerId,
        name: input.title,
        ...(input.description ? { description: input.description } : {}),
        visibility: input.visibility === 'public' ? 'public' : 'private',
        updatedAt: now
      }
    });
}

function canImportIntoProject(project: Project, member: ProjectMember | null, userId: string): boolean {
  if (isAdminUserId(userId) || project.ownerId === userId) {
    return true;
  }

  return member?.role === 'owner' || member?.role === 'admin' || member?.role === 'member';
}

async function createImportedTasks(projectId: string, plan: NonNullable<ReturnType<typeof resolveCatalogReusePlan>>) {
  const rootTask = await tasksRepository.create({
    projectId,
    title: plan.rootTaskTitle,
    description: plan.rootTaskDescription,
    status: 'new',
    priority: 'high',
    labels: plan.labels
  });

  let createdCount = 1;

  const createChildren = async (
    parentId: string,
    tasks: NonNullable<ReturnType<typeof resolveCatalogReusePlan>>['tasks']
  ): Promise<void> => {
    for (const task of tasks) {
      const createdTask = await tasksRepository.create({
        projectId,
        parentId,
        title: task.title,
        ...(task.description ? { description: task.description } : {}),
        status: 'new',
        ...(task.priority ? { priority: task.priority } : {}),
        ...(task.labels ? { labels: task.labels } : {})
      });
      createdCount += 1;
      if (task.children && task.children.length > 0) {
        await createChildren(createdTask.id, task.children);
      }
    }
  };

  await createChildren(rootTask.id, plan.tasks);

  return {
    rootTaskId: rootTask.id,
    importedTaskCount: createdCount
  };
}

export async function POST(request: Request) {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS || !flags.PM_PROJECTS_LIST) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = await getAuthFromRequestWithSession(request);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = marketplaceApplySchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('invalid_payload', { status: 400 });
    }

    const plan = resolveCatalogReusePlan(parsed.data.sourceKind, parsed.data.sourceId);
    if (!plan) {
      return jsonError('CATALOG_SOURCE_NOT_FOUND', { status: 404 });
    }

    if (parsed.data.targetMode === 'existing_project') {
      const project = await projectsRepository.findById(parsed.data.projectId);
      if (!project) {
        return jsonError('PROJECT_NOT_FOUND', { status: 404 });
      }

      const member = await projectsRepository
        .listMembers(project.id)
        .then((items) => items.find((item) => item.userId === auth.userId) ?? null);

      if (!canImportIntoProject(project, member, auth.userId)) {
        return jsonError('PROJECT_ACCESS_DENIED', { status: 403 });
      }

      const imported = await createImportedTasks(project.id, plan);
      return jsonOk({
        project: {
          id: project.id,
          title: project.title
        },
        targetMode: parsed.data.targetMode,
        sourceKind: plan.kind,
        sourceTitle: plan.sourceTitle,
        ...imported
      });
    }

    const organizationMember = await organizationsRepository.findMember(parsed.data.organizationId, auth.userId);
    if (!organizationMember || organizationMember.status !== 'active') {
      return jsonError('ORGANIZATION_ACCESS_DENIED', { status: 403 });
    }

    const targetPmContext = await ensureCatalogTargetPmContext(parsed.data.organizationId, auth.userId);
    if (!targetPmContext) {
      return jsonError('ORGANIZATION_NOT_FOUND', { status: 404 });
    }

    for (const workspaceMember of targetPmContext.workspaceMembers) {
      workspacesRepository.upsertMember(workspaceMember.workspaceId, workspaceMember.userId, workspaceMember.role);
    }

    const title = parsed.data.projectTitle?.trim() || plan.recommendedProjectTitle;
    const description = parsed.data.projectDescription?.trim() || plan.recommendedProjectDescription;

    const project = await projectsRepository.create({
      title,
      ...(description ? { description } : {}),
      ownerId: auth.userId,
      workspaceId: targetPmContext.workspace.id,
      ...(plan.projectType ? { type: plan.projectType } : {}),
      ...(plan.projectStage ? { stage: plan.projectStage } : {}),
      visibility: 'private'
    });

    try {
      for (const projectMember of targetPmContext.projectMembers) {
        await projectsRepository.upsertMember(project.id, projectMember.userId, projectMember.role);
      }

      const imported = await createImportedTasks(project.id, plan);
      await upsertOrganizationProject({
        projectId: project.id,
        organizationId: parsed.data.organizationId,
        ownerId: auth.userId,
        title: project.title,
        ...(description ? { description } : {}),
        visibility: 'private'
      });

      return jsonOk({
        project: {
          id: project.id,
          title: project.title
        },
        targetMode: parsed.data.targetMode,
        sourceKind: plan.kind,
        sourceTitle: plan.sourceTitle,
        ...imported
      });
    } catch (error) {
      await projectsRepository.delete(project.id);
      if (await db.select({ id: projects.id }).from(projects).where(eq(projects.id, project.id)).limit(1).then((rows) => rows.length > 0)) {
        await db.delete(projects).where(eq(projects.id, project.id));
      }
      throw error;
    }
  } catch (error) {
    console.error('[catalog apply] failed:', error);
    return jsonError('CATALOG_APPLY_FAILED', {
      status: 500,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
