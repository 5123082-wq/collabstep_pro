'use client';

import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ContentBlock } from '@/components/ui/content-block';
import TaskComments from './TaskComments';
import type { Task } from '@/types/pm';

type TaskDetailDrawerProps = {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  currentUserId: string;
};

export default function TaskDetailDrawer({
  task,
  open,
  onClose,
  currentUserId
}: TaskDetailDrawerProps) {
  const [rightPadding, setRightPadding] = useState<string>('88px');

  useEffect(() => {
    const calculateRightPadding = () => {
      if (typeof window !== 'undefined') {
        const root = document.documentElement;
        const padding = getComputedStyle(root).getPropertyValue('--content-inline-padding').trim();
        
        if (padding) {
          // Конвертируем в px для сравнения
          let paddingPx: number;
          if (padding.includes('rem')) {
            paddingPx = parseFloat(padding) * 16; // 1rem = 16px
          } else if (padding.includes('px')) {
            paddingPx = parseFloat(padding);
          } else {
            paddingPx = parseFloat(padding); // предполагаем px
          }
          
          // Используем max(padding, 88px) как у основного контента
          const finalPadding = Math.max(paddingPx, 88);
          setRightPadding(`${finalPadding}px`);
        } else {
          setRightPadding('88px');
        }
      }
    };

    calculateRightPadding();
    window.addEventListener('resize', calculateRightPadding);
    
    // Отслеживаем изменения медиа-запросов
    const mq1024 = window.matchMedia('(min-width: 1024px)');
    const mq1280 = window.matchMedia('(min-width: 1280px)');
    
    const handleMediaChange = () => {
      setTimeout(calculateRightPadding, 10);
    };
    
    mq1024.addEventListener('change', handleMediaChange);
    mq1280.addEventListener('change', handleMediaChange);
    
    return () => {
      window.removeEventListener('resize', calculateRightPadding);
      mq1024.removeEventListener('change', handleMediaChange);
      mq1280.removeEventListener('change', handleMediaChange);
    };
  }, []);

  if (!task) {
    return null;
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const STATUS_LABELS: Record<string, string> = {
    new: 'Backlog',
    in_progress: 'В работе',
    review: 'На проверке',
    done: 'Готово',
    blocked: 'Заблокировано'
  };

  const PRIORITY_LABELS: Record<string, string> = {
    low: 'Низкий',
    med: 'Средний',
    high: 'Высокий',
    urgent: 'Срочный'
  };

  // Отступ справа = max(contentPadding, 88px) как у основного контента
  const sheetStyles = {
    width: `calc(100% - ${rightPadding})`,
    maxWidth: 'none',
    right: rightPadding
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent 
        side="right" 
        className="flex h-full flex-col bg-neutral-950/95"
        style={sheetStyles}
      >
        <SheetHeader className="space-y-2 px-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-xl">{task.title}</SheetTitle>
              {task.description && (
                <p className="mt-2 text-sm text-neutral-400">{task.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-4 rounded-full border border-neutral-800 px-2 py-1 text-xs text-neutral-400 transition hover:border-neutral-700 hover:text-white"
            >
              ×
            </button>
          </div>
        </SheetHeader>

        <div className="mt-6 flex-1 overflow-y-auto space-y-6 px-6 pr-2">
          {/* Метаданные задачи */}
          <ContentBlock size="sm" className="grid grid-cols-4 gap-4 p-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Статус</div>
              <div className="mt-1 text-sm text-white">{STATUS_LABELS[task.status] || task.status}</div>
            </div>
            {task.priority && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Приоритет</div>
                <div className="mt-1 text-sm text-white">{PRIORITY_LABELS[task.priority] || task.priority}</div>
              </div>
            )}
            {task.startDate && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Начало</div>
                <div className="mt-1 text-sm text-white">{formatDate(task.startDate)}</div>
              </div>
            )}
            {task.dueAt && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Дедлайн</div>
                <div className="mt-1 text-sm text-white">{formatDate(task.dueAt)}</div>
              </div>
            )}
            {task.labels && task.labels.length > 0 && (
              <div className="col-span-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">Метки</div>
                <div className="flex flex-wrap gap-2">
                  {task.labels.map((label) => (
                    <span
                      key={label}
                      className="rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-300"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </ContentBlock>

          {/* Комментарии */}
          <ContentBlock size="sm">
            <TaskComments
              taskId={task.id}
              projectId={task.projectId}
              currentUserId={currentUserId}
            />
          </ContentBlock>
        </div>
      </SheetContent>
    </Sheet>
  );
}

