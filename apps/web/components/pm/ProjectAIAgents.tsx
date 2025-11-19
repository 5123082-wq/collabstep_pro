'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/ui/toast';
// @ts-ignore
import { Bot, Brain, MessageSquare, Play, Plus, Settings, Sparkles, StopCircle, X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

type AIAgent = {
  id: string;
  name: string;
  email: string;
  title?: string;
  isAI: boolean;
  agentType?: 'assistant' | 'reviewer' | 'reminder' | 'summarizer';
  responseTemplates?: string[];
  behavior?: {
    autoRespond?: boolean;
    responseStyle?: 'short' | 'detailed';
  };
};

type ProjectAIAgentsProps = {
  projectId: string;
  canManage: boolean; // Может ли пользователь добавлять/удалять агентов
  className?: string;
};

const AGENT_TYPE_LABELS: Record<string, string> = {
  assistant: 'Помощник',
  reviewer: 'Ревьюер',
  reminder: 'Напоминатель',
  summarizer: 'Суммаризатор'
};

const AGENT_TYPE_DESCRIPTIONS: Record<string, string> = {
  assistant: 'Помогает с общими вопросами по проекту и задачам',
  reviewer: 'Проверяет задачи и даёт обратную связь',
  reminder: 'Напоминает о дедлайнах и просроченных задачах',
  summarizer: 'Создаёт краткие сводки обсуждений и комментариев'
};

export default function ProjectAIAgents({
  projectId,
  canManage,
  className
}: ProjectAIAgentsProps) {
  const [projectAgents, setProjectAgents] = useState<AIAgent[]>([]);
  const [availableAgents, setAvailableAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [showAvailable, setShowAvailable] = useState(false);

  // Загрузка AI-агентов проекта
  const loadProjectAgents = async () => {
    try {
      const response = await fetch(`/api/pm/projects/${projectId}/ai-agents`);

      if (!response.ok) {
        throw new Error('Failed to load project AI agents');
      }

      const data = await response.json();
      setProjectAgents(data.agents || []);
    } catch (error) {
      console.error('Failed to load project AI agents:', error);
      toast('Ошибка загрузки AI-агентов', 'warning');
    }
  };

  // Загрузка всех доступных AI-агентов
  const loadAvailableAgents = async () => {
    try {
      const response = await fetch('/api/ai-agents');

      if (!response.ok) {
        // Endpoint может не существовать, игнорируем ошибку
        setAvailableAgents([]);
        return;
      }

      const data = await response.json();
      const allAgents = data.agents || [];

      // Фильтруем агентов, которые уже добавлены в проект
      const projectAgentIds = new Set(projectAgents.map(a => a.id));
      const available = allAgents.filter((agent: AIAgent) => !projectAgentIds.has(agent.id));

      setAvailableAgents(available);
    } catch (error) {
      console.error('Failed to load available AI agents:', error);
      setAvailableAgents([]);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await loadProjectAgents();
      setLoading(false);
    };
    void load();
  }, [projectId]);

  useEffect(() => {
    if (showAvailable) {
      void loadAvailableAgents();
    }
  }, [showAvailable, projectAgents]);

  // Добавление агента в проект
  const handleAddAgent = async (agentId: string) => {
    setAdding(true);
    try {
      const response = await fetch(`/api/pm/projects/${projectId}/ai-agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to add AI agent');
      }

      toast('AI-агент добавлен в проект', 'success');
      await loadProjectAgents();
      setShowAvailable(false);
    } catch (error) {
      console.error('Failed to add AI agent:', error);

      if (error instanceof Error) {
        if (error.message.includes('ACCESS_DENIED')) {
          toast('Недостаточно прав для добавления агентов', 'warning');
        } else if (error.message.includes('ALREADY_EXISTS')) {
          toast('Агент уже добавлен в проект', 'warning');
        } else {
          toast('Ошибка добавления AI-агента', 'warning');
        }
      } else {
        toast('Ошибка добавления AI-агента', 'warning');
      }
    } finally {
      setAdding(false);
    }
  };

  // Удаление агента из проекта
  const handleRemoveAgent = async (agentId: string) => {
    setRemoving(agentId);
    try {
      const response = await fetch(
        `/api/pm/projects/${projectId}/ai-agents?agentId=${agentId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to remove AI agent');
      }

      toast('AI-агент удалён из проекта', 'success');
      await loadProjectAgents();
    } catch (error) {
      console.error('Failed to remove AI agent:', error);

      if (error instanceof Error && error.message.includes('ACCESS_DENIED')) {
        toast('Недостаточно прав для удаления агентов', 'warning');
      } else {
        toast('Ошибка удаления AI-агента', 'warning');
      }
    } finally {
      setRemoving(null);
    }
  };

  if (loading) {
    return (
      <div className={cn('rounded-lg border border-neutral-800 bg-neutral-950/40 p-4', className)}>
        <div className="text-sm text-neutral-400">Загрузка AI-агентов...</div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-neutral-800 bg-neutral-950/40', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 p-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-indigo-400" />
          <h3 className="text-sm font-medium text-white">AI-агенты проекта</h3>
          {projectAgents.length > 0 && (
            <span className="text-xs text-neutral-500">({projectAgents.length})</span>
          )}
        </div>
        {canManage && !showAvailable && (
          <Button
            onClick={() => setShowAvailable(true)}
            variant="ghost"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Добавить агента
          </Button>
        )}
      </div>

      {/* Project Agents List */}
      <div className="p-4 space-y-3">
        {projectAgents.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 text-neutral-700 mx-auto mb-3" />
            <p className="text-sm text-neutral-500 mb-2">
              В проекте пока нет AI-агентов
            </p>
            {canManage && (
              <Button
                onClick={() => setShowAvailable(true)}
                variant="secondary"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Добавить первого агента
              </Button>
            )}
          </div>
        ) : (
          projectAgents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-start justify-between rounded-lg border border-neutral-800 bg-neutral-900/60 p-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Bot className="h-4 w-4 text-indigo-400" />
                  <span className="text-sm font-medium text-white">{agent.name}</span>
                  {agent.agentType && (
                    <span className="text-xs text-neutral-500 px-2 py-0.5 rounded bg-neutral-800">
                      {AGENT_TYPE_LABELS[agent.agentType]}
                    </span>
                  )}
                </div>
                {agent.agentType && (
                  <p className="text-xs text-neutral-400 ml-6">
                    {AGENT_TYPE_DESCRIPTIONS[agent.agentType]}
                  </p>
                )}
              </div>
              {canManage && (
                <button
                  onClick={() => handleRemoveAgent(agent.id)}
                  disabled={removing === agent.id}
                  className="text-neutral-500 hover:text-rose-400 transition disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Available Agents Modal */}
      {showAvailable && (
        <div className="border-t border-neutral-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white">Доступные агенты</h4>
            <button
              onClick={() => setShowAvailable(false)}
              className="text-neutral-500 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {availableAgents.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-4">
                Все доступные агенты уже добавлены
              </p>
            ) : (
              availableAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-start justify-between rounded-lg border border-neutral-800 bg-neutral-900/40 p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Bot className="h-4 w-4 text-indigo-400" />
                      <span className="text-sm font-medium text-white">{agent.name}</span>
                      {agent.agentType && (
                        <span className="text-xs text-neutral-500 px-2 py-0.5 rounded bg-neutral-800">
                          {AGENT_TYPE_LABELS[agent.agentType]}
                        </span>
                      )}
                    </div>
                    {agent.agentType && (
                      <p className="text-xs text-neutral-400 ml-6">
                        {AGENT_TYPE_DESCRIPTIONS[agent.agentType]}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => handleAddAgent(agent.id)}
                    disabled={adding}
                    variant="secondary"
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
