'use client';

import { useState } from 'react';
import type { ArchivedDocument } from '@collabverse/api';
import { formatFileSize } from '@/lib/utils/archive-utils';
import { cn } from '@/lib/utils';
import { FileText } from 'lucide-react';
// @ts-expect-error lucide-react icon types - these icons exist but types are incomplete
import { Download, Folder } from 'lucide-react';

type ArchivedDocumentsListProps = {
  documents: ArchivedDocument[];
  archiveId: string;
};

export function ArchivedDocumentsList({ documents, archiveId }: ArchivedDocumentsListProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownloadDocument = async (document: ArchivedDocument) => {
    try {
      setDownloading(document.id);
      const response = await fetch(document.fileUrl);
      if (!response.ok) {
        throw new Error('Не удалось скачать файл');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.title;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Не удалось скачать файл');
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAll = async () => {
    try {
      setDownloading('all');
      const response = await fetch(`/api/archives/${archiveId}/download`);
      if (!response.ok) {
        throw new Error('Не удалось скачать архив');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `archive-${archiveId}-documents.zip`;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading archive:', error);
      alert('Не удалось скачать архив');
    } finally {
      setDownloading(null);
    }
  };

  if (documents.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8 text-center">
        <FileText className="mx-auto h-12 w-12 text-neutral-600" />
        <p className="mt-4 text-neutral-400">В архиве нет документов</p>
      </div>
    );
  }

  // Группируем документы по проектам
  const documentsByProject = documents.reduce((acc, doc) => {
    const projectName = doc.projectName || 'Без проекта';
    if (!acc[projectName]) {
      acc[projectName] = [];
    }
    acc[projectName].push(doc);
    return acc;
  }, {} as Record<string, ArchivedDocument[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Документы архива</h3>
          <p className="mt-1 text-sm text-neutral-400">
            {documents.length} {getDocumentsWord(documents.length)}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownloadAll}
          disabled={downloading === 'all'}
          className={cn(
            'flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:bg-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <Download className="h-4 w-4" />
          {downloading === 'all' ? 'Скачивание...' : 'Скачать всё (ZIP)'}
        </button>
      </div>

      <div className="space-y-4">
        {Object.entries(documentsByProject).map(([projectName, projectDocs]) => (
          <div
            key={projectName}
            className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4"
          >
            <div className="mb-3 flex items-center gap-2">
              <Folder className="h-4 w-4 text-neutral-400" />
              <h4 className="font-medium text-white">{projectName}</h4>
              <span className="text-xs text-neutral-500">
                ({projectDocs.length} {getDocumentsWord(projectDocs.length)})
              </span>
            </div>
            <div className="space-y-2">
              {projectDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950/60 p-3 transition hover:border-indigo-500/40"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-neutral-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{doc.title}</p>
                      <p className="mt-0.5 text-xs text-neutral-400">
                        {formatFileSize(doc.fileSizeBytes)}
                        {doc.type && ` • ${doc.type.toUpperCase()}`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadDocument(doc)}
                    disabled={downloading === doc.id}
                    className={cn(
                      'ml-4 flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900/80 px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:border-indigo-500/40 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    <Download className="h-3 w-3" />
                    {downloading === doc.id ? '...' : 'Скачать'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getDocumentsWord(count: number): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'документов';
  }

  if (lastDigit === 1) {
    return 'документ';
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'документа';
  }

  return 'документов';
}
