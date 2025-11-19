'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/ui/toast';

type FileSource = 'all' | 'tasks' | 'comments' | 'chat' | 'project' | 'documents';

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
  source: FileSource;
  sourceEntityId?: string;
  sourceEntityTitle?: string;
  url?: string;
};

type ProjectFilesCatalogProps = {
  projectId: string;
};

export default function ProjectFilesCatalog({ projectId }: ProjectFilesCatalogProps) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FileSource>('all');
  const [uploading, setUploading] = useState(false);

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      const url = filter === 'all' 
        ? `/api/pm/projects/${projectId}/files`
        : `/api/pm/projects/${projectId}/files?source=${filter}`;
      
      const response = await fetch(url);

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
  }, [projectId, filter]);

  useEffect(() => {
    void loadFiles();
  }, [projectId, filter, loadFiles]);

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

  const getSourceLabel = (source: FileSource) => {
    const labels: Record<FileSource, string> = {
      all: 'Все',
      tasks: 'Задачи',
      comments: 'Комментарии',
      chat: 'Чат',
      project: 'Проект',
      documents: 'Документы'
    };
    return labels[source] || source;
  };

  // Группировка файлов по источникам
  const groupedFiles = files.reduce((acc, file) => {
    if (!acc[file.source]) {
      acc[file.source] = [];
    }
    acc[file.source].push(file);
    return acc;
  }, {} as Record<FileSource, ProjectFile[]>);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950/40">
        <div className="text-center text-sm text-neutral-400">Загрузка файлов...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и фильтры */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Файлы проекта</h3>
          <p className="mt-1 text-sm text-neutral-400">
            {files.length === 0
              ? 'Пока нет файлов'
              : `${files.length} ${files.length === 1 ? 'файл' : files.length < 5 ? 'файла' : 'файлов'}`}
          </p>
        </div>

        {/* Фильтры */}
        <div className="flex gap-2">
          {(['all', 'tasks', 'comments', 'chat', 'project', 'documents'] as FileSource[]).map((source) => (
            <button
              key={source}
              type="button"
              onClick={() => setFilter(source)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                filter === source
                  ? 'bg-indigo-500 text-white'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              {getSourceLabel(source)}
            </button>
          ))}
        </div>
      </div>

      {/* Кнопка загрузки */}
      <div className="flex justify-end">
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

      {/* Список файлов */}
      {files.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950/40">
          <div className="text-center text-sm text-neutral-400">
            {filter === 'all' ? 'Пока нет файлов. Загрузите первый файл!' : `Нет файлов в категории "${getSourceLabel(filter)}"`}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedFiles).map(([source, sourceFiles]) => (
            <div key={source} className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-6">
              <h4 className="mb-4 text-sm font-semibold text-white">
                {getSourceLabel(source as FileSource)} ({sourceFiles.length})
              </h4>
              <div className="space-y-3">
                {sourceFiles.map((file) => (
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
                            {file.sourceEntityTitle && (
                              <span className="text-xs text-neutral-400">— {file.sourceEntityTitle}</span>
                            )}
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

