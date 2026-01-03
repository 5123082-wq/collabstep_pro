'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Check } from 'lucide-react';
import { useFileManagerStore } from '@/stores/file-manager-store';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/ui/toast';

type ShareScope = 'view' | 'download';

type ShareLink = {
  id: string;
  token: string;
  scope: ShareScope;
  expiresAt: string | null;
  createdAt: string;
  url: string;
};

type ShareFileDialogProps = {
  onCreateShare: (fileId: string, scope: ShareScope, expiresIn: number | null) => Promise<ShareLink>;
  onDeleteShare?: (shareId: string) => Promise<void>;
};

export default function ShareFileDialog({
  onCreateShare,
}: ShareFileDialogProps) {
  const { shareFileId, closeShare, files } = useFileManagerStore();
  const [scope, setScope] = useState<ShareScope>('view');
  const [expiresIn, setExpiresIn] = useState<number | null>(72); // hours
  const [isCreating, setIsCreating] = useState(false);
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [copied, setCopied] = useState(false);

  const file = files.find((f) => f.id === shareFileId);

  // Reset state when dialog opens
  useEffect(() => {
    if (shareFileId) {
      setScope('view');
      setExpiresIn(72);
      setShareLink(null);
      setCopied(false);
    }
  }, [shareFileId]);

  // Handle keyboard
  useEffect(() => {
    if (!shareFileId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeShare();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shareFileId, closeShare]);

  const handleCreateShare = async () => {
    if (!shareFileId) return;

    setIsCreating(true);
    try {
      const link = await onCreateShare(shareFileId, scope, expiresIn);
      setShareLink(link);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Не удалось создать ссылку', 'warning');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = useCallback(async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink.url);
      setCopied(true);
      toast('Ссылка скопирована', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Не удалось скопировать ссылку', 'warning');
    }
  }, [shareLink]);

  const expiryOptions = [
    { value: 1, label: '1 час' },
    { value: 24, label: '24 часа' },
    { value: 72, label: '3 дня' },
    { value: 168, label: '7 дней' },
    { value: 720, label: '30 дней' },
    { value: null as number | null, label: 'Без срока' },
  ];

  if (!shareFileId || !file) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeShare();
        }
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20">
              <span className="text-xl">🔗</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Поделиться файлом</h2>
              <p className="text-sm text-neutral-400 truncate max-w-[300px]">{file.filename}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeShare}
            className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        {!shareLink ? (
          <div className="mt-6 space-y-6">
            {/* Scope selection */}
            <div>
              <label className="block text-sm font-medium text-neutral-300">Тип доступа</label>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setScope('view')}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                    scope === 'view'
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600'
                  }`}
                >
                  <span className="text-2xl">👁️</span>
                  <div>
                    <p className="font-medium text-white">Только просмотр</p>
                    <p className="text-xs text-neutral-400">Можно смотреть онлайн</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setScope('download')}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                    scope === 'download'
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600'
                  }`}
                >
                  <span className="text-2xl">📥</span>
                  <div>
                    <p className="font-medium text-white">Скачивание</p>
                    <p className="text-xs text-neutral-400">Можно скачать файл</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Expiry selection */}
            <div>
              <label className="block text-sm font-medium text-neutral-300">Срок действия</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {expiryOptions.map((option) => (
                  <button
                    key={option.value ?? 'null'}
                    type="button"
                    onClick={() => setExpiresIn(option.value)}
                    className={`rounded-lg border px-3 py-2 text-sm transition ${
                      expiresIn === option.value
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                        : 'border-neutral-700 bg-neutral-800/50 text-neutral-300 hover:border-neutral-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Create button */}
            <Button
              variant="primary"
              size="lg"
              onClick={handleCreateShare}
              loading={isCreating}
              className="w-full gap-2"
            >
              🔗 Создать ссылку
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {/* Success message */}
            <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
              <Check className="h-5 w-5 flex-shrink-0 text-green-400" />
              <p className="text-sm text-green-300">Ссылка успешно создана</p>
            </div>

            {/* Link display */}
            <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={shareLink.url}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-neutral-200 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-shrink-0 rounded-lg bg-indigo-500/20 p-2 text-indigo-300 transition hover:bg-indigo-500/30"
                >
                  {copied ? <Check className="h-4 w-4" /> : <span>📋</span>}
                </button>
              </div>
              
              <div className="mt-3 flex items-center gap-4 text-xs text-neutral-400">
                <span className="flex items-center gap-1">
                  {scope === 'view' ? '👁️' : '📥'}
                  {scope === 'view' ? 'Только просмотр' : 'Скачивание'}
                </span>
                {shareLink.expiresAt && (
                  <span className="flex items-center gap-1">
                    ⏰ Истекает: {new Date(shareLink.expiresAt).toLocaleDateString('ru-RU')}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={closeShare}>
                Закрыть
              </Button>
              <Button variant="primary" size="sm" onClick={handleCopyLink} className="gap-1.5">
                📋 Копировать ссылку
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
