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
  const { normalizedFilters, entries, ownersMap } = collectStage2Projects(currentUserId, filters);

  const sorted = sortProjects([...entries], normalizedFilters);

  const total = sorted.length;
  const pageSize = normalizedFilters.pageSize;
  const totalPages = Math.max(1, Math.ceil(Math.max(total, 1) / pageSize));
  const page = Math.min(Math.max(1, normalizedFilters.page), totalPages);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  const items = sorted.slice(start, end).map(({ project, members, metrics }) => {
    const ownerInfo = ownersMap.get(project.ownerId) ?? null;
    const transformed = transformProject(project, members, metrics, ownerInfo);
    const permissions = resolvePermissions(project, currentUserId, members);
    return applyPermissions(transformed, permissions);
  });

  const owners = Array.from(ownersMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'ru')
  );

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
}