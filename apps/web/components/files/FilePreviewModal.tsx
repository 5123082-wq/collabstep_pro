'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFileManagerStore } from '@/stores/file-manager-store';

type FilePreviewModalProps = {
  onDownload: (fileId: string) => void;
  onShare: (fileId: string) => void;
};

export default function FilePreviewModal({ onDownload, onShare }: FilePreviewModalProps) {
  const { previewFileId, closePreview, files, getFilesInCurrentFolder } = useFileManagerStore();
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const currentFiles = getFilesInCurrentFolder();
  const file = files.find((f) => f.id === previewFileId);
  
  // Find current index for navigation
  const previewableFiles = currentFiles.filter(
    (f) => f.mimeType.startsWith('image/') || f.mimeType.includes('pdf')
  );
  const currentIndex = previewableFiles.findIndex((f) => f.id === previewFileId);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prevFile = previewableFiles[currentIndex - 1];
      if (prevFile) {
        useFileManagerStore.getState().openPreview(prevFile.id);
      }
    }
  }, [currentIndex, previewableFiles]);

  const goToNext = useCallback(() => {
    if (currentIndex < previewableFiles.length - 1) {
      const nextFile = previewableFiles[currentIndex + 1];
      if (nextFile) {
        useFileManagerStore.getState().openPreview(nextFile.id);
      }
    }
  }, [currentIndex, previewableFiles]);

  // Keyboard navigation
  useEffect(() => {
    if (!previewFileId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          closePreview();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case '+':
        case '=':
          setZoom((z) => Math.min(z + 0.25, 3));
          break;
        case '-':
          setZoom((z) => Math.max(z - 0.25, 0.5));
          break;
        case 'r':
          setRotation((r) => (r + 90) % 360);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewFileId, closePreview, goToPrevious, goToNext]);

  // Reset zoom and rotation when file changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [previewFileId]);

  if (!previewFileId || !file) return null;

  const isImage = file.mimeType.startsWith('image/');
  const isPdf = file.mimeType.includes('pdf');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closePreview();
        }
      }}
    >
      {/* Header */}
      <div className="absolute left-0 right-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={closePreview}
            className="rounded-lg bg-neutral-800/80 p-2 text-neutral-300 transition hover:bg-neutral-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <div>
            <p className="font-medium text-white">{file.filename}</p>
            <p className="text-xs text-neutral-400">
              {currentIndex + 1} из {previewableFiles.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls (for images) */}
          {isImage && (
            <>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                className="rounded-lg bg-neutral-800/80 p-2 text-neutral-300 transition hover:bg-neutral-700 hover:text-white"
                title="Уменьшить"
              >
                🔍➖
              </button>
              <span className="min-w-[4rem] text-center text-sm text-neutral-300">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                className="rounded-lg bg-neutral-800/80 p-2 text-neutral-300 transition hover:bg-neutral-700 hover:text-white"
                title="Увеличить"
              >
                🔍➕
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="rounded-lg bg-neutral-800/80 p-2 text-neutral-300 transition hover:bg-neutral-700 hover:text-white"
                title="Повернуть"
              >
                🔄
              </button>
              <div className="mx-2 h-6 w-px bg-neutral-700" />
            </>
          )}

          <button
            type="button"
            onClick={() => onDownload(file.id)}
            className="flex items-center gap-2 rounded-lg bg-neutral-800/80 px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-700 hover:text-white"
          >
            📥 Скачать
          </button>
          <button
            type="button"
            onClick={() => onShare(file.id)}
            className="flex items-center gap-2 rounded-lg bg-indigo-500/80 px-3 py-2 text-sm text-white transition hover:bg-indigo-500"
          >
            🔗 Поделиться
          </button>
        </div>
      </div>

      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <button
          type="button"
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-neutral-800/80 p-3 text-neutral-300 transition hover:bg-neutral-700 hover:text-white"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {currentIndex < previewableFiles.length - 1 && (
        <button
          type="button"
          onClick={goToNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-neutral-800/80 p-3 text-neutral-300 transition hover:bg-neutral-700 hover:text-white"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Content */}
      <div className="flex h-full w-full items-center justify-center overflow-auto p-20">
        {isImage && (
          <img
            src={file.storageUrl}
            alt={file.filename}
            className="max-h-full max-w-full object-contain transition-transform"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
            draggable={false}
          />
        )}

        {isPdf && (
          <iframe
            src={`${file.storageUrl}#toolbar=0`}
            title={file.filename}
            className="h-full w-full max-w-4xl rounded-lg bg-white"
          />
        )}
      </div>

      {/* Thumbnails */}
      {previewableFiles.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-neutral-900/90 p-2">
          {previewableFiles.slice(0, 10).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => useFileManagerStore.getState().openPreview(f.id)}
              className={`h-12 w-12 overflow-hidden rounded-lg border-2 transition ${
                f.id === previewFileId
                  ? 'border-indigo-500'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              {f.mimeType.startsWith('image/') ? (
                <img
                  src={f.storageUrl}
                  alt={f.filename}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-neutral-800 text-xs text-neutral-400">
                  PDF
                </div>
              )}
            </button>
          ))}
          {previewableFiles.length > 10 && (
            <span className="px-2 text-xs text-neutral-500">
              +{previewableFiles.length - 10}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
