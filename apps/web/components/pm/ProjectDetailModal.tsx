'use client';

import { useEffect, useState, useReducer } from 'react';
import { type Project } from '@/types/pm';
import { flags } from '@/lib/flags';
import { FeatureComingSoon } from '@/components/app/FeatureComingSoon';
import { trackEvent } from '@/lib/telemetry';
import { toast } from '@/lib/ui/toast';
import ProjectHeader from '@/components/pm/ProjectHeader';
import ProjectKPIs from '@/components/pm/ProjectKPIs';
import QuickActions from '@/components/pm/QuickActions';
import ProjectTeam from '@/components/pm/ProjectTeam';
import ProjectActivity from '@/components/pm/ProjectActivity';
import ProjectLinks from '@/components/pm/ProjectLinks';
import LimitsLog from '@/components/pm/LimitsLog';
import AutomationsLog from '@/components/pm/AutomationsLog';
import BudgetSettingsModal from '@/components/pm/BudgetSettingsModal';
import ExpenseDrawer, { type ExpenseProjectOption } from '@/components/finance/ExpenseDrawer';
import ProjectChat from '@/components/pm/ProjectChat';
import ProjectFilesCatalog from '@/components/pm/ProjectFilesCatalog';
import TasksGanttView from '@/components/pm/TasksGanttView';
import CreateTaskModal from '@/components/pm/CreateTaskModal';
import ProjectAIAgents from '@/components/pm/ProjectAIAgents';
import ProjectInviteModal from '@/components/pm/ProjectInviteModal';
import { ContentBlock } from '@/components/ui/content-block';
import LargeContentModal from '@/components/ui/large-content-modal';
import {
  drawerReducer,
  createDraft,
  type DrawerState,
  type FinanceRole
} from '@/domain/finance/expenses';
import { DEMO_WORKSPACE_ID } from '@/domain/finance/expenses';

function mapDemoRole(role: string | null): FinanceRole {
  if (role === 'admin') {
    return 'owner';
  }
  if (role === 'user') {
    return 'member';
  }
  return 'viewer';
}

type ProjectDetailModalProps = {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
};

