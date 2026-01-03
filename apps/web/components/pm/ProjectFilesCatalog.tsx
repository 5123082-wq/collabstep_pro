'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/ui/toast';

type ProjectFile = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploaderId: string;
  uploader?: {
    id: string;
    name: string;
    email: string;
  };
  source: string;
  sourceEntityId?: string;
  sourceEntityTitle?: string;
  url?: string;
  folderId?: string | null;
  taskId?: string | null;
};

type Folder = {
  id: string;
  name: string;
  type: 'project' | 'task' | 'result' | 'custom';
  projectId: string;
  taskId?: string | null;
  parentId?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  fileCount: number;
};

type FolderTreeNode = Folder & {
  children: FolderTreeNode[];
};

type ProjectFilesCatalogProps = {
  projectId: string;
};

export default function ProjectFilesCatalog({ projectId }: ProjectFilesCatalogProps) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);

  // Построение дерева папок
  const folderTree = useMemo(() => {
    const folderMap = new Map<string, FolderTreeNode>();
    const rootFolders: FolderTreeNode[] = [];

    // Создаем узлы для всех папок
    folders.forEach((folder) => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    // Строим дерево
    folders.forEach((folder) => {
      const node = folderMap.get(folder.id);
      if (!node) return;

      if (!folder.parentId) {
        // Корневая папка (папка проекта)
        rootFolders.push(node);
      } else {
        // Дочерняя папка
        const parent = folderMap.get(folder.parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          // Если родитель не найден, добавляем как корневую
          rootFolders.push(node);
        }
      }
    });

    // Сортируем: сначала project, потом task, потом result
    const sortFolders = (nodes: FolderTreeNode[]): FolderTreeNode[] => {
      return nodes
        .sort((a, b) => {
          const order: Record<Folder['type'], number> = {
            project: 0,
            task: 1,
            result: 2,
            custom: 3
          };
          return (order[a.type] ?? 99) - (order[b.type] ?? 99);
        })
        .map((node) => ({
          ...node,
          children: sortFolders(node.children)
        }));
    };

    return sortFolders(rootFolders);
  }, [folders]);

  // Получение папки проекта (корневой папки)
  const projectFolder = useMemo(() => {
    return folders.find((f) => f.type === 'project') || null;
  }, [folders]);

  // Установка выбранной папки по умолчанию (папка проекта) и автоматическое раскрытие
  useEffect(() => {
    if (projectFolder && !selectedFolderId) {
      setSelectedFolderId(projectFolder.id);
      // Раскрываем папку проекта по умолчанию
      setExpandedFolders((prev) => new Set(prev).add(projectFolder.id));
    }
  }, [projectFolder, selectedFolderId]);

  const loadFolders = useCallback(async () => {
    try {
      const response = await fetch(`/api/pm/projects/${projectId}/folders`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Не удалось загрузить папки');
      }

      const data = await response.json();
      setFolders(data.data?.folders || []);
    } catch (err) {
      console.error('Error loading folders:', err);
      toast(err instanceof Error ? err.message : 'Не удалось загрузить папки', 'warning');
    }
  }, [projectId]);

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/pm/projects/${projectId}/files`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Не удалось загрузить файлы');
      }

      const data = await response.json();
      setFiles(data.data?.files || []);
    } catch (err) {
      console.error('Error loading files:', err);
      toast(err instanceof Error ? err.message : 'Неизвестная ошибка', 'warning');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadFolders();
    void loadFiles();
  }, [projectId, loadFolders, loadFiles]);

  // Фильтрация файлов по выбранной папке
  const filteredFiles = useMemo(() => {
    if (!selectedFolderId) {
      return [];
    }
    const isProjectRoot = projectFolder?.id === selectedFolderId;
    return files.filter(
      (file) => file.folderId === selectedFolderId || (isProjectRoot && !file.folderId)
    );
  }, [files, selectedFolderId, projectFolder]);

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/pm/projects/${projectId}/files`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Не удалось загрузить файл');
      }

      toast('Файл успешно загружен', 'success');
      void loadFolders();
      void loadFiles();
    } catch (err) {
      console.error('Error uploading file:', err);
      toast(err instanceof Error ? err.message : 'Не удалось загрузить файл', 'warning');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} ГБ`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const renderFolderNode = (node: FolderTreeNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(node.id);
    const isSelected = selectedFolderId === node.id;
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition cursor-pointer ${
            isSelected
              ? 'bg-indigo-500 text-white'
              : 'text-neutral-300 hover:bg-neutral-800'
          }`}
          style={{ paddingLeft: `${8 + level * 20}px` }}
          onClick={() => setSelectedFolderId(node.id)}
        >
          {hasChildren && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(node.id);
              }}
              className="flex items-center justify-center w-4 h-4 text-xs"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <span className="w-4" />}
          <span className="flex-1 truncate">{node.name}</span>
          <span className="text-xs opacity-70">({node.fileCount})</span>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child) => renderFolderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950/40">
        <div className="text-center text-sm text-neutral-400">Загрузка файлов...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и кнопка загрузки */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Файлы проекта</h3>
          <p className="mt-1 text-sm text-neutral-400">
            {filteredFiles.length === 0
              ? 'Пока нет файлов'
              : `${filteredFiles.length} ${filteredFiles.length === 1 ? 'файл' : filteredFiles.length < 5 ? 'файла' : 'файлов'}`}
          </p>
        </div>

        {/* Кнопка загрузки */}
        <label className="cursor-pointer">
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void handleFileUpload(file);
              }
            }}
            disabled={uploading}
          />
          <Button variant="primary" size="sm" loading={uploading}>
            📎 Загрузить файл
          </Button>
        </label>
      </div>

      {/* Дерево папок и список файлов */}
      <div className="grid grid-cols-[300px_1fr] gap-6">
        {/* Дерево папок */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
          <h4 className="mb-3 text-sm font-semibold text-white">Папки</h4>
          {folderTree.length === 0 ? (
            <div className="text-sm text-neutral-400">Нет папок</div>
          ) : (
            <div className="space-y-1">
              {folderTree.map((node) => renderFolderNode(node))}
            </div>
          )}
        </div>

        {/* Список файлов выбранной папки */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-6">
          {!selectedFolderId ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="text-center text-sm text-neutral-400">Выберите папку</div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="text-center text-sm text-neutral-400">Нет файлов в этой папке</div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 transition hover:bg-neutral-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📎</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <a
                            href={file.url || `/api/files/${file.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-white hover:text-indigo-400"
                          >
                            {file.filename}
                          </a>
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-xs text-neutral-400">
                          <span>{formatFileSize(file.sizeBytes)}</span>
                          <span>•</span>
                          <span>{formatDate(file.uploadedAt)}</span>
                          {file.uploader && (
                            <>
                              <span>•</span>
                              <span>{file.uploader.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={file.url || `/api/files/${file.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition hover:bg-neutral-700"
                    >
                      Открыть
                    </a>
                    <a
                      href={file.url || `/api/files/${file.id}`}
                      download={file.filename}
                      className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition hover:bg-neutral-700"
                    >
                      Скачать
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
