'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ContentBlock } from '@/components/ui/content-block';
import { type Project } from '@/types/pm';
import { trackEvent } from '@/lib/telemetry';

type RestoreProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onSuccess?: () => void;
};

export default function RestoreProjectDialog({ open, onOpenChange, project, onSuccess }: RestoreProjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onOpenChange]);

  if (!open) {
    return null;
  }

  const handleRestore = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/pm/projects/${project.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Не удалось восстановить проект');
      }

      // Отправляем аналитику
      trackEvent('pm_project_restored', {
        workspaceId: 'current',
        projectId: project.id,
        userId: 'current',
        source: 'archive_page'
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка при восстановлении проекта');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div style={{ maxWidth: '70vw', width: 'auto' }}>
        <ContentBlock
          as="div"
          className="max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Восстановить проект</h2>
              <p className="text-sm text-neutral-400 mt-1">
            Проект &quot;{project.name}&quot; будет восстановлен и снова станет доступен в списке активных проектов.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300 transition hover:border-neutral-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
              {error}
            </div>
          )}
          <div className="space-y-2 text-sm text-neutral-400">
            <p>
              <span className="font-medium text-neutral-300">Ключ проекта:</span> {project.key}
            </p>
            {project.metrics && (
              <p>
                <span className="font-medium text-neutral-300">Задач:</span> {project.metrics.total || 0}
              </p>
            )}
          </div>
          </div>

          <div className="flex gap-3 pt-6 mt-6 border-t border-neutral-800">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
              className="flex-1 rounded-xl border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleRestore}
            disabled={loading}
              className="flex-1 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Восстановление...' : 'Восстановить'}
          </button>
          </div>
        </ContentBlock>
      </div>
    </div>
  );
}

