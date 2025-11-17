'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/ui/toast';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalTitle, ModalDescription } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { ContentBlock } from '@/components/ui/content-block';
import { isDemoAdminEmail } from '@/lib/auth/demo-session';

type AIAgent = {
  id: string;
  name: string;
  email: string;
  title: string;
  agentType: 'assistant' | 'reviewer' | 'reminder' | 'summarizer';
  responseTemplates?: string[];
  behavior?: {
    autoRespond?: boolean;
    responseStyle?: 'short' | 'detailed';
  };
};

type ProjectInfo = {
  id: string;
  name: string;
  key: string;
};

const AGENT_TYPE_LABELS: Record<string, string> = {
  assistant: 'Помощник',
  reviewer: 'Ревьюер',
  reminder: 'Напоминатель',
  summarizer: 'Суммаризатор'
};

const AGENT_TYPE_DESCRIPTIONS: Record<string, string> = {
  assistant: 'Автоматически отвечает на вопросы и помогает с задачами',
  reviewer: 'Проверяет задачи и оставляет комментарии',
  reminder: 'Напоминает о приближающихся дедлайнах',
  summarizer: 'Суммирует обсуждения и комментарии'
};

export default function AiAgentsPage() {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [agentProjects, setAgentProjects] = useState<Record<string, ProjectInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedProjects, setSelectedProjects] = useState<Record<string, string>>({});
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [viewingAgent, setViewingAgent] = useState<AIAgent | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    title: string;
    responseTemplates: string;
    autoRespond: boolean;
    responseStyle: 'short' | 'detailed';
  }>({
    name: '',
    title: '',
    responseTemplates: '',
    autoRespond: false,
    responseStyle: 'short'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadData();
    // Проверить, является ли пользователь админом
    void checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/auth/me', { headers: { 'cache-control': 'no-store' } });
      const payload = (await response.json()) as { authenticated?: boolean; email?: string };
      if (payload.authenticated && payload.email) {
        setIsAdmin(isDemoAdminEmail(payload.email));
      }
    } catch (err) {
      console.error('Failed to check admin status', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Загрузить всех агентов
      const agentsResponse = await fetch('/api/pm/ai-agents');
      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json();
        setAgents(agentsData.data?.agents || []);
      }

      // Загрузить проекты
      const projectsResponse = await fetch('/api/pm/projects?pageSize=100');
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        const projectsList = (projectsData.items || []).map((p: any) => ({
          id: p.id,
          name: p.name || p.title,
          key: p.key
        }));
        setProjects(projectsList);

        // Загрузить информацию о том, в каких проектах используется каждый агент
        const agentProjectsMap: Record<string, ProjectInfo[]> = {};
        
        // Для каждого проекта проверяем наличие агентов
        for (const project of projectsList) {
          try {
            const response = await fetch(`/api/pm/projects/${project.id}/ai-agents`);
            if (response.ok) {
              const data = await response.json();
              const projectAgents = data.data?.agents || [];
              for (const agent of projectAgents) {
                if (!agentProjectsMap[agent.id]) {
                  agentProjectsMap[agent.id] = [];
                }
                agentProjectsMap[agent.id].push(project);
              }
            }
          } catch (err) {
            // Игнорируем ошибки доступа
          }
        }
        setAgentProjects(agentProjectsMap);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast('Не удалось загрузить данные', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToProject = async (agentId: string, projectId: string) => {
    try {
      const response = await fetch(`/api/pm/projects/${projectId}/ai-agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Не удалось добавить агента');
      }

      toast('Агент добавлен в проект', 'success');
      void loadData();
    } catch (error) {
      console.error('Error adding agent:', error);
      toast(error instanceof Error ? error.message : 'Не удалось добавить агента', 'error');
    }
  };

  const handleRemoveFromProject = async (agentId: string, projectId: string) => {
    try {
      const response = await fetch(`/api/pm/projects/${projectId}/ai-agents?agentId=${agentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Не удалось удалить агента');
      }

      toast('Агент удалён из проекта', 'success');
      void loadData();
    } catch (error) {
      console.error('Error removing agent:', error);
      toast(error instanceof Error ? error.message : 'Не удалось удалить агента', 'error');
    }
  };

  const handleEditAgent = (agent: AIAgent) => {
    setEditingAgent(agent);
    setEditForm({
      name: agent.name,
      title: agent.title,
      responseTemplates: agent.responseTemplates?.join('\n') || '',
      autoRespond: agent.behavior?.autoRespond ?? false,
      responseStyle: agent.behavior?.responseStyle ?? 'short'
    });
  };

  const handleSaveAgent = async () => {
    if (!editingAgent) return;

    setSaving(true);
    try {
      const responseTemplatesArray = editForm.responseTemplates
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean);

      const response = await fetch(`/api/pm/ai-agents/${editingAgent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          title: editForm.title,
          responseTemplates: responseTemplatesArray,
          behavior: {
            autoRespond: editForm.autoRespond,
            responseStyle: editForm.responseStyle
          }
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Не удалось сохранить изменения');
      }

      toast('Агент успешно обновлён', 'success');
      setEditingAgent(null);
      void loadData();
    } catch (error) {
      console.error('Error saving agent:', error);
      toast(error instanceof Error ? error.message : 'Не удалось сохранить изменения', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-50">AI-агенты</h1>
          <p className="text-sm text-neutral-400">
            Настраивайте агентов, роли и наборы инструментов для автоматизации.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-6 text-center text-sm text-neutral-400">
          Загрузка агентов...
        </div>
      ) : (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.length === 0 ? (
          <div className="col-span-full rounded-xl border border-neutral-800 bg-neutral-950/40 p-6 text-center text-sm text-neutral-400">
            Нет доступных AI-агентов
          </div>
        ) : (
          agents.map((agent) => {
            const agentProjectsList = agentProjects[agent.id] || [];
            return (
              <ContentBlock
                key={agent.id}
                as="article"
                interactive
                className="group flex flex-col cursor-pointer"
                onClick={() => setViewingAgent(agent)}
              >
                <header className="mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-neutral-50">{agent.name}</h3>
                    <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-200 shrink-0">
                      AI
                    </span>
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-wide text-indigo-300">
                    {AGENT_TYPE_LABELS[agent.agentType]}
                  </p>
                  <p className="mt-1.5 text-sm text-neutral-400 line-clamp-2">
                    {agent.title}
                  </p>
                </header>

                <div className="mb-3 flex flex-wrap gap-1.5 text-xs text-neutral-500">
                  {agent.behavior?.autoRespond && (
                    <span className="rounded-full border border-neutral-800 bg-neutral-900/70 px-2 py-0.5">
                      ✓ Автоответы
                    </span>
                  )}
                  <span className="rounded-full border border-neutral-800 bg-neutral-900/70 px-2 py-0.5">
                    {agent.behavior?.responseStyle === 'detailed' ? 'Подробный' : 'Краткий'}
                  </span>
                </div>

                {/* Проекты, где используется агент */}
                <div className="mb-3 min-h-[3rem]" onClick={(e) => e.stopPropagation()}>
                  {agentProjectsList.length > 0 ? (
                    <>
                      <p className="mb-1.5 text-xs font-medium text-neutral-400">В проектах:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {agentProjectsList.slice(0, 2).map((project) => (
                          <span
                            key={project.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900/60 px-2 py-0.5 text-xs text-neutral-300"
                          >
                            {project.key}
                            <button
                              type="button"
                              onClick={() => void handleRemoveFromProject(agent.id, project.id)}
                              className="text-neutral-500 hover:text-neutral-200"
                              title="Удалить из проекта"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        {agentProjectsList.length > 2 && (
                          <span className="inline-flex items-center rounded-lg border border-neutral-800 bg-neutral-900/60 px-2 py-0.5 text-xs text-neutral-400">
                            +{agentProjectsList.length - 2}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="h-0" aria-hidden="true" />
                  )}
                </div>

                {/* Добавить в проект */}
                <div className="mt-auto space-y-2" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={selectedProjects[agent.id] || ''}
                    onChange={(e) => {
                      setSelectedProjects({ ...selectedProjects, [agent.id]: e.target.value });
                    }}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Добавить в проект...</option>
                    {projects
                      .filter((p) => !agentProjectsList.some((ap) => ap.id === p.id))
                      .map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.key}: {project.name}
                        </option>
                      ))}
                  </select>
                  {selectedProjects[agent.id] && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        const projectId = selectedProjects[agent.id];
                        if (projectId) {
                          void handleAddToProject(agent.id, projectId);
                          setSelectedProjects({ ...selectedProjects, [agent.id]: '' });
                        }
                      }}
                      className="w-full"
                    >
                      Добавить
                    </Button>
                  )}
                </div>
              </ContentBlock>
            );
          })
        )}
      </div>
      )}

      {/* Модальное окно просмотра/редактирования агента */}
      {viewingAgent && (
        <Modal open={!!viewingAgent} onOpenChange={(open) => !open && setViewingAgent(null)}>
          <ModalContent className="max-w-3xl">
            <ModalHeader>
              <ModalTitle>{viewingAgent.name}</ModalTitle>
              <ModalDescription>
                {viewingAgent.title} • {AGENT_TYPE_LABELS[viewingAgent.agentType]}
              </ModalDescription>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-6">
                {/* Основная информация */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-neutral-200">Описание</h4>
                  <p className="text-sm text-neutral-400">{AGENT_TYPE_DESCRIPTIONS[viewingAgent.agentType]}</p>
                </div>

                {/* Поведение */}
                {viewingAgent.behavior && (
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-neutral-200">Поведение</h4>
                    <div className="space-y-2 text-sm text-neutral-400">
                      <div className="flex items-center gap-2">
                        <span>Автоответы:</span>
                        <span className={viewingAgent.behavior.autoRespond ? 'text-emerald-400' : 'text-neutral-500'}>
                          {viewingAgent.behavior.autoRespond ? 'Включены' : 'Выключены'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Стиль ответов:</span>
                        <span className="text-neutral-300">
                          {viewingAgent.behavior.responseStyle === 'detailed' ? 'Подробный' : 'Краткий'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Проекты */}
                {agentProjects[viewingAgent.id] && agentProjects[viewingAgent.id].length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-neutral-200">
                      Используется в проектах ({agentProjects[viewingAgent.id].length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {agentProjects[viewingAgent.id].map((project) => (
                        <div
                          key={project.id}
                          className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-1.5 text-sm"
                        >
                          <span className="text-neutral-300">
                            {project.key}: {project.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              void handleRemoveFromProject(viewingAgent.id, project.id);
                            }}
                            className="text-neutral-500 hover:text-neutral-200"
                            title="Удалить из проекта"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Добавить в проект */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-neutral-200">Добавить в проект</h4>
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedProjects[viewingAgent.id] || ''}
                      onChange={(e) => {
                        setSelectedProjects({ ...selectedProjects, [viewingAgent.id]: e.target.value });
                      }}
                      className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">Выберите проект...</option>
                      {projects
                        .filter((p) => !(agentProjects[viewingAgent.id] || []).some((ap) => ap.id === p.id))
                        .map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.key}: {project.name}
                          </option>
                        ))}
                    </select>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        const projectId = selectedProjects[viewingAgent.id];
                        if (projectId) {
                          void handleAddToProject(viewingAgent.id, projectId);
                          setSelectedProjects({ ...selectedProjects, [viewingAgent.id]: '' });
                        }
                      }}
                      disabled={!selectedProjects[viewingAgent.id]}
                    >
                      Добавить
                    </Button>
                  </div>
                </div>

                {/* Шаблоны ответов */}
                {viewingAgent.responseTemplates && viewingAgent.responseTemplates.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-neutral-200">
                      Шаблоны ответов ({viewingAgent.responseTemplates.length})
                    </h4>
                    <div className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
                      {viewingAgent.responseTemplates.map((template, idx) => (
                        <div key={idx} className="text-sm text-neutral-400">
                          • {template}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="secondary"
                onClick={() => setViewingAgent(null)}
              >
                Закрыть
              </Button>
              {isAdmin && (
                <Button
                  variant="primary"
                  onClick={() => {
                    handleEditAgent(viewingAgent);
                    setViewingAgent(null);
                  }}
                >
                  Редактировать
                </Button>
              )}
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* Модальное окно редактирования агента */}
      {editingAgent && (
        <Modal open={!!editingAgent} onOpenChange={(open) => !open && setEditingAgent(null)}>
          <ModalContent className="max-w-2xl">
            <ModalHeader>
              <ModalTitle>Редактировать агента: {editingAgent.name}</ModalTitle>
              <ModalDescription>
                Измените настройки агента. Изменения вступят в силу сразу после сохранения.
              </ModalDescription>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-300">
                    Название
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                    placeholder="Название агента"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-300">
                    Описание
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                    placeholder="Описание роли агента"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-300">
                    Шаблоны ответов (по одному на строку)
                  </label>
                  <Textarea
                    value={editForm.responseTemplates}
                    onChange={(e) => setEditForm({ ...editForm, responseTemplates: e.target.value })}
                    rows={6}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                    placeholder="Принял к сведению. Продолжаю работу.&#10;Понял задачу. Начинаю выполнение."
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    Каждая строка будет использоваться как отдельный шаблон ответа
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.autoRespond}
                      onChange={(e) => setEditForm({ ...editForm, autoRespond: e.target.checked })}
                      className="h-4 w-4 rounded border-neutral-800 bg-neutral-900/60 text-indigo-500 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-neutral-300">Автоматически отвечать на упоминания</span>
                  </label>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-neutral-300">
                      Стиль ответов
                    </label>
                    <select
                      value={editForm.responseStyle}
                      onChange={(e) => setEditForm({ ...editForm, responseStyle: e.target.value as 'short' | 'detailed' })}
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="short">Краткий</option>
                      <option value="detailed">Подробный</option>
                    </select>
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="secondary"
                onClick={() => setEditingAgent(null)}
                disabled={saving}
              >
                Отмена
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveAgent}
                disabled={saving || !editForm.name.trim()}
                loading={saving}
              >
                Сохранить
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </section>
  );
}
