'use client';

import { useEffect, useState } from 'react';
import { type Project } from '@/types/pm';
import { Download, Filter, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContentBlock } from '@/components/ui/content-block';

type AutomationEvent = {
  id: string;
  projectId: string;
  action: string;
  actorId: string;
  createdAt: string;
  before?: unknown;
  after?: {
    automationType?: string;
    expenseId?: string;
    previousStatus?: string;
    newStatus?: string;
    budgetLimit?: string;
    budgetSpent?: string;
    exceededBy?: string;
  };
};

type AutomationsLogProps = {
  project: Project;
};

export default function AutomationsLog({ project }: AutomationsLogProps) {
  const [events, setEvents] = useState<AutomationEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<AutomationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    async function loadAutomationEvents() {
      try {
        setLoading(true);
        // Загружаем события автоматизаций из audit log
        const response = await fetch(
          `/api/audit/log?projectId=${project.id}&entityType=expense&actions=automation.triggered`
        );
        if (response.ok) {
          const data = await response.json();
          const automationEvents = (data.items || []).filter(
            (event: AutomationEvent) => event.action === 'automation.triggered'
          );
          setEvents(automationEvents);
          setFilteredEvents(automationEvents);
        }
      } catch (err) {
        console.error('Failed to load automation events', err);
      } finally {
        setLoading(false);
      }
    }

    if (project.id) {
      void loadAutomationEvents();
    }
  }, [project.id]);

  useEffect(() => {
    // Применяем фильтры
    let filtered = [...events];

    // Фильтр по датам
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter((event) => new Date(event.createdAt) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((event) => new Date(event.createdAt) <= toDate);
    }

    setFilteredEvents(filtered);
  }, [events, dateFrom, dateTo]);

  const handleExportCSV = () => {
    if (filteredEvents.length === 0) return;

    // Создаём CSV
    const headers = ['Дата и время', 'Тип автоматизации', 'Трата', 'Статус до', 'Статус после', 'Детали'];
    const rows = filteredEvents.map((event) => {
      const date = new Date(event.createdAt).toLocaleString('ru-RU');
      const automationType =
        event.after?.automationType === 'budget_limit_exceeded'
          ? 'Превышение лимита бюджета'
          : event.after?.automationType || 'Неизвестно';
      const expenseId = event.after?.expenseId || 'N/A';
      const previousStatus = event.after?.previousStatus || 'N/A';
      const newStatus = event.after?.newStatus || 'N/A';
      const details =
        event.after?.exceededBy
          ? `Превышение на ${event.after.exceededBy}`
          : event.after?.budgetLimit
            ? `Лимит: ${event.after.budgetLimit}, Потрачено: ${event.after.budgetSpent}`
            : '';
      return [date, automationType, expenseId, previousStatus, newStatus, details];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))
    ].join('\n');

    // Скачиваем файл
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `automations-log-${project.id}-${new Date().toISOString().slice(0, 10)}.csv`;
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
        <h3 className="mb-2 text-sm font-semibold text-white">Журнал автоматизаций</h3>
        <p className="text-xs text-neutral-400">События автоматизаций появятся здесь</p>
      </ContentBlock>
    );
  }

  return (
    <ContentBlock size="sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">Журнал автоматизаций</h3>
        </div>
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
      </div>

      {/* Панель фильтров */}
      {showFilters && (
        <div className="mb-4 space-y-3 rounded-lg border border-neutral-800/50 bg-neutral-900/30 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
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
          </div>
          <button
            type="button"
            onClick={() => {
              setDateFrom('');
              setDateTo('');
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
              className="flex items-start gap-3 rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-3"
            >
              <Zap className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-indigo-200">
                  {event.after?.automationType === 'budget_limit_exceeded'
                    ? 'Автоматизация: Превышение лимита бюджета'
                    : 'Автоматизация сработала'}
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  {new Date(event.createdAt).toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                {event.after && (
                  <div className="mt-2 space-y-1 text-xs text-neutral-300">
                    {event.after.expenseId && (
                      <p>
                        Трата: <span className="font-mono">{event.after.expenseId.slice(0, 8)}...</span>
                      </p>
                    )}
                    {event.after.previousStatus && event.after.newStatus && (
                      <p>
                        Статус изменён: <span className="text-amber-300">{event.after.previousStatus}</span> →{' '}
                        <span className="text-indigo-300">{event.after.newStatus}</span>
                      </p>
                    )}
                    {event.after.exceededBy && (
                      <p className="text-rose-300">Превышение на {event.after.exceededBy}</p>
                    )}
                    {event.after.budgetLimit && event.after.budgetSpent && (
                      <p>
                        Бюджет: {event.after.budgetSpent} / {event.after.budgetLimit}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </ContentBlock>
  );
}

