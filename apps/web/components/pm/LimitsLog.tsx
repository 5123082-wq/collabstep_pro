'use client';

import { useEffect, useState } from 'react';
import { type Project } from '@/types/pm';
// @ts-ignore
import { Clock, Download, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

type LimitEvent = {
  id: string;
  projectId: string;
  action: string;
  actorId: string;
  createdAt: string;
  before?: unknown;
  after?: unknown;
};

type LimitsLogProps = {
  project: Project;
};

export default function LimitsLog({ project }: LimitsLogProps) {
  const [events, setEvents] = useState<LimitEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<LimitEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  useEffect(() => {
    async function loadLimitEvents() {
      try {
        setLoading(true);
        // Загружаем события из audit log, связанные с бюджетом проекта
        const response = await fetch(`/api/audit/log?projectId=${project.id}&entityType=project_budget&actions=project_budget.updated,expense.created`);
        if (response.ok) {
          const data = await response.json();
          // Фильтруем события, связанные с превышением лимитов
          const limitEvents = (data.items || []).filter((event: LimitEvent) => {
            // Проверяем, связано ли событие с превышением лимита
            if (event.action === 'expense.created' && event.after) {
              const after = event.after as { projectId?: string };
              return after.projectId === project.id;
            }
            return event.action === 'project_budget.updated' || event.action === 'expense.created';
          });
          setEvents(limitEvents);
          setFilteredEvents(limitEvents);
        }
      } catch (err) {
        console.error('Failed to load limit events', err);
      } finally {
        setLoading(false);
      }
    }

    if (project.id) {
      void loadLimitEvents();
    }
  }, [project.id]);

  useEffect(() => {
    // Применяем фильтры
    let filtered = [...events];

    // Фильтр по типу действия
    if (actionFilter !== 'all') {
      filtered = filtered.filter(event => event.action === actionFilter);
    }

    // Фильтр по датам
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter(event => new Date(event.createdAt) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(event => new Date(event.createdAt) <= toDate);
    }

    setFilteredEvents(filtered);
  }, [events, actionFilter, dateFrom, dateTo]);

  const handleExportCSV = () => {
    if (filteredEvents.length === 0) return;

    // Создаём CSV
    const headers = ['Дата и время', 'Действие', 'Детали'];
    const rows = filteredEvents.map(event => {
      const date = new Date(event.createdAt).toLocaleString('ru-RU');
      const action = event.action === 'expense.created' ? 'Создана трата' : 'Обновлён бюджет';
      const details = event.after && typeof event.after === 'object' && 'amount' in event.after
        ? `Сумма: ${(event.after as { amount?: string }).amount}`
        : '';
      return [date, action, details];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Скачиваем файл
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `limits-log-${project.id}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <ContentBlock size="sm">
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
        </div>
      </ContentBlock>
    );
  }

  if (events.length === 0 && !loading) {
    return (
      <ContentBlock size="sm">
        <ContentBlockTitle as="h3" className="mb-2">
          Журнал лимитов
        </ContentBlockTitle>
        <p className="text-xs text-neutral-400">События превышения лимитов появятся здесь</p>
      </ContentBlock>
    );
  }

  return (
    <ContentBlock size="sm">
      <ContentBlockTitle
        as="h3"
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition',
                showFilters
                  ? 'bg-indigo-500/20 text-indigo-300'
                  : 'bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800'
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              Фильтры
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredEvents.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-800/50 px-3 py-1.5 text-xs font-medium text-neutral-400 transition hover:bg-neutral-800 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Экспорт CSV
            </button>
          </div>
        }
      >
        Журнал лимитов
      </ContentBlockTitle>

      {/* Панель фильтров */}
      {showFilters && (
        <div className="mb-4 space-y-3 rounded-lg border border-neutral-800/50 bg-neutral-900/30 p-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-neutral-400">От даты</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-1.5 text-xs text-neutral-200"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-neutral-400">До даты</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-1.5 text-xs text-neutral-200"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-neutral-400">Тип события</span>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-1.5 text-xs text-neutral-200"
              >
                <option value="all">Все события</option>
                <option value="expense.created">Создана трата</option>
                <option value="project_budget.updated">Обновлён бюджет</option>
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={() => {
              setDateFrom('');
              setDateTo('');
              setActionFilter('all');
            }}
            className="text-xs text-neutral-400 hover:text-neutral-200"
          >
            Сбросить фильтры
          </button>
        </div>
      )}

      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <p className="text-xs text-neutral-500">Нет событий, соответствующих фильтрам</p>
        ) : (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 rounded-lg border border-neutral-800/50 bg-neutral-900/30 p-3"
            >
              <Clock className="h-4 w-4 text-neutral-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-neutral-300">
                  {event.action === 'expense.created' ? 'Создана трата' : 'Обновлён бюджет'}
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  {new Date(event.createdAt).toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                {event.after && typeof event.after === 'object' && (event.after as any).amount && (
                  <p className="text-xs text-neutral-400 mt-1">
                    Сумма: {(event.after as any).amount}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </ContentBlock>
  );
}

