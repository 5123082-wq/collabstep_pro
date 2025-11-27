/**
 * AIProjectPlanner Component
 * 
 * Компонент для планирования проекта через AI
 * - Генерация структуры проекта из описания
 * - Предпросмотр сгенерированной структуры
 * - Редактирование и применение
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/ui/toast';
import { cn } from '@/lib/utils';

type ProjectPhase = {
  name: string;
  description: string;
  tasks: Array<{
    title: string;
    description: string;
    estimatedDays: number;
    priority: 'low' | 'med' | 'high' | 'urgent';
    suggestedStartDate?: string;
    dependencies?: string[];
  }>;
};

type ProjectStructure = {
  phases: ProjectPhase[];
  estimatedTotalDays?: number;
  suggestedTeamSize?: number;
  risks?: string[];
  recommendations?: string[];
};

type AIProjectPlannerProps = {
  projectId?: string;
  projectName?: string;
  onStructureGenerated?: (structure: ProjectStructure) => void;
  onApply?: (structure: ProjectStructure) => Promise<void>;
  className?: string;
  showAdvancedOptions?: boolean;
};

export default function AIProjectPlanner({
  projectId,
  projectName,
  onStructureGenerated,
  onApply,
  className,
  showAdvancedOptions = true
}: AIProjectPlannerProps) {
  const [description, setDescription] = useState('');
  const [structure, setStructure] = useState<ProjectStructure | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  
  // Advanced options
  const [teamSize, setTeamSize] = useState<number | undefined>(undefined);
  const [deadline, setDeadline] = useState<string | undefined>(undefined);
  const [taskGranularity, setTaskGranularity] = useState<'high' | 'medium' | 'low'>('medium');
  const [includeRisks, setIncludeRisks] = useState(true);
  const [includeRecommendations, setIncludeRecommendations] = useState(true);

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast('Введите описание проекта', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai/generate-project-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          projectName,
          teamSize,
          deadline,
          preferences: {
            taskGranularity,
            includeRisks,
            includeRecommendations
          }
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Не удалось сгенерировать структуру');
      }

      const data = await response.json();
      setStructure(data.structure);
      onStructureGenerated?.(data.structure);
      toast('Структура проекта сгенерирована', 'success');
    } catch (error) {
      console.error('Error generating structure:', error);
      toast(error instanceof Error ? error.message : 'Ошибка генерации структуры', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!structure) return;

    setApplying(true);
    try {
      if (onApply) {
        await onApply(structure);
      } else {
        // Default implementation: create tasks
        if (!projectId) {
          throw new Error('projectId is required to apply structure');
        }

        for (const phase of structure.phases) {
          for (const task of phase.tasks) {
            await fetch('/api/pm/tasks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId,
                title: `${phase.name}: ${task.title}`,
                description: `${task.description}\n\n**Этап:** ${phase.name}\n**Оценка:** ${task.estimatedDays} дней`,
                priority: task.priority,
                estimatedTime: task.estimatedDays * 8 // Конвертируем дни в часы
              })
            });
          }
        }
      }

      toast('Структура проекта применена', 'success');
      setStructure(null);
      setDescription('');
    } catch (error) {
      console.error('Error applying structure:', error);
      toast(error instanceof Error ? error.message : 'Ошибка применения структуры', 'warning');
    } finally {
      setApplying(false);
    }
  };

  const handleRemoveTask = (phaseIndex: number, taskIndex: number) => {
    if (!structure) return;

    const newStructure = { ...structure };
    const phase = newStructure.phases[phaseIndex];
    if (!phase) return;

    phase.tasks.splice(taskIndex, 1);
    setStructure(newStructure);
  };

  const priorityColors = {
    urgent: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    med: 'bg-blue-100 text-blue-800 border-blue-200',
    low: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const priorityLabels = {
    urgent: 'Срочно',
    high: 'Высокий',
    med: 'Средний',
    low: 'Низкий'
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Input Section */}
      {!structure && (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[color:var(--text-primary)]">
              Описание проекта
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите проект: цели, требования, ожидаемые результаты..."
              rows={8}
              className="w-full rounded-xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] px-4 py-3 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] focus:border-[color:var(--surface-border-strong)] focus:outline-none focus:ring-1 focus:ring-[color:var(--surface-border-strong)]"
            />
          </div>

          {/* Advanced Options */}
          {showAdvancedOptions && (
            <details className="space-y-3 rounded-xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] p-4">
              <summary className="cursor-pointer text-sm font-medium text-[color:var(--text-primary)]">
                Дополнительные настройки
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">
                    Размер команды
                  </label>
                  <input
                    type="number"
                    value={teamSize || ''}
                    onChange={(e) => setTeamSize(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Не указано"
                    min={1}
                    className="w-full rounded-lg border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">
                    Дедлайн
                  </label>
                  <input
                    type="date"
                    value={deadline || ''}
                    onChange={(e) => setDeadline(e.target.value || undefined)}
                    className="w-full rounded-lg border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">
                    Детализация задач
                  </label>
                  <select
                    value={taskGranularity}
                    onChange={(e) => setTaskGranularity(e.target.value as 'high' | 'medium' | 'low')}
                    className="w-full rounded-lg border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] px-3 py-2 text-sm"
                  >
                    <option value="low">Крупные задачи (1-2 недели)</option>
                    <option value="medium">Средние задачи (3-7 дней)</option>
                    <option value="high">Мелкие задачи (1-3 дня)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={includeRisks}
                      onChange={(e) => setIncludeRisks(e.target.checked)}
                      className="rounded"
                    />
                    <span>Включить анализ рисков</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={includeRecommendations}
                      onChange={(e) => setIncludeRecommendations(e.target.checked)}
                      className="rounded"
                    />
                    <span>Включить рекомендации</span>
                  </label>
                </div>
              </div>
            </details>
          )}

          <Button
            onClick={handleGenerate}
            loading={loading}
            disabled={!description.trim()}
            className="w-full"
          >
            {loading ? 'Генерация структуры...' : 'Сгенерировать структуру проекта'}
          </Button>
        </div>
      )}

      {/* Preview Section */}
      {structure && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">
              Предпросмотр структуры проекта
            </h3>
            <button
              onClick={() => {
                setStructure(null);
                setDescription('');
              }}
              className="text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
            >
              Начать заново
            </button>
          </div>

          {/* Summary */}
          {(structure.estimatedTotalDays || structure.suggestedTeamSize) && (
            <div className="rounded-xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] p-4">
              <div className="flex gap-6 text-sm">
                {structure.estimatedTotalDays && (
                  <div>
                    <span className="text-[color:var(--text-secondary)]">Оценка времени: </span>
                    <span className="font-medium text-[color:var(--text-primary)]">
                      {structure.estimatedTotalDays} дней
                    </span>
                  </div>
                )}
                {structure.suggestedTeamSize && (
                  <div>
                    <span className="text-[color:var(--text-secondary)]">Рекомендуемая команда: </span>
                    <span className="font-medium text-[color:var(--text-primary)]">
                      {structure.suggestedTeamSize} человек
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Phases and Tasks */}
          <div className="space-y-4">
            {structure.phases.map((phase, phaseIndex) => (
              <div
                key={phaseIndex}
                className="rounded-xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] p-4"
              >
                <div className="mb-3">
                  <h4 className="font-semibold text-[color:var(--text-primary)]">{phase.name}</h4>
                  <p className="mt-1 text-sm text-[color:var(--text-secondary)]">{phase.description}</p>
                </div>

                <div className="space-y-2">
                  {phase.tasks.map((task, taskIndex) => (
                    <div
                      key={taskIndex}
                      className="rounded-lg border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-medium text-[color:var(--text-primary)]">{task.title}</h5>
                            <span className={cn('rounded-md border px-2 py-0.5 text-xs font-medium', priorityColors[task.priority])}>
                              {priorityLabels[task.priority]}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-[color:var(--text-secondary)]">{task.description}</p>
                          <div className="mt-2 flex gap-4 text-xs text-[color:var(--text-tertiary)]">
                            <span>Оценка: {task.estimatedDays} дней</span>
                            {task.dependencies && task.dependencies.length > 0 && (
                              <span>Зависит от: {task.dependencies.join(', ')}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveTask(phaseIndex, taskIndex)}
                          className="text-[color:var(--text-tertiary)] hover:text-red-600"
                          title="Удалить задачу"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Risks */}
          {structure.risks && structure.risks.length > 0 && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
              <h4 className="mb-2 font-semibold text-orange-900">⚠️ Потенциальные риски</h4>
              <ul className="space-y-1 text-sm text-orange-800">
                {structure.risks.map((risk, idx) => (
                  <li key={idx}>• {risk}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {structure.recommendations && structure.recommendations.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <h4 className="mb-2 font-semibold text-blue-900">💡 Рекомендации</h4>
              <ul className="space-y-1 text-sm text-blue-800">
                {structure.recommendations.map((rec, idx) => (
                  <li key={idx}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleApply} loading={applying} className="flex-1">
              {applying ? 'Применение...' : 'Применить структуру'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setStructure(null)}
              disabled={applying}
            >
              Отменить
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
