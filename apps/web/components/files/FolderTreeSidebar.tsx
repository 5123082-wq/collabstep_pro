'use client';

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, X } from 'lucide-react';
import { useFileManagerStore, type FolderObject } from '@/stores/file-manager-store';

type FolderTreeNode = Omit<FolderObject, 'children'> & {
  children: FolderTreeNode[];
};

type FolderTreeSidebarProps = {
  className?: string;
  onDeleteFolder?: (folderId: string) => void;
};

export default function FolderTreeSidebar({ className = '', onDeleteFolder }: FolderTreeSidebarProps) {
  const { folders, currentFolderId, navigateToFolder, files } = useFileManagerStore();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Build folder tree
  const folderTree = useMemo(() => {
    const folderMap = new Map<string, FolderTreeNode>();
    const rootFolders: FolderTreeNode[] = [];

    // Filter out any undefined/null folders
    const validFolders = folders.filter((folder): folder is FolderObject => 
      folder != null && typeof folder.id === 'string'
    );

    // Create nodes for all folders
    validFolders.forEach((folder) => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    // Build tree structure
    validFolders.forEach((folder) => {
      const node = folderMap.get(folder.id);
      if (!node) return;

      if (!folder.parentId) {
        rootFolders.push(node);
      } else {
        const parent = folderMap.get(folder.parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          rootFolders.push(node);
        }
      }
    });

    // Sort: project -> task -> result -> custom, then by name
    const sortFolders = (nodes: FolderTreeNode[]): FolderTreeNode[] => {
      return nodes
        .sort((a, b) => {
          const order: Record<FolderObject['type'], number> = {
            project: 0,
            task: 1,
            result: 2,
            custom: 3,
          };
          const orderDiff = order[a.type] - order[b.type];
          if (orderDiff !== 0) return orderDiff;
          return a.name.localeCompare(b.name);
        })
        .map((node) => ({
          ...node,
          children: sortFolders(node.children),
        }));
    };

    return sortFolders(rootFolders);
  }, [folders]);

  // Count files per folder
  const fileCountByFolder = useMemo(() => {
    const counts = new Map<string | null, number>();
    files.forEach((file) => {
      const folderId = file.folderId;
      counts.set(folderId, (counts.get(folderId) ?? 0) + 1);
    });
    return counts;
  }, [files]);

  const toggleExpanded = (folderId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

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

  const renderFolderNode = (node: FolderTreeNode, level: number = 0) => {
    const isExpanded = expandedIds.has(node.id);
    const isSelected = currentFolderId === node.id;
    const hasChildren = node.children.length > 0;
    const fileCount = fileCountByFolder.get(node.id) ?? 0;
    const canDelete = node.type === 'custom' && onDeleteFolder;

    return (
      <div key={node.id}>
        <div
          className={`group flex cursor-pointer items-center gap-1 rounded-lg py-1.5 pr-2 text-sm transition ${
            isSelected
              ? 'bg-indigo-500/20 text-indigo-300'
              : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
          }`}
          style={{ paddingLeft: `${8 + level * 16}px` }}
          onClick={() => navigateToFolder(node.id)}
        >
          {/* Expand/collapse button */}
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(node.id);
              }}
              className="flex h-5 w-5 items-center justify-center rounded text-neutral-500 transition hover:bg-neutral-700 hover:text-white"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}

          {/* Folder icon */}
          <span className="text-base">{getFolderIcon(node)}</span>

          {/* Folder name */}
          <span className="flex-1 truncate" title={node.name}>
            {node.name}
          </span>

          {/* File count */}
          {fileCount > 0 && (
            <span className="rounded-full bg-neutral-700/50 px-1.5 py-0.5 text-[10px] text-neutral-400 group-hover:bg-neutral-600">
              {fileCount}
            </span>
          )}

          {/* Delete button for custom folders */}
          {canDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFolder?.(node.id);
              }}
              className="ml-1 flex h-5 w-5 items-center justify-center rounded text-neutral-500 opacity-0 transition hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
              title="Удалить папку"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child) => renderFolderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootFileCount = fileCountByFolder.get(null) ?? 0;

  return (
    <aside className={`flex flex-col overflow-hidden ${className}`}>
      <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-3">
        <h3 className="text-sm font-semibold text-white">Папки</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {/* Root level (all files without folder) */}
        <div
          className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition ${
            currentFolderId === null
              ? 'bg-indigo-500/20 text-indigo-300'
              : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
          }`}
          onClick={() => navigateToFolder(null)}
        >
          <span className="text-base">📂</span>
          <span className="flex-1">Все файлы</span>
          {rootFileCount > 0 && (
            <span className="rounded-full bg-neutral-700/50 px-1.5 py-0.5 text-[10px] text-neutral-400 group-hover:bg-neutral-600">
              {rootFileCount}
            </span>
          )}
        </div>

        {/* Folder tree */}
        {folderTree.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {folderTree.map((node) => renderFolderNode(node))}
          </div>
        )}

        {/* Empty state */}
        {folderTree.length === 0 && (
          <div className="mt-6 px-3 text-center text-xs text-neutral-500">
            <p>Нет папок</p>
            <p className="mt-1">Папки создаются автоматически при загрузке файлов в проекты</p>
          </div>
        )}
      </div>
    </aside>
  );
}

