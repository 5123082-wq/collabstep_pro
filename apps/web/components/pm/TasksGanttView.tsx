'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { toast } from '@/lib/ui/toast';
import type { Task, TaskDependency } from '@collabverse/api';
import {
  type GanttTask,
  type GanttLink,
} from '@/lib/pm/gantt-utils';

type TasksGanttViewProps = {
  projectId: string;
  tasks: Task[];
};

type Scale = 'day' | 'week' | 'month';

export default function TasksGanttView({ projectId, tasks }: TasksGanttViewProps) {
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [scale, setScale] = useState<Scale>('week');
  const [loading, setLoading] = useState(true);
  const [criticalPath, setCriticalPath] = useState<string[]>([]);
  const [ganttTasks, setGanttTasks] = useState<GanttTask[]>([]);
  const [ganttLinks, setGanttLinks] = useState<GanttLink[]>([]);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartDate, setDragStartDate] = useState<Date | null>(null);

  // Загрузка зависимостей для всех задач
  const loadDependencies = useCallback(async () => {
    try {
      setLoading(true);
      // Загрузить зависимости для всех задач проекта
      const allDependencies: TaskDependency[] = [];
      
      for (const task of tasks) {
        try {
          const response = await fetch(`/api/pm/tasks/${task.id}/dependencies`);
          if (response.ok) {
            const data = await response.json();
            if (data.ok && data.data?.dependencies) {
              allDependencies.push(...data.data.dependencies);
            }
          }
        } catch (error) {
          console.error(`Failed to load dependencies for task ${task.id}:`, error);
        }
      }
      
      // Удалить дубликаты
      const uniqueDependencies = Array.from(
        new Map(allDependencies.map((dep) => [dep.id, dep])).values()
      );
      
      setDependencies(uniqueDependencies);
    } catch (error) {
      console.error('Failed to load dependencies:', error);
      toast('Не удалось загрузить зависимости задач', 'warning');
    } finally {
      setLoading(false);
    }
  }, [tasks]);

  useEffect(() => {
    void loadDependencies();
  }, [projectId, loadDependencies]);

  // Фильтрация задач
  const filteredTasks = ganttTasks.filter((task) => {
    const originalTask = tasks.find((t) => t.id === task.id);
    if (!originalTask) return false;
    
    if (filterStatus && originalTask.status !== filterStatus) {
      return false;
    }
    
    if (filterAssignee && originalTask.assigneeId !== filterAssignee) {
      return false;
    }
    
    return true;
  });

  // Вычисление временного диапазона
  const getDateRange = () => {
    if (filteredTasks.length === 0) {
      return { start: new Date(), end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
    }

    let minDate = new Date(filteredTasks[0].start_date);
    let maxDate = new Date(filteredTasks[0].end_date);

    for (const task of filteredTasks) {
      const start = new Date(task.start_date);
      const end = new Date(task.end_date);
      if (start < minDate) minDate = start;
      if (end > maxDate) maxDate = end;
    }

    // Добавить небольшой отступ
    minDate = new Date(minDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    maxDate = new Date(maxDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    return { start: minDate, end: maxDate };
  };

  const { start: rangeStart, end: rangeEnd } = getDateRange();

  // Вычисление позиций и размеров для SVG
  const getDatePosition = (date: Date): number => {
    const totalDays = (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24);
    const daysFromStart = (date.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24);
    return (daysFromStart / totalDays) * 100;
  };

  const getTaskWidth = (task: GanttTask): number => {
    const start = new Date(task.start_date);
    const end = new Date(task.end_date);
    const totalDays = (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24);
    const taskDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(2, (taskDays / totalDays) * 100);
  };

  // Обработка перетаскивания задачи
  const handleTaskMouseDown = (taskId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const task = ganttTasks.find((t) => t.id === taskId);
    if (!task || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    // Сохраняем начальную позицию относительно контейнера (вычитаем ширину колонки задач)
    const startX = event.clientX - containerRect.left - 192;
    
    setDraggedTaskId(taskId);
    setDragStartX(startX);
    setDragStartDate(new Date(task.start_date));
  };

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!draggedTaskId || !dragStartDate || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const currentX = event.clientX - containerRect.left - 192; // Вычитаем ширину колонки задач
      const width = containerRect.width - 192; // Ширина области временной шкалы
      const totalDays = (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24);
      const daysPerPixel = totalDays / width;
      const deltaDays = (currentX - dragStartX) * daysPerPixel;
      const newStartDate = new Date(dragStartDate.getTime() + deltaDays * 24 * 60 * 60 * 1000);

      // Ограничиваем дату диапазоном
      if (newStartDate < rangeStart) {
        newStartDate.setTime(rangeStart.getTime());
      }
      if (newStartDate > rangeEnd) {
        newStartDate.setTime(rangeEnd.getTime());
      }

      // Обновить позицию задачи визуально
      setGanttTasks((prev) =>
        prev.map((t) => {
          if (t.id === draggedTaskId) {
            const duration = (new Date(t.end_date).getTime() - new Date(t.start_date).getTime()) / (1000 * 60 * 60 * 24);
            const newEndDate = new Date(newStartDate.getTime() + duration * 24 * 60 * 60 * 1000);
            
            return {
              ...t,
              start_date: newStartDate.toISOString().split('T')[0],
              end_date: newEndDate.toISOString().split('T')[0],
            };
          }
          return t;
        })
      );
    },
    [draggedTaskId, dragStartX, dragStartDate, rangeStart, rangeEnd]
  );

  const handleMouseUp = useCallback(async () => {
    if (!draggedTaskId) return;

    const task = ganttTasks.find((t) => t.id === draggedTaskId);
    if (!task) {
      // Сброс состояния если задача не найдена
      setDraggedTaskId(null);
      setDragStartX(0);
      setDragStartDate(null);
      return;
    }

    // Проверяем валидность дат
    const startDate = task.start_date;
    const endDate = task.end_date;
    
    if (!startDate || !endDate) {
      toast('Не удалось обновить задачу: отсутствуют даты', 'warning');
      setDraggedTaskId(null);
      setDragStartX(0);
      setDragStartDate(null);
      return;
    }

    // Проверяем, что дата окончания не раньше даты начала
    if (new Date(endDate) < new Date(startDate)) {
      toast('Дата окончания не может быть раньше даты начала', 'warning');
      // Восстанавливаем исходное состояние
      await loadDependencies();
      setDraggedTaskId(null);
      setDragStartX(0);
      setDragStartDate(null);
      return;
    }

    try {
      // Обновить задачу через API (используем bulk endpoint)
      const requestBody = {
        taskIds: [draggedTaskId],
        updates: {
          startAt: startDate, // Формат "YYYY-MM-DD" должен работать
          dueAt: endDate,      // Формат "YYYY-MM-DD" должен работать
        },
      };
      
      console.log('[Gantt] Sending update request:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch('/api/pm/tasks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Получаем детали ошибки
        const errorText = await response.text();
        console.error('[Gantt] API Error Response:', response.status, errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Unknown error' };
        }
        console.error('[Gantt] API Error Data:', errorData);
        throw new Error(errorData.error || `Failed to update task: ${response.status}`);
      }

      const result = await response.json();
      if (result.ok) {
        toast('Сроки задачи обновлены', 'success');
        // Перезагрузить зависимости для обновления критического пути
        await loadDependencies();
      } else {
        throw new Error(result.error || 'Failed to update task');
      }
    } catch (error) {
      console.error('Failed to update task:', error);
      toast(
        error instanceof Error ? error.message : 'Не удалось обновить сроки задачи',
        'warning'
      );
      // Перезагрузить задачи для восстановления правильного состояния
      await loadDependencies();
    } finally {
      setDraggedTaskId(null);
      setDragStartX(0);
      setDragStartDate(null);
    }
  }, [draggedTaskId, ganttTasks, loadDependencies]);

  useEffect(() => {
    if (draggedTaskId) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedTaskId, handleMouseMove, handleMouseUp]);

  // Генерация временной шкалы
  const generateTimeScale = () => {
    const timeScaleItems: Array<{ date: Date; label: string }> = [];
    const current = new Date(rangeStart);
    
    while (current <= rangeEnd) {
      timeScaleItems.push({
        date: new Date(current),
        label: current.toLocaleDateString('ru-RU', {
          month: 'short',
          day: 'numeric',
        }),
      });
      
      if (scale === 'day') {
        current.setDate(current.getDate() + 1);
      } else if (scale === 'week') {
        current.setDate(current.getDate() + 7);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
    }
    
    return timeScaleItems;
  };

  const timeScale = generateTimeScale();

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-800 border-t-indigo-500" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-8 text-center text-neutral-400">
        <p>Нет задач для отображения на диаграмме Ганта</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Контролы */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-neutral-300">Масштаб:</label>
          <select
            value={scale}
            onChange={(e) => setScale(e.target.value as Scale)}
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-white"
          >
            <option value="day">Дни</option>
            <option value="week">Недели</option>
            <option value="month">Месяцы</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-neutral-300">Статус:</label>
          <select
            value={filterStatus || ''}
            onChange={(e) => setFilterStatus(e.target.value || null)}
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-white"
          >
            <option value="">Все</option>
            <option value="new">Новая</option>
            <option value="in_progress">В работе</option>
            <option value="review">На проверке</option>
            <option value="done">Выполнена</option>
            <option value="blocked">Заблокирована</option>
          </select>
        </div>

        {criticalPath.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-neutral-300">
            <span className="h-4 w-4 rounded bg-rose-500" />
            <span>Критический путь ({criticalPath.length} задач)</span>
          </div>
        )}
      </div>

      {/* Диаграмма Ганта */}
      <div
        ref={containerRef}
        className="overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-900/60"
      >
        <div className="min-w-full">
          {/* Временная шкала */}
          <div className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-900">
            <div className="flex">
              <div className="w-48 border-r border-neutral-800 p-2 text-sm font-medium text-neutral-300">
                Задача
              </div>
              <div className="flex-1">
                <div className="flex">
                  {timeScale.map((item, idx) => (
                    <div
                      key={idx}
                      className="border-r border-neutral-800 p-2 text-xs text-neutral-400"
                      style={{ minWidth: `${100 / timeScale.length}%` }}
                    >
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Задачи */}
          <div className="relative">
            {/* Стрелки зависимостей */}
            {ganttLinks.length > 0 && containerRef.current && (
              <svg
                ref={svgRef}
                className="pointer-events-none absolute left-0 top-0 z-0"
                style={{
                  width: '100%',
                  height: `${filteredTasks.length * 48}px`,
                  marginLeft: '192px', // Ширина колонки с названиями задач
                }}
              >
                {ganttLinks.map((link) => {
                  const sourceTask = filteredTasks.find((t) => t.id === link.source);
                  const targetTask = filteredTasks.find((t) => t.id === link.target);
                  
                  if (!sourceTask || !targetTask) return null;

                  const sourceLeft = getDatePosition(new Date(sourceTask.end_date));
                  const targetLeft = getDatePosition(new Date(targetTask.start_date));
                  const sourceIdx = filteredTasks.findIndex((t) => t.id === link.source);
                  const targetIdx = filteredTasks.findIndex((t) => t.id === link.target);

                  if (sourceIdx === -1 || targetIdx === -1) return null;

                  const containerWidth = containerRef.current!.clientWidth - 192; // Минус ширина колонки задач
                  const y1 = sourceIdx * 48 + 24;
                  const y2 = targetIdx * 48 + 24;
                  const x1 = (sourceLeft / 100) * containerWidth;
                  const x2 = (targetLeft / 100) * containerWidth;

                  const isCritical = criticalPath.includes(link.source) && criticalPath.includes(link.target);

                  return (
                    <g key={link.id}>
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={isCritical ? '#ef4444' : '#6366f1'}
                        strokeWidth={isCritical ? '3' : '2'}
                        markerEnd="url(#arrowhead)"
                      />
                    </g>
                  );
                })}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill="#6366f1" />
                  </marker>
                </defs>
              </svg>
            )}

            {filteredTasks.map((task, idx) => {
              const originalTask = tasks.find((t) => t.id === task.id);
              const isCritical = criticalPath.includes(task.id);
              const left = getDatePosition(new Date(task.start_date));
              const width = getTaskWidth(task);

              return (
                <div
                  key={task.id}
                  className="relative z-10 flex border-b border-neutral-800 hover:bg-neutral-800/30"
                  style={{ height: '48px' }}
                >
                  <div className="w-48 border-r border-neutral-800 p-2 text-sm text-neutral-300">
                    <div className="truncate font-medium">{task.text}</div>
                    <div className="text-xs text-neutral-500">
                      {originalTask?.status || 'new'}
                    </div>
                  </div>
                  <div className="relative flex-1">
                    <div
                      className={`absolute top-2 h-8 rounded cursor-move transition-opacity select-none ${
                        isCritical ? 'bg-rose-500' : 'bg-indigo-500'
                      } ${draggedTaskId === task.id ? 'opacity-50' : 'opacity-100'}`}
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        minWidth: '4px',
                        userSelect: 'none', // Предотвращаем выделение текста
                      }}
                      onMouseDown={(e) => handleTaskMouseDown(task.id, e)}
                      title={`${task.text} (${task.start_date} - ${task.end_date})`}
                    >
                      {width > 5 && (
                        <div className="flex h-full items-center px-2 text-xs text-white">
                          {task.text}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

