'use client';

import { useEffect, useState, useMemo, useTransition, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { flags } from '@/lib/flags';
import { FeatureComingSoon } from '@/components/app/FeatureComingSoon';
import { useOrganization } from '@/components/organizations/OrganizationContext';
import {
  parseTaskFilters,
  buildTaskFilterParams,
  type TaskListView,
  type TaskListFilters
} from '@/lib/pm/task-filters';
import { type Task } from '@/types/pm';
import TasksBoardView from '@/components/pm/TasksBoardView';
import TasksListView from '@/components/pm/TasksListView';
import TasksCalendarView from '@/components/pm/TasksCalendarView';
import TaskDetailModal from '@/components/pm/TaskDetailModal';
import { ContentBlock } from '@/components/ui/content-block';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/telemetry';
import type { ProjectScope } from '@/lib/pm/filters';
import { wsClient } from '@/lib/websocket/client';

type TaskProjectOption = {
  id: string;
  name: string;
  key: string;
  scope: ProjectScope;
  isOwner: boolean;
};

type TasksCacheData = {
  items: Task[];
  projects: TaskProjectOption[];
  scopeCounts: Record<ProjectScope, number>;
};

const DEFAULT_SCOPE_COUNTS: Record<ProjectScope, number> = {
  all: 0,
  owned: 0,
  member: 0
};

const SCOPE_TABS: Array<{ id: ProjectScope; label: string }> = [
  { id: 'all', label: 'Все проекты' },
  { id: 'owned', label: 'Мои проекты' },
  { id: 'member', label: 'Я участник' }
];

export default function PMTasksPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { currentOrganization } = useOrganization();

  const urlFilters = useMemo(() => parseTaskFilters(searchParams), [searchParams]);
  const view = urlFilters.view || 'board';
  // По умолчанию показываем только проекты пользователя
  const activeScope = urlFilters.scope ?? 'owned';

  // Кэш для хранения данных по ключу фильтров
  const cacheRef = useRef<Map<string, TasksCacheData>>(new Map());
  // Стабильный ключ кэша, который не меняется при каждом рендере
  const cacheKey = useMemo(() => {
    const params = buildTaskFilterParams(urlFilters);
    // Исключаем view и pageSize из ключа кэша для доски, так как они не влияют на данные
    params.delete('view');
    // Для доски pageSize всегда большой, поэтому не включаем его в ключ кэша
    if (view === 'board') {
      params.delete('pageSize');
    }
    // Сортируем параметры для стабильности ключа
    const sortedParams = new URLSearchParams();
    Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([key, value]) => sortedParams.set(key, value));
    return sortedParams.toString();
  }, [urlFilters, view]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectOptions, setProjectOptions] = useState<TaskProjectOption[]>([]);
  const [scopeCounts, setScopeCounts] = useState<Record<ProjectScope, number>>(DEFAULT_SCOPE_COUNTS);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  // Ref для отслеживания предыдущего cacheKey, чтобы избежать лишних перезагрузок
  const prevCacheKeyRef = useRef<string>('');
  // Ref для отслеживания текущей загрузки, чтобы избежать race conditions
  const loadingRef = useRef<string | null>(null);
  // Ref для хранения актуального cacheKey для обработчиков событий
  const currentCacheKeyRef = useRef<string>('');

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.email) {
            setCurrentUserId(data.email);
          }
        }
      } catch (err) {
        console.error('Failed to load current user:', err);
      }
    }

    void loadCurrentUser();
  }, []);

  useEffect(() => {
    // Проверяем, изменился ли cacheKey - если нет, не перезагружаем данные
    // НО: при первом рендере (когда prevCacheKeyRef пустой) всегда загружаем
    const isFirstLoad = prevCacheKeyRef.current === '';
    const cacheKeyChanged = cacheKey !== prevCacheKeyRef.current;
    
    if (!isFirstLoad && !cacheKeyChanged) {
      return;
    }

    // Обновляем предыдущий ключ и текущий ключ для обработчиков событий
    prevCacheKeyRef.current = cacheKey;
    currentCacheKeyRef.current = cacheKey;

    // Проверяем кэш перед загрузкой
    const cached = cacheRef.current.get(cacheKey);
    if (cached && !isFirstLoad) {
      // Показываем кэшированные данные сразу (но не при первой загрузке)
      setTasks(cached.items);
      setProjectOptions(cached.projects);
      setScopeCounts(cached.scopeCounts);
      setInitialLoading(false);
      loadingRef.current = null;
      return; // Не загружаем данные, если они уже в кэше
    }

    // Если кэша нет или это первая загрузка, устанавливаем loading и загружаем данные
    // Отмечаем, что идет загрузка для этого cacheKey
    loadingRef.current = cacheKey;
    setInitialLoading(true);
    // Очищаем предыдущие данные только если это новая загрузка (не из кэша)
    setTasks([]);
    setError(null);

    let cancelled = false;

    async function loadTasks() {
      try {
        // Для доски задач увеличиваем pageSize, чтобы показать все задачи
        const filtersForRequest = view === 'board' 
          ? { ...urlFilters, pageSize: 1000 }
          : urlFilters;
        const params = buildTaskFilterParams(filtersForRequest);
        const url = `/api/pm/tasks?${params.toString()}`;
        // Отключаем кэширование браузера, чтобы избежать конфликтов со старыми данными
        const response = await fetch(url, {
          headers: { 'cache-control': 'no-store' }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to load tasks: ${response.status} ${errorText}`);
        }
        
        const responseData = await response.json();
        // jsonOk возвращает { ok: true, data: ... }
        const data = responseData.ok ? responseData.data : responseData;

        if (cancelled) {
          return;
        }

        // Проверяем, не изменился ли cacheKey во время загрузки
        if (loadingRef.current !== cacheKey) {
          return; // Игнорируем результат, если cacheKey изменился
        }

        const cacheData: TasksCacheData = {
          items: Array.isArray(data?.items) ? data.items : [],
          projects: Array.isArray(data?.meta?.projects) ? data.meta.projects : [],
          scopeCounts: data?.meta?.scopeCounts ?? DEFAULT_SCOPE_COUNTS
        };

        // Если API не вернул ни проектов, ни задач, создаём демо-данные, чтобы рабочее место не было пустым
        if (cacheData.projects.length === 0) {
          const fallbackProject: TaskProjectOption = {
            id: 'demo-project',
            name: 'Demo project',
            key: 'DEMO',
            scope: 'owned',
            isOwner: true
          };
          cacheData.projects = [fallbackProject];

          if (cacheData.items.length === 0) {
            const now = new Date().toISOString();
            cacheData.items = [
              {
                id: 'demo-task',
                projectId: fallbackProject.id,
                title: 'Demo task',
                description: 'Автосозданная задача для пустого списка',
                status: 'new',
                number: 1,
                createdAt: now,
                updatedAt: now
              } as Task
            ];
          }
        }

        // Сохраняем в кэш
        cacheRef.current.set(cacheKey, cacheData);

        setTasks(cacheData.items);
        setProjectOptions(cacheData.projects);
        setScopeCounts(cacheData.scopeCounts);
        setError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        // Проверяем, не изменился ли cacheKey во время загрузки
        if (loadingRef.current !== cacheKey) {
          return; // Игнорируем ошибку, если cacheKey изменился
        }
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('[PMTasksPage] Failed to load tasks:', errorMessage);
        setError(errorMessage);
      } finally {
        // Всегда сбрасываем loading, если это текущая загрузка
        if (loadingRef.current === cacheKey) {
          setInitialLoading(false);
          loadingRef.current = null;
        }
      }
    }

    void loadTasks();

    // Слушаем события создания и обновления задачи для обновления списка
    const handleTaskEvent = () => {
      // Инвалидируем весь кэш, так как задача может появиться в любом фильтре
      // Используем актуальный cacheKey из ref
      const currentKey = currentCacheKeyRef.current;
      if (currentKey) {
        cacheRef.current.delete(currentKey);
      }
      // Также очищаем все кэшированные данные для надежности
      cacheRef.current.clear();
      // Небольшая задержка для того, чтобы задача успела сохраниться в базе данных
      setTimeout(() => {
        // Принудительно обновляем данные, игнорируя проверку на изменение cacheKey
        prevCacheKeyRef.current = '';
        void loadTasks();
      }, 100);
    };

    window.addEventListener('task-created', handleTaskEvent);
    window.addEventListener('task-updated', handleTaskEvent);

    // Подписка на WebSocket события для real-time обновлений (если включен)
    if (currentUserId && wsClient.isWebSocketEnabled()) {
      wsClient.connect(currentUserId);

      // Подписываемся на события задач
      const unsubscribeTaskCreated = wsClient.onEventType('task.created', () => {
        handleTaskEvent();
      });

      const unsubscribeTaskUpdated = wsClient.onEventType('task.updated', () => {
        handleTaskEvent();
      });

      return () => {
        cancelled = true;
        window.removeEventListener('task-created', handleTaskEvent);
        window.removeEventListener('task-updated', handleTaskEvent);
        unsubscribeTaskCreated();
        unsubscribeTaskUpdated();
      };
    }

    return () => {
      cancelled = true;
      window.removeEventListener('task-created', handleTaskEvent);
      window.removeEventListener('task-updated', handleTaskEvent);
    };
    // currentUserId используется только для WebSocket подключения, которое опционально
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlFilters, cacheKey, view]);

  const handleViewChange = (newView: TaskListView) => {
    trackEvent('pm_view_changed', { view: newView });
    const params = buildTaskFilterParams({ ...urlFilters, view: newView, page: 1 });
    startTransition(() => {
      router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
    });
  };

  const handleScopeChange = useCallback(
    (scope: ProjectScope) => {
      if (scope === activeScope) {
        return;
      }
      trackEvent('pm_filter_applied', { filter: 'scope', scope });
      const { projectId: _currentProjectId, ...restFilters } = urlFilters;
      void _currentProjectId;
      const nextFilters: TaskListFilters = {
        ...restFilters,
        scope,
        page: 1
      };
      const params = buildTaskFilterParams(nextFilters);
      startTransition(() => {
        router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
      });
    },
    [activeScope, pathname, router, startTransition, urlFilters]
  );

  const handleProjectChange = useCallback(
    (projectId: string | undefined) => {
      const selected = projectOptions.find((option) => option.id === projectId);
      const nextScope: ProjectScope = selected?.scope ?? activeScope;
      trackEvent('pm_filter_applied', {
        filter: 'project',
        projectId: projectId ?? null,
        scope: nextScope
      });
      const nextFilters: TaskListFilters = {
        ...urlFilters,
        ...(projectId ? { projectId } : {}),
        scope: nextScope,
        page: 1
      };
      const params = buildTaskFilterParams(nextFilters);
      startTransition(() => {
        router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
      });
    },
    [activeScope, pathname, projectOptions, router, startTransition, urlFilters]
  );

  const clearProjectFilter = useCallback(() => {
    handleProjectChange(undefined);
  }, [handleProjectChange]);

  useEffect(() => {
    trackEvent('pm_nav_opened', { section: 'tasks' });
  }, []);

  const viewEnabled = {
    board: flags.PM_TASKS_BOARD,
    list: flags.PM_TASKS_LIST,
    calendar: flags.PM_TASKS_CALENDAR
  };

  const activeView = viewEnabled[view] ? view : (viewEnabled.board ? 'board' : viewEnabled.list ? 'list' : 'calendar');
  const activeProject = projectOptions.find((option) => option.id === urlFilters.projectId);

  if (!flags.PM_NAV_PROJECTS_AND_TASKS) {
    return <FeatureComingSoon title="Задачи" />;
  }

  return (
    <div className="space-y-6 min-w-0 max-w-full overflow-x-hidden">
      <header className="flex items-center justify-between min-w-0 flex-wrap gap-4 max-w-full">
        <div>
          <h1 className="text-xl font-semibold text-white">
            {currentOrganization ? `Задачи — ${currentOrganization.name}` : 'Задачи'}
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            {currentOrganization 
              ? `Управляйте задачами организации ${currentOrganization.name}`
              : 'Управляйте всеми задачами'
            }
          </p>
        </div>

        {/* Переключатель представлений */}
        <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950/60 p-1">
          {viewEnabled.board && (
            <button
              type="button"
              onClick={() => handleViewChange('board')}
              disabled={isPending}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition',
                activeView === 'board'
                  ? 'bg-indigo-500/20 text-indigo-100'
                  : 'text-neutral-400 hover:text-white'
              )}
            >
              Board
            </button>
          )}
          {viewEnabled.list && (
            <button
              type="button"
              onClick={() => handleViewChange('list')}
              disabled={isPending}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition',
                activeView === 'list'
                  ? 'bg-indigo-500/20 text-indigo-100'
                  : 'text-neutral-400 hover:text-white'
              )}
            >
              List
            </button>
          )}
          {viewEnabled.calendar && (
            <button
              type="button"
              onClick={() => handleViewChange('calendar')}
              disabled={isPending}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition',
                activeView === 'calendar'
                  ? 'bg-indigo-500/20 text-indigo-100'
                  : 'text-neutral-400 hover:text-white'
              )}
            >
              Calendar
            </button>
          )}
        </div>
      </header>

      <ContentBlock size="sm" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            {SCOPE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleScopeChange(tab.id)}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-sm font-medium transition',
                  activeScope === tab.id
                    ? 'bg-indigo-500/20 text-indigo-100'
                    : 'border border-transparent text-neutral-300 hover:border-indigo-500/30 hover:text-white'
                )}
              >
                {tab.label}
                <span className="ml-2 rounded-full bg-neutral-900 px-2 py-0.5 text-xs text-neutral-400">
                  {scopeCounts[tab.id]}
                </span>
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Проект
            <select
              value={urlFilters.projectId ?? ''}
              onChange={(event) => handleProjectChange(event.target.value || undefined)}
              className="min-w-[220px] rounded-xl border border-neutral-900 bg-neutral-950 px-3 py-1.5 text-sm text-white focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="">
                {projectOptions.length === 0 ? 'Нет доступных проектов' : 'Все проекты'}
              </option>
              {projectOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {`${option.key} — ${option.name}`}
                </option>
              ))}
            </select>
          </label>
        </div>
        {activeProject && (
          <button
            type="button"
            onClick={clearProjectFilter}
            className="h-9 rounded-xl border border-neutral-800 px-4 text-xs font-semibold uppercase tracking-wide text-neutral-300 transition hover:border-indigo-500/40 hover:text-white"
          >
            Сбросить
          </button>
        )}
      </ContentBlock>

      {error && (
        <ContentBlock variant="error">
          <p className="text-sm">Не удалось загрузить задачи. Попробуйте обновить страницу.</p>
        </ContentBlock>
      )}

      {activeView === 'board' && (
        <TasksBoardView
          tasks={tasks}
          loading={initialLoading}
          filters={urlFilters}
          onTaskClick={(task) => setSelectedTask(task)}
        />
      )}
      {activeView === 'list' && <TasksListView tasks={tasks} loading={initialLoading} filters={urlFilters} />}
      {activeView === 'calendar' && <TasksCalendarView tasks={tasks} loading={initialLoading} filters={urlFilters} />}

      {/* Детальный вид задачи с комментариями */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={selectedTask !== null}
        onClose={() => setSelectedTask(null)}
        currentUserId={currentUserId || 'demo-user'}
      />
    </div>
  );
}
