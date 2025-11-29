'use server';

import type { Project } from '@/types/pm';
import { type ProjectListFilters, type ProjectScope } from './filters';
import {
  applyPermissions,
  collectStage2Projects,
  resolvePermissions,
  sortProjects,
  transformProject,
  type ProjectsOverviewOwner,
  type ProjectPermissions
} from './stage2-aggregator';

export type ProjectsOverviewFilters = Omit<ProjectListFilters, 'scope'> & {
  scope: ProjectScope;
};

export type ProjectWithPermissions = Project & {
  permissions: ProjectPermissions;
  owner?: ProjectsOverviewOwner;
};

export type ProjectsOverviewResult = {
  items: ProjectWithPermissions[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  owners: ProjectsOverviewOwner[];
};

export async function getProjectsOverview(
  currentUserId: string,
  filters: Partial<ProjectListFilters>
): Promise<ProjectsOverviewResult> {
  try {
    const { normalizedFilters, entries, ownersMap } = await collectStage2Projects(currentUserId, filters);

    // Защита: убеждаемся, что entries - это массив
    const safeEntries = Array.isArray(entries) ? entries : [];
    const sorted = Array.isArray(safeEntries) ? sortProjects([...safeEntries], normalizedFilters) : [];

    // Защита: убеждаемся, что sorted - это массив
    const safeSorted = Array.isArray(sorted) ? sorted : [];
    const total = safeSorted.length;
    const pageSize = normalizedFilters.pageSize ?? 12;
    const totalPages = Math.max(1, Math.ceil(Math.max(total, 1) / pageSize));
    const page = Math.min(Math.max(1, normalizedFilters.page ?? 1), totalPages);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const items: ProjectWithPermissions[] = safeSorted.slice(start, end).map((entry) => {
      // Защита: убеждаемся, что entry имеет правильную структуру
      if (!entry || !entry.project) {
        return null;
      }
      const { project, members = [], metrics } = entry;
      const ownerInfo = ownersMap?.get(project.ownerId) ?? null;
      const transformed = transformProject(project, members, metrics, ownerInfo);
      const permissions = resolvePermissions(project, currentUserId, members);
      const withPermissions = applyPermissions(transformed, permissions);
      return {
        ...withPermissions,
        permissions,
        ...(ownerInfo ? { owner: ownerInfo } : {})
      };
    }).filter((item): item is ProjectWithPermissions => item !== null);

    const owners = ownersMap && ownersMap instanceof Map
      ? Array.from(ownersMap.values()).sort((a, b) =>
          a.name.localeCompare(b.name, 'ru')
        )
      : [];

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages
      },
      owners
    };
  } catch (error) {
    console.error('[getProjectsOverview] Error:', error);
    // Возвращаем безопасную структуру в случае ошибки
    return {
      items: [],
      pagination: {
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 12,
        total: 0,
        totalPages: 1
      },
      owners: []
    };
  }
}