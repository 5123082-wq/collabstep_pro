'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
// @ts-ignore
import { ArrowUpRight, DollarSign, Plus, KanbanSquare } from 'lucide-react';
import { type Project } from '@/types/pm';
import { buildProjectFilterParams, parseProjectFilters, type ProjectListFilters, type ProjectScope } from '@/lib/pm/filters';
import { useDebouncedValue } from '@/lib/ui/useDebouncedValue';
import { trackEvent } from '@/lib/telemetry';
import { toast } from '@/lib/ui/toast';
import { useAppShell } from '@/components/app/AppShellContext';
import { cn } from '@/lib/utils';
import { ContentBlock } from '@/components/ui/content-block';
import ProjectDetailModal from '@/components/pm/ProjectDetailModal';
import {
  deleteProjectFilterPreset,
  loadProjectFilterPresets,
  saveProjectFilterPreset,
  updateProjectFilterPreset,
  type ProjectFilterPreset,
  type ProjectFilterSnapshot
} from '@/lib/pm/project-filter-presets';

type ProjectsOverviewOwner = NonNullable<Project['owner']>;

type ProjectsOverviewResult = {
  items: Project[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  owners: ProjectsOverviewOwner[];
};

type ProjectsOverviewPageClientProps = {
  initialFilters: ProjectListFilters;
  initialData: ProjectsOverviewResult;
  currentUserId: string;
};

const STATUS_LABELS: Record<Project['status'], string> = {
  DRAFT: 'Черновик',
  ACTIVE: 'Активен',
  ON_HOLD: 'Пауза',
  COMPLETED: 'Завершён',
  ARCHIVED: 'Архив'
};

const STATUS_COLORS: Record<Project['status'], string> = {
  DRAFT: 'bg-neutral-500 text-white',
  ACTIVE: 'bg-emerald-500 text-white',
  ON_HOLD: 'bg-amber-500 text-white',
  COMPLETED: 'bg-sky-500 text-white',
  ARCHIVED: 'bg-neutral-700 text-neutral-100'
};

const STATUS_OPTIONS: Array<{ value: Project['status'] | ''; label: string }> = [
  { value: '', label: 'Все статусы' },
  { value: 'ACTIVE', label: 'Активные' },
  { value: 'ON_HOLD', label: 'На паузе' },
  { value: 'COMPLETED', label: 'Завершённые' },
  { value: 'DRAFT', label: 'Черновики' },
  { value: 'ARCHIVED', label: 'Архив' }
];

const SORT_OPTIONS: Array<{ value: NonNullable<ProjectListFilters['sortBy']>; label: string }> = [
  { value: 'updated', label: 'По обновлению' },
  { value: 'dueDate', label: 'По дедлайну' },
  { value: 'progress', label: 'По прогрессу' }
];

const DEFAULT_SCOPE: ProjectScope = 'owned';

function resolveScope(value: ProjectScope | undefined): ProjectScope {
  if (value === 'member' || value === 'owned' || value === 'all') {
    return value;
  }
  return DEFAULT_SCOPE;
}

function formatNumber(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return value.toLocaleString('ru-RU');
}

function buildPresetFingerprint(filters: ProjectFilterSnapshot | ProjectListFilters): string {
  return JSON.stringify({
    status: filters.status ?? null,
    ownerId: filters.ownerId ?? null,
    memberId: filters.memberId ?? null,
    q: (filters.q ?? '').trim(),
    sortBy: filters.sortBy ?? 'updated',
    sortOrder: filters.sortOrder ?? 'desc',
    scope: (filters.scope ?? DEFAULT_SCOPE),
    pageSize: filters.pageSize ?? null
  });
}

function toPresetSnapshot(filters: ProjectListFilters): ProjectFilterSnapshot {
  const { page: _page, ...rest } = filters;
  return rest as ProjectFilterSnapshot;
}

function ProjectsOverviewCard({
  project,
  onOpenProject,
  onCreateTask,
  onCreateExpense,
  onViewTasks
}: {
  project: Project;
  onOpenProject: (project: Project) => void;
  onCreateTask: (project: Project) => void;
  onCreateExpense: (project: Project) => void;
  onViewTasks: (project: Project) => void;
}) {
  const statusLabel = STATUS_LABELS[project.status];
  const statusColor = STATUS_COLORS[project.status];
  const metrics = project.metrics ?? {
    total: 0,
    inProgress: 0,
    overdue: 0,
    progressPct: 0,
    activity7d: 0
  };

  return (
    <ContentBlock
      interactive
      className="group flex h-full flex-col gap-4"
      data-testid="project-card"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wide text-neutral-500">
              {project.key}
            </span>
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                statusColor
              )}
            >
              {statusLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onOpenProject(project)}
            className="text-left text-lg font-semibold text-white transition-colors hover:text-indigo-300"
          >
            {project.name}
          </button>
          {project.owner?.name && (
            <p className="text-xs text-neutral-500">
              Владелец: <span className="text-neutral-300">{project.owner.name}</span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onOpenProject(project)}
          className="flex items-center gap-1 rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-300 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-white"
        >
          <ArrowUpRight className="h-4 w-4" />
          Открыть
        </button>
      </header>

      <section className="space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-neutral-400">
            <span>Прогресс</span>
            <span className="font-medium text-neutral-200">{metrics.progressPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-neutral-900">
            <div
              className="h-2 rounded-full bg-indigo-500 transition-all"
              style={{ width: `${metrics.progressPct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl border border-neutral-900 bg-neutral-950/80 p-3">
            <div className="text-neutral-400">Всего задач</div>
            <div className="mt-1 text-xl font-semibold text-white">{formatNumber(metrics.total)}</div>
          </div>
          <div className="rounded-xl border border-neutral-900 bg-neutral-950/80 p-3">
            <div className="text-neutral-400">В работе</div>
            <div className="mt-1 text-xl font-semibold text-emerald-400">
              {formatNumber(metrics.inProgress)}
            </div>
          </div>
          <div className="rounded-xl border border-neutral-900 bg-neutral-950/80 p-3">
            <div className="text-neutral-400">Просрочено</div>
            <div className="mt-1 text-xl font-semibold text-rose-400">
              {formatNumber(metrics.overdue)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-neutral-900 bg-neutral-950/80 p-3">
            <div className="text-neutral-400">Активность 7 дней</div>
            <div className="mt-1 text-base font-semibold text-white">
              {formatNumber(metrics.activity7d)}
            </div>
          </div>
          <div className="rounded-xl border border-neutral-900 bg-neutral-950/80 p-3">
            <div className="text-neutral-400">Бюджет</div>
            <div className="mt-1 text-base font-semibold text-neutral-200">
              {project.metrics?.budgetUsed !== undefined && project.metrics?.budgetLimit !== undefined
                ? `${formatNumber(project.metrics.budgetUsed)} / ${formatNumber(project.metrics.budgetLimit)}`
                : '—'}
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-auto flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onViewTasks(project)}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-900 bg-neutral-950/70 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-200 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-white"
        >
          <KanbanSquare className="h-4 w-4" />
          Задачи
        </button>
        <button
          type="button"
          onClick={() => onCreateTask(project)}
          disabled={!project.permissions?.canCreateTask}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-900 bg-neutral-950/70 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-200 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-white disabled:cursor-not-allowed disabled:border-neutral-900 disabled:text-neutral-600"
        >
          <Plus className="h-4 w-4" />
          Новая задача
        </button>
        <button
          type="button"
          onClick={() => onCreateExpense(project)}
          disabled={!project.permissions?.canCreateExpense}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-900 bg-neutral-950/70 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-200 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-white disabled:cursor-not-allowed disabled:border-neutral-900 disabled:text-neutral-600"
        >
          <DollarSign className="h-4 w-4" />
          Добавить трату
        </button>
      </footer>
    </ContentBlock>
  );
}

export default function ProjectsOverviewPageClient({ initialFilters, initialData, currentUserId }: ProjectsOverviewPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const liveSearchParams = useSearchParams();
  const { openCreateMenu } = useAppShell();
  const [filters, setFilters] = useState<ProjectListFilters>({
    ...initialFilters,
    scope: resolveScope(initialFilters.scope)
  });
  const filtersRef = useRef<ProjectListFilters>({
    ...initialFilters,
    scope: resolveScope(initialFilters.scope)
  });
  const [data, setData] = useState<Project[]>(initialData.items);
  const [owners, setOwners] = useState<ProjectsOverviewOwner[]>(initialData.owners);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [searchDraft, setSearchDraft] = useState(filters.q ?? '');
  const [presets, setPresets] = useState<ProjectFilterPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const debouncedQuery = useDebouncedValue(searchDraft, 400);
  const initialViewLogged = useRef(false);
  const isInitialHydrated = useRef(false);

  useEffect(() => {
    if (!initialViewLogged.current) {
      trackEvent('projects_overview_viewed', {
        userId: currentUserId,
        scope: filters.scope ?? DEFAULT_SCOPE,
        total: initialData.pagination.total
      });
      initialViewLogged.current = true;
    }
  }, [currentUserId, filters.scope, initialData.pagination.total]);

  useEffect(() => {
    if (isInitialHydrated.current) {
      return;
    }
    isInitialHydrated.current = true;
  }, []);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    setPresets(loadProjectFilterPresets());
  }, []);

  useEffect(() => {
    if (presets.length === 0) {
      setSelectedPresetId(null);
      return;
    }
    const fingerprint = buildPresetFingerprint(filters);
    const matched = presets.find((preset) => buildPresetFingerprint(preset.filters) === fingerprint);
    setSelectedPresetId(matched?.id ?? null);
  }, [filters, presets]);

  useEffect(() => {
    const nextParams = new URLSearchParams(liveSearchParams.toString());
    const parsed = parseProjectFilters(nextParams);
    const scope = resolveScope((nextParams.get('scope') as ProjectScope | null) ?? filters.scope);
    const merged: ProjectListFilters = {
      ...filtersRef.current,
      ...parsed,
      scope,
      pageSize: parsed.pageSize || filtersRef.current.pageSize || initialFilters.pageSize || 12
    };
    setFilters(merged);
    filtersRef.current = merged;
  }, [initialFilters.pageSize, liveSearchParams, filters.scope]);

  useEffect(() => {
    setSearchDraft(filters.q ?? '');
  }, [filters.q]);

  // Кэш для хранения данных по ключу фильтров
  const cacheRef = useRef<Map<string, ProjectsOverviewResult>>(new Map());
  // Ref для отслеживания предыдущего queryKey, чтобы избежать лишних перезагрузок
  const prevQueryKeyRef = useRef<string>('');

  // Стабильный ключ кэша, который не меняется при каждом рендере
  const queryKey = useMemo(() => {
    const params = buildProjectFilterParams(filters);
    // Сортируем параметры для стабильности ключа
    const sortedParams = new URLSearchParams();
    Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([key, value]) => sortedParams.set(key, value));
    return sortedParams.toString();
  }, [
    filters.status,
    filters.ownerId,
    filters.memberId,
    filters.q,
    filters.page,
    filters.pageSize,
    filters.sortBy,
    filters.sortOrder,
    filters.scope,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    filters
  ]);

  useEffect(() => {
    // Проверяем, изменился ли queryKey - если нет, не перезагружаем данные
    if (queryKey === prevQueryKeyRef.current) {
      return;
    }

    // Обновляем предыдущий ключ
    prevQueryKeyRef.current = queryKey;

    // Проверяем кэш перед загрузкой
    const cached = cacheRef.current.get(queryKey);
    if (cached) {
      // Показываем кэшированные данные сразу
      setData(cached.items);
      setOwners(cached.owners ?? []);
      setPagination(cached.pagination);
      setLoading(false);
      // Обновляем в фоне
    } else {
      setLoading(true);
    }

    const controller = new AbortController();
    const hasCached = !!cached;

    async function loadProjects() {
      setError(null);
      try {
        const response = await fetch(`/api/pm/projects?${queryKey}`, {
          signal: controller.signal,
          // Используем stale-while-revalidate паттерн
          headers: { 'cache-control': 'max-age=30, stale-while-revalidate=60' }
        });
        if (!response.ok) {
          throw new Error('FAILED');
        }
        const payload = (await response.json()) as ProjectsOverviewResult;
        if (!controller.signal.aborted) {
          // Сохраняем в кэш
          cacheRef.current.set(queryKey, payload);

          setData(payload.items);
          setOwners(payload.owners ?? []);
          setPagination(payload.pagination);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          // eslint-disable-next-line no-console
          console.error(err);
          setError('Не удалось загрузить проекты. Попробуйте позже.');
          // Не очищаем данные, если они есть в кэше
          if (!hasCached) {
            setData([]);
            setPagination({
              page: filtersRef.current.page ?? 1,
              pageSize: filtersRef.current.pageSize ?? 12,
              total: 0,
              totalPages: 1
            });
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadProjects();
    return () => controller.abort();
  }, [queryKey]);

  const updateFilters = useCallback(
    (
      patch: Partial<ProjectListFilters>,
      options: { resetPage?: boolean; track?: boolean; reason?: string } = {}
    ) => {
      const current = filtersRef.current;
      const next: ProjectListFilters = {
        ...current,
        ...patch
      };

      if (options.resetPage !== false && patch.page === undefined) {
        next.page = 1;
      }

      filtersRef.current = next;

      startTransition(() => {
        setFilters(next);
        const params = buildProjectFilterParams(next);
        router.replace(`${pathname}${params.toString() ? `?${params}` : ''}`, { scroll: false });
      });

      if (options.track) {
        trackEvent('projects_overview_filter_applied', {
          userId: currentUserId,
          scope: next.scope ?? DEFAULT_SCOPE,
          status: next.status ?? null,
          ownerId: next.ownerId ?? null,
          memberId: next.memberId ?? null,
          q: next.q ?? null,
          sortBy: next.sortBy ?? 'updated',
          sortOrder: next.sortOrder ?? 'desc',
          page: next.page ?? 1,
          reason: options.reason ?? 'filter'
        });
      }
    },
    [currentUserId, pathname, router, startTransition]
  );

  const handleApplyPreset = useCallback(
    (presetId: string) => {
      const preset = presets.find((item) => item.id === presetId);
      if (!preset) {
        return;
      }

      const snapshot = preset.filters;
      updateFilters(
        {
          ...snapshot,
          page: 1,
          pageSize: snapshot.pageSize ?? filtersRef.current.pageSize
        },
        { resetPage: false, track: true, reason: 'preset' }
      );
      setSelectedPresetId(presetId);
      trackEvent('projects_overview_preset_applied', {
        userId: currentUserId,
        presetId,
        scope: snapshot.scope ?? DEFAULT_SCOPE
      });
    },
    [currentUserId, presets, updateFilters]
  );

  const handleSavePreset = useCallback(() => {
    const name = window.prompt('Название пресета')?.trim();
    if (!name) {
      return;
    }
    const snapshot = toPresetSnapshot(filtersRef.current);
    const saved = saveProjectFilterPreset({ name, filters: snapshot });
    setPresets(loadProjectFilterPresets());
    setSelectedPresetId(saved.id);
    trackEvent('projects_overview_preset_saved', {
      userId: currentUserId,
      presetId: saved.id,
      scope: snapshot.scope ?? DEFAULT_SCOPE
    });
    toast('Пресет сохранён');
  }, [currentUserId]);

  const handleUpdatePreset = useCallback(() => {
    if (!selectedPresetId) {
      return;
    }
    const snapshot = toPresetSnapshot(filtersRef.current);
    const updated = updateProjectFilterPreset(selectedPresetId, { filters: snapshot });
    if (updated) {
      setPresets(loadProjectFilterPresets());
      setSelectedPresetId(updated.id);
      trackEvent('projects_overview_preset_updated', {
        userId: currentUserId,
        presetId: updated.id,
        scope: snapshot.scope ?? DEFAULT_SCOPE
      });
      toast('Пресет обновлён');
    }
  }, [currentUserId, selectedPresetId]);

  const handleDeletePreset = useCallback(() => {
    if (!selectedPresetId) {
      return;
    }
    const confirmed = window.confirm('Удалить выбранный пресет?');
    if (!confirmed) {
      return;
    }
    if (deleteProjectFilterPreset(selectedPresetId)) {
      setPresets(loadProjectFilterPresets());
      trackEvent('projects_overview_preset_deleted', {
        userId: currentUserId,
        presetId: selectedPresetId
      });
      setSelectedPresetId(null);
      toast('Пресет удалён');
    }
  }, [currentUserId, selectedPresetId]);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    const currentSearch = filtersRef.current.q ?? '';
    if (trimmed === currentSearch) {
      return;
    }
    updateFilters(
      trimmed ? { q: trimmed } : {},
      { resetPage: true, track: !!isInitialHydrated.current, reason: 'search' }
    );
  }, [debouncedQuery, updateFilters]);

  const handleScopeChange = (scope: ProjectScope) => {
    updateFilters(
      { scope },
      {
        resetPage: true,
        track: true,
        reason: 'tab-change'
      }
    );
  };

  const handleStatusChange = (status: Project['status'] | '') => {
    updateFilters(
      status ? { status } : {},
      {
        resetPage: true,
        track: true,
        reason: 'status'
      }
    );
  };

  const handleOwnerChange = (ownerId: string) => {
    updateFilters(
      ownerId ? { ownerId } : {},
      {
        resetPage: true,
        track: true,
        reason: 'owner'
      }
    );
  };

  const handleSortChange = (sortBy: NonNullable<ProjectListFilters['sortBy']>) => {
    updateFilters(
      { sortBy },
      {
        resetPage: false,
        track: true,
        reason: 'sort'
      }
    );
  };

  const handleResetFilters = () => {
    setSearchDraft('');
    updateFilters(
      {
        scope: DEFAULT_SCOPE
      },
      { resetPage: true, track: true, reason: 'reset' }
    );
  };

  const handlePageChange = (page: number) => {
    updateFilters({ page }, { resetPage: false, track: false });
  };

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const handleOpenProject = (project: Project) => {
    trackEvent('projects_overview_quick_action', {
      userId: currentUserId,
      projectId: project.id,
      action: 'open_project',
      scope: filtersRef.current.scope ?? DEFAULT_SCOPE
    });
    setSelectedProjectId(project.id);
  };

  const handleCreateTask = (project: Project) => {
    if (!project.permissions?.canCreateTask) {
      toast('Недостаточно прав для создания задач');
      return;
    }
    trackEvent('projects_overview_quick_action', {
      userId: currentUserId,
      projectId: project.id,
      action: 'create_task',
      scope: filtersRef.current.scope ?? DEFAULT_SCOPE
    });
    openCreateMenu();
    toast('Открываем мастер создания задачи');
  };

  const handleCreateExpense = (project: Project) => {
    if (!project.permissions?.canCreateExpense) {
      toast('Недостаточно прав для добавления трат');
      return;
    }
    trackEvent('projects_overview_quick_action', {
      userId: currentUserId,
      projectId: project.id,
      action: 'create_expense',
      scope: filtersRef.current.scope ?? DEFAULT_SCOPE
    });
    // Открываем проект в модальном окне
    setSelectedProjectId(project.id);
    // TODO: Добавить логику для автоматического открытия expense drawer в модальном окне
  };

  const handleViewTasks = (project: Project) => {
    trackEvent('projects_overview_quick_action', {
      userId: currentUserId,
      projectId: project.id,
      action: 'open_tasks',
      scope: filtersRef.current.scope ?? DEFAULT_SCOPE
    });
    const scope = filtersRef.current.scope ?? DEFAULT_SCOPE;
    const params = new URLSearchParams();
    params.set('projectId', project.id);
    params.set('scope', scope);
    params.set('view', 'board');
    router.push(`/pm/tasks?${params.toString()}`);
  };

  const activeScope = filters.scope ? resolveScope(filters.scope) : DEFAULT_SCOPE;
  const hasPresets = presets.length > 0;
  const hasFiltersApplied = Boolean(
    filters.status || filters.ownerId || filters.q || filters.scope === 'member'
  );
  const empty = !loading && data.length === 0;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <header className="flex flex-col gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white">Проекты</h1>
            <p className="text-sm text-neutral-400">
              Управляйте портфелем без переключения в PM-хаб. Таблицы, фильтры и быстрые действия —
              всё под рукой.
            </p>
          </div>
        </header>

        <div className="inline-flex rounded-xl border border-neutral-900 bg-neutral-950/80 p-1">
          {[
            { id: 'owned' as ProjectScope, label: 'Мои' },
            { id: 'member' as ProjectScope, label: 'Я участник' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleScopeChange(tab.id)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition',
                activeScope === tab.id
                  ? 'bg-indigo-500/20 text-indigo-200'
                  : 'text-neutral-400 hover:text-neutral-200'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <ContentBlock>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex flex-1 flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Поиск
                <input
                  type="search"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Название или ключ проекта..."
                  className="w-full rounded-xl border border-neutral-900 bg-neutral-950 px-4 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </label>
            </div>

            <div className="w-full md:w-48">
              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Статус
                <select
                  value={filters.status || ''}
                  onChange={(event) => handleStatusChange(event.target.value as Project['status'] | '')}
                  className="w-full rounded-xl border border-neutral-900 bg-neutral-950 px-4 py-2 text-sm text-white focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="w-full md:w-56">
              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Владелец
                <select
                  value={filters.ownerId || ''}
                  onChange={(event) => handleOwnerChange(event.target.value)}
                  className="w-full rounded-xl border border-neutral-900 bg-neutral-950 px-4 py-2 text-sm text-white focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  <option value="">Все владельцы</option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="w-full md:w-48">
              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Сортировка
                <select
                  value={filters.sortBy ?? 'updated'}
                  onChange={(event) => handleSortChange(event.target.value as NonNullable<ProjectListFilters['sortBy']>)}
                  className="w-full rounded-xl border border-neutral-900 bg-neutral-950 px-4 py-2 text-sm text-white focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {hasFiltersApplied && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-10 rounded-xl border border-neutral-900 bg-transparent px-4 text-xs font-semibold uppercase tracking-wide text-neutral-300 transition hover:border-indigo-500/40 hover:text-white"
              >
                Сбросить
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2 md:w-64">
            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Пресеты фильтров
              <select
                value={selectedPresetId ?? ''}
                onChange={(event) => {
                  const presetId = event.target.value;
                  if (!presetId) {
                    setSelectedPresetId(null);
                    return;
                  }
                  handleApplyPreset(presetId);
                }}
                disabled={!hasPresets}
                className="w-full rounded-xl border border-neutral-900 bg-neutral-950 px-4 py-2 text-sm text-white focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:text-neutral-600"
              >
                <option value="">{hasPresets ? 'Выберите пресет' : 'Нет сохранённых пресетов'}</option>
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSavePreset}
              className="rounded-xl border border-neutral-900 bg-neutral-950 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-200 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-white"
            >
              Сохранить текущий
            </button>
            <button
              type="button"
              onClick={handleUpdatePreset}
              disabled={!selectedPresetId}
              className="rounded-xl border border-neutral-900 bg-neutral-950 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-200 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-white disabled:cursor-not-allowed disabled:text-neutral-600"
            >
              Обновить пресет
            </button>
            <button
              type="button"
              onClick={handleDeletePreset}
              disabled={!selectedPresetId}
              className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-100 transition hover:border-rose-400 hover:bg-rose-500/20 hover:text-white disabled:cursor-not-allowed disabled:border-neutral-900 disabled:bg-transparent disabled:text-neutral-600"
            >
              Удалить
            </button>
          </div>
        </div>
      </ContentBlock>

      {error ? (
        <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-100">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => handleResetFilters()}
            className="mt-4 rounded-lg border border-rose-500/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-200 transition hover:border-rose-400 hover:text-white"
          >
            Сбросить фильтры
          </button>
        </div>
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <ContentBlock
              key={index}
              className="h-64 animate-pulse"
            >
              <div />
            </ContentBlock>
          ))}
        </div>
      ) : empty ? (
        <ContentBlock className="p-12 text-center">
          <h3 className="text-lg font-semibold text-white">Проекты не найдены</h3>
          <p className="mt-2 text-sm text-neutral-400">
            Попробуйте изменить фильтры или создать новый проект.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {hasFiltersApplied && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="rounded-xl border border-neutral-900 bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-300 transition hover:border-indigo-500/40 hover:text-white"
              >
                Сбросить фильтры
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                openCreateMenu();
                trackEvent('projects_overview_quick_action', {
                  userId: currentUserId,
                  action: 'create_project',
                  scope: filtersRef.current.scope ?? DEFAULT_SCOPE
                });
              }}
              className="rounded-xl border border-indigo-500 bg-indigo-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-indigo-100 transition hover:bg-indigo-500/30"
            >
              Создать проект
            </button>
          </div>
        </ContentBlock>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((project) => (
              <ProjectsOverviewCard
                key={project.id}
                project={project}
                onOpenProject={handleOpenProject}
                onCreateTask={handleCreateTask}
                onCreateExpense={handleCreateExpense}
                onViewTasks={handleViewTasks}
              />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <nav className="content-block content-block-sm flex items-center justify-between px-4 py-3">
              <button
                type="button"
                onClick={() => handlePageChange(Math.max(1, (filters.page ?? 1) - 1))}
                disabled={(filters.page ?? 1) <= 1 || loading || isPending}
                className="rounded-xl border border-neutral-900 bg-neutral-950/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-300 transition hover:border-indigo-500/40 hover:text-white disabled:cursor-not-allowed disabled:text-neutral-600"
              >
                Назад
              </button>
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(8, pagination.totalPages) }).map((_, index) => {
                  const pageNumber = index + 1;
                  const isActive = pageNumber === (filters.page ?? pagination.page);
                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => handlePageChange(pageNumber)}
                      disabled={loading || isPending}
                      className={cn(
                        'rounded-xl border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition',
                        isActive
                          ? 'border-indigo-500/60 bg-indigo-500/20 text-indigo-100'
                          : 'border-neutral-900 bg-neutral-950/70 text-neutral-300 hover:border-indigo-500/40 hover:text-white',
                        loading || isPending ? 'cursor-not-allowed opacity-70' : ''
                      )}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() =>
                  handlePageChange(Math.min(pagination.totalPages, (filters.page ?? 1) + 1))
                }
                disabled={(filters.page ?? 1) >= pagination.totalPages || loading || isPending}
                className="rounded-xl border border-neutral-900 bg-neutral-950/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-300 transition hover:border-indigo-500/40 hover:text-white disabled:cursor-not-allowed disabled:text-neutral-600"
              >
                Вперёд
              </button>
            </nav>
          )}
        </>
      )}

      {/* Модальное окно проекта */}
      {selectedProjectId && (
        <ProjectDetailModal
          projectId={selectedProjectId}
          isOpen={!!selectedProjectId}
          onClose={() => setSelectedProjectId(null)}
        />
      )}
    </div>
  );
}


