'use client';

import { useMemo } from 'react';
import { useFileManagerStore } from '@/stores/file-manager-store';
import { FileListingItem } from './FileListingItem';
import { FolderListingItem } from './FolderListingItem';

type FileListingViewProps = {
  onUploadClick: () => void;
  onDownloadFile: (fileId: string) => void;
  onDeleteFile: (fileId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  className?: string;
};

export default function FileListingView({
  onUploadClick,
  onDownloadFile,
  onDeleteFile,
  onDeleteFolder,
  className = '',
}: FileListingViewProps) {
  const {
    viewMode,
    isLoading,
    getFilesInCurrentFolder,
    getFoldersInCurrentFolder,
    openPreview,
    openShare,
    openRename,
    navigateToFolder,
    clearSelection,
  } = useFileManagerStore();

  const currentFiles = getFilesInCurrentFolder();
  const currentFolders = getFoldersInCurrentFolder();

  const isEmpty = currentFiles.length === 0 && currentFolders.length === 0;

  const gridClasses = useMemo(() => {
    switch (viewMode) {
      case 'icons':
        return 'grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3';
      case 'grid':
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4';
      default:
        return 'space-y-2';
    }
  }, [viewMode]);

  if (isLoading) {
    return (
      <div className={`flex min-h-[400px] items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-neutral-400">Загрузка файлов...</p>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className={`flex min-h-[400px] items-center justify-center ${className}`}>
        <div className="text-center">
          <span className="text-6xl">📭</span>
          <h3 className="mt-4 text-lg font-medium text-neutral-300">Нет файлов</h3>
          <p className="mt-1 text-sm text-neutral-500">
            Загрузите файлы или создайте папку
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onUploadClick}
              className="flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 transition hover:bg-indigo-500/20"
            >
              <span>📤</span>
              Загрузить файл
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-[400px] ${className}`}
      onClick={(e) => {
        // Clear selection when clicking on empty space
        if (e.target === e.currentTarget) {
          clearSelection();
        }
      }}
    >
      {/* Folders section */}
      {currentFolders.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Папки ({currentFolders.length})
          </h4>
          <div className={gridClasses}>
            {currentFolders.map((folder) => (
              <FolderListingItem
                key={folder.id}
                folder={folder}
                viewMode={viewMode}
                onOpen={() => navigateToFolder(folder.id)}
                onRename={() => openRename(folder.id, 'folder')}
                onDelete={() => onDeleteFolder(folder.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Files section */}
      {currentFiles.length > 0 && (
        <div>
          <h4 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Файлы ({currentFiles.length})
          </h4>
          <div className={gridClasses}>
            {currentFiles.map((file) => (
              <FileListingItem
                key={file.id}
                file={file}
                viewMode={viewMode}
                onPreview={() => openPreview(file.id)}
                onDownload={() => onDownloadFile(file.id)}
                onShare={() => openShare(file.id)}
                onRename={() => openRename(file.id, 'file')}
                onDelete={() => onDeleteFile(file.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
