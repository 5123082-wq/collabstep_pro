'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ProjectCardTile from '@/components/pm/ProjectCardTile';
import RestoreProjectDialog from '@/components/pm/RestoreProjectDialog';
import { buildProjectFilterParams, parseProjectFilters, type ProjectListFilters } from '@/lib/pm/filters';
import { useDebouncedValue } from '@/lib/ui/useDebouncedValue';
import { type Project } from '@/types/pm';
import { cn } from '@/lib/utils';

type ArchivedProjectsListProps = {
  projects: Project[];
  loading?: boolean;
  error?: string | null;
};

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
};

function Pagination({ currentPage, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }
  const pages = Array.from({ length: Math.min(totalPages, 10) }, (_, index) => index + 1);
  return (
    <nav aria-label="Пагинация архивных проектов" className="content-block content-block-sm flex items-center justify-between px-4 py-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-300 transition hover:border-indigo-500/40 hover:text-white disabled:cursor-not-allowed disabled:border-neutral-900 disabled:text-neutral-600"
        aria-label="Предыдущая страница"
      >
        Назад
      </button>
      <div className="flex items-center gap-2">
        {pages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onChange(page)}
            className={cn(
              'rounded-xl border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition',
              page === currentPage
                ? 'border-indigo-500/60 bg-indigo-500/20 text-indigo-100'
                : 'border-neutral-800 bg-neutral-900/70 text-neutral-300 hover:border-indigo-500/40 hover:text-white'
            )}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-300 transition hover:border-indigo-500/40 hover:text-white disabled:cursor-not-allowed disabled:border-neutral-900 disabled:text-neutral-600"
        aria-label="Следующая страница"
      >
        Вперёд
      </button>
    </nav>
  );
}

const SORT_OPTIONS: Array<{ value: ProjectListFilters['sortBy']; label: string }> = [
  { value: 'updated', label: 'По дате архивирования' },
  { value: 'dueDate', label: 'По дедлайну' },
  { value: 'progress', label: 'По прогрессу' }
];

