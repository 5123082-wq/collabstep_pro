'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { type Task } from '@/types/pm';
import { type TaskListFilters } from '@/lib/pm/task-filters';
import { useRouter, usePathname } from 'next/navigation';
import { buildTaskFilterParams } from '@/lib/pm/task-filters';
import { useTransition } from 'react';
import { trackEvent } from '@/lib/telemetry';
import { ContentBlock } from '@/components/ui/content-block';

type ColumnId = 'number' | 'title' | 'project' | 'status' | 'priority' | 'assignee' | 'due' | 'labels';

type Column = {
  id: ColumnId;
  label: string;
  width: number;
  sortable?: boolean;
};

const DEFAULT_COLUMNS: Column[] = [
  { id: 'number', label: '#', width: 80, sortable: true },
  { id: 'title', label: 'Название', width: 300, sortable: true },
  { id: 'project', label: 'Проект', width: 150, sortable: true },
  { id: 'status', label: 'Статус', width: 120, sortable: true },
  { id: 'priority', label: 'Приоритет', width: 100, sortable: true },
  { id: 'assignee', label: 'Исполнитель', width: 150 },
  { id: 'due', label: 'Срок', width: 120, sortable: true },
  { id: 'labels', label: 'Метки', width: 200 }
];

const STATUS_LABELS: Record<string, string> = {
  new: 'Backlog',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
  blocked: 'Blocked'
};

type TasksListViewProps = {
  tasks: Task[];
  loading?: boolean;
  filters: TaskListFilters;
};

