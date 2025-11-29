'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Task, TaskStatus } from '@/types/pm';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type ProjectTasksSectionProps = {
  projectId: string;
  tasks: Task[];
  loading?: boolean;
  onTaskClick: (task: Task) => void;
  onCreateTask?: () => void;
};

const STATUS_ORDER: TaskStatus[] = ['new', 'in_progress', 'review', 'blocked', 'done'];

const STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'Backlog',
  in_progress: 'В работе',
  review: 'На проверке',
  blocked: 'Блокеры',
  done: 'Готово'
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  new: 'bg-neutral-900 border-neutral-800 text-neutral-200',
  in_progress: 'bg-indigo-500/10 border-indigo-500/40 text-indigo-100',
  review: 'bg-amber-500/10 border-amber-500/40 text-amber-100',
  blocked: 'bg-rose-500/10 border-rose-500/40 text-rose-100',
  done: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-100'
};

const PRIORITY_LABELS: Record<NonNullable<Task['priority']>, string> = {
  low: 'Низкий',
  med: 'Средний',
  high: 'Высокий',
  urgent: 'Срочный'
};

const PRIORITY_COLORS: Record<NonNullable<Task['priority']>, string> = {
  low: 'border-blue-500/40 bg-blue-500/10 text-blue-100',
  med: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
  high: 'border-orange-500/40 bg-orange-500/10 text-orange-100',
  urgent: 'border-rose-500/40 bg-rose-500/10 text-rose-100'
};

function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold',
        STATUS_COLORS[status]
      )}
    >
      <span
        className={cn('h-2 w-2 rounded-full', {
          'bg-indigo-400': status === 'in_progress',
          'bg-emerald-400': status === 'done',
          'bg-amber-400': status === 'review',
          'bg-rose-400': status === 'blocked',
          'bg-neutral-500': status === 'new'
        })}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority?: Task['priority'] }) {
  if (!priority) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold',
        PRIORITY_COLORS[priority]
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

function DueBadge({ date }: { date?: string }) {
  if (!date) return null;
  const formatted = new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short'
  });
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs font-medium text-neutral-200">
      <span className="h-2 w-2 rounded-full bg-neutral-500" />
      Дедлайн: {formatted}
    </span>
  );
}

export default function ProjectTasksSection({
  projectId,
  tasks,
  loading,
  onTaskClick,
  onCreateTask
}: ProjectTasksSectionProps) {
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const stats = useMemo(() => {
    const inProgress = tasks.filter((task) => task.status === 'in_progress').length;
    const done = tasks.filter((task) => task.status === 'done').length;
    return { total: tasks.length, inProgress, done };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks
      .filter((task) => (statusFilter === 'all' ? true : task.status === statusFilter))
      .filter((task) => {
        if (!query) return true;
        return (
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          String(task.number).includes(query)
        );
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [search, statusFilter, tasks]);


  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/40 px-6 py-10 text-center">
      <p className="text-sm font-medium text-white">В проекте пока нет задач</p>
      <p className="text-sm text-neutral-400">Создайте первую или импортируйте список</p>
      {onCreateTask && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onCreateTask}
            className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(99,102,241,0.25)] transition hover:bg-indigo-400"
          >
            Создать задачу
          </button>
          <Link
            href={`/pm/tasks?projectId=${projectId}&scope=all`}
            className="rounded-xl border border-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-indigo-500/40 hover:text-white"
          >
            Открыть задачи
          </Link>
        </div>
      )}
    </div>
  );

  const renderListView = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-20 animate-pulse rounded-2xl bg-neutral-900/60" />
          ))}
        </div>
      );
    }

    if (filteredTasks.length === 0) {
      return renderEmpty();
    }

    return (
      <div className="space-y-3">
        {filteredTasks.map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => onTaskClick(task)}
            className="group flex w-full flex-col gap-3 rounded-2xl border border-neutral-900 bg-neutral-950/60 p-4 text-left transition hover:border-indigo-500/50 hover:bg-neutral-900"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-xs font-semibold text-neutral-400">
                    #{task.number}
                  </span>
                  <span className="line-clamp-1 text-sm font-semibold text-white group-hover:text-indigo-100">
                    {task.title}
                  </span>
                </div>
                {task.description && (
                  <p className="line-clamp-2 text-xs text-neutral-500">{task.description}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
                {(() => {
                  const dueDate = task.dueAt || task.dueDate;
                  return dueDate ? <DueBadge date={dueDate} /> : null;
                })()}
              </div>
            </div>
            {task.labels && task.labels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {task.labels.slice(0, 4).map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-neutral-900 px-2 py-1 text-xs text-neutral-300"
                  >
                    {label}
                  </span>
                ))}
                {task.labels.length > 4 && (
                  <span className="rounded-full bg-neutral-900 px-2 py-1 text-xs text-neutral-400">
                    +{task.labels.length - 4}
                  </span>
                )}
              </div>
            )}
          </button>
        ))}
      </div>
    );
  };

  return (
    <ContentBlock size="md" className="space-y-4">
      <ContentBlockTitle
        as="h2"
        actions={
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span className="rounded-full bg-neutral-900 px-2 py-1 font-semibold text-neutral-200">
              Всего: {stats.total}
            </span>
            <span className="rounded-full bg-indigo-500/10 px-2 py-1 font-semibold text-indigo-100">
              В работе: {stats.inProgress}
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-100">
              Готово: {stats.done}
            </span>
          </div>
        }
      >
        Задачи
      </ContentBlockTitle>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск по задачам"
          className="h-10 w-full min-w-[220px] rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 md:w-64"
        />
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as TaskStatus | 'all')}
        >
          <SelectTrigger className="h-10 w-[140px] rounded-xl border-neutral-800 bg-neutral-950 text-white">
            <SelectValue placeholder="Фильтр" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            {STATUS_ORDER.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Link
          href={`/pm/tasks?projectId=${projectId}&scope=all`}
          className="rounded-xl border border-neutral-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-200 transition hover:border-indigo-500/40 hover:text-white"
        >
          Все задачи
        </Link>
        {onCreateTask && (
          <button
            type="button"
            onClick={onCreateTask}
            className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(99,102,241,0.25)] transition hover:bg-indigo-400"
          >
            Новая задача
          </button>
        )}
      </div>

      {renderListView()}
    </ContentBlock>
  );
}
