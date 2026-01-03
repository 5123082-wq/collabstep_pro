'use client';

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useFileManagerStore } from '@/stores/file-manager-store';
import { Button } from '@/components/ui/button';

type NewFolderDialogProps = {
  organizationId?: string;
  onCreateFolder: (name: string, parentId: string | null) => Promise<void>;
};

export default function NewFolderDialog({
  onCreateFolder,
}: NewFolderDialogProps) {
  const { showNewFolderDialog, closeNewFolderDialog, currentFolderId } = useFileManagerStore();
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when dialog opens
  useEffect(() => {
    if (showNewFolderDialog) {
      setName('');
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [showNewFolderDialog]);

  // Handle keyboard
  useEffect(() => {
    if (!showNewFolderDialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeNewFolderDialog();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showNewFolderDialog, closeNewFolderDialog]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Введите название папки');
      return;
    }

    if (trimmedName.length > 255) {
      setError('Название слишком длинное');
      return;
    }

    // Check for invalid characters
    if (/[<>:"/\\|?*]/.test(trimmedName)) {
      setError('Название содержит недопустимые символы');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await onCreateFolder(trimmedName, currentFolderId);
      closeNewFolderDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать папку');
    } finally {
      setIsCreating(false);
    }
  };

  if (!showNewFolderDialog) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeNewFolderDialog();
        }
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20">
              <span className="text-xl">📁</span>
            </div>
            <h2 className="text-lg font-semibold text-white">Новая папка</h2>
          </div>
          <button
            type="button"
            onClick={closeNewFolderDialog}
            className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6">
          <div>
            <label htmlFor="folder-name" className="block text-sm font-medium text-neutral-300">
              Название папки
            </label>
            <input
              ref={inputRef}
              id="folder-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="Новая папка"
              className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white placeholder-neutral-500 transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              disabled={isCreating}
            />
            {error && (
              <p className="mt-2 text-sm text-rose-400">{error}</p>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={closeNewFolderDialog}
              disabled={isCreating}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isCreating}
              disabled={!name.trim()}
            >
              Создать
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

