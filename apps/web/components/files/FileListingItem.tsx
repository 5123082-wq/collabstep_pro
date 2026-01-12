'use client';

import { memo, useCallback } from 'react';
import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { useFileManagerStore, type FileObject } from '@/stores/file-manager-store';

type FileListingItemProps = {
  file: FileObject;
  viewMode: 'list' | 'grid' | 'icons';
  onPreview: () => void;
  onDownload: () => void;
  onShare: () => void;
  onRename?: () => void;
  onDelete: () => void;
};

function getFileEmoji(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('document') || mimeType.includes('text')) return '📝';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return '📊';
  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('rar')) return '📦';
  if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('html')) return '💻';
  return '📎';
}

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
  });
}

function FileListingItemComponent({
  file,
  viewMode,
  onPreview,
  onDownload,
  onShare,
  onDelete,
}: FileListingItemProps) {
  const { selectedFileIds, selectFile, toggleFileSelection } = useFileManagerStore();
  const isSelected = selectedFileIds.has(file.id);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      toggleFileSelection(file.id);
    } else {
      selectFile(file.id);
    }
  }, [file.id, selectFile, toggleFileSelection]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onPreview();
  }, [onPreview]);

  const isPreviewable = file.mimeType.startsWith('image/') || file.mimeType.includes('pdf');

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
            toggleFileSelection(file.id);
          }}
        >
          {isSelected && (
            <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 12 12">
              <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
            </svg>
          )}
        </div>

        {/* File icon */}
        <div className="flex-shrink-0 text-xl">
          {getFileEmoji(file.mimeType)}
        </div>

        {/* File info */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-white">{file.filename}</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {formatFileSize(file.sizeBytes)} • {formatDate(file.updatedAt)}
            {file.uploader && ` • ${file.uploader.name}`}
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          {isPreviewable && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPreview();
              }}
              className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-700 hover:text-white"
              title="Просмотр"
            >
              👁️
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-700 hover:text-white"
            title="Скачать"
          >
            📥
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-700 hover:text-white"
            title="Поделиться"
          >
            🔗
          </button>
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
        </div>
      </div>
    );
  }

  // Grid / Icons view
  return (
    <div
      className={`group relative flex flex-col rounded-xl border p-3 transition cursor-pointer ${
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
          toggleFileSelection(file.id);
        }}
      >
        {isSelected && (
          <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 12 12">
            <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
          </svg>
        )}
      </div>

      {/* File preview / icon */}
      <div className="flex aspect-square items-center justify-center rounded-lg bg-neutral-800/50">
        {file.mimeType.startsWith('image/') ? (
          <Image
            src={file.storageUrl}
            alt={file.filename}
            width={160}
            height={160}
            className="h-full w-full rounded-lg object-cover"
            loading="lazy"
            unoptimized
          />
        ) : (
          <span className="text-4xl">{getFileEmoji(file.mimeType)}</span>
        )}
      </div>

      {/* File name */}
      <p className="mt-2 truncate text-center text-sm font-medium text-white" title={file.filename}>
        {file.filename}
      </p>

      {/* File size */}
      <p className="mt-0.5 text-center text-xs text-neutral-500">
        {formatFileSize(file.sizeBytes)}
      </p>

      {/* Quick actions overlay */}
      <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded-lg bg-neutral-900/90 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          className="rounded-lg p-1.5 text-neutral-400 transition hover:text-white"
          title="Скачать"
        >
          📥
        </button>
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
    </div>
  );
}

export const FileListingItem = memo(FileListingItemComponent);
