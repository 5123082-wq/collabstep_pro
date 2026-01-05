import { eq, and } from 'drizzle-orm';
import { db } from '../db/config';
import { userProjectTemplates } from '../db/schema';
import type { ProjectType, ProjectStage, ProjectVisibility } from '../types';

// Helper function to safely cast string to ProjectType
function asProjectType(value: string | null | undefined): ProjectType | undefined {
  if (!value) return undefined;
  const validTypes: ProjectType[] = ['product', 'marketing', 'operations', 'service', 'internal'];
  return validTypes.includes(value as ProjectType) ? (value as ProjectType) : undefined;
}

// Helper function to safely cast string to ProjectStage
function asProjectStage(value: string | null | undefined): ProjectStage | undefined {
  if (!value) return undefined;
  const validStages: ProjectStage[] = ['discovery', 'design', 'build', 'launch', 'support'];
  return validStages.includes(value as ProjectStage) ? (value as ProjectStage) : undefined;
}

// Helper function to safely cast string to ProjectVisibility
function asProjectVisibility(value: string | null | undefined): ProjectVisibility | undefined {
  if (!value) return undefined;
  const validVisibilities: ProjectVisibility[] = ['private', 'public'];
  return validVisibilities.includes(value as ProjectVisibility) ? (value as ProjectVisibility) : undefined;
}

export interface UserProjectTemplate {
  id: string;
  userId: string;
  title: string;
  kind?: string;
  summary?: string;
  projectType?: ProjectType;
  projectStage?: ProjectStage;
  projectVisibility?: ProjectVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserTemplateInput {
  title: string;
  kind?: string;
  summary?: string;
  projectType?: ProjectType;
  projectStage?: ProjectStage;
  projectVisibility?: ProjectVisibility;
}

export interface UpdateUserTemplateInput {
  title?: string;
  kind?: string;
  summary?: string;
  projectType?: ProjectType;
  projectStage?: ProjectStage;
  projectVisibility?: ProjectVisibility;
}

export class UserTemplatesRepository {
  async list(userId: string): Promise<UserProjectTemplate[]> {
    const templates = await db
      .select()
      .from(userProjectTemplates)
      .where(eq(userProjectTemplates.userId, userId))
      .orderBy(userProjectTemplates.createdAt);

    return templates.map((template) => {
      const result: UserProjectTemplate = {
        id: template.id,
        userId: template.userId,
        title: template.title,
        createdAt: template.createdAt instanceof Date ? template.createdAt.toISOString() : template.createdAt,
        updatedAt: template.updatedAt instanceof Date ? template.updatedAt.toISOString() : template.updatedAt
      };
      
      if (template.kind) result.kind = template.kind;
      if (template.summary) result.summary = template.summary;
      
      const projectType = asProjectType(template.projectType);
      if (projectType) result.projectType = projectType;
      
      const projectStage = asProjectStage(template.projectStage);
      if (projectStage) result.projectStage = projectStage;
      
      const projectVisibility = asProjectVisibility(template.projectVisibility);
      if (projectVisibility) result.projectVisibility = projectVisibility;
      
      return result;
    });
  }

  async findById(id: string, userId: string): Promise<UserProjectTemplate | null> {
    const [template] = await db
      .select()
      .from(userProjectTemplates)
      .where(and(eq(userProjectTemplates.id, id), eq(userProjectTemplates.userId, userId)))
      .limit(1);

    if (!template) {
      return null;
    }

    const result: UserProjectTemplate = {
      id: template.id,
      userId: template.userId,
      title: template.title,
      createdAt: template.createdAt instanceof Date ? template.createdAt.toISOString() : template.createdAt,
      updatedAt: template.updatedAt instanceof Date ? template.updatedAt.toISOString() : template.updatedAt
    };
    
    if (template.kind) result.kind = template.kind;
    if (template.summary) result.summary = template.summary;
    
    const projectType = asProjectType(template.projectType);
    if (projectType) result.projectType = projectType;
    
    const projectStage = asProjectStage(template.projectStage);
    if (projectStage) result.projectStage = projectStage;
    
    const projectVisibility = asProjectVisibility(template.projectVisibility);
    if (projectVisibility) result.projectVisibility = projectVisibility;
    
    return result;
  }

