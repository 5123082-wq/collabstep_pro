'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// @ts-expect-error lucide-react icon types
import { FileText, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from '@/lib/ui/toast';
import { canAccessAdmin, getRolesForDemoAccount } from '@/lib/auth/roles';
import { ContentBlock } from '@/components/ui/content-block';
import { useSessionContext } from '@/components/app/SessionContext';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

interface UserData {
  userId: string;
  userName: string;
  userEmail: string;
  projectsCount: number;
  tasksCount: number;
  projects: Array<{
    id: string;
    key: string;
    title: string;
    status: string;
    tasksCount: number;
    createdAt: string;
  }>;
}

interface OrphanedTaskGroup {
  projectId: string;
  tasksCount: number;
  tasks: Array<{ id: string; title: string; number: number }>;
  hasMore: boolean;
}

interface DataStats {
  summary: {
    totalProjects: number;
    totalTasks: number;
    totalUsers: number;
    orphanedTasks?: number;
    orphanedProjects?: number;
  };
  users: UserData[];
  orphaned?: {
    tasks: {
      count: number;
      byProjectId: OrphanedTaskGroup[];
    };
    projects: Array<{
      id: string;
      key: string;
      title: string;
      ownerId: string;
      status: string;
      createdAt: string;
    }>;
  };
}

export default function AdminDataPage() {
  const router = useRouter();
  const session = useSessionContext();
  const [stats, setStats] = useState<DataStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [expandedOrphanedProjectId, setExpandedOrphanedProjectId] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/data/stats');
      if (!response.ok) {
        throw new Error('Failed to load stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
      toast('Ошибка при загрузке статистики', 'warning');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const roles = getRolesForDemoAccount(session.email, session.role);
    if (!canAccessAdmin(roles)) {
      router.push('/dashboard?toast=forbidden');
      toast('Недостаточно прав для доступа к админ-панели', 'warning');
      return;
    }

    void loadStats();
  }, [session, loadStats, router]);

  const handleClearAll = useCallback(async () => {
    if (!confirm('Вы уверены, что хотите удалить ВСЕ проекты и задачи из памяти? Это действие необратимо!')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/data/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to clear data');
      }

      const result = await response.json();
      toast(`Удалено: ${result.deleted.projects} проектов и ${result.deleted.tasks} задач`, 'success');
      await loadStats();
    } catch (error) {
      console.error('Error clearing data:', error);
      toast('Ошибка при удалении данных', 'warning');
    }
  }, [loadStats]);

  const handleClearUser = useCallback(async (userId: string, userName: string) => {
    if (!confirm(`Вы уверены, что хотите удалить все проекты и задачи пользователя "${userName}"? Это действие необратимо!`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/data/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true, userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to clear user data');
      }

      const result = await response.json();
      toast(`Удалено: ${result.deleted.projects} проектов и ${result.deleted.tasks} задач`, 'success');
      await loadStats();
    } catch (error) {
      console.error('Error clearing user data:', error);
      toast('Ошибка при удалении данных пользователя', 'warning');
    }
  }, [loadStats]);

  const handleCleanupOrphaned = useCallback(async (type: 'tasks' | 'projects' | 'all', projectId?: string) => {
    const message = projectId
      ? `Вы уверены, что хотите удалить все задачи с projectId "${projectId}"? Это действие необратимо!`
      : type === 'tasks'
      ? `Вы уверены, что хотите удалить все осиротевшие задачи (${stats?.orphaned?.tasks.count || 0} шт.)? Это действие необратимо!`
      : type === 'projects'
      ? `Вы уверены, что хотите удалить все осиротевшие проекты (${stats?.orphaned?.projects.length || 0} шт.)? Это действие необратимо!`
      : `Вы уверены, что хотите удалить все осиротевшие задачи и проекты? Это действие необратимо!`;

    if (!confirm(message)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/data/cleanup-orphaned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: type === 'tasks' || type === 'all',
          projects: type === 'projects' || type === 'all',
          ...(projectId ? { projectId } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to cleanup orphaned data');
      }

      const result = await response.json();
      toast(`Удалено: ${result.deleted.tasks} задач и ${result.deleted.projects} проектов`, 'success');
      await loadStats();
    } catch (error) {
      console.error('Error cleaning up orphaned data:', error);
      toast('Ошибка при удалении осиротевших данных', 'warning');
    }
  }, [loadStats, stats]);

  // Показываем загрузку, пока session не загрузится
  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-neutral-400">Загрузка...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="admin-page space-y-6">
      <AdminPageHeader
        title="Управление данными"
        description="Просмотр и управление проектами и задачами в памяти системы"
        actions={
          <button
            onClick={loadStats}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </button>
        }
      />

      {/* Summary Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <ContentBlock size="sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400">Всего проектов</p>
                <p className="text-3xl font-semibold text-neutral-50">{stats.summary.totalProjects}</p>
                {stats.summary.orphanedProjects !== undefined && stats.summary.orphanedProjects > 0 && (
                  <p className="text-xs text-yellow-400 mt-1">Осиротевших: {stats.summary.orphanedProjects}</p>
                )}
              </div>
              <FileText className="h-8 w-8 text-blue-400" />
            </div>
          </ContentBlock>

          <ContentBlock size="sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400">Всего задач</p>
                <p className="text-3xl font-semibold text-neutral-50">{stats.summary.totalTasks}</p>
                {stats.summary.orphanedTasks !== undefined && stats.summary.orphanedTasks > 0 && (
                  <p className="text-xs text-yellow-400 mt-1">Осиротевших: {stats.summary.orphanedTasks}</p>
                )}
              </div>
              <FileText className="h-8 w-8 text-green-400" />
            </div>
          </ContentBlock>

          <ContentBlock size="sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400">Пользователей</p>
                <p className="text-3xl font-semibold text-neutral-50">{stats.summary.totalUsers}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-400" />
            </div>
          </ContentBlock>
        </div>
      )}

      {/* Danger Zone */}
      <div className="rounded-2xl border border-red-800/50 bg-red-950/20 p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-neutral-50 mb-2">Опасная зона</h2>
            <p className="text-sm text-neutral-400 mb-4">
              Удаление всех данных необратимо. Будут удалены все проекты, задачи и связанные данные из памяти системы.
            </p>
            <button
              onClick={handleClearAll}
              disabled={!stats || stats.summary.totalProjects === 0}
              className="rounded-xl border border-red-800 bg-red-950/60 px-4 py-2 text-sm font-medium text-red-100 transition hover:border-red-600 hover:bg-red-900/60 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="inline h-4 w-4 mr-2" />
              Удалить все данные
            </button>
          </div>
        </div>
      </div>

      {/* Users Data */}
      {stats && stats.users.length > 0 && (
        <ContentBlock>
          <h2 className="mb-4 text-lg font-semibold text-neutral-50">Данные по пользователям</h2>
          <div className="space-y-3">
            {stats.users.map((user) => (
              <div
                key={user.userId}
                className="rounded-xl border border-neutral-800 bg-neutral-950/80 overflow-hidden"
              >
                {/* User Summary */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-neutral-50">{user.userName}</p>
                      <p className="text-sm text-neutral-400">{user.userEmail}</p>
                      <div className="mt-2 flex gap-4 text-sm">
                        <span className="text-neutral-400">
                          Проектов: <span className="text-blue-400 font-medium">{user.projectsCount}</span>
                        </span>
                        <span className="text-neutral-400">
                          Задач: <span className="text-green-400 font-medium">{user.tasksCount}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setExpandedUserId(expandedUserId === user.userId ? null : user.userId)}
                        className="rounded-lg border border-neutral-700 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-300 transition hover:border-indigo-500/40 hover:bg-indigo-500/10"
                      >
                        {expandedUserId === user.userId ? 'Скрыть' : 'Показать'}
                      </button>
                      <Link
                        href={`/admin/data/users/${user.userId}`}
                        className="rounded-lg border border-neutral-700 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-300 transition hover:border-indigo-500/40 hover:bg-indigo-500/10"
                      >
                        Удаление
                      </Link>
                      <button
                        onClick={() => handleClearUser(user.userId, user.userName)}
                        disabled={user.projectsCount === 0}
                        className="rounded-lg border border-red-800 bg-red-950/60 px-3 py-2 text-sm text-red-100 transition hover:border-red-600 hover:bg-red-900/60 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="inline h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Projects List */}
                {expandedUserId === user.userId && user.projects.length > 0 && (
                  <div className="border-t border-neutral-800 bg-neutral-950/40 p-4">
                    <p className="text-sm font-medium text-neutral-300 mb-3">Проекты:</p>
                    <div className="space-y-2">
                      {user.projects.map((project) => (
                        <div
                          key={project.id}
                          className="rounded-lg border border-neutral-800/50 bg-neutral-900/40 p-3 text-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-neutral-50">
                                {project.key} - {project.title}
                              </p>
                              <div className="mt-1 flex gap-3 text-xs text-neutral-400">
                                <span>Статус: {project.status}</span>
                                <span>Задач: {project.tasksCount}</span>
                                <span>Создан: {new Date(project.createdAt).toLocaleDateString('ru-RU')}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ContentBlock>
      )}

      {/* Orphaned Data */}
      {stats && stats.orphaned && (stats.orphaned.tasks.count > 0 || stats.orphaned.projects.length > 0) && (
        <ContentBlock>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-50 mb-1">Осиротевшие данные</h2>
              <p className="text-sm text-neutral-400">
                Задачи и проекты без связанных сущностей (проекты без владельцев, задачи без проектов)
              </p>
            </div>
            {(stats.orphaned.tasks.count > 0 || stats.orphaned.projects.length > 0) && (
              <button
                onClick={() => handleCleanupOrphaned('all')}
                className="rounded-xl border border-red-800 bg-red-950/60 px-4 py-2 text-sm font-medium text-red-100 transition hover:border-red-600 hover:bg-red-900/60"
              >
                <Trash2 className="inline h-4 w-4 mr-2" />
                Удалить все осиротевшие
              </button>
            )}
          </div>

          {/* Orphaned Tasks */}
          {stats.orphaned.tasks.count > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-neutral-50">
                  Осиротевшие задачи ({stats.orphaned.tasks.count})
                </h3>
                <button
                  onClick={() => handleCleanupOrphaned('tasks')}
                  className="rounded-lg border border-red-800 bg-red-950/60 px-3 py-1.5 text-xs font-medium text-red-100 transition hover:border-red-600 hover:bg-red-900/60"
                >
                  <Trash2 className="inline h-3 w-3 mr-1" />
                  Удалить все
                </button>
              </div>
              <div className="space-y-3">
                {stats.orphaned.tasks.byProjectId.map((group) => (
                  <div
                    key={group.projectId}
                    className="rounded-xl border border-yellow-800/50 bg-yellow-950/20 overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-neutral-50">
                            Project ID: <span className="font-mono text-sm">{group.projectId}</span>
                          </p>
                          <p className="text-sm text-neutral-400 mt-1">
                            Задач: <span className="text-yellow-400 font-medium">{group.tasksCount}</span>
                            {group.hasMore && <span className="text-neutral-500"> (показано 10 из {group.tasksCount})</span>}
                          </p>
                          {expandedOrphanedProjectId === group.projectId && (
                            <div className="mt-3 space-y-1">
                              {group.tasks.map((task) => (
                                <div
                                  key={task.id}
                                  className="text-xs text-neutral-300 bg-neutral-900/40 rounded px-2 py-1"
                                >
                                  #{task.number}: {task.title}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setExpandedOrphanedProjectId(expandedOrphanedProjectId === group.projectId ? null : group.projectId)}
                            className="rounded-lg border border-neutral-700 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-300 transition hover:border-indigo-500/40 hover:bg-indigo-500/10"
                          >
                            {expandedOrphanedProjectId === group.projectId ? 'Скрыть' : 'Показать'}
                          </button>
                          <button
                            onClick={() => handleCleanupOrphaned('tasks', group.projectId)}
                            className="rounded-lg border border-red-800 bg-red-950/60 px-3 py-2 text-sm text-red-100 transition hover:border-red-600 hover:bg-red-900/60"
                          >
                            <Trash2 className="inline h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orphaned Projects */}
          {stats.orphaned.projects.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-neutral-50">
                  Осиротевшие проекты ({stats.orphaned.projects.length})
                </h3>
                <button
                  onClick={() => handleCleanupOrphaned('projects')}
                  className="rounded-lg border border-red-800 bg-red-950/60 px-3 py-1.5 text-xs font-medium text-red-100 transition hover:border-red-600 hover:bg-red-900/60"
                >
                  <Trash2 className="inline h-3 w-3 mr-1" />
                  Удалить все
                </button>
              </div>
              <div className="space-y-2">
                {stats.orphaned.projects.map((project) => (
                  <div
                    key={project.id}
                    className="rounded-lg border border-yellow-800/50 bg-yellow-950/20 p-3 text-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-neutral-50">
                          {project.key} - {project.title}
                        </p>
                        <div className="mt-1 flex gap-3 text-xs text-neutral-400">
                          <span>Статус: {project.status}</span>
                          <span>Владелец: <span className="font-mono">{project.ownerId}</span></span>
                          <span>Создан: {new Date(project.createdAt).toLocaleDateString('ru-RU')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ContentBlock>
      )}

      {/* Empty State */}
      {stats && stats.users.length === 0 && (!stats.orphaned || (stats.orphaned.tasks.count === 0 && stats.orphaned.projects.length === 0)) && (
        <ContentBlock variant="dashed" className="text-center">
          <FileText className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
          <p className="text-neutral-400">Нет данных для отображения</p>
          <p className="text-sm text-neutral-500 mt-1">Проекты и задачи отсутствуют в памяти системы</p>
        </ContentBlock>
      )}
    </div>
  );
}
