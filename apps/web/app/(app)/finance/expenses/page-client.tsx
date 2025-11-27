'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ExpenseDrawer, { type ExpenseProjectOption } from '@/components/finance/ExpenseDrawer';
import CsvImportModal from '@/components/finance/CsvImportModal';
import { Badge } from '@/components/ui/badge';
import {
  DEMO_WORKSPACE_ID,
  PAGE_SIZE_OPTIONS,
  STATUS_COLORS,
  STATUS_LABELS,
  createDraft,
  drawerReducer,
  formatExpenseAmount,
  normalizeExpense,
  formatAttachmentCount,
  type AuditEvent,
  type DrawerState,
  type Expense,
  type ExpensesResponse,
  type ExpenseSummary,
  type ExpenseStatus,
  type FinanceRole
} from '@/domain/finance/expenses';
import { buildExpenseFilterParams, parseExpenseFilters, type ExpenseListFilters } from '@/lib/finance/filters';
import { formatMoney, parseAmountInput } from '@/lib/finance/format-money';
import { getExpensePermissions } from '@/lib/finance/permissions';
import { ContentBlock } from '@/components/ui/content-block';
import { cn } from '@/lib/utils';

const PERIOD_PRESETS = [
  { id: 'all', label: 'Весь период' },
  { id: '7d', label: '7 дней' },
  { id: '30d', label: '30 дней' },
  { id: 'current-month', label: 'Текущий месяц' }
] as const;

type PeriodPresetId = (typeof PERIOD_PRESETS)[number]['id'] | 'custom';

type ProjectOption = ExpenseProjectOption & { role: FinanceRole };

type ImportState = {
  open: boolean;
};

function mapDemoRole(role: string | null): FinanceRole {
  if (role === 'admin') {
    return 'owner';
  }
  if (role === 'user') {
    return 'member';
  }
  return 'viewer';
}

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getPresetRange(preset: PeriodPresetId): { dateFrom?: string; dateTo?: string } {
  const today = new Date();
  switch (preset) {
    case '7d': {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { dateFrom: formatDateInput(from), dateTo: formatDateInput(today) };
    }
    case '30d': {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return { dateFrom: formatDateInput(from), dateTo: formatDateInput(today) };
    }
    case 'current-month': {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { dateFrom: formatDateInput(from), dateTo: formatDateInput(to) };
    }
    default:
      return {};
  }
}

function detectPreset(filters: ExpenseListFilters): PeriodPresetId {
  if (!filters.dateFrom && !filters.dateTo) {
    return 'all';
  }
  for (const preset of PERIOD_PRESETS) {
    if (preset.id === 'all') {
      continue;
    }
    const range = getPresetRange(preset.id);
    if (range.dateFrom === filters.dateFrom && range.dateTo === filters.dateTo) {
      return preset.id;
    }
  }
  return 'custom';
}