export default function TasksListView({ tasks, loading, filters }: TasksListViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [editingCell, setEditingCell] = useState<{ taskId: string; columnId: ColumnId } | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(DEFAULT_COLUMNS.map((c) => c.id));
  const parentRef = useRef<HTMLDivElement>(null);

  const columns = useMemo(() => DEFAULT_COLUMNS.filter((c) => visibleColumns.includes(c.id)), [visibleColumns]);
  
  const tableMinWidth = useMemo(() => {
    return columns.reduce((sum, col) => sum + col.width, 0);
  }, [columns]);

  const sortedTasks = useMemo(() => {
    const sorted = [...tasks];
    if (filters.sortBy) {
      sorted.sort((a, b) => {
        let aValue: string | number | undefined;
        let bValue: string | number | undefined;

        switch (filters.sortBy) {
          case 'title':
            aValue = a.title.toLowerCase();
            bValue = b.title.toLowerCase();
            break;
          case 'priority':
            const priorityOrder = { urgent: 4, high: 3, med: 2, low: 1 };
            aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
            bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
            break;
          case 'dueDate':
            aValue = a.dueAt || a.dueDate || '';
            bValue = b.dueAt || b.dueDate || '';
            break;
          case 'updated':
          default:
            aValue = new Date(a.updatedAt).getTime();
            bValue = new Date(b.updatedAt).getTime();
            break;
        }

        if (filters.sortOrder === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        }
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      });
    }
    return sorted;
  }, [tasks, filters.sortBy, filters.sortOrder]);

  const rowVirtualizer = useVirtualizer({
    count: sortedTasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10
  });

  const handleCellEdit = useCallback(
    async (taskId: string, columnId: ColumnId, value: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const updates: Record<string, unknown> = {};
      if (columnId === 'title') {
        updates.title = value;
      } else if (columnId === 'status') {
        updates.status = value;
      } else if (columnId === 'priority') {
        updates.priority = value || undefined;
      }

      try {
        trackEvent('pm_task_updated', { taskId, field: columnId });
        const response = await fetch('/api/pm/tasks/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskIds: [taskId],
            updates
          })
        });

        if (!response.ok) {
          throw new Error('Failed to update task');
        }

        // Отправляем событие для обновления списка задач на других страницах
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('task-updated', { 
            detail: { taskId, projectId: task.projectId } 
          }));
        }

        const params = buildTaskFilterParams(filters);
        startTransition(() => {
          router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
        });
      } catch (error) {
        console.error('Error updating task:', error);
      }

      setEditingCell(null);
    },
    [tasks, filters, router, pathname, startTransition]
  );

  const handleExportCSV = useCallback(() => {
    trackEvent('pm_task_export_csv', { count: sortedTasks.length });
    const headers = columns.map((c) => c.label).join(',');
    const rows = sortedTasks.map((task) => {
      const values = columns.map((col) => {
        switch (col.id) {
          case 'number':
            return task.number;
          case 'title':
            return `"${task.title.replace(/"/g, '""')}"`;
          case 'project':
            return task.projectId;
          case 'status':
            return STATUS_LABELS[task.status] || task.status;
          case 'priority':
            return task.priority || '';
          case 'assignee':
            return task.assigneeId || '';
          case 'due':
            return task.dueAt || task.dueDate || '';
          case 'labels':
            return task.labels?.join(';') || '';
          default:
            return '';
        }
      });
      return values.join(',');
    });

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tasks-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [columns, sortedTasks]);

  const renderCell = (task: Task, columnId: ColumnId) => {
    const isEditing = editingCell?.taskId === task.id && editingCell?.columnId === columnId;

    switch (columnId) {
      case 'number':
        return <div className="text-sm text-neutral-400">#{task.number}</div>;
      case 'title':
        return isEditing ? (
          <input
            type="text"
            defaultValue={task.title}
            autoFocus
            onBlur={(e) => handleCellEdit(task.id, columnId, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void handleCellEdit(task.id, columnId, e.currentTarget.value);
              } else if (e.key === 'Escape') {
                setEditingCell(null);
              }
            }}
            className="w-full rounded border border-indigo-500/40 bg-neutral-900 px-2 py-1 text-sm text-white focus:outline-none"
          />
        ) : (
          <div
            className="cursor-pointer text-sm text-white hover:text-indigo-400"
            onClick={() => setEditingCell({ taskId: task.id, columnId })}
          >
            {task.title}
          </div>
        );
      case 'project':
        return <div className="text-sm text-neutral-300">{task.projectId}</div>;
      case 'status':
        return isEditing ? (
          <select
            autoFocus
            defaultValue={task.status}
            onBlur={(e) => handleCellEdit(task.id, columnId, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setEditingCell(null);
              }
            }}
            className="rounded border border-indigo-500/40 bg-neutral-900 px-2 py-1 text-sm text-white focus:outline-none"
          >
            <option value="new">Backlog</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
            <option value="blocked">Blocked</option>
          </select>
        ) : (
          <div
            className="cursor-pointer text-sm text-neutral-300 hover:text-indigo-400"
            onClick={() => setEditingCell({ taskId: task.id, columnId })}
          >
            {STATUS_LABELS[task.status] || task.status}
          </div>
        );
      case 'priority':
        return isEditing ? (
          <select
            autoFocus
            defaultValue={task.priority || ''}
            onBlur={(e) => handleCellEdit(task.id, columnId, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setEditingCell(null);
              }
            }}
            className="rounded border border-indigo-500/40 bg-neutral-900 px-2 py-1 text-sm text-white focus:outline-none"
          >
            <option value="">—</option>
            <option value="low">Low</option>
            <option value="med">Med</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        ) : (
          <div
            className="cursor-pointer text-sm text-neutral-300 hover:text-indigo-400"
            onClick={() => setEditingCell({ taskId: task.id, columnId })}
          >
            {task.priority || '—'}
          </div>
        );
      case 'assignee':
        return <div className="text-sm text-neutral-300">{task.assigneeId || '—'}</div>;
      case 'due':
        return (
          <div className="text-sm text-neutral-300">
            {task.dueAt || task.dueDate
              ? new Date(task.dueAt || task.dueDate!).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'short'
                })
              : '—'}
          </div>
        );
      case 'labels':
        return (
          <div className="flex flex-wrap gap-1">
            {task.labels?.slice(0, 3).map((label) => (
              <span key={label} className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-300">
                {label}
              </span>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-neutral-900/50" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 min-w-0 max-w-full">
      {/* Панель инструментов */}
      <ContentBlock size="sm" className="min-w-0 max-w-full">
        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-400">
            Всего задач: <span className="font-semibold text-white">{sortedTasks.length}</span>
          </div>
          <button
            type="button"
            onClick={handleExportCSV}
            className="rounded-lg border border-neutral-800 bg-neutral-900/70 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:border-indigo-500/40 hover:text-white flex-shrink-0"
          >
            Экспорт CSV
          </button>
        </div>
      </ContentBlock>

      {/* Таблица */}
      <div className="w-full min-w-0 max-w-full overflow-hidden">
        <ContentBlock size="sm" className="overflow-x-auto p-0">
          <div ref={parentRef} className="max-h-[600px] overflow-y-auto" style={{ width: tableMinWidth, minWidth: tableMinWidth }}>
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative', width: tableMinWidth }}>
              {/* Заголовки */}
              <div className="sticky top-0 z-10 flex border-b border-neutral-800 bg-neutral-950" style={{ width: tableMinWidth }}>
                {columns.map((column) => (
                  <div
                    key={column.id}
                    style={{ width: column.width, flexShrink: 0 }}
                    className="border-r border-neutral-800 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-400 last:border-r-0"
                  >
                    {column.label}
                  </div>
                ))}
              </div>

              {/* Строки */}
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const task = sortedTasks[virtualRow.index];
                return (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: tableMinWidth,
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`
                    }}
                    className="flex border-b border-neutral-800/50 hover:bg-neutral-900/50"
                  >
                    {columns.map((column) => (
                      <div
                        key={column.id}
                        style={{ width: column.width, flexShrink: 0 }}
                        className="border-r border-neutral-800/50 px-4 py-3 last:border-r-0"
                      >
                        {renderCell(task, column.id)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </ContentBlock>
      </div>
    </div>
  );
}

