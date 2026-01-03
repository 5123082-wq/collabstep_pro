'use client';

import { Trash2, Search } from 'lucide-react';
import { useFileManagerStore, type ViewMode, type SortField } from '@/stores/file-manager-store';
import { Button } from '@/components/ui/button';

type FileToolbarProps = {
  onUploadClick: () => void;
  onCreateFolder: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onPaste?: () => void;
  className?: string;
};

export default function FileToolbar({
  onUploadClick,
  onCreateFolder,
  onDownload,
  onShare,
  onPaste,
  className = '',
}: FileToolbarProps) {
  const {
    viewMode,
    setViewMode,
    sortField,
    setSortField,
    sortOrder,
    toggleSortOrder,
    searchQuery,
    setSearchQuery,
    showTrash,
    setShowTrash,
    selectedFileIds,
    selectedFolderIds,
    clipboard,
    copySelected,
    cutSelected,
    isUploading,
  } = useFileManagerStore();

  const hasSelection = selectedFileIds.size > 0 || selectedFolderIds.size > 0;
  const selectionCount = selectedFileIds.size + selectedFolderIds.size;
  const hasClipboard = clipboard.mode !== null && (clipboard.fileIds.length > 0 || clipboard.folderIds.length > 0);

  const viewModes: { mode: ViewMode; emoji: string; label: string }[] = [
    { mode: 'list', emoji: '☰', label: 'Список' },
    { mode: 'grid', emoji: '⊞', label: 'Сетка' },
    { mode: 'icons', emoji: '⊡', label: 'Иконки' },
  ];

  const sortOptions: { field: SortField; label: string }[] = [
    { field: 'name', label: 'Имя' },
    { field: 'size', label: 'Размер' },
    { field: 'modified', label: 'Дата' },
    { field: 'type', label: 'Тип' },
  ];

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {/* Primary actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={onUploadClick}
          disabled={isUploading || showTrash}
          className="gap-1.5"
        >
          <span className="text-sm">📤</span>
          Загрузить
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onCreateFolder}
          disabled={showTrash}
          className="gap-1.5"
        >
          <span className="text-sm">📁</span>
          <span className="hidden sm:inline">Новая папка</span>
        </Button>
      </div>

      {/* Selection actions */}
      {hasSelection && (
        <div className="flex items-center gap-1 border-l border-neutral-700 pl-3">
          <span className="mr-2 text-xs text-neutral-400">
            Выбрано: {selectionCount}
          </span>
          
          <button
            type="button"
            onClick={copySelected}
            className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
            title="Копировать (Ctrl+C)"
          >
            <span className="text-sm">📋</span>
          </button>
          
          <button
            type="button"
            onClick={cutSelected}
            className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
            title="Вырезать (Ctrl+X)"
          >
            <span className="text-sm">✂️</span>
          </button>
          
          {onDownload && selectedFileIds.size > 0 && (
            <button
              type="button"
              onClick={onDownload}
              className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
              title="Скачать"
            >
              <span className="text-sm">📥</span>
            </button>
          )}
          
          {onShare && selectedFileIds.size === 1 && (
            <button
              type="button"
              onClick={onShare}
              className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
              title="Поделиться"
            >
              <span className="text-sm">🔗</span>
            </button>
          )}
        </div>
      )}

      {/* Paste action */}
      {hasClipboard && onPaste && (
        <button
          type="button"
          onClick={onPaste}
          className="flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-sm text-indigo-300 transition hover:bg-indigo-500/20"
          title="Вставить (Ctrl+V)"
        >
          <span>📋</span>
          Вставить ({clipboard.fileIds.length + clipboard.folderIds.length})
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск файлов..."
          className="w-48 rounded-lg border border-neutral-700 bg-neutral-900 py-1.5 pl-9 pr-3 text-sm text-neutral-200 placeholder-neutral-500 transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Sort dropdown */}
      <div className="flex items-center gap-1">
        <select
          value={sortField}
          onChange={(e) => setSortField(e.target.value as SortField)}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-300 focus:border-indigo-500 focus:outline-none"
        >
          {sortOptions.map((option) => (
            <option key={option.field} value={option.field}>
              {option.label}
            </option>
          ))}
        </select>
        
        <button
          type="button"
          onClick={toggleSortOrder}
          className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
          title={sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}
        >
          <span className={`text-sm transition ${sortOrder === 'desc' ? 'rotate-180 inline-block' : ''}`}>↕️</span>
        </button>
      </div>

      {/* View mode */}
      <div className="flex items-center rounded-lg border border-neutral-700 bg-neutral-900">
        {viewModes.map(({ mode, emoji, label }) => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={`rounded-lg p-2 transition ${
              viewMode === mode
                ? 'bg-indigo-500/20 text-indigo-300'
                : 'text-neutral-400 hover:text-white'
            }`}
            title={label}
          >
            <span className="text-sm">{emoji}</span>
          </button>
        ))}
      </div>

      {/* Trash toggle */}
      <button
        type="button"
        onClick={() => setShowTrash(!showTrash)}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
          showTrash
            ? 'bg-rose-500/20 text-rose-300'
            : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
        }`}
        title={showTrash ? 'Показать файлы' : 'Показать корзину'}
      >
        {showTrash ? (
          <>
            <span>↩️</span>
            Файлы
          </>
        ) : (
          <>
            <Trash2 className="h-4 w-4" />
            Корзина
          </>
        )}
      </button>
    </div>
  );
}
