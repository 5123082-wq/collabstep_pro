'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { OrganizationArchive, ArchivedDocument } from '@collabverse/api';
import { ArchivedDocumentsList } from '@/components/organizations/archives/ArchivedDocumentsList';
import {
  formatClosedDate,
  formatExpiresDate,
  getTimeUntilDeletion,
  getExpiryColor,
  formatFileSize,
} from '@/lib/utils/archive-utils';
import { cn } from '@/lib/utils';
import {
  Clock,
  FileText,
  Users,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
// @ts-expect-error lucide-react icon types - these icons exist but types are incomplete
import { Archive, Folder, Download, HardDrive } from 'lucide-react';

export default function ArchiveDetailsPage() {
  const params = useParams();
  const archiveId = params.archiveId as string;

  const [archive, setArchive] = useState<OrganizationArchive | null>(null);
  const [documents, setDocuments] = useState<ArchivedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function loadArchive() {
      try {
        setLoading(true);
        const response = await fetch(`/api/archives/${archiveId}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Архив не найден или истёк');
          }
          if (response.status === 403) {
            throw new Error('У вас нет доступа к этому архиву');
          }
          throw new Error('Не удалось загрузить архив');
        }
        const data = await response.json();
        setArchive(data.archive);
        setDocuments(data.documents || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }
    }

    if (archiveId) {
      void loadArchive();
    }
  }, [archiveId]);

  const handleDownloadAll = async () => {
    if (!archive) return;

    try {
      setDownloading(true);
      const response = await fetch(`/api/archives/${archiveId}/download`);
      if (!response.ok) {
        throw new Error('Не удалось скачать архив');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `archive-${archiveId}-documents.zip`;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading archive:', error);
      alert('Не удалось скачать архив');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-neutral-800" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-48 animate-pulse rounded bg-neutral-800" />
            <div className="h-4 w-32 animate-pulse rounded bg-neutral-800" />
          </div>
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-neutral-900/50" />
      </div>
    );
  }

  if (error || !archive) {
    return (
      <div className="space-y-6">
        <Link
          href="/archive"
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к списку архивов
        </Link>

        <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-100">
          <p>{error || 'Архив не найден'}</p>
          <Link
            href="/archive"
            className="mt-4 inline-block rounded-xl border border-rose-500/40 bg-rose-500/20 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/30"
          >
            Вернуться к списку архивов
          </Link>
        </div>
      </div>
    );
  }

  const totalSize = documents.reduce((sum, doc) => sum + doc.fileSizeBytes, 0);

  return (
    <div className="space-y-6">
      {/* Навигация */}
      <Link
        href="/archive"
        className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к списку архивов
      </Link>

      {/* Заголовок */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">{archive.organizationName}</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Архив закрытой организации • ID: {archive.id}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownloadAll}
          disabled={downloading || documents.length === 0}
          className={cn(
            'flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:bg-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <Download className="h-4 w-4" />
          {downloading ? 'Скачивание...' : 'Скачать всё (ZIP)'}
        </button>
      </div>

      {/* Статус и время до удаления */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                archive.status === 'active'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              )}
            >
              <Archive className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                Статус: {archive.status === 'active' ? 'Активен' : 'Истёк'}
              </p>
              <p className="mt-0.5 text-xs text-neutral-400">
                Хранится {archive.retentionDays} дней
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <Clock className={cn('h-4 w-4', getExpiryColor(archive.expiresAt))} />
              <span className={cn('text-sm font-medium', getExpiryColor(archive.expiresAt))}>
                {getTimeUntilDeletion(archive.expiresAt)}
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              До {formatExpiresDate(archive.expiresAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Информация об архиве */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-400">Закрыта</p>
              <p className="mt-0.5 text-sm font-medium text-white">
                {formatClosedDate(archive.closedAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
              <Folder className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-400">Проектов</p>
              <p className="mt-0.5 text-sm font-medium text-white">
                {archive.snapshot.projectsCount}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-400">Документов</p>
              <p className="mt-0.5 text-sm font-medium text-white">
                {archive.snapshot.documentsCount}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20 text-green-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-400">Участников</p>
              <p className="mt-0.5 text-sm font-medium text-white">
                {archive.snapshot.membersCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Размер архива */}
      {totalSize > 0 && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/20 text-yellow-400">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-400">Общий размер</p>
              <p className="mt-0.5 text-sm font-medium text-white">{formatFileSize(totalSize)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Список документов */}
      <ArchivedDocumentsList documents={documents} archiveId={archiveId} />
    </div>
  );
}
