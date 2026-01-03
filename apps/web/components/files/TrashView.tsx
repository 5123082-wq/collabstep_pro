'use client';

import { Trash2 } from 'lucide-react';
import { useFileManagerStore } from '@/stores/file-manager-store';
import { Button } from '@/components/ui/button';

type TrashViewProps = {
  onRestore: (fileId: string) => void;
  onPermanentDelete?: (fileId: string) => void;
  className?: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} ГБ`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TrashView({
  onRestore,
  className = '',
}: TrashViewProps) {
  const { trash, isLoading } = useFileManagerStore();

  if (isLoading) {
    return (
      <div className={`flex min-h-[400px] items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-neutral-400">Загрузка корзины...</p>
        </div>
      </div>
    );
  }

  if (trash.length === 0) {
    return (
      <div className={`flex min-h-[400px] items-center justify-center ${className}`}>
        <div className="text-center">
          <Trash2 className="mx-auto mb-4 h-16 w-16 text-neutral-600" />
          <h3 className="text-lg font-medium text-neutral-300">Корзина пуста</h3>
          <p className="mt-1 text-sm text-neutral-500">
            Удалённые файлы будут отображаться здесь
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Корзина</h3>
          <p className="text-sm text-neutral-400">
            {trash.length} {trash.length === 1 ? 'файл' : trash.length < 5 ? 'файла' : 'файлов'}
          </p>
        </div>
      </div>

      {/* Warning */}
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
        <span className="text-xl">⚠️</span>
        <div className="text-sm">
          <p className="font-medium text-amber-300">Файлы удаляются автоматически</p>
          <p className="mt-0.5 text-amber-400/80">
            Файлы в корзине удаляются навсегда по истечении срока хранения (зависит от тарифа).
          </p>
        </div>
      </div>

      {/* Files list */}
      <div className="space-y-2">
        {trash.map((file) => (
          <div
            key={file.id}
            className="group flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-3"
          >
            {/* File icon */}
            <div className="flex-shrink-0 text-neutral-500">
              <Trash2 className="h-5 w-5" />
            </div>

            {/* File info */}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-neutral-300">{file.filename}</p>
              <p className="mt-0.5 text-xs text-neutral-500">
                {formatFileSize(file.sizeBytes)} • Удалён {formatDate(file.updatedAt)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRestore(file.id)}
                className="gap-1.5"
              >
                ↩️ Восстановить
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
