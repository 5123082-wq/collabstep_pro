'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@/lib/ui/toast';
import { ContentBlock } from '@/components/ui/content-block';
import { useSessionContext } from '@/components/app/SessionContext';
import { canAccessAdmin, getRolesForDemoAccount } from '@/lib/auth/roles';

type ItemType = 'all' | 'project' | 'task';

type ProjectItem = {
  type: 'project';
  id: string;
  title: string;
  key: string;
  status: string;
  createdAt: string;
  tasksCount: number;
};

type TaskItem = {
  type: 'task';
  id: string;
  title: string;
  status: string;
  priority?: string;
  projectId: string;
  projectKey?: string;
  projectTitle?: string;
  assigneeId?: string;
  reason: 'project_owner' | 'assignee';
  createdAt: string;
  updatedAt?: string;
};

type ItemsResponse = {
  user: {
    id: string;
    name?: string;
    email?: string;
  };
  items: Array<ProjectItem | TaskItem>;
  counts: {
    projects: number;
    tasks: number;
  };
};

export default function AdminUserDataPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const session = useSessionContext();

  const userId = params.userId as string;
  const initialFilter = (searchParams.get('type') as ItemType) ?? 'all';
  const [filter, setFilter] = useState<ItemType>(
    initialFilter === 'project' || initialFilter === 'task' ? initialFilter : 'all'
  );
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ItemsResponse['items']>([]);
  const [user, setUser] = useState<ItemsResponse['user'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }
    const roles = getRolesForDemoAccount(session.email, session.role);
    if (!canAccessAdmin(roles)) {
      router.push('/dashboard?toast=forbidden');
      toast('Недостаточно прав для доступа к админ-панели', 'warning');
    }
  }, [session, router]);

  const loadItems = useCallback(
    async (selectedFilter: ItemType) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/admin/data/users/${userId}/items?type=${selectedFilter}`,
          { cache: 'no-store' }
        );
        if (!res.ok) {
          throw new Error(`Ошибка ${res.status}: не удалось загрузить данные`);
        }
        const data = (await res.json()) as ItemsResponse;
        setItems(data.items);
        setUser(data.user);
      } catch (err) {
        console.error('[AdminUserData] Failed to load items', err);
        setError(err instanceof Error ? err.message : 'Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    void loadItems(filter);
  }, [filter, loadItems]);

  const handleFilterChange = (next: ItemType) => {
    setFilter(next);
    const params = new URLSearchParams(window.location.search);
    if (next === 'all') {
      params.delete('type');
    } else {
      params.set('type', next);
    }
    const url = `${window.location.pathname}?${params.toString()}`.replace(/\?$/, '');
    router.replace(url);
  };

  const handleDelete = async (item: ProjectItem | TaskItem) => {
    const label =
      item.type === 'project'
        ? `проект "${item.title}"`
        : `задачу "${item.title}" (${item.projectKey ?? item.projectId})`;

    const getPreview = async () => {
      const url =
        item.type === 'project'
          ? `/api/pm/projects/${item.id}?preview=true`
          : `/api/pm/tasks/${item.id}?preview=true`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Не удалось получить превью удаления');
      }
      return res.json();
    };

    try {
      setRefreshing(true);

      const previewPayload = await getPreview();

      const confirmLines: string[] = [];
      if (item.type === 'project' && previewPayload?.data?.preview) {
        const preview = previewPayload.data.preview as {
          tasks: unknown[];
          dependencies: unknown[];
          related: Record<string, number>;
        };
        confirmLines.push(`Задач: ${preview.tasks?.length ?? 0}`);
        confirmLines.push(`Зависимостей: ${preview.dependencies?.length ?? 0}`);
        confirmLines.push(
          `Комментарии: ${preview.related?.comments ?? 0}, Уведомления: ${preview.related?.notifications ?? 0}`
        );
      } else if (item.type === 'task' && previewPayload?.data?.preview) {
        const preview = previewPayload.data.preview as {
          links: { blockers: unknown[]; blocks: unknown[]; children: unknown[] };
          related: { comments?: number; attachments?: { task?: number; comments?: number }; expenses?: number; notifications?: number };
        };
        confirmLines.push(
          `Связи: блокируют ${preview.links?.blockers?.length ?? 0}, блокирует ${preview.links?.blocks?.length ?? 0}, подзадач ${preview.links?.children?.length ?? 0}`
        );
        confirmLines.push(
          `Комментарии: ${preview.related?.comments ?? 0}, Файлы: ${
            (preview.related?.attachments?.task ?? 0) + (preview.related?.attachments?.comments ?? 0)
          }`
        );
        confirmLines.push(
          `Расходы: ${preview.related?.expenses ?? 0}, Уведомления: ${preview.related?.notifications ?? 0}`
        );
      }

      const confirmText = [
        `Удалить ${label}?`,
        ...(confirmLines.length > 0 ? ['', ...confirmLines] : []),
        '',
        'Действие необратимо.'
      ].join('\n');

      if (!confirm(confirmText)) {
        setRefreshing(false);
        return;
      }

    try {
      if (item.type === 'project') {
        const res = await fetch(`/api/pm/projects/${item.id}`, {
          method: 'DELETE'
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Не удалось удалить проект');
        }
        toast(`Проект удален`, 'success');
      } else {
        const res = await fetch(`/api/pm/tasks/${item.id}`, {
          method: 'DELETE'
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Не удалось удалить задачу');
        }
        toast(`Задача удалена`, 'success');
      }

      await loadItems(filter);
    } catch (err) {
      console.error('[AdminUserData] Delete error', err);
      toast(err instanceof Error ? err.message : 'Ошибка при удалении', 'warning');
    } finally {
      setRefreshing(false);
    }
    } catch (err) {
      console.error('[AdminUserData] Preview error', err);
      toast(err instanceof Error ? err.message : 'Не удалось получить превью удаления', 'warning');
      setRefreshing(false);
    }
  };

  const filteredItems = useMemo(() => items, [items]);

  if (!session) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-neutral-400">
        Загрузка сессии...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-neutral-400">
            Пользователь: {user?.name || userId}
          </p>
          {user?.email && (
            <p className="text-xs text-neutral-500">Email: {user.email}</p>
          )}
          <h1 className="text-xl font-semibold text-neutral-50 mt-2">
            Данные пользователя для удаления
          </h1>
          <p className="text-sm text-neutral-400">
            Сухой список проектов и задач для админов. Здесь нет архивирования, только удаление.
          </p>
        </div>
        <Link
          href="/admin/data"
          className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-200 transition hover:border-indigo-500/40 hover:bg-indigo-500/10"
        >
          Назад к списку пользователей
        </Link>
      </div>

      <ContentBlock>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-neutral-400">Показать:</span>
          {(['all', 'project', 'task'] as ItemType[]).map((t) => (
            <button
              key={t}
              onClick={() => handleFilterChange(t)}
              className={`rounded-lg px-3 py-1 text-sm transition border ${
                filter === t
                  ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-50'
                  : 'border-neutral-800 bg-neutral-950/60 text-neutral-300 hover:border-neutral-700'
              }`}
              disabled={refreshing}
            >
              {t === 'all' ? 'Все' : t === 'project' ? 'Проекты' : 'Задачи'}
            </button>
          ))}
          <button
            onClick={() => loadItems(filter)}
            className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-1 text-sm text-neutral-300 transition hover:border-indigo-500/40 hover:bg-indigo-500/10"
            disabled={refreshing}
          >
            Обновить
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-neutral-400">Загрузка...</div>
        ) : error ? (
          <div className="py-6 text-center text-red-400 text-sm">{error}</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-10 text-center text-neutral-400">
            Нет данных для этого пользователя
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-400 border-b border-neutral-800">
                  <th className="px-3 py-2">Тип</th>
                  <th className="px-3 py-2">Название</th>
                  <th className="px-3 py-2">Статус</th>
                  <th className="px-3 py-2">Проект</th>
                  <th className="px-3 py-2">Создано</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={`${item.type}-${item.id}`}
                    className="border-b border-neutral-900/60"
                  >
                    <td className="px-3 py-2 align-middle text-neutral-300">
                      {item.type === 'project' ? 'Проект' : 'Задача'}
                    </td>
                    <td className="px-3 py-2 align-middle text-neutral-50">
                      {item.type === 'project' ? (
                        <div className="space-y-1">
                          <div className="font-medium">
                            {item.key} — {item.title}
                          </div>
                          <div className="text-xs text-neutral-500">
                            Задач: {item.tasksCount}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="font-medium">{item.title}</div>
                          <div className="text-xs text-neutral-500">
                            {item.priority ? `Приоритет: ${item.priority}` : 'Без приоритета'}
                          </div>
                          <div className="text-xs text-neutral-500">
                            Привязка: {item.reason === 'project_owner' ? 'в проекте пользователя' : 'назначена пользователю'}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle text-neutral-400">
                      {item.status}
                    </td>
                    <td className="px-3 py-2 align-middle text-neutral-400">
                      {item.type === 'project'
                        ? '—'
                        : item.projectKey
                          ? `${item.projectKey} — ${item.projectTitle ?? ''}`
                          : item.projectTitle ?? item.projectId}
                    </td>
                    <td className="px-3 py-2 align-middle text-neutral-400">
                      {new Date(item.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-3 py-2 align-middle text-right">
                      <button
                        onClick={() => void handleDelete(item)}
                        className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-1 text-sm text-red-100 transition hover:border-red-600 hover:bg-red-900/60 disabled:opacity-50"
                        disabled={refreshing}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ContentBlock>
    </div>
  );
}
