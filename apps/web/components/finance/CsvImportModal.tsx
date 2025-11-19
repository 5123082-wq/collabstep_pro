'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ContentBlock } from '@/components/ui/content-block';
import { parseExpensesCsv, type CsvParseError } from '@/lib/finance/csv-import';
import { parseAmountInput } from '@/lib/finance/format-money';
import type { ExpenseStatus, FinanceRole } from '@/domain/finance/expenses';

type ProjectOption = {
  id: string;
  name: string;
  role: FinanceRole;
};

type ImportReport = {
  processed: number;
  created: number;
  errors: CsvParseError[];
};

type CsvImportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
  projects: ProjectOption[];
  workspaceId: string;
  canImport: boolean;
};

export default function CsvImportModal({
  isOpen,
  onClose,
  onImportComplete,
  projects,
  workspaceId,
  canImport
}: CsvImportModalProps) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [fileName, setFileName] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      setReport(null);
      setFileName('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, isOpen]);

  if (!isOpen) {
    return null;
  }

  const resolveProjectId = (value: string): string | null => {
    if (!value) {
      return null;
    }
    const normalized = value.trim().toLowerCase();
    const direct = projects.find((project) => project.id.toLowerCase() === normalized);
    if (direct) {
      return direct.id;
    }
    const byName = projects.find((project) => project.name.trim().toLowerCase() === normalized);
    if (byName) {
      return byName.id;
    }
    return null;
  };

  const handleImportFile = async (file: File) => {
    if (!canImport) {
      return;
    }
    setLoading(true);
    setReport(null);
    setFileName(file.name);
    try {
      const text = await file.text();
      const { records, errors: validationErrors, processed } = parseExpensesCsv(text);
      const importReport: ImportReport = { processed, created: 0, errors: [...validationErrors] };
      
      for (const row of records) {
        const rowNumber = row.rowNumber;
        const projectId = resolveProjectId(row.project);
        if (!projectId) {
          importReport.errors.push({ row: rowNumber, reason: 'Проект не найден' });
          continue;
        }
        const projectRole = projects.find((project) => project.id === projectId)?.role ?? 'viewer';
        if (projectRole === 'viewer') {
          importReport.errors.push({ row: rowNumber, reason: 'Недостаточно прав для проекта' });
          continue;
        }
        const payload = {
          workspaceId,
          projectId,
          date: row.date || new Date().toISOString().slice(0, 10),
          amount: parseAmountInput(row.amount || '0'),
          currency: row.currency || 'RUB',
          category: row.category || 'Uncategorized',
          description: row.description || undefined,
          vendor: row.vendor || undefined,
          status: 'draft' as ExpenseStatus
        };
        try {
          const response = await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!response.ok) {
            throw new Error('CREATE_ERROR');
          }
          importReport.created += 1;
        } catch (err) {
          console.error(err);
          importReport.errors.push({ row: rowNumber, reason: 'Ошибка создания' });
        }
      }
      setReport(importReport);
      onImportComplete?.();
    } catch (err) {
      console.error(err);
      setReport({
        processed: 0,
        created: 0,
        errors: [{ row: 0, reason: 'Не удалось обработать файл' }]
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div style={{ maxWidth: '70vw', width: 'auto' }}>
        <ContentBlock 
          as="div" 
          className="max-h-[90vh] overflow-y-auto p-6 shadow-2xl" 
          role="dialog" 
          aria-modal="true"
        >
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Импорт CSV</h2>
              <p className="text-sm text-neutral-400 mt-1">
                Формат: Date, Amount, Currency, Category, Description, Vendor, Project(name|id)
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300 transition hover:border-neutral-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-neutral-200">Выберите файл CSV</span>
              <input
                type="file"
                accept=".csv"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleImportFile(file);
                    event.target.value = '';
                  }
                }}
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
                disabled={loading || !canImport}
              />
            </label>

            {loading && (
              <div className="flex items-center gap-2 text-sm text-neutral-300">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
                Загрузка...
              </div>
            )}

            {report && (
              <div className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <p className="text-neutral-300">
                    Обработано строк: <span className="font-semibold">{report.processed}</span>
                  </p>
                  <p className="text-neutral-300">
                    Создано черновиков: <span className="font-semibold text-emerald-400">{report.created}</span>
                  </p>
                </div>
                
                {report.errors.length > 0 ? (
                  <div className="space-y-2 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3">
                    <p className="text-sm font-medium text-rose-300">Ошибки:</p>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-rose-200">
                      {report.errors.map((error, index) => (
                        <li key={`${error.row}-${index}`}>
                          Строка {error.row}: {error.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
                    <p className="text-sm font-medium text-emerald-300">Ошибок нет</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800"
              >
                {report ? 'Закрыть' : 'Отмена'}
              </button>
            </div>
          </div>
        </ContentBlock>
      </div>
    </div>
  );
}

