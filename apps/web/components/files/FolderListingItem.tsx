'use client';

import { memo, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { useFileManagerStore, type FolderObject } from '@/stores/file-manager-store';

type FolderListingItemProps = {
  folder: FolderObject;
  viewMode: 'list' | 'grid' | 'icons';
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
};

function getFolderEmoji(type: FolderObject['type']): string {
  switch (type) {
    case 'project':
      return '📁';
    case 'task':
      return '📋';
    case 'result':
      return '✅';
    default:
      return '📂';
  }
}

function FolderListingItemComponent({
  folder,
  viewMode,
  onOpen,
  onRename,
  onDelete,
}: FolderListingItemProps) {
  const { selectedFolderIds, selectFolder, toggleFolderSelection, files } = useFileManagerStore();
  const isSelected = selectedFolderIds.has(folder.id);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      toggleFolderSelection(folder.id);
    } else {
      selectFolder(folder.id);
    }
  }, [folder.id, selectFolder, toggleFolderSelection]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onOpen();
  }, [onOpen]);

  // Count files in this folder
  const fileCount = files.filter((f) => f.folderId === folder.id).length;

  // Check if folder can be deleted (only custom folders)
  const canDelete = folder.type === 'custom';

  // Suppress unused variable warning
  void onRename;

  if (viewMode === 'list') {
    return (
      <div
        className={`group flex items-center gap-3 rounded-lg border px-4 py-3 transition cursor-pointer ${
          isSelected
            ? 'border-indigo-500/60 bg-indigo-500/10'
            : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-700 hover:bg-neutral-800/60'
        }`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {/* Checkbox */}
        <div
          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition ${
            isSelected
              ? 'border-indigo-500 bg-indigo-500'
              : 'border-neutral-600 bg-neutral-800 group-hover:border-neutral-500'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            toggleFolderSelection(folder.id);
          }}
        >
          {isSelected && (
            <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 12 12">
              <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
            </svg>
          )}
        </div>

        {/* Folder icon */}
        <div className="flex-shrink-0 text-xl">
          {getFolderEmoji(folder.type)}
        </div>

        {/* Folder info */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-white">{folder.name}</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {fileCount} {fileCount === 1 ? 'файл' : fileCount < 5 ? 'файла' : 'файлов'}
            {folder.type !== 'custom' && (
              <span className="ml-2 rounded-full bg-neutral-700/50 px-1.5 py-0.5 text-[10px] uppercase">
                {folder.type === 'project' ? 'Проект' : folder.type === 'task' ? 'Задача' : 'Результат'}
              </span>
            )}
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          {canDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-700 hover:text-rose-400"
              title="Удалить"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Grid / Icons view
  return (
    <div
      className={`group relative flex flex-col items-center rounded-xl border p-4 transition cursor-pointer ${
        isSelected
          ? 'border-indigo-500/60 bg-indigo-500/10'
          : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-700 hover:bg-neutral-800/60'
      }`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* Selection checkbox */}
      <div
        className={`absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded border transition ${
          isSelected
            ? 'border-indigo-500 bg-indigo-500'
            : 'border-neutral-600 bg-neutral-800 opacity-0 group-hover:opacity-100'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          toggleFolderSelection(folder.id);
        }}
      >
        {isSelected && (
          <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 12 12">
            <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
          </svg>
        )}
      </div>

      {/* Folder icon */}
      <span className="text-4xl mb-2">{getFolderEmoji(folder.type)}</span>

      {/* Folder name */}
      <p className="w-full truncate text-center text-sm font-medium text-white" title={folder.name}>
        {folder.name}
      </p>

      {/* File count */}
      <p className="mt-0.5 text-center text-xs text-neutral-500">
        {fileCount} {fileCount === 1 ? 'файл' : fileCount < 5 ? 'файла' : 'файлов'}
      </p>

      {/* Quick actions overlay */}
      {canDelete && (
        <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded-lg bg-neutral-900/90 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded-lg p-1.5 text-neutral-400 transition hover:text-rose-400"
            title="Удалить"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export const FolderListingItem = memo(FolderListingItemComponent);
