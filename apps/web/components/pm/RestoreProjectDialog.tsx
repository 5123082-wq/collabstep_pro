'use client';

import { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalTitle, ModalDescription } from '@/components/ui/modal';
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
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Восстановить проект</ModalTitle>
          <ModalDescription>
            Проект &quot;{project.name}&quot; будет восстановлен и снова станет доступен в списке активных проектов.
          </ModalDescription>
        </ModalHeader>
        <ModalBody>
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
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-2 text-sm font-medium text-white transition hover:border-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleRestore}
            disabled={loading}
            className="rounded-xl border border-indigo-500/40 bg-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:bg-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Восстановление...' : 'Восстановить'}
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

