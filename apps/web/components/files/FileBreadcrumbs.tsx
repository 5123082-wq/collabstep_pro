'use client';

import { ChevronRight } from 'lucide-react';
import { useFileManagerStore, type FolderObject } from '@/stores/file-manager-store';

type FileBreadcrumbsProps = {
  className?: string;
};

export default function FileBreadcrumbs({ className = '' }: FileBreadcrumbsProps) {
  const { currentPath, navigateToFolder } = useFileManagerStore();

  const getFolderIcon = (folder: FolderObject) => {
    switch (folder.type) {
      case 'project':
        return '📁';
      case 'task':
        return '📋';
      case 'result':
        return '✅';
      default:
        return '📂';
    }
  };

  return (
    <nav className={`flex items-center gap-1 overflow-x-auto py-2 ${className}`} aria-label="Breadcrumbs">
      {/* Home / Root */}
      <button
        type="button"
        onClick={() => navigateToFolder(null)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
        title="Все файлы организации"
      >
        <span className="text-base">🏠</span>
        <span className="hidden sm:inline">Все файлы</span>
      </button>

      {/* Path segments */}
      {currentPath.map((folder, index) => (
        <div key={folder.id} className="flex items-center">
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-neutral-600" />
          <button
            type="button"
            onClick={() => navigateToFolder(folder.id)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
              index === currentPath.length - 1
                ? 'bg-indigo-500/20 text-indigo-300'
                : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
            }`}
            title={folder.name}
          >
            <span className="text-base">{getFolderIcon(folder)}</span>
            <span className="max-w-[150px] truncate">{folder.name}</span>
          </button>
        </div>
      ))}
    </nav>
  );
}

