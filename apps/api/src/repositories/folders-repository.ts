import { eq, and } from 'drizzle-orm';
import { db } from '../db/config';
import { folders } from '../db/schema';

export type DbFolder = typeof folders.$inferSelect;
export type NewDbFolder = typeof folders.$inferInsert;

/**
 * Repository for folder management (project, task, result folders)
 */
export class FoldersRepository {
  /**
   * Find project folder by project ID
   */
  async findProjectFolder(projectId: string): Promise<DbFolder | null> {
    const [folder] = await db
      .select()
      .from(folders)
      .where(
        and(
          eq(folders.projectId, projectId),
          eq(folders.type, 'project')
        )
      )
      .limit(1);

    return folder || null;
  }

  /**
   * Find task folder by task ID
   */
  async findTaskFolder(taskId: string): Promise<DbFolder | null> {
    const [folder] = await db
      .select()
      .from(folders)
      .where(
        and(
          eq(folders.taskId, taskId),
          eq(folders.type, 'task')
        )
      )
      .limit(1);

    return folder || null;
  }

  /**
   * Find result folder by task ID
   */
  async findResultFolder(taskId: string): Promise<DbFolder | null> {
    const [folder] = await db
      .select()
      .from(folders)
      .where(
        and(
          eq(folders.taskId, taskId),
          eq(folders.type, 'result')
        )
      )
      .limit(1);

    return folder || null;
  }

  /**
   * Ensure project folder exists (create if not exists)
   */
  async ensureProjectFolder(
    organizationId: string,
    projectId: string,
    name: string,
    createdBy: string
  ): Promise<DbFolder> {
    const existing = await this.findProjectFolder(projectId);
    if (existing) {
      return existing;
    }

    const [created] = await db
      .insert(folders)
      .values({
        organizationId,
        projectId,
        name,
        type: 'project',
        createdBy,
        taskId: null,
        parentId: null,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to create project folder');
    }

    return created;
  }

  /**
   * Ensure task folder exists (create if not exists)
   */
  async ensureTaskFolder(
    organizationId: string,
    projectId: string,
    taskId: string,
    name: string,
    createdBy: string,
    parentId: string | null
  ): Promise<DbFolder> {
    const existing = await this.findTaskFolder(taskId);
    if (existing) {
      return existing;
    }

    const [created] = await db
      .insert(folders)
      .values({
        organizationId,
        projectId,
        taskId,
        name,
        type: 'task',
        createdBy,
        parentId,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to create task folder');
    }

    return created;
  }

  /**
   * Ensure result folder exists (create if not exists)
   */
  async ensureResultFolder(
    organizationId: string,
    projectId: string,
    taskId: string,
    createdBy: string,
    parentId: string | null
  ): Promise<DbFolder> {
    const existing = await this.findResultFolder(taskId);
    if (existing) {
      return existing;
    }

    const [created] = await db
      .insert(folders)
      .values({
        organizationId,
        projectId,
        taskId,
        name: 'Result',
        type: 'result',
        createdBy,
        parentId,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to create result folder');
    }

    return created;
  }

  /**
   * List all folders for a project (flat list with parentId)
   */
  async listByProject(projectId: string): Promise<DbFolder[]> {
    return await db
      .select()
      .from(folders)
      .where(eq(folders.projectId, projectId))
      .orderBy(folders.createdAt);
  }
}

export const foldersRepository = new FoldersRepository();
