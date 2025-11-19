'use client';

import { useState } from 'react';
// @ts-ignore
import { Archive, DollarSign, Plus, Store, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type Project } from '@/types/pm';
import { trackEvent } from '@/lib/telemetry';

type QuickActionsProps = {
  project: Project;
  onTaskCreate?: () => void;
  onInvite?: () => void;
  onExpenseCreate?: () => void;
  onMarketplacePublish?: () => void;
  onArchive?: () => void;
};

export default function QuickActions({
  project,
  onTaskCreate,
  onInvite,
  onExpenseCreate,
  onMarketplacePublish,
  onArchive
}: QuickActionsProps) {
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);
  const handleTaskCreate = () => {
    trackEvent('pm_project_action', {
      workspaceId: 'current',
      projectId: project.id,
      userId: 'current',
      action: 'create_task',
      source: 'quick_actions'
    });
    onTaskCreate?.();
  };

  const handleInvite = () => {
    trackEvent('pm_project_action', {
      workspaceId: 'current',
      projectId: project.id,
      userId: 'current',
      action: 'invite',
      source: 'quick_actions'
    });
    onInvite?.();
  };

  const handleExpenseCreate = () => {
    trackEvent('pm_project_action', {
      workspaceId: 'current',
      projectId: project.id,
      userId: 'current',
      action: 'create_expense',
      source: 'quick_actions'
    });
    onExpenseCreate?.();
  };

  const handleMarketplacePublish = () => {
    trackEvent('pm_publish_started', {
      workspaceId: 'current',
      projectId: project.id,
      userId: 'current',
      source: 'quick_actions'
    });
    onMarketplacePublish?.();
  };

  const handleArchive = async () => {
    // Проверяем оба формата статуса (uppercase и lowercase)
    if ((project.status as string) === 'ARCHIVED' || (project.status as string) === 'archived' || archiving) {
      return;
    }

    if (!confirm(`Вы уверены, что хотите архивировать проект "${project.name}"?`)) {
      return;
    }

    try {
      setArchiving(true);
      const response = await fetch(`/api/pm/projects/${project.id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Не удалось архивировать проект');
      }

      trackEvent('pm_project_archived', {
        workspaceId: 'current',
        projectId: project.id,
        userId: 'current',
        source: 'quick_actions'
      });

      onArchive?.();
      // Перенаправляем на страницу архива
      router.push('/pm/archive');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Произошла ошибка при архивировании проекта');
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={handleTaskCreate}
        className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-2 text-sm font-medium text-white transition hover:border-indigo-500/40 hover:bg-indigo-500/10"
      >
        <Plus className="h-4 w-4" />
        Новая задача
      </button>

      <button
        type="button"
        onClick={handleInvite}
        className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-2 text-sm font-medium text-white transition hover:border-indigo-500/40 hover:bg-indigo-500/10"
      >
        <UserPlus className="h-4 w-4" />
        Пригласить
      </button>

      <button
        type="button"
        onClick={handleExpenseCreate}
        className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-2 text-sm font-medium text-white transition hover:border-indigo-500/40 hover:bg-indigo-500/10"
      >
        <DollarSign className="h-4 w-4" />
        Создать трату
      </button>

      <button
        type="button"
        onClick={handleMarketplacePublish}
        className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-2 text-sm font-medium text-white transition hover:border-indigo-500/40 hover:bg-indigo-500/10"
      >
        <Store className="h-4 w-4" />
        Выставить в маркетплейс
      </button>

      {(project.status as string) !== 'ARCHIVED' && (project.status as string) !== 'archived' && (
        <button
          type="button"
          onClick={handleArchive}
          disabled={archiving}
          className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-2 text-sm font-medium text-white transition hover:border-amber-500/40 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Archive className="h-4 w-4" />
          {archiving ? 'Архивирование...' : 'Архивировать'}
        </button>
      )}
    </div>
  );
}

