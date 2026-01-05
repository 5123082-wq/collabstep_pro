'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, ArrowLeft, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { toast } from '@/lib/ui/toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { ContentBlock } from '@/components/ui/content-block';
import TemplateTaskTree from '@/components/admin/templates/TemplateTaskTree';
import TemplateTaskForm from '@/components/admin/templates/TemplateTaskForm';
import type { ProjectTemplateTask } from '@collabverse/api';

type TaskWithChildren = ProjectTemplateTask & {
  children?: TaskWithChildren[];
};

export default function TemplateTasksPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const [tasks, setTasks] = useState<TaskWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTemplateTask | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/templates/${templateId}/tasks`, {
        cache: 'no-store'
      });
      if (!response.ok) {
        throw new Error('Не удалось загрузить задачи');
      }
      const data = (await response.json()) as { items: TaskWithChildren[] };
      setTasks(data.items);
    } catch (err) {
      console.error('[TemplateTasksPage] Ошибка загрузки:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      toast('Не удалось загрузить задачи', 'warning');
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const handleCreate = () => {
    setEditingTask(null);
    setIsFormOpen(true);
  };

  const handleEdit = (task: ProjectTemplateTask) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleDelete = async (taskId: string) => {
    try {
      const response = await fetch(`/api/admin/templates/${templateId}/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error || 'Не удалось удалить задачу');
      }

      toast('Задача удалена', 'success');
      void loadTasks();
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : 'Не удалось удалить задачу', 'warning');
      throw err;
    }
  };

  const handleSubmit = async (data: {
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
  }) => {
    try {
      const url = editingTask
        ? `/api/admin/templates/${templateId}/tasks/${editingTask.id}`
        : `/api/admin/templates/${templateId}/tasks`;
      const method = editingTask ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error || 'Не удалось сохранить задачу');
      }

      toast(editingTask ? 'Задача обновлена' : 'Задача создана', 'success');
      void loadTasks();
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : 'Не удалось сохранить задачу', 'warning');
      throw err;
    }
  };

  const descendantIds = useMemo(() => {
    if (!editingTask) {
      return new Set<string>();
    }

    const ids = new Set<string>();

    const collectDescendants = (node: TaskWithChildren) => {
      if (!node.children) return;
      for (const child of node.children) {
        ids.add(child.id);
        collectDescendants(child);
      }
    };

    const findTarget = (nodes: TaskWithChildren[]): boolean => {
      for (const node of nodes) {
        if (node.id === editingTask.id) {
          collectDescendants(node);
          return true;
        }
        if (node.children && findTarget(node.children)) {
          return true;
        }
      }
      return false;
    };

    findTarget(tasks);
    return ids;
  }, [editingTask, tasks]);

  // Flatten tasks for parent selection
  const flattenTasks = (tasks: TaskWithChildren[], level = 0): Array<{ id: string; title: string; level: number }> => {
    const result: Array<{ id: string; title: string; level: number }> = [];
    for (const task of tasks) {
      if (editingTask && (task.id === editingTask.id || descendantIds.has(task.id))) {
        continue; // Skip self and descendants
      }
      result.push({ id: task.id, title: task.title, level });
      if (task.children) {
        result.push(...flattenTasks(task.children, level + 1));
      }
    }
    return result;
  };

  return (
    <div className="admin-page space-y-6">
      <AdminPageHeader
        title="Задачи шаблона"
        description="Управление задачами в шаблоне проекта"
        actions={
          <>
            <button
              onClick={() => router.push('/admin/templates')}
              className="flex items-center gap-2 rounded-xl border border-neutral-700/50 bg-neutral-800/50 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-neutral-600 hover:bg-neutral-700/50"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад
            </button>
            <button
              onClick={() => void loadTasks()}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-neutral-700/50 bg-neutral-800/50 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-neutral-600 hover:bg-neutral-700/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
              Обновить
            </button>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/20"
            >
              <Plus className="h-4 w-4" />
              Добавить задачу
            </button>
          </>
        }
      />

      {loading && (
        <ContentBlock variant="dashed" className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-neutral-500 border-r-transparent"></div>
          <p className="mt-4 text-sm text-neutral-400">Загрузка задач...</p>
        </ContentBlock>
      )}

      {error && !loading && (
        <ContentBlock variant="error">
          <p className="text-sm text-rose-100">{error}</p>
          <button
            onClick={() => void loadTasks()}
            className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/20 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/30"
          >
            Повторить попытку
          </button>
        </ContentBlock>
      )}

      {!loading && !error && (
        <ContentBlock>
          <TemplateTaskTree tasks={tasks} onEdit={handleEdit} onDelete={handleDelete} />
        </ContentBlock>
      )}

      <TemplateTaskForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleSubmit}
        task={editingTask}
        availableParentTasks={flattenTasks(tasks)}
      />
    </div>
  );
}
