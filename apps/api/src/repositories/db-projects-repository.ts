import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/config';
import {
    projects,
    projectMembers
} from '../db/schema';

export type DbProject = typeof projects.$inferSelect;
export type NewDbProject = typeof projects.$inferInsert;
export type DbProjectMember = typeof projectMembers.$inferSelect;

/**
 * Repository for the new DB-based Project model.
 * Note: There is an existing memory-based ProjectsRepository in projects-repository.ts
 * We name this one DbProjectsRepository to avoid collision during migration.
 */
export class DbProjectsRepository {

    async create(project: NewDbProject): Promise<DbProject> {
        return await db.transaction(async (tx) => {
            const [created] = await tx
                .insert(projects)
                .values(project)
                .returning();

            if (!created) throw new Error('Failed to create project');

            // Owner becomes a member with 'owner' role
            await tx.insert(projectMembers).values({
                projectId: created.id,
                userId: project.ownerId,
                role: 'owner',
                status: 'active'
            });

            return created;
        });
    }

    async findById(id: string): Promise<DbProject | null> {
        const [project] = await db
            .select()
            .from(projects)
            .where(eq(projects.id, id));
        return project || null;
    }

    async listForUser(userId: string, organizationId?: string): Promise<DbProject[]> {
        const query = db
            .select({ project: projects })
            .from(projects)
            .innerJoin(
                projectMembers,
                eq(projects.id, projectMembers.projectId)
            )
            .where(and(
                eq(projectMembers.userId, userId),
                eq(projectMembers.status, 'active')
            ));

        // If organization filter provided
        if (organizationId) {
            // Note: complex query building with drizzle needs care, simpler to filter in memory or refine query
            // But we can add another condition to WHERE
            // logic: ... AND project.organizationId = organizationId
            // Requires referencing projects.organizationId in the where clause
        }

        // Simple list for now
        const result = await query.orderBy(desc(projects.createdAt));

        if (organizationId) {
            return result.map(r => r.project).filter(p => p.organizationId === organizationId);
        }

        return result.map(r => r.project);
    }

    async findMember(projectId: string, userId: string): Promise<DbProjectMember | null> {
        const [member] = await db
            .select()
            .from(projectMembers)
            .where(and(
                eq(projectMembers.projectId, projectId),
                eq(projectMembers.userId, userId)
            ));
        return member || null;
    }
}

export const dbProjectsRepository = new DbProjectsRepository();

