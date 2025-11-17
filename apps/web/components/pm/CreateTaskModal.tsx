'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalTitle, ModalDescription, ModalClose } from '@/components/ui/modal';
import { toast } from '@/lib/ui/toast';
import { trackEvent } from '@/lib/telemetry';
import TaskAIActions from './TaskAIActions';

type CreateTaskModalProps = {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Низкий' },
  { value: 'med', label: 'Средний' },
  { value: 'high', label: 'Высокий' },
  { value: 'urgent', label: 'Срочный' }
];

const STATUS_OPTIONS = [
  { value: 'new', label: 'Новая' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'review', label: 'На проверке' },
  { value: 'blocked', label: 'Заблокирована' }
];

export default function CreateTaskModal({ projectId, isOpen, onClose, onSuccess }: CreateTaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'new' | 'in_progress' | 'review' | 'done' | 'blocked'>('new');
  const [priority, setPriority] = useState<'low' | 'med' | 'high' | 'urgent'>('med');
  const [dueAt, setDueAt] = useState('');

  useEffect(() => {
    if (!isOpen) {
      // Сбрасываем форму при закрытии
      setTitle('');
      setDescription('');
      setStatus('new');
      setPriority('med');
      setDueAt('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast('Введите название задачи', 'warning');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/pm/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          priority,
          ...(dueAt ? { dueAt } : {})
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create task' }));
        throw new Error(error.error || 'Не удалось создать задачу');
      }

      const data = await response.json();
      
      trackEvent('pm_task_created', {
        workspaceId: 'current',
        projectId,
        taskId: data.task?.id,
        userId: 'current',
        source: 'quick_actions'
      });

      // Отправляем событие для обновления списка задач на других страницах
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('task-created', { 
          detail: { taskId: data.task?.id, projectId } 
        }));
      }

      toast('Задача успешно создана', 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Не удалось создать задачу', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent>
        <ModalClose />
        <ModalHeader>
          <ModalTitle>Создать задачу</ModalTitle>
          <ModalDescription>Добавьте новую задачу в проект</ModalDescription>
        </ModalHeader>
        
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <div className="space-y-4">
              <div>
                <label htmlFor="task-title" className="block text-sm font-medium text-white mb-2">
                  Название задачи <span className="text-rose-400">*</span>
                </label>
                <input
                  id="task-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Введите название задачи"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-white placeholder:text-neutral-500 focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                  autoFocus
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="task-description" className="block text-sm font-medium text-white">
                    Описание
                  </label>
                  {title.trim() && (
                    <TaskAIActions
                      taskId="" // Пустой ID для новой задачи
                      taskTitle={title}
                      projectId={projectId}
                      onDescriptionGenerated={(generatedDescription) => {
                        setDescription(generatedDescription);
                      }}
                      variant="inline"
                      className="scale-90 origin-right"
                    />
                  )}
                </div>
                <textarea
                  id="task-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Добавьте описание задачи (необязательно)"
                  rows={4}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-white placeholder:text-neutral-500 focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="task-status" className="block text-sm font-medium text-white mb-2">
                    Статус
                  </label>
                  <select
                    id="task-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as typeof status)}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-white focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="task-priority" className="block text-sm font-medium text-white mb-2">
                    Приоритет
                  </label>
                  <select
                    id="task-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as typeof priority)}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-white focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="task-due" className="block text-sm font-medium text-white mb-2">
                  Срок выполнения
                </label>
                <input
                  id="task-due"
                  type="date"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-white focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Создание...' : 'Создать задачу'}
            </button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

