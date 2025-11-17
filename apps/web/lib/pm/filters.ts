import type { ProjectStatus } from '@/types/pm';

export type ProjectScope = 'all' | 'owned' | 'member';

export type ProjectListFilters = {
  status?: ProjectStatus;
  ownerId?: string;
  memberId?: string;
  q?: string;
  page: number;
  pageSize: number;
  sortBy?: 'updated' | 'dueDate' | 'progress';
  sortOrder?: 'asc' | 'desc';
  scope?: ProjectScope;
};

export const DEFAULT_PROJECT_FILTERS: ProjectListFilters = {
  page: 1,
  pageSize: 20,
  sortBy: 'updated',
  sortOrder: 'desc',
  scope: 'all'
};

export function parseProjectFilters(searchParams: URLSearchParams): ProjectListFilters {
  const status = searchParams.get('status') as ProjectStatus | null;
  const ownerId = searchParams.get('ownerId') || undefined;
  const memberId = searchParams.get('memberId') || undefined;
  const q = searchParams.get('q') || undefined;
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '20') || 20));
  const sortBy = (searchParams.get('sortBy') as ProjectListFilters['sortBy']) || 'updated';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
  const scopeParam = searchParams.get('scope');
  const scope: ProjectScope | undefined =
    scopeParam === 'owned' || scopeParam === 'member' || scopeParam === 'all'
      ? scopeParam
      : undefined;

  return {
    status: status || undefined,
    ownerId,
    memberId,
    q,
    page,
    pageSize,
    sortBy,
    sortOrder,
    scope
  };
}

export function buildProjectFilterParams(filters: ProjectListFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.ownerId) params.set('ownerId', filters.ownerId);
  if (filters.memberId) params.set('memberId', filters.memberId);
  if (filters.q) params.set('q', filters.q);
  params.set('page', `${filters.page}`);
  params.set('pageSize', `${filters.pageSize}`);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
  if (filters.scope && filters.scope !== 'all') params.set('scope', filters.scope);
  return params;
}

