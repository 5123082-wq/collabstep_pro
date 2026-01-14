'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { type Task, type TaskStatus } from '@/types/pm';
import { type TaskListFilters } from '@/lib/pm/task-filters';
import { cn } from '@/lib/utils';
import { useRouter, usePathname } from 'next/navigation';
import { buildTaskFilterParams } from '@/lib/pm/task-filters';
import { useTransition } from 'react';
import { trackEvent } from '@/lib/telemetry';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { ContentBlock } from '@/components/ui/content-block';
import * as Avatar from '@radix-ui/react-avatar';

const DEFAULT_STATUSES: TaskStatus[] = ['new', 'in_progress', 'review', 'done', 'blocked'];

const STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'Backlog',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
  blocked: 'Blocked'
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'border-rose-500/50 bg-rose-500/10',
  high: 'border-orange-500/50 bg-orange-500/10',
  med: 'border-yellow-500/50 bg-yellow-500/10',
  low: 'border-blue-500/50 bg-blue-500/10'
};

type TaskCardProps = {
  task: Task;
  isDragging?: boolean;
  assignee?: { id: string; name: string; email: string; role: string; avatarUrl?: string };
};

function TaskCard({ task, isDragging, assignee, onOpenDetail, className }: TaskCardProps & { onOpenDetail?: (task: Task) => void; className?: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging: isDraggingState } = useDraggable({
    id: task.id,
    data: { task }
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`
      }
    : undefined;

  const priorityColor = task.priority ? PRIORITY_COLORS[task.priority] : 'border-neutral-800 bg-neutral-900/50';

  const handleClick = (e: React.MouseEvent) => {
    // Не открываем детали при перетаскивании
    if (isDragging || isDraggingState) return;
    e.stopPropagation();
    onOpenDetail?.(task);
  };

  // Отслеживаем, был ли drag, чтобы различать клик и drag
  const dragStarted = useRef(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Обработчик клика на drag handle - открываем детали, если это был клик, а не drag
  const handleDragHandleClick = () => {
    // Если drag уже начался, не обрабатываем клик
    if (dragStarted.current || isDragging || isDraggingState) {
      dragStarted.current = false;
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      return;
    }
    
    // Используем небольшую задержку, чтобы проверить, не начался ли drag
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    
    clickTimeoutRef.current = setTimeout(() => {
      // Если drag не начался, это был клик - открываем детали
      if (!dragStarted.current && !isDragging && !isDraggingState) {
        onOpenDetail?.(task);
      }
      clickTimeoutRef.current = null;
    }, 150);
  };

  // Модифицируем listeners, чтобы отслеживать начало drag
  const modifiedListeners = {
    ...listeners,
    onPointerDown: (e: React.PointerEvent) => {
      dragStarted.current = false;
      // Вызываем оригинальный обработчик
      if (typeof listeners?.onPointerDown === 'function') {
        listeners.onPointerDown(e);
      }
    },
  };

  // Отслеживаем начало drag через isDraggingState
  useEffect(() => {
    if (isDraggingState && !dragStarted.current) {
      dragStarted.current = true;
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
    }
    if (!isDraggingState) {
      dragStarted.current = false;
    }
    
    // Очистка timeout при размонтировании
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
    };
  }, [isDraggingState]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-task-card
      data-task-id={task.id}
      className={cn(
        'relative rounded-xl border p-3 transition-all duration-200 ease-out',
        'hover:border-indigo-500/40 hover:shadow-lg',
        'cursor-pointer block',
        priorityColor,
        (isDragging || isDraggingState) && 'opacity-50 scale-95',
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-2 pointer-events-none">
        <div className="flex-1">
          <div className="text-sm font-medium text-white">{task.title}</div>
          {task.description && (
            <div className="mt-1 text-xs text-neutral-400 line-clamp-2">{task.description}</div>
          )}
        </div>
        {task.priority && (
          <span className="rounded px-1.5 py-0.5 text-xs font-semibold uppercase text-neutral-300">
            {task.priority}
          </span>
        )}
      </div>
      {task.labels && task.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 pointer-events-none">
          {task.labels.slice(0, 3).map((label) => (
            <span key={label} className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-300">
              {label}
            </span>
          ))}
        </div>
      )}
      {task.dueAt && (
        <div className="mt-2 text-xs text-neutral-400 pointer-events-none">
          Due: {new Date(task.dueAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
        </div>
      )}
      {assignee && (
        <div className="mt-2 flex items-center gap-2 pointer-events-none">
          <Avatar.Root className="inline-flex h-6 w-6 select-none items-center justify-center overflow-hidden rounded-full bg-neutral-800 align-middle border-2 border-neutral-700">
            <Avatar.Image
              src={assignee.avatarUrl || ''}
              alt={assignee.name}
              className="h-full w-full rounded-[inherit] object-cover"
            />
            <Avatar.Fallback className="flex h-full w-full items-center justify-center bg-neutral-700 text-xs font-medium text-neutral-300">
              {assignee.name.charAt(0).toUpperCase()}
            </Avatar.Fallback>
          </Avatar.Root>
          <span className="text-xs text-neutral-400 truncate max-w-[100px]">
            {assignee.name}
          </span>
        </div>
      )}
      <div 
        {...attributes} 
        {...modifiedListeners} 
        onClick={handleDragHandleClick}
        className="absolute inset-0 cursor-grab active:cursor-grabbing" 
        aria-label="Перетащить задачу" 
      />
    </div>
  );
}

type StatusColumnProps = {
  status: TaskStatus;
  tasks: Task[];
  isOver?: boolean;
  assigneesMap?: Record<string, { id: string; name: string; email: string; role: string; avatarUrl?: string }>;
};

function StatusColumn({ status, tasks, isOver, assigneesMap, onOpenDetail }: StatusColumnProps & { onOpenDetail?: (task: Task) => void }) {
  const { setNodeRef, isOver: isOverState } = useDroppable({
    id: status,
    data: { status }
  });

  return (
    <ContentBlock
      size="sm"
      ref={setNodeRef}
      className={cn(
        'flex flex-col w-full h-full',
        'transition-all duration-200 ease-out',
        (isOver || isOverState) && 'border-indigo-500/60 bg-indigo-500/10 scale-[1.02]'
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-300">
          {STATUS_LABELS[status]}
        </h3>
        <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs font-medium text-neutral-400">
          {tasks.length}
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto min-h-0">
        {tasks.length > 0 ? (
          tasks.map((task) => {
            const assignee = task.assigneeId && assigneesMap ? assigneesMap[task.assigneeId] : undefined;
            return (
              <TaskCard 
                key={task.id} 
                task={task}
                {...(assignee && { assignee })}
                {...(onOpenDetail && { onOpenDetail })}
              />
            );
          })
        ) : (
          <div className="py-8 text-center text-sm text-neutral-500">Нет задач</div>
        )}
      </div>
    </ContentBlock>
  );
}

type TasksBoardViewProps = {
  tasks: Task[];
  loading?: boolean;
  filters: TaskListFilters;
  onTaskClick?: (task: Task) => void;
};

export default function TasksBoardView({ tasks: initialTasks, loading, filters, onTaskClick }: TasksBoardViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [projectMembers, setProjectMembers] = useState<Array<{ id: string; name: string; email: string; role: string; avatarUrl?: string }>>([]);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Требуем движение мыши на 8px перед началом drag
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Синхронизация с props
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Загрузка участников проекта
  useEffect(() => {
    if (tasks.length > 0 && tasks[0]?.projectId) {
      fetch(`/api/pm/projects/${tasks[0].projectId}/members`)
        .then(res => res.json())
        .then(data => {
          const members = data.data?.members || data.members || [];
          setProjectMembers(members);
        })
        .catch(console.error);
    }
  }, [tasks]);

  // Создание мапы assignees
  const assigneesMap = useMemo(() => {
    const map: Record<string, { id: string; name: string; email: string; role: string; avatarUrl?: string }> = {};
    projectMembers.forEach(member => {
      map[member.id] = member;
    });
    return map;
  }, [projectMembers]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      new: [],
      in_progress: [],
      review: [],
      done: [],
      blocked: []
    };

    for (const task of tasks) {
      if (task.status in grouped) {
        grouped[task.status].push(task);
      }
    }

    return grouped;
  }, [tasks]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      
      // Сразу сбрасываем activeId, чтобы DragOverlay исчез
      setActiveId(null);
      
      if (!over) return;

      const taskId = active.id as string;
      const newStatus = over.id as TaskStatus;

      // Получаем текущую задачу из локального состояния
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.status === newStatus) return;

      // Сохраняем исходную задачу для возможного отката
      const originalTask = { ...task };

      // ОПТИМИСТИЧНОЕ ОБНОВЛЕНИЕ
      const updatedTask = { ...task, status: newStatus };
      setTasks(prevTasks => 
        prevTasks.map(t => t.id === taskId ? updatedTask : t)
      );

      try {
        console.log('[TasksBoard] Sending update request:', { taskId, fromStatus: task.status, toStatus: newStatus });
        trackEvent('pm_task_moved_board', { taskId, fromStatus: task.status, toStatus: newStatus });
        
        const response = await fetch('/api/pm/tasks/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskIds: [taskId],
            updates: { status: newStatus }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[TasksBoard] API Error Response:', response.status, errorText);
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText || 'Unknown error' };
          }
          console.error('[TasksBoard] API Error Data:', errorData);
          throw new Error(errorData.error || `Failed to update task: ${response.status}`);
        }

        const responseData = await response.json();
        console.log('[TasksBoard] API Response:', responseData);
        
        // API возвращает { ok: true, data: { updated: number, tasks: Task[] } }
        const tasks = responseData?.data?.tasks || responseData?.tasks;
        
        if (tasks && Array.isArray(tasks) && tasks.length > 0) {
          const serverTask = tasks[0];
          console.log('[TasksBoard] Updating task from server:', serverTask);
          setTasks(prevTasks => 
            prevTasks.map(t => t.id === taskId ? serverTask : t)
          );
        } else {
          console.warn('[TasksBoard] No tasks in API response, keeping optimistic update. Response:', responseData);
        }

        trackEvent('pm_task_updated', { taskId, status: newStatus });

        // Отправляем событие для обновления списка задач на других страницах
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('task-updated', { 
            detail: { taskId, projectId: originalTask.projectId } 
          }));
        }

        // Обновляем URL для синхронизации
        const params = buildTaskFilterParams(filters);
        startTransition(() => {
          router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
        });
      } catch (error) {
        // ОТКАТ ПРИ ОШИБКЕ
        console.error('[TasksBoard] Error updating task, rolling back:', error);
        setTasks(prevTasks => 
          prevTasks.map(t => t.id === taskId ? originalTask : t)
        );
        // В реальном приложении здесь бы был toast с ошибкой
      }
    },
    [tasks, filters, router, pathname, startTransition]
  );

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  if (loading) {
    return (
      <div className="min-w-0 max-w-full">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 items-start">
          {DEFAULT_STATUSES.map((status) => (
            <div key={status} className="h-96 animate-pulse rounded-2xl bg-neutral-900/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="min-w-0 max-w-full h-[calc(100vh-200px)]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 items-stretch h-full">
          {DEFAULT_STATUSES.map((status) => (
            <StatusColumn 
              key={status} 
              status={status} 
              tasks={tasksByStatus[status]} 
              assigneesMap={assigneesMap}
              {...(onTaskClick && { onOpenDetail: onTaskClick })} 
            />
          ))}
        </div>
      </div>
      <DragOverlay
        className="opacity-90"
        style={{ cursor: 'grabbing' }}
      >
        {activeTask ? (() => {
          const assignee = activeTask.assigneeId ? assigneesMap[activeTask.assigneeId] : undefined;
          return (
            <TaskCard 
              task={activeTask} 
              isDragging
              {...(assignee && { assignee })}
              className="shadow-2xl scale-105"
            />
          );
        })() : null}
      </DragOverlay>
    </DndContext>
  );
}
