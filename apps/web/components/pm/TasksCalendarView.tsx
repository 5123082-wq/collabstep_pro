'use client';

import { useState, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, type View, type Event } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { type Task } from '@/types/pm';
import { type TaskListFilters } from '@/lib/pm/task-filters';
import { cn } from '@/lib/utils';
import { ContentBlock } from '@/components/ui/content-block';

const locales = {
  ru
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: locales.ru }),
  getDay,
  locales
});

type TasksCalendarViewProps = {
  tasks: Task[];
  loading?: boolean;
  filters: TaskListFilters;
};

type CalendarEvent = Event & {
  task: Task;
};

export default function TasksCalendarView({ tasks, loading }: TasksCalendarViewProps) {
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  const filteredTasks = useMemo(() => {
    if (showOnlyMine) {
      // В реальном приложении здесь бы использовался текущий userId
      return tasks.filter((t) => t.assigneeId);
    }
    return tasks;
  }, [tasks, showOnlyMine]);

  const events: CalendarEvent[] = useMemo(() => {
    return filteredTasks
      .filter((task) => {
        const startDate = task.startAt || task.startDate;
        const dueDate = task.dueAt || task.dueDate;
        return startDate || dueDate;
      })
      .map((task) => {
        const startDate = task.startAt || task.startDate;
        const dueDate = task.dueAt || task.dueDate;
        const start = startDate ? new Date(startDate) : new Date();
        const end = dueDate ? new Date(dueDate) : new Date(start.getTime() + 24 * 60 * 60 * 1000);

        return {
          id: task.id,
          title: task.title,
          start,
          end,
          task
        };
      });
  }, [filteredTasks]);

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const priority = event.task.priority;
    const colors: Record<string, { backgroundColor: string; borderColor: string }> = {
      urgent: { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.5)' },
      high: { backgroundColor: 'rgba(249, 115, 22, 0.2)', borderColor: 'rgba(249, 115, 22, 0.5)' },
      med: { backgroundColor: 'rgba(234, 179, 8, 0.2)', borderColor: 'rgba(234, 179, 8, 0.5)' },
      low: { backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: 'rgba(59, 130, 246, 0.5)' }
    };

    const style = priority && colors[priority] 
      ? colors[priority] 
      : { backgroundColor: 'rgba(100, 100, 100, 0.2)', borderColor: 'rgba(100, 100, 100, 0.5)' };

    return {
      style: {
        ...style,
        borderRadius: '4px',
        border: `1px solid ${style.borderColor}`,
        color: '#fff',
        padding: '2px 4px'
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-w-0 max-w-full">
        <div className="h-[600px] animate-pulse rounded-xl bg-neutral-900/50" />
      </div>
    );
  }

  return (
    <div className="space-y-4 min-w-0 max-w-full">
      {/* Панель управления */}
      <ContentBlock size="sm" className="min-w-0">
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setView('day')}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition',
              view === 'day'
                ? 'bg-indigo-500/20 text-indigo-100'
                : 'text-neutral-400 hover:text-white'
            )}
          >
            День
          </button>
          <button
            type="button"
            onClick={() => setView('week')}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition',
              view === 'week'
                ? 'bg-indigo-500/20 text-indigo-100'
                : 'text-neutral-400 hover:text-white'
            )}
          >
            Неделя
          </button>
          <button
            type="button"
            onClick={() => setView('month')}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition',
              view === 'month'
                ? 'bg-indigo-500/20 text-indigo-100'
                : 'text-neutral-400 hover:text-white'
            )}
          >
            Месяц
          </button>
        </div>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={showOnlyMine}
            onChange={(e) => setShowOnlyMine(e.target.checked)}
            className="rounded border-neutral-800 bg-neutral-900 text-indigo-500 focus:ring-indigo-500"
          />
          <span className="text-sm text-neutral-300">Только мои</span>
        </label>
        </div>
      </ContentBlock>

      {/* Календарь */}
      <ContentBlock size="sm" className="min-w-0 max-w-full">
        <style jsx global>{`
          .rbc-calendar {
            color: #fff;
            background: transparent;
          }
          .rbc-header {
            color: #a3a3a3;
            border-bottom: 1px solid #404040;
            padding: 8px;
          }
          .rbc-day-bg {
            border-color: #404040;
          }
          .rbc-time-slot {
            border-top-color: #404040;
          }
          .rbc-time-header-content {
            border-left-color: #404040;
          }
          .rbc-today {
            background-color: rgba(99, 102, 241, 0.1);
          }
          .rbc-off-range-bg {
            background-color: rgba(255, 255, 255, 0.02);
          }
          .rbc-event {
            border-radius: 4px;
            padding: 2px 4px;
          }
          .rbc-event-label {
            font-size: 12px;
          }
          .rbc-toolbar {
            margin-bottom: 16px;
          }
          .rbc-toolbar button {
            color: #d4d4d4;
            border-color: #404040;
            background: transparent;
          }
          .rbc-toolbar button:hover {
            background-color: rgba(99, 102, 241, 0.2);
            border-color: #6366f1;
          }
          .rbc-toolbar button.rbc-active {
            background-color: rgba(99, 102, 241, 0.3);
            border-color: #6366f1;
          }
        `}</style>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          eventPropGetter={eventStyleGetter}
          style={{ height: 600 }}
        />
      </ContentBlock>
    </div>
  );
}