export default function ProjectDetailModal({ projectId, isOpen, onClose }: ProjectDetailModalProps) {
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [role, setRole] = useState<FinanceRole>('viewer');
  const [projects, setProjects] = useState<ExpenseProjectOption[]>([]);

  const [drawerState, dispatchDrawer] = useReducer(drawerReducer, {
    open: false,
    expense: null,
    draft: createDraft(null, 'RUB'),
    saving: false,
    error: null,
    tab: 'details',
    history: [],
    loadingHistory: false
  } satisfies DrawerState);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showBudgetSettingsModal, setShowBudgetSettingsModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newLimit, setNewLimit] = useState('');
  const [savingLimit, setSavingLimit] = useState(false);
  const [publishingListing, setPublishingListing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'chat' | 'files' | 'gantt' | 'ai-agents'>('overview');
  const [projectTasks, setProjectTasks] = useState<any[]>([]);

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch('/api/auth/me', { headers: { 'cache-control': 'no-store' } });
        const payload = (await response.json()) as { authenticated?: boolean; email?: string; userId?: string; role?: string };
        if (payload.authenticated && payload.userId) {
          setCurrentUserId(payload.userId);
        } else if (payload.authenticated && payload.email) {
          setCurrentUserId(payload.email);
        }
        if (payload.authenticated) {
          setRole(mapDemoRole(payload.role ?? null));
        }
      } catch (err) {
        console.error('Failed to load user', err);
      }
    }
    void loadUser();
  }, []);

  useEffect(() => {
    async function loadProjects() {
      try {
        const response = await fetch('/api/pm/projects?pageSize=100');
        if (response.ok) {
          const data = await response.json();
          setProjects(
            (data.items || []).map((p: Project) => ({
              id: p.id,
              name: p.name
            }))
          );
        }
      } catch (err) {
        console.error('Failed to load projects', err);
      }
    }
    void loadProjects();
  }, []);

  useEffect(() => {
    if (!isOpen || !projectId) {
      return;
    }

    async function loadProject() {
      try {
        setLoading(true);
        const response = await fetch(`/api/pm/projects/${projectId}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error(`[Project Modal] Failed to load project: status=${response.status}, error=`, errorData);
          if (response.status === 404) {
            setError(`Проект не найден (404). ID: ${projectId}`);
            setLoading(false);
            return;
          }
          if (response.status === 403) {
            setError('Доступ запрещен. У вас нет прав для просмотра этого проекта.');
            setLoading(false);
            return;
          }
          throw new Error(errorData.error || `Failed to load project: ${response.status}`);
        }
        const data = await response.json();
        if (!data.ok || !data.data?.project) {
          console.error('Invalid response format:', data);
          throw new Error('Invalid response format');
        }
        setProject(data.data.project);
        setError(null);

        void loadProjectTasks(projectId);

        trackEvent('pm_project_viewed', {
          workspaceId: 'current',
          projectId: projectId,
          userId: currentUserId || 'current',
          source: 'modal'
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    void loadProject();
  }, [projectId, isOpen, currentUserId]);

  if (!flags.PM_NAV_PROJECTS_AND_TASKS || !flags.PM_PROJECT_CARD) {
    return (
      <LargeContentModal isOpen={isOpen} onClose={onClose}>
        <div className="p-6">
          <FeatureComingSoon title="Проект" />
        </div>
      </LargeContentModal>
    );
  }

  const loadProjectTasks = async (projId: string) => {
    try {
      const response = await fetch(`/api/pm/tasks?projectId=${projId}&pageSize=1000`);
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.data?.items) {
          setProjectTasks(data.data.items);
        }
      }
    } catch (err) {
      console.error('Failed to load project tasks:', err);
    }
  };

  const handleExpenseCreate = () => {
    dispatchDrawer({
      type: 'open-create',
      payload: { currency: 'RUB' }
    });
    setTimeout(() => {
      dispatchDrawer({
        type: 'update',
        payload: { projectId: projectId }
      });
    }, 0);
  };

  const handleExpenseSave = async () => {
    if (!project) return;

    try {
      dispatchDrawer({ type: 'set-saving', payload: true });
      dispatchDrawer({ type: 'set-error', payload: null });

      const workspaceId = project.workspaceId || DEMO_WORKSPACE_ID;
      
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          projectId: drawerState.draft.projectId || projectId,
          date: drawerState.draft.date || new Date().toISOString(),
          amount: drawerState.draft.amount || '0',
          currency: drawerState.draft.currency || 'RUB',
          category: drawerState.draft.category || 'Uncategorized',
          description: drawerState.draft.description,
          vendor: drawerState.draft.vendor,
          paymentMethod: drawerState.draft.paymentMethod,
          taxAmount: drawerState.draft.taxAmount,
          status: drawerState.draft.status || 'draft',
          attachments: drawerState.draft.attachments
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create expense' }));
        throw new Error(error.error || 'Failed to create expense');
      }

      const expense = await response.json();

      trackEvent('pm_expense_created', {
        workspaceId,
        projectId: drawerState.draft.projectId || projectId,
        userId: currentUserId || 'current',
        amount: drawerState.draft.amount,
        currency: drawerState.draft.currency,
        source: 'quick_actions'
      });

      if (expense.status === 'pending' && drawerState.draft.status !== 'pending') {
        trackEvent('pm_expense_limit_breached', {
          workspaceId,
          projectId: drawerState.draft.projectId || projectId,
          expenseId: expense.id,
          userId: currentUserId || 'current',
          amount: expense.amount,
          currency: expense.currency,
          source: 'ui'
        });
        trackEvent('pm_automation_triggered', {
          workspaceId,
          projectId: drawerState.draft.projectId || projectId,
          expenseId: expense.id,
          userId: currentUserId || 'current',
          automationType: 'budget_limit_exceeded',
          source: 'ui'
        });
        toast('Трата создана и автоматически переведена в статус "На согласовании" из-за превышения лимита бюджета', 'warning');
      } else {
        toast('Трата успешно создана', 'success');
      }

      dispatchDrawer({ type: 'close' });
      const projectResponse = await fetch(`/api/pm/projects/${projectId}`);
      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        if (projectData.ok && projectData.data?.project) {
          setProject(projectData.data.project);
        }
      }
    } catch (err) {
      dispatchDrawer({
        type: 'set-error',
        payload: err instanceof Error ? err.message : 'Failed to create expense'
      });
    } finally {
      dispatchDrawer({ type: 'set-saving', payload: false });
    }
  };

  const handleMarketplacePublish = async () => {
    if (!project || publishingListing) return;

    try {
      setPublishingListing(true);
      const response = await fetch(`/api/pm/projects/${projectId}/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create listing' }));
        throw new Error(error.error || 'Failed to create listing');
      }

      const data = await response.json();
      
      toast('Листинг успешно создан', 'success');
      
      const projectResponse = await fetch(`/api/pm/projects/${projectId}`);
      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        setProject(projectData.project);
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Не удалось создать листинг', 'warning');
    } finally {
      setPublishingListing(false);
    }
  };

  const handleUpdateLimit = () => {
    setNewLimit(project?.metrics?.budgetLimit?.toString() || '');
    setShowLimitModal(true);
  };

  const handleSaveBudgetLimit = async () => {
    if (!project || !newLimit || savingLimit) return;

    try {
      setSavingLimit(true);
      const response = await fetch(`/api/pm/projects/${projectId}/budget`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgetLimit: parseFloat(newLimit) })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update budget limit' }));
        throw new Error(error.error || 'Failed to update budget limit');
      }

      trackEvent('pm_budget_limit_updated', {
        workspaceId: project.workspaceId || 'current',
        projectId: projectId,
        userId: currentUserId || 'current',
        newLimit: parseFloat(newLimit)
      });

      toast('Лимит бюджета успешно обновлён', 'success');

      const projectResponse = await fetch(`/api/pm/projects/${projectId}`);
      if (projectResponse.ok) {
        const projectData = await response.json();
        if (projectData.ok && projectData.data?.project) {
          setProject(projectData.data.project);
        }
      }

      setShowLimitModal(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Не удалось обновить лимит бюджета', 'warning');
    } finally {
      setSavingLimit(false);
    }
  };

  const canAccessChatAndFiles = currentUserId && project && (project.ownerId === currentUserId || 
    (project.members || []).some((m: { userId: string }) => m.userId === currentUserId));

  return (
    <LargeContentModal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-6 p-6">
        {loading && (
          <div className="flex min-h-[320px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-800 border-t-indigo-500" />
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-100">
            <p className="font-semibold">Ошибка загрузки проекта</p>
            <p className="mt-2">{error}</p>
            <p className="mt-2 text-xs opacity-75">ID проекта: {projectId}</p>
          </div>
        )}

        {!loading && !error && project && (
          <>
            <ProjectHeader project={project} />

            {canAccessChatAndFiles && (
              <div className="flex gap-2 border-b border-neutral-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    activeTab === 'overview'
                      ? 'border-b-2 border-indigo-500 text-white'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Обзор
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('chat')}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    activeTab === 'chat'
                      ? 'border-b-2 border-indigo-500 text-white'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Чат
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('files')}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    activeTab === 'files'
                      ? 'border-b-2 border-indigo-500 text-white'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Файлы
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('gantt')}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    activeTab === 'gantt'
                      ? 'border-b-2 border-indigo-500 text-white'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Гант
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ai-agents')}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    activeTab === 'ai-agents'
                      ? 'border-b-2 border-indigo-500 text-white'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  AI-агенты
                </button>
              </div>
            )}

            {activeTab === 'overview' && (
              <>
                <ProjectKPIs 
                  project={project} 
                  onUpdateLimit={handleUpdateLimit}
                  {...(flags.BUDGET_LIMITS && { onBudgetSettingsClick: () => setShowBudgetSettingsModal(true) })}
                />

                <QuickActions
                  project={project}
                  onTaskCreate={() => {
                    setShowCreateTaskModal(true);
                  }}
                  onInvite={() => {
                    setShowInviteModal(true);
                  }}
                  onExpenseCreate={handleExpenseCreate}
                  onMarketplacePublish={handleMarketplacePublish}
                />

                <div className="grid gap-6 lg:grid-cols-2">
                  <ProjectTeam project={project} currentUserId={currentUserId} />
                  <ProjectLinks project={project} />
                </div>

                {project.metrics?.budgetLimit && (
                  <LimitsLog project={project} />
                )}

                {flags.FINANCE_AUTOMATIONS && (
                  <AutomationsLog project={project} />
                )}

                <ProjectActivity project={project} />
              </>
            )}

            {activeTab === 'chat' && canAccessChatAndFiles && (
              <ProjectChat projectId={projectId} currentUserId={currentUserId} />
            )}

            {activeTab === 'files' && canAccessChatAndFiles && (
              <ProjectFilesCatalog projectId={projectId} />
            )}

            {activeTab === 'gantt' && (
              <TasksGanttView projectId={projectId} tasks={projectTasks} />
            )}

            {activeTab === 'ai-agents' && (
              <div className="space-y-6">
                <ProjectAIAgents 
                  projectId={projectId} 
                  canManage={
                    project.ownerId === currentUserId || 
                    role === 'owner' || 
                    role === 'admin'
                  }
                />
              </div>
            )}

            {showLimitModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                <ContentBlock className="w-full max-w-md shadow-2xl">
                  <h3 className="mb-4 text-lg font-semibold text-white">Изменить лимит бюджета</h3>
                  <label className="mb-4 flex flex-col gap-2 text-sm text-neutral-300">
                    Новый лимит
                    <input
                      type="number"
                      step="0.01"
                      value={newLimit}
                      onChange={(e) => setNewLimit(e.target.value)}
                      className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-white"
                      placeholder="Введите новый лимит"
                    />
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleSaveBudgetLimit}
                      disabled={savingLimit || !newLimit}
                      className="flex-1 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingLimit ? 'Сохранение...' : 'Сохранить'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLimitModal(false)}
                      disabled={savingLimit}
                      className="flex-1 rounded-lg border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:bg-neutral-900 disabled:opacity-50"
                    >
                      Отмена
                    </button>
                  </div>
                </ContentBlock>
              </div>
            )}

            <ExpenseDrawer
              state={drawerState}
              role={role}
              onClose={() => dispatchDrawer({ type: 'close' })}
              onDraftChange={(patch) => dispatchDrawer({ type: 'update', payload: patch })}
              onSave={handleExpenseSave}
              onStatusChange={(status) => {
                dispatchDrawer({ type: 'update', payload: { status } });
              }}
              onTabChange={(tab) => dispatchDrawer({ type: 'switch-tab', payload: tab })}
              projectOptions={projects}
              projectSelectionDisabled={false}
            />

            {flags.BUDGET_LIMITS && (
              <BudgetSettingsModal
                projectId={projectId}
                workspaceId={project.workspaceId || 'current'}
                currentUserId={currentUserId}
                isOpen={showBudgetSettingsModal}
                onClose={() => setShowBudgetSettingsModal(false)}
                onSaved={() => {
                  void fetch(`/api/pm/projects/${projectId}`)
                    .then((res) => {
                      if (res.ok) {
                        return res.json();
                      }
                      return null;
                    })
                    .then((data) => {
                      if (data?.ok && data.data?.project) {
                        setProject(data.data.project);
                      }
                    })
                    .catch((error) => {
                      console.error('Error reloading project:', error);
                    });
                }}
              />
            )}

            <CreateTaskModal
              projectId={projectId}
              isOpen={showCreateTaskModal}
              onClose={() => setShowCreateTaskModal(false)}
              onSuccess={() => {
                void fetch(`/api/pm/projects/${projectId}`)
                  .then((res) => {
                    if (res.ok) {
                      return res.json();
                    }
                    return null;
                  })
                  .then((data) => {
                    if (data?.ok && data.data?.project) {
                      setProject(data.data.project);
                    }
                  })
                  .catch((error) => {
                    console.error('Error reloading project:', error);
                  });
              }}
            />

            {project && (
              <ProjectInviteModal
                projectId={projectId}
                projectName={project.name}
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                onSuccess={() => {
                  void fetch(`/api/pm/projects/${projectId}`)
                    .then((res) => {
                      if (res.ok) {
                        return res.json();
                      }
                      return null;
                    })
                    .then((data) => {
                      if (data?.ok && data.data?.project) {
                        setProject(data.data.project);
                      }
                    })
                    .catch((error) => {
                      console.error('Error reloading project:', error);
                    });
                }}
              />
            )}
          </>
        )}
      </div>
    </LargeContentModal>
  );
}