  async create(input: CreateUserTemplateInput, userId: string): Promise<UserProjectTemplate> {
    const now = new Date();
    const [created] = await db
      .insert(userProjectTemplates)
      .values({
        userId,
        title: input.title,
        kind: input.kind ?? null,
        summary: input.summary ?? null,
        projectType: input.projectType ?? null,
        projectStage: input.projectStage ?? null,
        projectVisibility: input.projectVisibility ?? null,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    if (!created) {
      throw new Error('Failed to create user template');
    }

    const result: UserProjectTemplate = {
      id: created.id,
      userId: created.userId,
      title: created.title,
      createdAt: created.createdAt instanceof Date ? created.createdAt.toISOString() : created.createdAt,
      updatedAt: created.updatedAt instanceof Date ? created.updatedAt.toISOString() : created.updatedAt
    };
    
    if (created.kind) result.kind = created.kind;
    if (created.summary) result.summary = created.summary;
    
    const projectType = asProjectType(created.projectType);
    if (projectType) result.projectType = projectType;
    
    const projectStage = asProjectStage(created.projectStage);
    if (projectStage) result.projectStage = projectStage;
    
    const projectVisibility = asProjectVisibility(created.projectVisibility);
    if (projectVisibility) result.projectVisibility = projectVisibility;
    
    return result;
  }

  async update(id: string, input: UpdateUserTemplateInput, userId: string): Promise<UserProjectTemplate | null> {
    // First verify ownership
    const existing = await this.findById(id, userId);
    if (!existing) {
      return null;
    }

    const updateData: {
      title?: string;
      kind?: string | null;
      summary?: string | null;
      projectType?: ProjectType | null;
      projectStage?: ProjectStage | null;
      projectVisibility?: ProjectVisibility | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    if (input.kind !== undefined) {
      updateData.kind = input.kind || null;
    }
    if (input.summary !== undefined) {
      updateData.summary = input.summary || null;
    }
    if (input.projectType !== undefined) {
      updateData.projectType = input.projectType || null;
    }
    if (input.projectStage !== undefined) {
      updateData.projectStage = input.projectStage || null;
    }
    if (input.projectVisibility !== undefined) {
      updateData.projectVisibility = input.projectVisibility || null;
    }

    const [updated] = await db
      .update(userProjectTemplates)
      .set(updateData)
      .where(and(eq(userProjectTemplates.id, id), eq(userProjectTemplates.userId, userId)))
      .returning();

    if (!updated) {
      return null;
    }

    const result: UserProjectTemplate = {
      id: updated.id,
      userId: updated.userId,
      title: updated.title,
      createdAt: updated.createdAt instanceof Date ? updated.createdAt.toISOString() : updated.createdAt,
      updatedAt: updated.updatedAt instanceof Date ? updated.updatedAt.toISOString() : updated.updatedAt
    };
    
    if (updated.kind) result.kind = updated.kind;
    if (updated.summary) result.summary = updated.summary;
    
    const projectType = asProjectType(updated.projectType);
    if (projectType) result.projectType = projectType;
    
    const projectStage = asProjectStage(updated.projectStage);
    if (projectStage) result.projectStage = projectStage;
    
    const projectVisibility = asProjectVisibility(updated.projectVisibility);
    if (projectVisibility) result.projectVisibility = projectVisibility;
    
    return result;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    // First verify ownership
    const existing = await this.findById(id, userId);
    if (!existing) {
      return false;
    }

    const result = await db
      .delete(userProjectTemplates)
      .where(and(eq(userProjectTemplates.id, id), eq(userProjectTemplates.userId, userId)));

    // Drizzle returns number of affected rows
    return (result as unknown as { rowCount?: number })?.rowCount ? (result as unknown as { rowCount: number }).rowCount > 0 : true;
  }
}

export const userTemplatesRepository = new UserTemplatesRepository();

