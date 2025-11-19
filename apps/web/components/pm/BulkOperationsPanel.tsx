/**
 * BulkOperationsPanel Component
 * 
 * Компонент для массовых операций через AI команды
 * - Ввод команд на естественном языке
 * - Предпросмотр операции перед применением
 * - История выполненных операций
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/ui/toast';
import { cn } from '@/lib/utils';
import {
  parseBulkCommand,
  executeBulkOperation,
  countAffectedTasks,
  getOperationTypeDescription,
  BULK_COMMAND_EXAMPLES,
  type BulkOperation,
  type ParsedCommand
} from '@/lib/ai/bulk-operations';

type Task = {
  id: string;
  status: string;
  assigneeId?: string;
  priority?: string;
  labels?: string[];
  dueAt?: string;
};

type HistoryEntry = {
  id: string;
  command: string;
  operation: BulkOperation;
  updatedCount: number;
  timestamp: Date;
};

type BulkOperationsPanelProps = {
  projectId: string;
  tasks: Task[];
  availableStatuses?: string[];
  availableMembers?: Array<{ id: string; name: string }>;
  availablePriorities?: string[];
  onOperationExecuted?: () => void;
  className?: string;
};

export default function BulkOperationsPanel({
  projectId,
  tasks,
  availableStatuses,
  availableMembers,
  availablePriorities,
  onOperationExecuted,
  className
}: BulkOperationsPanelProps) {
  const [command, setCommand] = useState('');
  const [parsing, setParsing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [parsedCommand, setParsedCommand] = useState<ParsedCommand | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showExamples, setShowExamples] = useState(true);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`bulk-operations-history-${projectId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHistory(parsed.map((h: any) => ({ ...h, timestamp: new Date(h.timestamp) })));
      } catch (error) {
        console.error('Error loading history:', error);
      }
    }
  }, [projectId]);

  // Save history to localStorage
  const saveHistory = (newHistory: HistoryEntry[]) => {
    try {
      localStorage.setItem(`bulk-operations-history-${projectId}`, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error saving history:', error);
    }
  };

  const handleParse = async () => {
    if (!command.trim()) {
      toast('Введите команду', 'warning');
      return;
    }

    setParsing(true);
    try {
      const result = await parseBulkCommand(command.trim(), {
        availableStatuses,
        availableMembers,
        availablePriorities
      });

      setParsedCommand(result);

      if (result.operation) {
        // Count affected tasks
        const affectedCount = countAffectedTasks(result.operation, tasks);
        result.operation.affectedCount = affectedCount;

        if (affectedCount === 0) {
          toast('Команда не затронет ни одной задачи', 'warning');
        } else if (result.confidence < 0.7) {
          toast('Команда распознана с низкой уверенностью. Проверьте правильность.', 'warning');
        }
      } else {
        toast('Не удалось распознать команду', 'warning');
      }

      setShowExamples(false);
    } catch (error) {
      console.error('Error parsing command:', error);
      toast('Ошибка обработки команды', 'error');
    } finally {
      setParsing(false);
    }
  };

  const handleExecute = async () => {
    if (!parsedCommand?.operation) return;

    const affectedCount = parsedCommand.operation.affectedCount || 0;

    // Confirmation for large operations
    if (affectedCount > 10) {
      const confirmed = window.confirm(
        `Вы уверены, что хотите изменить ${affectedCount} задач?\n\n${parsedCommand.interpretation}`
      );
      if (!confirmed) return;
    }

    setExecuting(true);
    try {
      const result = await executeBulkOperation(parsedCommand.operation, projectId);

      if (result.success) {
        toast(`Успешно обновлено ${result.updatedCount} задач`, 'success');

        // Add to history
        const newEntry: HistoryEntry = {
          id: Date.now().toString(),
          command: command.trim(),
          operation: parsedCommand.operation,
          updatedCount: result.updatedCount,
          timestamp: new Date()
        };
        const newHistory = [newEntry, ...history].slice(0, 10); // Keep last 10
        setHistory(newHistory);
        saveHistory(newHistory);

        // Reset form
        setCommand('');
        setParsedCommand(null);
        onOperationExecuted?.();
      } else {
        toast('Ошибка выполнения операции', 'error');
      }
    } catch (error) {
      console.error('Error executing operation:', error);
      toast(error instanceof Error ? error.message : 'Ошибка выполнения операции', 'error');
    } finally {
      setExecuting(false);
    }
  };

  const handleCancel = () => {
    setParsedCommand(null);
    setShowExamples(true);
  };

  const handleUseExample = (example: string) => {
    setCommand(example);
    setShowExamples(false);
  };

  const handleRepeatCommand = (entry: HistoryEntry) => {
    setCommand(entry.command);
    setShowExamples(false);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">
          Массовые операции через AI
        </h3>
        <p className="text-sm text-[color:var(--text-secondary)]">
          Опишите, что нужно сделать на естественном языке
        </p>
      </div>

      {/* Command Input */}
      <div className="space-y-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-[color:var(--text-primary)]">
            Команда
          </label>
          <textarea
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                void handleParse();
              }
            }}
            placeholder="Например: Измени статус всех задач в работе на готово"
            rows={3}
            className="w-full rounded-xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] px-4 py-3 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] focus:border-[color:var(--surface-border-strong)] focus:outline-none focus:ring-1 focus:ring-[color:var(--surface-border-strong)]"
          />
          <div className="mt-1 text-xs text-[color:var(--text-tertiary)]">
            Нажмите Ctrl+Enter (Cmd+Enter) для быстрого распознавания
          </div>
        </div>

        <Button
          onClick={handleParse}
          loading={parsing}
          disabled={!command.trim() || parsing}
          className="w-full"
        >
          {parsing ? 'Распознавание...' : 'Распознать команду'}
        </Button>
      </div>

      {/* Examples */}
      {showExamples && !parsedCommand && (
        <div className="rounded-xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] p-4">
          <h4 className="mb-3 text-sm font-medium text-[color:var(--text-primary)]">
            Примеры команд
          </h4>
          <div className="space-y-2">
            {BULK_COMMAND_EXAMPLES.slice(0, 5).map((example, idx) => (
              <button
                key={idx}
                onClick={() => handleUseExample(example)}
                className="w-full rounded-lg border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] px-3 py-2 text-left text-sm text-[color:var(--text-secondary)] hover:border-[color:var(--surface-border-strong)] hover:bg-[color:var(--surface-base)] hover:text-[color:var(--text-primary)]"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Parsed Command Preview */}
      {parsedCommand && (
        <div className="space-y-4">
          {parsedCommand.operation ? (
            <>
              {/* Interpretation */}
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🤖</div>
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900">AI понял команду как:</h4>
                    <p className="mt-1 text-sm text-blue-800">{parsedCommand.interpretation}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-blue-700">
                      <span>Уверенность: {Math.round(parsedCommand.confidence * 100)}%</span>
                      {parsedCommand.operation.affectedCount !== undefined && (
                        <>
                          <span>•</span>
                          <span>
                            Затронет задач: {parsedCommand.operation.affectedCount}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Operation Details */}
              <div className="rounded-xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] p-4">
                <h4 className="mb-3 font-medium text-[color:var(--text-primary)]">
                  Детали операции
                </h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-[color:var(--text-tertiary)]">Тип операции: </span>
                    <span className="font-medium text-[color:var(--text-primary)]">
                      {getOperationTypeDescription(parsedCommand.operation.type)}
                    </span>
                  </div>

                  {Object.keys(parsedCommand.operation.filter).length > 0 && (
                    <div>
                      <div className="mb-1 text-[color:var(--text-tertiary)]">Фильтр:</div>
                      <div className="rounded-lg bg-[color:var(--surface-muted)] px-3 py-2">
                        {Object.entries(parsedCommand.operation.filter).map(([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <span className="text-[color:var(--text-tertiary)]">{key}:</span>
                            <span className="text-[color:var(--text-primary)]">
                              {Array.isArray(value) ? value.join(', ') : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {Object.keys(parsedCommand.operation.updates).length > 0 && (
                    <div>
                      <div className="mb-1 text-[color:var(--text-tertiary)]">Изменения:</div>
                      <div className="rounded-lg bg-[color:var(--surface-muted)] px-3 py-2">
                        {Object.entries(parsedCommand.operation.updates).map(([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <span className="text-[color:var(--text-tertiary)]">{key}:</span>
                            <span className="font-medium text-[color:var(--text-primary)]">
                              {Array.isArray(value) ? value.join(', ') : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Warnings */}
              {parsedCommand.warnings && parsedCommand.warnings.length > 0 && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                  <h4 className="mb-2 font-medium text-orange-900">⚠️ Предупреждения</h4>
                  <ul className="space-y-1 text-sm text-orange-800">
                    {parsedCommand.warnings.map((warning, idx) => (
                      <li key={idx}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={handleExecute}
                  loading={executing}
                  disabled={executing || (parsedCommand.operation.affectedCount === 0)}
                  className="flex-1"
                >
                  {executing ? 'Выполнение...' : 'Выполнить операцию'}
                </Button>
                <Button variant="secondary" onClick={handleCancel} disabled={executing}>
                  Отменить
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <h4 className="mb-2 font-medium text-red-900">❌ Не удалось распознать команду</h4>
              <p className="text-sm text-red-800">{parsedCommand.interpretation}</p>
              {parsedCommand.warnings && parsedCommand.warnings.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-red-700">
                  {parsedCommand.warnings.map((warning, idx) => (
                    <li key={idx}>• {warning}</li>
                  ))}
                </ul>
              )}
              <Button
                variant="secondary"
                onClick={handleCancel}
                size="sm"
                className="mt-3"
              >
                Попробовать снова
              </Button>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && !parsedCommand && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-[color:var(--text-primary)]">
            История операций
          </h4>
          <div className="space-y-2">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-4 rounded-xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] p-3"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-[color:var(--text-primary)]">
                    {entry.command}
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--text-tertiary)]">
                    {getOperationTypeDescription(entry.operation.type)} • 
                    Обновлено {entry.updatedCount} задач • 
                    {new Date(entry.timestamp).toLocaleString('ru-RU')}
                  </div>
                </div>
                <button
                  onClick={() => handleRepeatCommand(entry)}
                  className="text-xs text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
                >
                  Повторить
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

