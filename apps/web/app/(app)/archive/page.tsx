'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { OrganizationArchive } from '@collabverse/api';
import { formatClosedDate, formatExpiresDate, getTimeUntilDeletion, getExpiryColor } from '@/lib/utils/archive-utils';
import { cn } from '@/lib/utils';
import { Clock, FileText, Users } from 'lucide-react';
// @ts-expect-error lucide-react icon types - these icons exist but types are incomplete
import { Archive, Folder, Download } from 'lucide-react';

export default function ArchivesPage() {
  const [archives, setArchives] = useState<OrganizationArchive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadArchives() {
      try {
        setLoading(true);
        const response = await fetch('/api/archives');
        if (!response.ok) {
          throw new Error('Не удалось загрузить архивы');
        }
        const data = await response.json();
        setArchives(data.archives || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }
    }

    void loadArchives();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-xl font-semibold text-white">Архивы организаций</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Просмотр архивов закрытых организаций
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900/50"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-xl font-semibold text-white">Архивы организаций</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Просмотр архивов закрытых организаций
          </p>
        </header>

        <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-100">
          <p>Не удалось загрузить архивы. Попробуйте обновить страницу.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/20 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/30"
          >
            Обновить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-white">Архивы организаций</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Просмотр архивов закрытых организаций. Архивы хранятся 30 дней и затем автоматически удаляются.
        </p>
      </header>

      {archives.length === 0 ? (
        <div className="rounded-3xl border border-neutral-900 bg-neutral-950/60 p-12 text-center">
          <Archive className="mx-auto h-12 w-12 text-neutral-600" />
          <p className="mt-4 text-neutral-400">У вас нет архивов организаций</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {archives.map((archive) => (
            <Link
              key={archive.id}
              href={`/archive/${archive.id}`}
              className="group relative block rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 transition hover:border-indigo-500/40 hover:bg-neutral-900/70"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white group-hover:text-indigo-100 transition">
                    {archive.organizationName}
                  </h3>
                  <p className="mt-1 text-xs text-neutral-400">
                    Закрыта {formatClosedDate(archive.closedAt)}
                  </p>
                </div>
                <Archive className="h-5 w-5 text-neutral-600 flex-shrink-0" />
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <Folder className="h-4 w-4" />
                  <span>{archive.snapshot.projectsCount} проектов</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <FileText className="h-4 w-4" />
                  <span>{archive.snapshot.documentsCount} документов</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <Users className="h-4 w-4" />
                  <span>{archive.snapshot.membersCount} участников</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className={cn('h-4 w-4', getExpiryColor(archive.expiresAt))} />
                  <span className={cn('text-xs font-medium', getExpiryColor(archive.expiresAt))}>
                    {getTimeUntilDeletion(archive.expiresAt)}
                  </span>
                </div>
                <div className="text-xs text-neutral-500">
                  До {formatExpiresDate(archive.expiresAt)}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-neutral-800">
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>Статус: {archive.status === 'active' ? 'Активен' : 'Истёк'}</span>
                  <span className="flex items-center gap-1 text-indigo-400 group-hover:text-indigo-300 transition">
                    Открыть
                    <Download className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
