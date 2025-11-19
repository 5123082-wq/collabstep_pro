import type { TaskStatus } from '@collabverse/api';
import type { ProjectScope } from './filters';

export type TaskListView = 'board' | 'list' | 'calendar';

export type TaskListFilters = {
  projectId?: string;
  status?: TaskStatus;
  assigneeId?: string;
  priority?: 'low' | 'med' | 'high' | 'urgent';
  labels?: string[];
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  page: number;
  pageSize: number;
  sortBy?: 'updated' | 'dueDate' | 'priority' | 'title';
  sortOrder?: 'asc' | 'desc';
  view?: TaskListView;
  groupBy?: 'status' | 'assignee' | 'priority' | 'none';
  swimlane?: 'assignee' | 'priority' | 'none';
  scope?: ProjectScope;
};

export const DEFAULT_TASK_FILTERS: TaskListFilters = {
  page: 1,
  pageSize: 20,
  sortBy: 'updated',
  sortOrder: 'desc',
  view: 'board',
  groupBy: 'status',
  swimlane: 'none',
  scope: 'owned' // По умолчанию показываем только проекты пользователя
};

export function parseTaskFilters(searchParams: URLSearchParams): TaskListFilters {
  const projectId = searchParams.get('projectId') || undefined;
  const status = (searchParams.get('status') as TaskStatus | null) || undefined;
  const assigneeId = searchParams.get('assigneeId') || undefined;
  const priority = (searchParams.get('priority') as 'low' | 'med' | 'high' | 'urgent' | null) || undefined;
  const labels = searchParams.get('labels')?.split(',').filter(Boolean) || undefined;
  const dateFrom = searchParams.get('dateFrom') || undefined;
  const dateTo = searchParams.get('dateTo') || undefined;
  const q = searchParams.get('q') || undefined;
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '20') || 20));
  const sortBy = (searchParams.get('sortBy') as TaskListFilters['sortBy']) || 'updated';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
  const view = (searchParams.get('view') as TaskListView) || 'board';
  const groupBy = (searchParams.get('groupBy') as TaskListFilters['groupBy']) || 'status';
  const swimlane = (searchParams.get('swimlane') as TaskListFilters['swimlane']) || 'none';
  const scopeParam = searchParams.get('scope');
  // По умолчанию показываем только проекты пользователя
  const scope: ProjectScope =
    scopeParam === 'owned' || scopeParam === 'member' || scopeParam === 'all'
      ? scopeParam
      : 'owned';

  const filters: TaskListFilters = {
    page,
    pageSize,
    sortBy,
    sortOrder,
    view,
    groupBy,
    swimlane,
    scope
  };

  if (projectId) filters.projectId = projectId;
  if (status) filters.status = status;
  if (assigneeId) filters.assigneeId = assigneeId;
  if (priority) filters.priority = priority;
  if (labels) filters.labels = labels;
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;
  if (q) filters.q = q;

  return filters;
}

export function buildTaskFilterParams(filters: TaskListFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.projectId) params.set('projectId', filters.projectId);
  if (filters.status) params.set('status', filters.status);
  if (filters.assigneeId) params.set('assigneeId', filters.assigneeId);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.labels && filters.labels.length > 0) params.set('labels', filters.labels.join(','));
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.q) params.set('q', filters.q);
  params.set('page', `${filters.page}`);
  params.set('pageSize', `${filters.pageSize}`);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
  if (filters.view) params.set('view', filters.view);
  if (filters.groupBy && filters.groupBy !== 'status') params.set('groupBy', filters.groupBy);
  if (filters.swimlane && filters.swimlane !== 'none') params.set('swimlane', filters.swimlane);
  // Добавляем scope в URL только если он отличается от дефолтного 'owned'
  if (filters.scope && filters.scope !== 'owned') params.set('scope', filters.scope);
  return params;
}

export type TaskFilterPreset = {
  id: string;
  name: string;
  filters: TaskListFilters;
  createdAt: string;
  updatedAt: string;
};

const PRESETS_STORAGE_KEY = 'pm_task_filter_presets';

export function loadTaskFilterPresets(): TaskFilterPreset[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as TaskFilterPreset[];
  } catch {
    return [];
  }
}

export function saveTaskFilterPreset(preset: Omit<TaskFilterPreset, 'id' | 'createdAt' | 'updatedAt'>): TaskFilterPreset {
  const presets = loadTaskFilterPresets();
  const now = new Date().toISOString();
  const newPreset: TaskFilterPreset = {
    ...preset,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now
  };
  presets.push(newPreset);
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  return newPreset;
}

export function updateTaskFilterPreset(id: string, updates: Partial<Omit<TaskFilterPreset, 'id' | 'createdAt'>>): TaskFilterPreset | null {
  const presets = loadTaskFilterPresets();
  const index = presets.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const current = presets[index];
  if (!current) return null;

  const updated: TaskFilterPreset = {
    ...current,
    ...updates,
    id: current.id,
    name: updates.name ?? current.name,
    filters: updates.filters ?? current.filters,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString()
  };

  presets[index] = updated;
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  return updated;
}

export function deleteTaskFilterPreset(id: string): boolean {
  const presets = loadTaskFilterPresets();
  const filtered = presets.filter((p) => p.id !== id);
  if (filtered.length === presets.length) return false;
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

