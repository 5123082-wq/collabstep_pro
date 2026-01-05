import { memory } from '../data/memory';
import type { ProjectTemplate, ID, ProjectType, ProjectStage, ProjectVisibility } from '../types';

function cloneTemplate(template: ProjectTemplate): ProjectTemplate {
  return { ...template };
}

export interface CreateTemplateInput {
  title: string;
  kind: string;
  summary: string;
  projectType?: ProjectType;
  projectStage?: ProjectStage;
  projectVisibility?: ProjectVisibility;
}

export interface UpdateTemplateInput {
  title?: string;
  kind?: string;
  summary?: string;
  projectType?: ProjectType;
  projectStage?: ProjectStage;
  projectVisibility?: ProjectVisibility;
}

export class TemplatesRepository {
  list(): ProjectTemplate[] {
    return memory.TEMPLATES.map(cloneTemplate);
  }

  findById(id: string): ProjectTemplate | null {
    const template = memory.TEMPLATES.find((item) => item.id === id);
    return template ? cloneTemplate(template) : null;
  }

  create(input: CreateTemplateInput): ProjectTemplate {
    // Генерируем уникальный ID с префиксом tpl-admin-
    const id: ID = `tpl-admin-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Проверяем уникальность ID (маловероятно, но на всякий случай)
    let attempts = 0;
    let finalId = id;
    while (memory.TEMPLATES.some((t) => t.id === finalId) && attempts < 10) {
      finalId = `tpl-admin-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      attempts++;
    }

    const template: ProjectTemplate = {
      id: finalId,
      title: input.title,
      kind: input.kind,
      summary: input.summary,
      ...(input.projectType !== undefined ? { projectType: input.projectType } : {}),
      ...(input.projectStage !== undefined ? { projectStage: input.projectStage } : {}),
      ...(input.projectVisibility !== undefined ? { projectVisibility: input.projectVisibility } : {}),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    memory.TEMPLATES.push(template);
    return cloneTemplate(template);
  }

  update(id: string, input: UpdateTemplateInput): ProjectTemplate | null {
    const index = memory.TEMPLATES.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }

    const existing = memory.TEMPLATES[index];
    if (!existing) {
      return null;
    }
    
    const updated: ProjectTemplate = {
      id: existing.id,
      title: input.title ?? existing.title,
      kind: input.kind ?? existing.kind,
      summary: input.summary ?? existing.summary,
      ...(input.projectType !== undefined ? { projectType: input.projectType } : existing.projectType !== undefined ? { projectType: existing.projectType } : {}),
      ...(input.projectStage !== undefined ? { projectStage: input.projectStage } : existing.projectStage !== undefined ? { projectStage: existing.projectStage } : {}),
      ...(input.projectVisibility !== undefined ? { projectVisibility: input.projectVisibility } : existing.projectVisibility !== undefined ? { projectVisibility: existing.projectVisibility } : {}),
      updatedAt: new Date().toISOString(),
      ...(existing.createdAt !== undefined ? { createdAt: existing.createdAt } : { createdAt: new Date().toISOString() })
    };

    memory.TEMPLATES[index] = updated;
    return cloneTemplate(updated);
  }

  delete(id: string): boolean {
    const index = memory.TEMPLATES.findIndex((item) => item.id === id);
    if (index === -1) {
      return false;
    }

    memory.TEMPLATES.splice(index, 1);
    return true;
  }
}

export const templatesRepository = new TemplatesRepository();
