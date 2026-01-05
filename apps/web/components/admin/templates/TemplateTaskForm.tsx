'use client';

import { useState, useEffect } from 'react';
import clsx from 'clsx';
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle
} from '@/components/ui/modal';
import type { ProjectTemplateTask } from '@collabverse/api';

type TemplateTaskFormProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    parentTaskId?: string | null;
    defaultStatus: 'new' | 'in_progress' | 'review' | 'done' | 'blocked';
    defaultPriority?: 'low' | 'med' | 'high' | 'urgent';
    defaultLabels?: string[];
    offsetStartDays: number;
    offsetDueDays?: number;
    estimatedTime?: number | null;
    storyPoints?: number | null;
  }) => Promise<void>;
  task?: ProjectTemplateTask | null;
  availableParentTasks?: Array<{ id: string; title: string; level: number }>;
};

export default function TemplateTaskForm({
  open,
  onClose,
  onSubmit,
  task,
  availableParentTasks = []
}: TemplateTaskFormProps) {
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    parentTaskId: string;
    defaultStatus: 'new' | 'in_progress' | 'review' | 'done' | 'blocked';
    defaultPriority: string;
    defaultLabels: string;
    offsetStartDays: number;
    offsetDueDays: string;
    estimatedTime: string;
    storyPoints: string;
  }>({
    title: '',
    description: '',
    parentTaskId: '',
    defaultStatus: 'new',
    defaultPriority: '',
    defaultLabels: '',
    offsetStartDays: 0,
    offsetDueDays: '',
    estimatedTime: '',
    storyPoints: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        parentTaskId: task.parentTaskId || '',
        defaultStatus: task.defaultStatus,
        defaultPriority: task.defaultPriority || '',
        defaultLabels: task.defaultLabels?.join(', ') || '',
        offsetStartDays: task.offsetStartDays,
        offsetDueDays: task.offsetDueDays?.toString() || '',
        estimatedTime: task.estimatedTime?.toString() || '',
        storyPoints: task.storyPoints?.toString() || ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        parentTaskId: '',
        defaultStatus: 'new',
        defaultPriority: '',
        defaultLabels: '',
        offsetStartDays: 0,
        offsetDueDays: '',
        estimatedTime: '',
        storyPoints: ''
      });
    }
  }, [task, open]);

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: formData.title,
        ...(formData.description && { description: formData.description }),
        ...(formData.parentTaskId ? { parentTaskId: formData.parentTaskId || null } : {}),
        defaultStatus: formData.defaultStatus,
        ...(formData.defaultPriority && { defaultPriority: formData.defaultPriority as 'low' | 'med' | 'high' | 'urgent' }),
        ...(formData.defaultLabels && {
          defaultLabels: formData.defaultLabels.split(',').map((l) => l.trim()).filter(Boolean)
        }),
        offsetStartDays: formData.offsetStartDays,
        ...(formData.offsetDueDays && { offsetDueDays: parseInt(formData.offsetDueDays, 10) }),
        ...(formData.estimatedTime && { estimatedTime: parseInt(formData.estimatedTime, 10) }),
        ...(formData.storyPoints && { storyPoints: parseInt(formData.storyPoints, 10) })
      });
      onClose();
    } catch (error) {
      console.error('Error submitting task:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onClose}>
      <ModalContent className="max-w-2xl">
        <ModalHeader>
          <ModalTitle>{task ? 'Редактировать задачу' : 'Создать задачу'}</ModalTitle>
          <ModalDescription>
            {task
              ? 'Измените данные задачи шаблона.'
              : 'Создайте новую задачу для шаблона проекта.'}
          </ModalDescription>
          <ModalClose />
        </ModalHeader>

        <ModalBody className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="task-title" className="text-sm font-medium text-neutral-200">
              Название *
            </label>
            <input
              id="task-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Название задачи"
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm text-neutral-100 placeholder-neutral-500 transition focus:border-indigo-500 focus:outline-none"
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="task-description" className="text-sm font-medium text-neutral-200">
              Описание
            </label>
            <textarea
              id="task-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Описание задачи"
              rows={4}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm text-neutral-100 placeholder-neutral-500 transition focus:border-indigo-500 focus:outline-none resize-none"
              maxLength={5000}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="task-status" className="text-sm font-medium text-neutral-200">
                Статус по умолчанию
              </label>
              <select
                id="task-status"
                value={formData.defaultStatus}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultStatus: e.target.value as typeof formData.defaultStatus
                  })
                }
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm text-neutral-100 transition focus:border-indigo-500 focus:outline-none"
              >
                <option value="new">Новая</option>
                <option value="in_progress">В работе</option>
                <option value="review">На проверке</option>
                <option value="done">Выполнена</option>
                <option value="blocked">Заблокирована</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="task-priority" className="text-sm font-medium text-neutral-200">
                Приоритет
              </label>
              <select
                id="task-priority"
                value={formData.defaultPriority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultPriority: e.target.value as typeof formData.defaultPriority
                  })
                }
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm text-neutral-100 transition focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Не выбран</option>
                <option value="low">Низкий</option>
                <option value="med">Средний</option>
                <option value="high">Высокий</option>
                <option value="urgent">Срочный</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="task-parent" className="text-sm font-medium text-neutral-200">
              Родительская задача
            </label>
            <select
              id="task-parent"
              value={formData.parentTaskId}
              onChange={(e) => setFormData({ ...formData, parentTaskId: e.target.value })}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm text-neutral-100 transition focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Нет (корневая задача)</option>
              {availableParentTasks.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {'  '.repeat(parent.level)}
                  {parent.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="task-labels" className="text-sm font-medium text-neutral-200">
              Метки (через запятую)
            </label>
            <input
              id="task-labels"
              type="text"
              value={formData.defaultLabels}
              onChange={(e) => setFormData({ ...formData, defaultLabels: e.target.value })}
              placeholder="research, naming, design"
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm text-neutral-100 placeholder-neutral-500 transition focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="task-start-days" className="text-sm font-medium text-neutral-200">
                Смещение старта (дни)
              </label>
              <input
                id="task-start-days"
                type="number"
                min="0"
                value={formData.offsetStartDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    offsetStartDays: parseInt(e.target.value, 10) || 0
                  })
                }
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm text-neutral-100 transition focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="task-due-days" className="text-sm font-medium text-neutral-200">
                Смещение дедлайна (дни)
              </label>
              <input
                id="task-due-days"
                type="number"
                min="0"
                value={formData.offsetDueDays}
                onChange={(e) => setFormData({ ...formData, offsetDueDays: e.target.value })}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm text-neutral-100 transition focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-neutral-900 bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-300 transition hover:border-indigo-500/40 hover:text-white"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || !formData.title.trim()}
            className={clsx(
              'rounded-xl border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition',
              submitting || !formData.title.trim()
                ? 'border-neutral-900 bg-neutral-950/60 text-neutral-600 cursor-not-allowed'
                : 'border-indigo-500/50 bg-indigo-500/15 text-indigo-100 hover:border-indigo-400 hover:bg-indigo-500/25'
            )}
          >
            {submitting ? 'Сохранение...' : task ? 'Сохранить' : 'Создать'}
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