function escapeCsvValue(value: string | number | undefined | null): string {
  if (value === undefined || value === null) {
    return '';
  }
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export default function FinanceExpensesPageClient({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const liveSearchParams = useSearchParams();
  const [filters, setFilters] = useState<ExpenseListFilters>(() => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => params.append(key, item));
      } else if (value !== undefined) {
        params.set(key, value);
      }
    });
    return parseExpenseFilters(params);
  });
  const [items, setItems] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({ totalCount: 0, totalsByCurrency: [] });
  const [pagination, setPagination] = useState({ page: filters.page, pageSize: filters.pageSize, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [role, setRole] = useState<FinanceRole>('viewer');
  const [exporting, setExporting] = useState(false);
  const [importState, setImportState] = useState<ImportState>({ open: false });

  const [drawerState, dispatchDrawer] = useReducer(drawerReducer, {
    open: false,
    expense: null,
    draft: createDraft(null, 'RUB'),
    saving: false,
    error: null,
    tab: 'details',
    history: [],
    loadingHistory: false
  } satisfies DrawerState);

  useEffect(() => {
    setFilters(parseExpenseFilters(liveSearchParams));
  }, [liveSearchParams]);

  const permissions = useMemo(() => getExpensePermissions(role), [role]);
  // Ref для отслеживания предыдущего queryKey, чтобы избежать лишних перезагрузок
  const prevQueryKeyRef = useRef<string>('');

  // Стабильный ключ кэша, который не меняется при каждом рендере
  const queryKey = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', `${filters.page}`);
    params.set('pageSize', `${filters.pageSize}`);
    if (filters.projectId) params.set('projectId', filters.projectId);
    if (filters.status) params.set('status', filters.status);
    if (filters.category) params.set('category', filters.category);
    if (filters.vendor) params.set('vendor', filters.vendor);
    if (filters.q) params.set('q', filters.q);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    // Сортируем параметры для стабильности ключа
    const sortedParams = new URLSearchParams();
    Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([key, value]) => sortedParams.set(key, value));
    return sortedParams.toString();
  }, [
    filters.page,
    filters.pageSize,
    filters.projectId,
    filters.status,
    filters.category,
    filters.vendor,
    filters.q,
    filters.dateFrom,
    filters.dateTo
  ]);

  useEffect(() => {
    let cancelled = false;
    async function loadRole() {
      try {
        const response = await fetch('/api/auth/me', { headers: { 'cache-control': 'no-store' } });
        const payload = (await response.json()) as { authenticated?: boolean; role?: string };
        if (!cancelled && payload.authenticated) {
          setRole(mapDemoRole(payload.role ?? null));
        }
      } catch (err) {
        console.error(err);
      }
    }
    void loadRole();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Убеждаемся, что код выполняется на клиенте
    if (typeof window === 'undefined') {
      return;
    }

    let cancelled = false;
    async function loadProjects() {
      try {
        const response = await fetch('/api/finance/projects', { headers: { 'cache-control': 'no-store' } });
        if (!response.ok) {
          throw new Error('FAILED');
        }
        const payload = (await response.json()) as { items: Array<{ id: string; name: string; role: FinanceRole }> };
        if (!cancelled) {
          setProjects(payload.items ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load projects:', err);
          setProjects([]);
        }
      }
    }
    void loadProjects();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Проверяем, изменился ли queryKey - если нет, не перезагружаем данные
    if (queryKey === prevQueryKeyRef.current) {
      return;
    }
    
    // Обновляем предыдущий ключ
    prevQueryKeyRef.current = queryKey;
    
    const controller = new AbortController();
    async function loadExpenses() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/expenses?${queryKey}`, {
          signal: controller.signal,
          headers: { 'cache-control': 'no-store' }
        });
        if (!response.ok) {
          throw new Error('FAILED');
        }
        const payload = (await response.json()) as ExpensesResponse;
        if (!controller.signal.aborted) {
          const normalizedItems = (payload.items ?? []).map((item) => normalizeExpense(item));
          setItems(normalizedItems);
          const nextSummary =
            payload.summary ??
            ({
              totalCount: normalizedItems.length,
              totalsByCurrency: []
            } satisfies ExpenseSummary);
          setSummary(nextSummary);
          if (payload.pagination) {
            setPagination({ ...payload.pagination, total: nextSummary.totalCount });
          } else {
            const totalPages = Math.max(1, Math.ceil(nextSummary.totalCount / filters.pageSize));
            setPagination({ page: filters.page, pageSize: filters.pageSize, total: nextSummary.totalCount, totalPages });
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error(err);
          setError('Не удалось загрузить расходы');
          setItems([]);
          setSummary({ totalCount: 0, totalsByCurrency: [] });
          setPagination({ page: filters.page, pageSize: filters.pageSize, total: 0, totalPages: 1 });
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }
    void loadExpenses();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const updateQuery = useCallback(
    (patch: Partial<ExpenseListFilters>) => {
      const params = buildExpenseFilterParams(liveSearchParams, patch);
      router.replace(`${pathname}${params.toString() ? `?${params}` : ''}`);
    },
    [liveSearchParams, pathname, router]
  );

  const handleFilter = useCallback(
    (patch: Partial<ExpenseListFilters>) => {
      updateQuery({ ...patch, page: 1 });
    },
    [updateQuery]
  );

  const handlePagination = useCallback(
    (page: number) => {
      updateQuery({ page });
    },
    [updateQuery]
  );

  const availableProjectOptions = useMemo(() => projects.filter((project) => project.role !== 'viewer'), [projects]);
  const drawerProjects = useMemo(() => {
    if (!drawerState.draft.projectId) {
      return availableProjectOptions;
    }
    if (availableProjectOptions.some((project) => project.id === drawerState.draft.projectId)) {
      return availableProjectOptions;
    }
    const current = projects.find((project) => project.id === drawerState.draft.projectId);
    return current ? [...availableProjectOptions, current] : availableProjectOptions;
  }, [availableProjectOptions, drawerState.draft.projectId, projects]);

  const openCreate = useCallback(() => {
    if (!permissions.canCreate) return;
    dispatchDrawer({ type: 'open-create', payload: { currency: 'RUB' } });
    const preferredProject = filters.projectId ?? availableProjectOptions[0]?.id;
    if (preferredProject) {
      dispatchDrawer({ type: 'update', payload: { projectId: preferredProject } });
    }
  }, [availableProjectOptions, filters.projectId, permissions.canCreate]);

  const openExpense = useCallback(
    (expense: Expense) => {
      dispatchDrawer({ type: 'open-view', payload: { expense } });
    },
    []
  );

  const closeDrawer = useCallback(() => dispatchDrawer({ type: 'close' }), []);

  const handleDraftChange = useCallback((patch: Partial<DrawerState['draft']>) => {
    dispatchDrawer({ type: 'update', payload: patch });
  }, []);

  const handleSave = useCallback(async () => {
    if (!permissions.canEdit) {
      return;
    }
    if (!drawerState.draft.projectId) {
      dispatchDrawer({ type: 'set-error', payload: 'Выберите проект' });
      return;
    }
    dispatchDrawer({ type: 'set-saving', payload: true });
    dispatchDrawer({ type: 'set-error', payload: null });
    const payload = {
      workspaceId: drawerState.draft.workspaceId ?? DEMO_WORKSPACE_ID,
      projectId: drawerState.draft.projectId,
      date: drawerState.draft.date ?? new Date().toISOString().slice(0, 10),
      amount: parseAmountInput(String(drawerState.draft.amount ?? '0')),
      currency: drawerState.draft.currency ?? 'RUB',
      category: drawerState.draft.category ?? 'Uncategorized',
      description: drawerState.draft.description,
      vendor: drawerState.draft.vendor,
      paymentMethod: drawerState.draft.paymentMethod,
      taxAmount: drawerState.draft.taxAmount,
      status: drawerState.draft.status ?? 'draft',
      attachments: drawerState.draft.attachments ?? []
    };
    try {
      const endpoint = drawerState.expense ? `/api/expenses/${drawerState.expense.id}` : '/api/expenses';
      const method = drawerState.expense ? 'PATCH' : 'POST';
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error('SAVE_ERROR');
      }
      closeDrawer();
      updateQuery({ page: filters.page });
    } catch (err) {
      console.error(err);
      dispatchDrawer({ type: 'set-error', payload: 'Не удалось сохранить трату' });
    } finally {
      dispatchDrawer({ type: 'set-saving', payload: false });
    }
  }, [closeDrawer, drawerState.draft, drawerState.expense, filters.page, permissions.canEdit, updateQuery]);

  const handleStatusChange = useCallback(
    async (status: ExpenseStatus) => {
      if (!drawerState.expense || !permissions.canChangeStatus) return;
      dispatchDrawer({ type: 'set-saving', payload: true });
      dispatchDrawer({ type: 'set-error', payload: null });
      try {
        const response = await fetch(`/api/expenses/${drawerState.expense.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        if (!response.ok) {
          throw new Error('STATUS_ERROR');
        }
        closeDrawer();
        updateQuery({ page: filters.page });
      } catch (err) {
        console.error(err);
        dispatchDrawer({ type: 'set-error', payload: 'Не удалось обновить статус' });
      } finally {
        dispatchDrawer({ type: 'set-saving', payload: false });
      }
    },
    [closeDrawer, drawerState.expense, filters.page, permissions.canChangeStatus, updateQuery]
  );

  const loadHistory = useCallback(
    async (expenseId: string) => {
      dispatchDrawer({ type: 'set-history', payload: { items: drawerState.history, loading: true } });
      try {
        const response = await fetch(`/api/expenses/${expenseId}/history`, { headers: { 'cache-control': 'no-store' } });
        if (!response.ok) {
          throw new Error('FAILED');
        }
        const payload = (await response.json()) as { items: AuditEvent[] };
        dispatchDrawer({ type: 'set-history', payload: { items: payload.items ?? [], loading: false } });
      } catch (err) {
        console.error(err);
        dispatchDrawer({ type: 'set-history', payload: { items: [], loading: false } });
      }
    },
    [drawerState.history]
  );

  useEffect(() => {
    if (drawerState.open && drawerState.expense && drawerState.tab === 'history' && !drawerState.history.length) {
      void loadHistory(drawerState.expense.id);
    }
  }, [drawerState.open, drawerState.expense, drawerState.tab, drawerState.history.length, loadHistory]);

  const totalsByCurrency = summary.totalsByCurrency;

  const categories = useMemo(() => {
    const list = new Set<string>();
    items.forEach((item) => {
      if (item.category) {
        list.add(item.category);
      }
    });
    return Array.from(list.values());
  }, [items]);

  const vendors = useMemo(() => {
    const list = new Set<string>();
    items.forEach((item) => {
      if (item.vendor) {
        list.add(item.vendor);
      }
    });
    return Array.from(list.values());
  }, [items]);

  const presetId = useMemo(() => detectPreset(filters), [filters]);

  const handlePresetChange = useCallback(
    (preset: PeriodPresetId) => {
      if (preset === 'all') {
        handleFilter({ dateFrom: '', dateTo: '' });
        return;
      }
      if (preset === 'custom') {
        return;
      }
      const range = getPresetRange(preset);
      handleFilter(range);
    },
    [handleFilter]
  );

  const handleExportCsv = useCallback(async () => {
    if (!permissions.canExport) {
      return;
    }
    try {
      setExporting(true);
      const params = new URLSearchParams(queryKey);
      params.set('pageSize', '100');
      let page = 1;
      let totalPages = 1;
      const all: Expense[] = [];
      do {
        params.set('page', `${page}`);
        const response = await fetch(`/api/expenses?${params.toString()}`);
        if (!response.ok) {
          throw new Error('EXPORT_ERROR');
        }
        const payload = (await response.json()) as ExpensesResponse;
        all.push(...(payload.items ?? []));
        totalPages = payload.pagination?.totalPages ?? 1;
        page += 1;
      } while (page <= totalPages);
      const header = ['Date', 'Category', 'Description', 'Amount', 'Currency', 'Project', 'Vendor', 'Status'];
      const rows = all
        .map((expense) =>
          [
            expense.date.slice(0, 10),
            expense.category ?? '',
            expense.description ?? '',
            expense.amount,
            expense.currency,
            expense.projectId,
            expense.vendor ?? '',
            STATUS_LABELS[expense.status]
          ].map(escapeCsvValue).join(',')
        )
        .join('\n');
      const content = `${header.join(',')}\n${rows}`;
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `all-expenses-${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  }, [permissions.canExport, queryKey]);

  const handleImportComplete = useCallback(() => {
    updateQuery({ page: 1 });
  }, [updateQuery]);

  const presetButtons = PERIOD_PRESETS.map((preset) => {
    const active = preset.id === presetId;
    return (
      <button
        key={preset.id}
        type="button"
        onClick={() => handlePresetChange(preset.id)}
        className={cn(
          'rounded-full border border-neutral-800 px-3 py-1 text-xs transition',
          active ? 'bg-indigo-500 text-white' : 'text-neutral-300 hover:text-white'
        )}
      >
        {preset.label}
      </button>
    );
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-50">Расходы</h1>
          <p className="text-sm text-neutral-400">Глобальный журнал расходов по всем проектам.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {permissions.canCreate ? (
            <button
              type="button"
              onClick={openCreate}
              disabled={!availableProjectOptions.length && !filters.projectId}
              className={cn(
                'rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition',
                !availableProjectOptions.length && !filters.projectId ? 'opacity-40' : 'hover:bg-indigo-400'
              )}
            >
              Новая трата
            </button>
          ) : null}
          {permissions.canImport ? (
            <button
              type="button"
              onClick={() => setImportState({ open: true })}
              className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-100 transition hover:border-indigo-400/60 hover:text-white"
            >
              Импорт CSV
            </button>
          ) : null}
          {permissions.canExport ? (
            <>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={exporting || !items.length}
                className={cn(
                  'rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-100 transition',
                  exporting || !items.length ? 'opacity-40' : 'hover:border-indigo-400/60 hover:text-white'
                )}
              >
                {exporting ? 'Экспорт...' : 'Экспорт CSV'}
              </button>
              <button
                type="button"
                className="rounded-full border border-neutral-800 px-4 py-2 text-sm text-neutral-400"
                disabled
                title="Скоро"
              >
                Экспорт XLSX
              </button>
            </>
          ) : null}
        </div>
      </header>

      <ContentBlock>
        <div className="flex flex-wrap gap-3 text-xs text-neutral-400">
          <label className="flex flex-col gap-1">
            Проект
            <select
              value={filters.projectId ?? ''}
              onChange={(event) => handleFilter({ projectId: event.target.value })}
              className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100"
            >
              <option value="">Все проекты</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-1">
            Период
            <div className="flex flex-wrap gap-2">{presetButtons}</div>
          </div>
          <label className="flex flex-col gap-1">
            С
            <input
              type="date"
              value={filters.dateFrom ?? ''}
              onChange={(event) => handleFilter({ dateFrom: event.target.value })}
              className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100"
            />
          </label>
          <label className="flex flex-col gap-1">
            По
            <input
              type="date"
              value={filters.dateTo ?? ''}
              onChange={(event) => handleFilter({ dateTo: event.target.value })}
              className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100"
            />
          </label>
          <label className="flex flex-col gap-1">
            Статус
            <select
              value={filters.status ?? ''}
              onChange={(event) =>
                handleFilter(
                  event.target.value
                    ? ({ status: event.target.value as ExpenseStatus } as Partial<ExpenseListFilters>)
                    : ({ status: '' as unknown as ExpenseStatus } as Partial<ExpenseListFilters>)
                )
              }
              className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100"
            >
              <option value="">Все</option>
              {(Object.keys(STATUS_LABELS) as ExpenseStatus[]).map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Категория
            <select
              value={filters.category ?? ''}
              onChange={(event) => handleFilter({ category: event.target.value })}
              className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100"
            >
              <option value="">Все</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Поставщик
            <select
              value={filters.vendor ?? ''}
              onChange={(event) => handleFilter({ vendor: event.target.value })}
              className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100"
            >
              <option value="">Все</option>
              {vendors.map((vendor) => (
                <option key={vendor} value={vendor}>
                  {vendor}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Поиск
            <input
              type="search"
              value={filters.q ?? ''}
              onChange={(event) => handleFilter({ q: event.target.value })}
              placeholder="Описание, поставщик..."
              className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100"
            />
          </label>
        </div>
      </ContentBlock>

      <ContentBlock>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-400">
          <div className="flex flex-wrap items-center gap-4">
            <span>Записей: {summary.totalCount}</span>
            <span className="flex items-center gap-2">
              Итого:
              {totalsByCurrency.length ? (
                totalsByCurrency.map(({ currency, amount }) => (
                  <span key={currency} className="font-semibold text-white">
                    {formatExpenseAmount(amount, currency, 'ru-RU')}
                  </span>
                ))
              ) : (
                <span className="text-neutral-300">—</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {PAGE_SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => handleFilter({ pageSize: size })}
                className={cn(
                  'rounded-full px-3 py-1 transition',
                  size === filters.pageSize ? 'bg-indigo-500/80 text-white' : 'hover:text-white'
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="mt-4 flex min-h-[240px] items-center justify-center">
            <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="mt-4 flex min-h-[240px] flex-col items-center justify-center gap-3 text-sm text-neutral-300">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => updateQuery({ page: filters.page })}
              className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-100 transition hover:border-indigo-400/60 hover:text-white"
            >
              Повторить
            </button>
          </div>
        ) : !items.length ? (
          <div className="mt-4 flex min-h-[240px] flex-col items-center justify-center gap-2 text-sm text-neutral-300">
            <p>Нет расходов по выбранным фильтрам.</p>
          </div>
        ) : (
          <ContentBlock className="mt-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-900 text-sm">
                <thead className="bg-neutral-900/60 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Дата</th>
                    <th className="px-4 py-3 text-left">Категория</th>
                    <th className="px-4 py-3 text-left">Описание</th>
                    <th className="px-4 py-3 text-left">Сумма</th>
                    <th className="px-4 py-3 text-left">Проект</th>
                    <th className="px-4 py-3 text-left">Поставщик</th>
                    <th className="px-4 py-3 text-left">Статус</th>
                    <th className="px-4 py-3 text-left">Вложения</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 text-sm text-neutral-300">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="cursor-pointer transition hover:bg-neutral-900/60"
                      onClick={() => openExpense(item)}
                    >
                      <td className="px-4 py-3 align-top text-sm text-neutral-100">
                        {new Date(item.date).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-4 py-3 align-top text-sm text-neutral-100">{item.category || 'Без категории'}</td>
                      <td className="px-4 py-3 align-top text-sm text-neutral-300">{item.description ?? '—'}</td>
                      <td className="px-4 py-3 align-top text-sm text-neutral-100">
                        {formatMoney(item.amount, item.currency, 'ru-RU')}
                      </td>
                      <td className="px-4 py-3 align-top text-sm text-neutral-300">{item.projectId}</td>
                      <td className="px-4 py-3 align-top text-sm text-neutral-300">{item.vendor ?? '—'}</td>
                      <td className="px-4 py-3 align-top">
                        <Badge className={cn('px-2 py-1 text-xs', STATUS_COLORS[item.status])}>{STATUS_LABELS[item.status]}</Badge>
                      </td>
                      <td className="px-4 py-3 align-top text-sm text-neutral-300">
                        {formatAttachmentCount(item.attachments)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-900 bg-neutral-950/80 px-4 py-3 text-xs text-neutral-400">
              <button
                type="button"
                onClick={() => handlePagination(Math.max(1, filters.page - 1))}
                disabled={filters.page <= 1}
                className="rounded-full border border-neutral-800 px-3 py-1 text-neutral-300 disabled:opacity-40"
              >
                Назад
              </button>
              <span>
                Стр. {filters.page} из {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() => handlePagination(Math.min(pagination.totalPages, filters.page + 1))}
                disabled={filters.page >= pagination.totalPages}
                className="rounded-full border border-neutral-800 px-3 py-1 text-neutral-300 disabled:opacity-40"
              >
                Вперёд
              </button>
            </div>
          </ContentBlock>
        )}
      </ContentBlock>

      <ExpenseDrawer
        state={drawerState}
        role={role}
        onClose={closeDrawer}
        onDraftChange={handleDraftChange}
        onSave={handleSave}
        onStatusChange={handleStatusChange}
        onTabChange={(tab) => dispatchDrawer({ type: 'switch-tab', payload: tab })}
        projectOptions={drawerProjects}
        projectSelectionDisabled={Boolean(drawerState.expense)}
      />

      <CsvImportModal
        isOpen={importState.open}
        onClose={() => setImportState({ open: false })}
        onImportComplete={handleImportComplete}
        projects={projects}
        workspaceId={DEMO_WORKSPACE_ID}
        canImport={permissions.canImport}
      />
    </div>
  );
}
