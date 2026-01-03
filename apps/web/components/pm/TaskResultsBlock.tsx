'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ContentBlock } from '@/components/ui/content-block';
import { Button } from '@/components/ui/button';
import type { TaskAttachment } from '@/types/pm';
import { toast } from '@/lib/ui/toast';
import { cn } from '@/lib/utils';

type TaskResultFile = {
  id: string;
  filename: string;
  mimeType?: string;
  sizeBytes?: number;
  storageUrl?: string;
};

type TaskResultsBlockProps = {
  taskId: string;
  attachments?: TaskAttachment[];
  active?: boolean;
  size?: 'sm' | 'md';
  className?: string;
};

const formatSize = (sizeBytes?: number) => {
  if (typeof sizeBytes !== 'number') {
    return null;
  }
  return `${Math.round(sizeBytes / 1024)} КБ`;
};

export default function TaskResultsBlock({
  taskId,
  attachments,
  active = true,
  size = 'sm',
  className
}: TaskResultsBlockProps) {
  const [results, setResults] = useState<TaskResultFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const attachmentsMap = useMemo(() => {
    const map = new Map<string, TaskAttachment>();
    (attachments ?? []).forEach((file) => map.set(file.id, file));
    return map;
  }, [attachments]);

  const displayResults = useMemo(
    () =>
      results.map((file) => {
        const match = attachmentsMap.get(file.id);
        return {
          ...file,
          storageUrl: file.storageUrl ?? match?.storageUrl,
          sizeBytes: typeof file.sizeBytes === 'number' ? file.sizeBytes : match?.sizeBytes
        };
      }),
    [attachmentsMap, results]
  );

  const fetchResults = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/pm/tasks/${taskId}/results`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = payload?.error || 'Не удалось загрузить результаты';
        throw new Error(message);
      }
      const files = payload?.data?.files ?? payload?.files ?? [];
      setResults(Array.isArray(files) ? files : []);
    } catch (error) {
      console.error('Failed to load task results:', error);
      toast(error instanceof Error ? error.message : 'Не удалось загрузить результаты', 'warning');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (!active) return;
    void fetchResults();
  }, [active, fetchResults]);

  useEffect(() => {
    setResults([]);
    setSelectedIds([]);
    setPickerOpen(false);
  }, [taskId]);

  useEffect(() => {
    if (!pickerOpen) {
      setSelectedIds([]);
    }
  }, [pickerOpen]);

  const handleToggleSelection = () => {
    setPickerOpen((prev) => !prev);
  };

  const handleToggleFile = (fileId: string) => {
    setSelectedIds((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  };

  const handleSaveResults = async () => {
    if (selectedIds.length === 0) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/pm/tasks/${taskId}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: selectedIds })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = payload?.error || 'Не удалось сохранить результаты';
        throw new Error(message);
      }
      toast('Результаты обновлены', 'success');
      setPickerOpen(false);
      await fetchResults();
    } catch (error) {
      console.error('Failed to set task results:', error);
      toast(error instanceof Error ? error.message : 'Не удалось сохранить результаты', 'warning');
    } finally {
      setSaving(false);
    }
  };

  const hasAttachments = Boolean(attachments && attachments.length > 0);
  const hasResults = displayResults.length > 0;

  return (
    <ContentBlock size={size} className={cn(className)}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Финальные результаты
            </div>
            <p className="text-xs text-neutral-500">Зафиксируйте итоговые файлы задачи.</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleToggleSelection}
          >
            {pickerOpen ? 'Скрыть выбор' : 'Отметить результаты'}
          </Button>
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="text-sm text-neutral-500">Загрузка результатов...</div>
          ) : hasResults ? (
            displayResults.map((file) => {
              const sizeLabel = formatSize(file.sizeBytes);
              return (
                <div
                  key={file.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-2"
                >
                  <div className="min-w-0">
                    {file.storageUrl ? (
                      <a
                        href={file.storageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-sm font-medium text-white hover:text-indigo-200"
                      >
                        {file.filename}
                      </a>
                    ) : (
                      <div className="truncate text-sm font-medium text-white">{file.filename}</div>
                    )}
                    {sizeLabel && <div className="text-xs text-neutral-500">{sizeLabel}</div>}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-900/30 px-4 py-4 text-sm text-neutral-500">
              Пока нет финальных результатов
            </div>
          )}
        </div>

        {pickerOpen && (
          <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/30 p-3">
            {hasAttachments ? (
              <div className="space-y-2">
                {attachments?.map((file) => {
                  const sizeLabel = formatSize(file.sizeBytes);
                  return (
                    <label
                      key={file.id}
                      className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-200"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(file.id)}
                        onChange={() => handleToggleFile(file.id)}
                        className="rounded"
                      />
                      <span className="min-w-0 flex-1 truncate">{file.filename}</span>
                      {sizeLabel && (
                        <span className="shrink-0 text-xs text-neutral-500">{sizeLabel}</span>
                      )}
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-neutral-500">Нет вложений для выбора</div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPickerOpen(false)}
              >
                Отмена
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                loading={saving}
                disabled={!hasAttachments || selectedIds.length === 0}
                onClick={() => void handleSaveResults()}
              >
                Сохранить
              </Button>
            </div>
          </div>
        )}
      </div>
    </ContentBlock>
  );
}
