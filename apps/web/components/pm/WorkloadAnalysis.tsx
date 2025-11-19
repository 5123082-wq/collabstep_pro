/**
 * WorkloadAnalysis Component
 * 
 * Компонент для визуализации анализа загруженности команды
 * - График загруженности участников
 * - Выделение перегруженных участников
 * - Рекомендации по перераспределению задач
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/ui/toast';
import { cn } from '@/lib/utils';

type MemberWorkload = {
  userId: string;
  userName: string;
  activeTasks: number;
  estimatedHours: number;
  upcomingDeadlines: number;
  overloadLevel: 'low' | 'medium' | 'high' | 'critical';
  capacity: number; // 0-100%
};

type RedistributionSuggestion = {
  taskId: string;
  taskTitle: string;
  fromUserId: string;
  toUserId: string;
  reason: string;
};

type WorkloadAnalysisData = {
  members: MemberWorkload[];
  overloadedMembers: string[];
  underutilizedMembers: string[];
  recommendations: string[];
  redistributionSuggestions?: RedistributionSuggestion[];
};

type WorkloadAnalysisProps = {
  projectId: string;
  autoLoad?: boolean;
  onRedistribute?: (suggestion: RedistributionSuggestion) => Promise<void>;
  className?: string;
};

export default function WorkloadAnalysis({
  projectId,
  autoLoad = false,
  onRedistribute,
  className
}: WorkloadAnalysisProps) {
  const [analysis, setAnalysis] = useState<WorkloadAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [redistributing, setRedistributing] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/analyze-workload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Не удалось проанализировать загруженность');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      toast('Анализ загруженности завершён', 'success');
    } catch (error) {
      console.error('Error analyzing workload:', error);
      toast(error instanceof Error ? error.message : 'Ошибка анализа загруженности', 'warning');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (autoLoad) {
      void handleAnalyze();
    }
  }, [autoLoad, handleAnalyze]);

  const handleRedistribute = async (suggestion: RedistributionSuggestion) => {
    setRedistributing(suggestion.taskId);
    try {
      if (onRedistribute) {
        await onRedistribute(suggestion);
      } else {
        // Default implementation: update task assignee
        const response = await fetch(`/api/pm/tasks/${suggestion.taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assigneeId: suggestion.toUserId
          })
        });

        if (!response.ok) {
          throw new Error('Не удалось перераспределить задачу');
        }
      }

      toast('Задача перераспределена', 'success');
      // Refresh analysis
      await handleAnalyze();
    } catch (error) {
      console.error('Error redistributing task:', error);
      toast(error instanceof Error ? error.message : 'Ошибка перераспределения задачи', 'warning');
    } finally {
      setRedistributing(null);
    }
  };

  const getOverloadLevelColor = (level: MemberWorkload['overloadLevel']) => {
    switch (level) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getOverloadLevelLabel = (level: MemberWorkload['overloadLevel']) => {
    switch (level) {
      case 'critical':
        return 'Критическая перегрузка';
      case 'high':
        return 'Высокая нагрузка';
      case 'medium':
        return 'Средняя нагрузка';
      case 'low':
        return 'Низкая нагрузка';
      default:
        return 'Неизвестно';
    }
  };

  const getCapacityColor = (capacity: number) => {
    if (capacity >= 90) return 'text-red-600';
    if (capacity >= 70) return 'text-orange-600';
    if (capacity >= 50) return 'text-yellow-600';
    if (capacity >= 30) return 'text-green-600';
    return 'text-gray-600';
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">
            Анализ загруженности команды
          </h3>
          <p className="text-sm text-[color:var(--text-secondary)]">
            AI анализирует распределение задач и предлагает оптимизации
          </p>
        </div>
        <Button onClick={handleAnalyze} loading={loading} size="sm">
          {loading ? 'Анализ...' : analysis ? 'Обновить' : 'Проанализировать'}
        </Button>
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Members Workload */}
          <div className="space-y-3">
            <h4 className="font-medium text-[color:var(--text-primary)]">
              Загруженность участников
            </h4>
            <div className="space-y-2">
              {analysis.members.map((member) => (
                <div
                  key={member.userId}
                  className={cn(
                    'rounded-xl border p-4',
                    analysis.overloadedMembers.includes(member.userId)
                      ? 'border-red-200 bg-red-50'
                      : analysis.underutilizedMembers.includes(member.userId)
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)]'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h5 className="font-medium text-[color:var(--text-primary)]">
                          {member.userName}
                        </h5>
                        <span
                          className={cn(
                            'rounded-md px-2 py-0.5 text-xs font-medium',
                            getOverloadLevelColor(member.overloadLevel),
                            'text-white'
                          )}
                        >
                          {getOverloadLevelLabel(member.overloadLevel)}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-[color:var(--text-tertiary)]">Активных задач: </span>
                          <span className="font-medium text-[color:var(--text-primary)]">
                            {member.activeTasks}
                          </span>
                        </div>
                        <div>
                          <span className="text-[color:var(--text-tertiary)]">Оценка времени: </span>
                          <span className="font-medium text-[color:var(--text-primary)]">
                            {member.estimatedHours}ч
                          </span>
                        </div>
                        <div>
                          <span className="text-[color:var(--text-tertiary)]">Дедлайнов на неделю: </span>
                          <span className="font-medium text-[color:var(--text-primary)]">
                            {member.upcomingDeadlines}
                          </span>
                        </div>
                      </div>

                      {/* Capacity Bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[color:var(--text-tertiary)]">Загруженность</span>
                          <span className={cn('font-medium', getCapacityColor(member.capacity))}>
                            {member.capacity}%
                          </span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className={cn(
                              'h-full transition-all',
                              member.capacity >= 90
                                ? 'bg-red-500'
                                : member.capacity >= 70
                                ? 'bg-orange-500'
                                : member.capacity >= 50
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            )}
                            style={{ width: `${Math.min(member.capacity, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <h4 className="mb-3 font-semibold text-blue-900">💡 Рекомендации</h4>
              <ul className="space-y-2 text-sm text-blue-800">
                {analysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-blue-600">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Redistribution Suggestions */}
          {analysis.redistributionSuggestions && analysis.redistributionSuggestions.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-[color:var(--text-primary)]">
                Предложения по перераспределению
              </h4>
              <div className="space-y-2">
                {analysis.redistributionSuggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-4 rounded-xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] p-4"
                  >
                    <div className="flex-1">
                      <h5 className="font-medium text-[color:var(--text-primary)]">
                        {suggestion.taskTitle}
                      </h5>
                      <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                        {suggestion.reason}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-[color:var(--text-tertiary)]">
                        <span>
                          От: {analysis.members.find(m => m.userId === suggestion.fromUserId)?.userName || 'Неизвестно'}
                        </span>
                        <span>→</span>
                        <span>
                          К: {analysis.members.find(m => m.userId === suggestion.toUserId)?.userName || 'Неизвестно'}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleRedistribute(suggestion)}
                      loading={redistributing === suggestion.taskId}
                      disabled={redistributing !== null}
                    >
                      Применить
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] p-4">
              <div className="text-xl font-bold text-[color:var(--text-primary)]">
                {analysis.members.length}
              </div>
              <div className="text-sm text-[color:var(--text-secondary)]">Всего участников</div>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="text-xl font-bold text-red-900">
                {analysis.overloadedMembers.length}
              </div>
              <div className="text-sm text-red-700">Перегружено</div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="text-xl font-bold text-blue-900">
                {analysis.underutilizedMembers.length}
              </div>
              <div className="text-sm text-blue-700">Недозагружено</div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!analysis && !loading && (
        <div className="rounded-xl border border-dashed border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] p-12 text-center">
          <p className="text-sm text-[color:var(--text-secondary)]">
            Нажмите &quot;Проанализировать&quot; для анализа загруженности команды
          </p>
        </div>
      )}
    </div>
  );
}

