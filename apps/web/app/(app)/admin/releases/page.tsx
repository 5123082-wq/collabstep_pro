'use client';

// TODO: Подключить к реальному API когда backend будет готов
// - Создать API endpoints для releases (GET /api/admin/releases, POST /api/admin/releases, PATCH /api/admin/releases/[id])
// - Заменить mockReleases на реальные API вызовы
// - Добавить loading/error states
// - Использовать типы из @collabverse/api

import { useState } from 'react';
import { Calendar, Play, Pause, X } from 'lucide-react';
import { toast } from '@/lib/ui/toast';
import clsx from 'clsx';
import { ContentBlock } from '@/components/ui/content-block';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

interface Release {
  id: string;
  name: string;
  feature: string;
  scheduledAt: string;
  strategy: 'instant' | 'gradual' | 'canary';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  createdBy: string;
}

const mockReleases: Release[] = [
  {
    id: '1',
    name: 'Запуск маркетинговых исследований',
    feature: 'marketing-research',
    scheduledAt: '2025-02-15T10:00:00Z',
    strategy: 'gradual',
    status: 'scheduled',
    createdBy: 'admin-1'
  },
  {
    id: '2',
    name: 'Бета-тест нового канбана',
    feature: 'tasks-kanban',
    scheduledAt: '2025-01-25T09:00:00Z',
    strategy: 'canary',
    status: 'completed',
    createdBy: 'admin-1'
  }
];

export default function AdminReleasesPage() {
  const [releases] = useState<Release[]>(mockReleases);

  const handleCancel = (releaseId: string) => {
    // TODO: Use releaseId when connected to real API
    toast(`Релиз ${releaseId} отменён`, 'info');
  };

  return (
    <div className="admin-page space-y-6">
      <AdminPageHeader
        title="Управление релизами"
        actions={
          <button
            onClick={() => toast('TODO: Создать релиз', 'info')}
            className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/20"
          >
            + Создать релиз
          </button>
        }
      />

      {/* Releases List */}
      <div className="space-y-4">
        {releases.map((release) => (
          <ContentBlock
            key={release.id}
            size="sm"
            interactive
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-cyan-500/20 p-2">
                  <Calendar className="h-5 w-5 text-cyan-100" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-neutral-50">{release.name}</h3>
                    <span
                      className={clsx(
                        'rounded px-2 py-0.5 text-xs font-medium',
                        release.status === 'scheduled'
                          ? 'bg-blue-500/20 text-blue-100'
                          : release.status === 'in_progress'
                            ? 'bg-orange-500/20 text-orange-100'
                            : release.status === 'completed'
                              ? 'bg-green-500/20 text-green-100'
                              : 'bg-neutral-500/20 text-neutral-100'
                      )}
                    >
                      {release.status === 'scheduled'
                        ? 'Запланирован'
                        : release.status === 'in_progress'
                          ? 'В процессе'
                          : release.status === 'completed'
                            ? 'Завершён'
                            : 'Отменён'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-neutral-400">
                    Фича: <span className="font-medium">{release.feature}</span>
                  </p>
                  <div className="mt-4 flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-neutral-500" />
                      <span className="text-neutral-400">
                        {new Date(release.scheduledAt).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div>
                      <span
                        className={clsx(
                          'rounded px-2 py-1 text-xs font-medium',
                          release.strategy === 'instant'
                            ? 'bg-purple-500/20 text-purple-100'
                            : release.strategy === 'gradual'
                              ? 'bg-orange-500/20 text-orange-100'
                              : 'bg-green-500/20 text-green-100'
                        )}
                      >
                        {release.strategy === 'instant'
                          ? 'Мгновенно'
                          : release.strategy === 'gradual'
                            ? 'Постепенно'
                            : 'Canary'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {release.status === 'scheduled' && (
                  <>
                    <button
                      onClick={() => toast('TODO: Запустить релиз', 'info')}
                      className="rounded-xl border border-green-500/40 bg-green-500/10 p-2 text-green-100 transition hover:bg-green-500/20"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleCancel(release.id)}
                      className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-2 text-rose-100 transition hover:bg-rose-500/20"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                )}
                {release.status === 'in_progress' && (
                  <button
                    onClick={() => toast('TODO: Приостановить', 'info')}
                    className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-2 text-orange-100 transition hover:bg-orange-500/20"
                  >
                    <Pause className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </ContentBlock>
        ))}
      </div>

      {releases.length === 0 && (
        <ContentBlock variant="dashed" className="text-center">
          <Calendar className="mx-auto h-12 w-12 text-neutral-700" />
          <p className="mt-4 text-sm text-neutral-400">Нет запланированных релизов</p>
        </ContentBlock>
      )}
    </div>
  );
}
