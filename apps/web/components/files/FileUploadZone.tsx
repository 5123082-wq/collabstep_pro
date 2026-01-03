'use client';

import { useState, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { useFileManagerStore } from '@/stores/file-manager-store';

type UploadingFile = {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
};

type FileUploadZoneProps = {
  organizationId: string;
  projectId?: string;
  folderId?: string | null;
  onUploadComplete?: () => void;
  className?: string;
};

export default function FileUploadZone({
  projectId,
  folderId,
  onUploadComplete,
  className = '',
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setIsUploading, addFile } = useFileManagerStore();

  const uploadFile = useCallback(async (uploadingFile: UploadingFile) => {
    const formData = new FormData();
    formData.append('file', uploadingFile.file);
    if (projectId) {
      formData.append('projectId', projectId);
    }
    if (folderId) {
      formData.append('folderId', folderId);
    }

    try {
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === uploadingFile.id ? { ...f, status: 'uploading' as const } : f
        )
      );

      const response = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка загрузки');
      }

      const data = await response.json();
      
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === uploadingFile.id
            ? { ...f, status: 'success' as const, progress: 100 }
            : f
        )
      );

      // Add file to store
      if (data.file) {
        addFile({
          ...data.file,
          createdAt: data.file.uploadedAt,
          updatedAt: data.file.uploadedAt,
          storageKey: '',
          folderId: folderId ?? null,
        });
      }
    } catch (error) {
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === uploadingFile.id
            ? {
                ...f,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Неизвестная ошибка',
              }
            : f
        )
      );
    }
  }, [projectId, folderId, addFile]);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const newFiles: UploadingFile[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: 'pending' as const,
    }));

    setUploadingFiles((prev) => [...prev, ...newFiles]);
    setIsUploading(true);

    // Upload files sequentially
    for (const uploadingFile of newFiles) {
      await uploadFile(uploadingFile);
    }

    setIsUploading(false);
    onUploadComplete?.();
  }, [uploadFile, setIsUploading, onUploadComplete]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      void processFiles(files);
    }
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      void processFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const removeUploadingFile = useCallback((id: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setUploadingFiles((prev) => prev.filter((f) => f.status === 'uploading' || f.status === 'pending'));
  }, []);

  const hasCompletedFiles = uploadingFiles.some((f) => f.status === 'success' || f.status === 'error');

  return (
    <div className={className}>
      {/* Drop zone */}
      <div
        className={`relative rounded-xl border-2 border-dashed p-8 text-center transition ${
          isDragging
            ? 'border-indigo-500 bg-indigo-500/10'
            : 'border-neutral-700 bg-neutral-900/40 hover:border-neutral-600'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        
        <span className={`text-4xl ${isDragging ? '' : ''}`}>📤</span>
        
        <p className="mt-3 text-sm text-neutral-300">
          Перетащите файлы сюда или{' '}
          <span className="font-medium text-indigo-400">выберите</span>
        </p>
        
        <p className="mt-1 text-xs text-neutral-500">
          Максимальный размер файла зависит от вашего тарифа
        </p>
      </div>

      {/* Uploading files list */}
      {uploadingFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-neutral-300">
              Загрузка ({uploadingFiles.length})
            </h4>
            {hasCompletedFiles && (
              <button
                type="button"
                onClick={clearCompleted}
                className="text-xs text-neutral-500 hover:text-neutral-300"
              >
                Очистить завершённые
              </button>
            )}
          </div>

          {uploadingFiles.map((uploadingFile) => (
            <div
              key={uploadingFile.id}
              className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/60 p-3"
            >
              {/* Status icon */}
              {uploadingFile.status === 'success' ? (
                <span className="text-lg">✅</span>
              ) : uploadingFile.status === 'error' ? (
                <span className="text-lg">❌</span>
              ) : uploadingFile.status === 'uploading' ? (
                <div className="h-5 w-5 flex-shrink-0 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              ) : (
                <span className="text-lg">📎</span>
              )}

              {/* File info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-neutral-200">
                  {uploadingFile.file.name}
                </p>
                {uploadingFile.status === 'error' && uploadingFile.error && (
                  <p className="text-xs text-rose-400">{uploadingFile.error}</p>
                )}
                {uploadingFile.status === 'uploading' && (
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-neutral-700">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all"
                      style={{ width: `${uploadingFile.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Remove button */}
              {(uploadingFile.status === 'success' || uploadingFile.status === 'error') && (
                <button
                  type="button"
                  onClick={() => removeUploadingFile(uploadingFile.id)}
                  className="flex-shrink-0 rounded-lg p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