export default function ArchivedProjectsList({ projects, loading, error }: ArchivedProjectsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const urlFilters = useMemo(() => parseProjectFilters(searchParams), [searchParams]);
  const [filters, setFilters] = useState<ProjectListFilters>(urlFilters);
  const filtersRef = useRef(filters);
  const [searchDraft, setSearchDraft] = useState(filters.q ?? '');
  const debouncedQuery = useDebouncedValue(searchDraft, 400);
  const listRef = useRef<HTMLDivElement>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    setFilters(urlFilters);
  }, [urlFilters]);

  useEffect(() => {
    setSearchDraft(filters.q ?? '');
  }, [filters.q]);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const scrollToTop = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.requestAnimationFrame(() => {
      const target = listRef.current;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }, []);

  const updateFilters = useCallback(
    (patch: Partial<ProjectListFilters>, options: { resetPage?: boolean; scroll?: boolean } = {}) => {
      const current = filtersRef.current;
      const merged: ProjectListFilters = {
        ...current,
        ...patch
      };

      if (options.resetPage !== false) {
        merged.page = 1;
      }

      filtersRef.current = merged;
      setFilters(merged);

      const params = buildProjectFilterParams(merged);
      startTransition(() => {
        router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
      });

      if (options.scroll !== false) {
        scrollToTop();
      }
    },
    [pathname, router, scrollToTop, startTransition]
  );

  useEffect(() => {
    const normalized = filters.q ?? '';
    if (normalized === debouncedQuery) {
      return;
    }
    const value = debouncedQuery.trim();
    updateFilters(value ? { q: value } : {});
  }, [debouncedQuery, filters.q, updateFilters]);

  type ProjectWithMeta = Project & {
    updatedAt?: string;
    createdAt?: string;
    title?: string;
  };

  // Фильтрация архивных проектов
  const filteredProjects = useMemo(() => {
    // Фильтруем только архивные проекты (поддерживаем оба формата статуса)
    let result = [...projects].filter((p) => {
      const status = (p.status || '').toLowerCase();
      return status === 'archived';
    });

    if (filters.q) {
      const query = filters.q.toLowerCase();
      result = result.filter((p) => {
        const project = p as ProjectWithMeta;
        const name = project.name || project.title || '';
        return name.toLowerCase().includes(query) || p.key.toLowerCase().includes(query);
      });
    }

    // Сортировка
    result.sort((a, b) => {
      const projectA = a as ProjectWithMeta;
      const projectB = b as ProjectWithMeta;
      let aValue: number | string = '';
      let bValue: number | string = '';

      switch (filters.sortBy) {
        case 'updated':
          aValue = projectA.updatedAt || projectA.createdAt || '';
          bValue = projectB.updatedAt || projectB.createdAt || '';
          break;
        case 'dueDate':
          aValue = projectA.dueDate || '';
          bValue = projectB.dueDate || '';
          break;
        case 'progress':
          aValue = projectA.metrics?.progressPct || 0;
          bValue = projectB.metrics?.progressPct || 0;
          break;
        default:
          return 0;
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    });

    return result;
  }, [projects, filters]);

  const total = filteredProjects.length;
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const currentPage = Math.min(filters.page, totalPages);
  const pageItems = useMemo(
    () => filteredProjects.slice((currentPage - 1) * filters.pageSize, currentPage * filters.pageSize),
    [filteredProjects, currentPage, filters.pageSize]
  );

  useEffect(() => {
    if (filters.page > totalPages) {
      updateFilters({ page: totalPages }, { resetPage: false, scroll: false });
    }
  }, [filters.page, totalPages, updateFilters]);

  const handleReset = () => {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
    scrollToTop();
  };

  const handleRestoreClick = (project: Project) => {
    setSelectedProject(project);
    setRestoreDialogOpen(true);
  };

  const handleRestoreSuccess = () => {
    setRestoreDialogOpen(false);
    setSelectedProject(null);
    // Перезагрузить страницу для обновления списка
    window.location.reload();
  };

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-100">
        <p>Не удалось загрузить архивные проекты. Попробуйте обновить страницу.</p>
      </div>
    );
  }

  return (
    <>
      <section className="space-y-6" ref={listRef}>
        {/* Фильтры и поиск */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row">
            {/* Поиск */}
            <div className="flex-1">
              <input
                type="search"
                placeholder="Поиск по названию или ключу..."
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Сортировка */}
            <select
              value={filters.sortBy || ''}
              onChange={(e) => {
                const value = e.target.value as ProjectListFilters['sortBy'];
                updateFilters(value ? { sortBy: value } : {});
              }}
              className="rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-2 text-sm text-white focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {filters.q && (
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-300 transition hover:border-indigo-500/40 hover:text-white"
            >
              Сбросить
            </button>
          )}
        </div>

        {/* Результаты */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-neutral-900/50" />
            ))}
          </div>
        ) : pageItems.length === 0 ? (
          <div className="rounded-3xl border border-neutral-900 bg-neutral-950/60 p-12 text-center">
            <p className="text-neutral-400">Архивные проекты не найдены</p>
            {filters.q && (
              <button
                type="button"
                onClick={handleReset}
                className="mt-4 text-sm text-indigo-400 hover:text-indigo-300"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pageItems.map((project) => (
                <div key={project.id} className="relative">
                  <ProjectCardTile project={project} />
                  <div className="absolute right-4 top-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRestoreClick(project);
                      }}
                      className="rounded-lg border border-neutral-700 bg-neutral-900/80 px-3 py-1.5 text-xs font-medium text-white transition hover:border-indigo-500/40 hover:bg-indigo-500/10"
                      title="Восстановить проект"
                    >
                      Восстановить
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Pagination currentPage={currentPage} totalPages={totalPages} onChange={(page) => updateFilters({ page }, { scroll: true })} />
          </>
        )}
      </section>

      {selectedProject && (
        <RestoreProjectDialog
          open={restoreDialogOpen}
          onOpenChange={setRestoreDialogOpen}
          project={selectedProject}
          onSuccess={handleRestoreSuccess}
        />
      )}
    </>
  );
}
