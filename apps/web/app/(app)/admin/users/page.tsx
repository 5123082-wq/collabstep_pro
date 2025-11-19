'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Shield, UserX, UserCheck, RefreshCw, Bot, Trash2, Edit } from 'lucide-react';
import { toast } from '@/lib/ui/toast';
import clsx from 'clsx';
import type { AdminUserView } from '@collabverse/api';
import { ContentBlock } from '@/components/ui/content-block';

interface User {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  status: 'active' | 'suspended' | 'invited';
  lastLoginAt: string;
  createdAt: string;
  isAI?: boolean; // Флаг для AI-агентов
}

function convertAdminUserToUser(adminUser: AdminUserView): User {
  // Проверяем, является ли строка UUID
  const isUUID = (str: string | undefined): boolean => {
    if (!str) return false;
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidPattern.test(str);
  };

  // Проверяем, что email валидный (не UUID и содержит @)
  const isValidEmail = (email: string | undefined): boolean => {
    if (!email) return false;
    return !isUUID(email) && email.includes('@');
  };

  // Получаем валидное имя (не UUID)
  const getDisplayName = (): string => {
    if (adminUser.name && !isUUID(adminUser.name)) {
      return adminUser.name;
    }
    // Если имя - это UUID, пытаемся использовать email
    if (isValidEmail(adminUser.email)) {
      return adminUser.email.split('@')[0]; // Используем часть до @ как имя
    }
    return 'Без имени';
  };

  // Получаем валидный email (не UUID)
  const getEmail = (): string => {
    if (isValidEmail(adminUser.email)) {
      return adminUser.email;
    }
    return 'Без email';
  };

  // Проверяем, является ли пользователь AI-агентом
  // По флагу isAI или по email (AI-агенты имеют домен @collabverse.ai)
  const isAI = adminUser.isAI || (adminUser.email?.endsWith('@collabverse.ai') ?? false);

  const converted = {
    id: adminUser.userId,
    email: getEmail(),
    displayName: getDisplayName(),
    roles: adminUser.roles,
    status: adminUser.status,
    lastLoginAt: adminUser.updatedAt, // Using updatedAt as lastLoginAt approximation
    createdAt: adminUser.updatedAt, // Using updatedAt as createdAt approximation
    isAI // Передаем флаг AI-агента
  };
  console.log('[convertAdminUserToUser] Конвертирован пользователь:', converted.displayName, converted.email);
  return converted;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Добавляем timestamp для предотвращения кеширования
      const response = await fetch(`/api/admin/users?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!response.ok) {
        throw new Error('Не удалось загрузить пользователей');
      }
      const data = (await response.json()) as { items: AdminUserView[] };
      console.log('[AdminUsersPage] Загружено пользователей из API:', data.items.length);
      console.log('[AdminUsersPage] Список пользователей из API:', data.items.map(u => `${u.name} (${u.email || u.userId})`));
      const converted = data.items.map(convertAdminUserToUser);
      setUsers(converted);
      console.log('[AdminUsersPage] Установлено пользователей в state:', converted.length);
      console.log('[AdminUsersPage] Список пользователей в state:', converted.map(u => `${u.displayName} (${u.email})`));
    } catch (err) {
      console.error('[AdminUsersPage] Ошибка загрузки:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      toast('Не удалось загрузить пользователей', 'warning');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  // Автоматическое обновление при фокусе на странице
  useEffect(() => {
    const handleFocus = () => {
      void loadUsers();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadUsers]);

  const handleSuspend = useCallback(
    async (userId: string) => {
      setUpdatingIds((prev) => new Set(prev).add(userId));
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'suspended' })
        });

        if (!response.ok) {
          const errorData = (await response.json()) as { error?: string };
          throw new Error(errorData.error || 'Не удалось обновить пользователя');
        }

        const data = (await response.json()) as { item: AdminUserView };
        const updatedUser = convertAdminUserToUser(data.item);
        setUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));
        toast('Пользователь заблокирован', 'warning');
      } catch (err) {
        console.error(err);
        toast(err instanceof Error ? err.message : 'Не удалось заблокировать пользователя', 'warning');
      } finally {
        setUpdatingIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
    },
    []
  );

  const handleActivate = useCallback(
    async (userId: string) => {
      setUpdatingIds((prev) => new Set(prev).add(userId));
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'active' })
        });

        if (!response.ok) {
          const errorData = (await response.json()) as { error?: string };
          throw new Error(errorData.error || 'Не удалось обновить пользователя');
        }

        const data = (await response.json()) as { item: AdminUserView };
        const updatedUser = convertAdminUserToUser(data.item);
        setUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));
        toast('Пользователь активирован', 'success');
      } catch (err) {
        console.error(err);
        toast(err instanceof Error ? err.message : 'Не удалось активировать пользователя', 'warning');
      } finally {
        setUpdatingIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
    },
    []
  );

  const handleDelete = useCallback(
    async (userId: string, userName: string) => {
      if (!confirm(`Вы уверены, что хотите удалить пользователя "${userName}"? Это действие необратимо!`)) {
        return;
      }

      setUpdatingIds((prev) => new Set(prev).add(userId));
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errorData = (await response.json()) as { error?: string };
          if (errorData.error === 'cannot_delete_self') {
            throw new Error('Нельзя удалить самого себя');
          }
          throw new Error(errorData.error || 'Не удалось удалить пользователя');
        }

        setUsers((prev) => prev.filter((u) => u.id !== userId));
        toast('Пользователь удалён', 'success');
      } catch (err) {
        console.error(err);
        toast(err instanceof Error ? err.message : 'Не удалось удалить пользователя', 'warning');
      } finally {
        setUpdatingIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
    },
    []
  );

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Логирование для отладки
  useEffect(() => {
    console.log('[AdminUsersPage] Всего пользователей:', users.length);
    console.log('[AdminUsersPage] Отфильтровано:', filteredUsers.length);
    console.log('[AdminUsersPage] Поиск:', searchQuery);
    console.log('[AdminUsersPage] Фильтр статуса:', statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users.length, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-neutral-50">Управление пользователями</h1>
            <p className="text-sm text-neutral-400">
              Блокировки, разрешения и управление доступом пользователей
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadUsers()}
              disabled={loading}
              className="rounded-xl border border-neutral-700/50 bg-neutral-800/50 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-neutral-600 hover:bg-neutral-700/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Обновить список"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
            <button
              onClick={() => toast('TODO: Пригласить пользователя', 'info')}
              className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/20"
            >
              + Пригласить
            </button>
          </div>
        </div>
      </header>

      {/* Filters */}
      <ContentBlock size="sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по email или имени..."
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 py-2 pl-10 pr-4 text-sm text-neutral-100 placeholder-neutral-500 transition focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-neutral-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 transition focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">Все статусы</option>
              <option value="active">Активные</option>
              <option value="suspended">Заблокированные</option>
              <option value="invited">Приглашённые</option>
            </select>
          </div>
        </div>
      </ContentBlock>

      {/* Loading State */}
      {loading && (
        <ContentBlock variant="dashed" className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-neutral-500 border-r-transparent"></div>
          <p className="mt-4 text-sm text-neutral-400">Загрузка пользователей...</p>
        </ContentBlock>
      )}

      {/* Error State */}
      {error && !loading && (
        <ContentBlock variant="error">
          <p className="text-sm text-rose-100">{error}</p>
          <button
            onClick={() => void loadUsers()}
            className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/20 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/30"
          >
            Повторить попытку
          </button>
        </ContentBlock>
      )}

      {/* Users Table */}
      {!loading && !error && (
        <ContentBlock size="sm" className="overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-400px)] overflow-y-auto">
          <table className="w-full">
            <thead className="border-b border-neutral-800 bg-neutral-950/80">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Пользователь
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Роли
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Последний вход
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Статус
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className={clsx(
                    "transition",
                    user.isAI 
                      ? "hover:bg-purple-950/20 border-l-2 border-l-purple-500/50" 
                      : "hover:bg-neutral-900/40"
                  )}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={clsx(
                            "font-medium",
                            user.isAI ? "text-purple-300" : "text-neutral-50"
                          )}>
                            {user.displayName}
                          </p>
                          {user.isAI && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 text-xs font-medium text-purple-200">
                              <Bot className="h-3 w-3" />
                              AI
                            </span>
                          )}
                          {(user.displayName === 'Без имени' || user.email === 'Без email') && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/20 border border-orange-500/40 px-2 py-0.5 text-xs font-medium text-orange-200" title="Запись в системе управления без соответствующего пользователя">
                              ⚠️ Сиротская запись
                            </span>
                          )}
                        </div>
                        <p className={clsx(
                          "text-sm",
                          user.isAI ? "text-purple-400/80" : "text-neutral-400"
                        )}>
                          {user.email}
                        </p>
                        {(user.displayName === 'Без имени' || user.email === 'Без email') && (
                          <p className="text-xs text-neutral-500 mt-1 font-mono">
                            ID: {user.id}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-1 text-xs font-medium text-blue-100"
                        >
                          <Shield className="h-3 w-3" />
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-400">
                    {new Date(user.lastLoginAt).toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={clsx(
                        'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
                        user.status === 'active'
                          ? 'bg-green-500/20 text-green-100'
                          : user.status === 'suspended'
                          ? 'bg-orange-500/20 text-orange-100'
                          : 'bg-blue-500/20 text-blue-100'
                      )}
                    >
                      {user.status === 'active'
                        ? 'Активен'
                        : user.status === 'suspended'
                        ? 'Заблокирован'
                        : 'Приглашён'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {user.status !== 'active' ? (
                        <button
                          onClick={() => handleActivate(user.id)}
                          disabled={updatingIds.has(user.id)}
                          className={clsx(
                            'rounded-xl border border-green-500/40 bg-green-500/10 p-2 text-green-100 transition hover:bg-green-500/20',
                            updatingIds.has(user.id) && 'cursor-not-allowed opacity-50'
                          )}
                          title="Активировать"
                        >
                          {updatingIds.has(user.id) ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSuspend(user.id)}
                          disabled={updatingIds.has(user.id)}
                          className={clsx(
                            'rounded-xl border border-orange-500/40 bg-orange-500/10 p-2 text-orange-100 transition hover:bg-orange-500/20',
                            updatingIds.has(user.id) && 'cursor-not-allowed opacity-50'
                          )}
                          title="Заблокировать"
                        >
                          {updatingIds.has(user.id) ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                          ) : (
                            <UserX className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => setEditingUser(user)}
                        disabled={updatingIds.has(user.id)}
                        className={clsx(
                          'rounded-xl border border-neutral-800 bg-neutral-900/60 p-2 text-neutral-400 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-100',
                          updatingIds.has(user.id) && 'cursor-not-allowed opacity-50'
                        )}
                        title="Редактировать пользователя"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id, user.displayName)}
                        disabled={updatingIds.has(user.id) || user.isAI}
                        className={clsx(
                          'rounded-xl border border-red-500/40 bg-red-500/10 p-2 text-red-100 transition hover:bg-red-500/20',
                          (updatingIds.has(user.id) || user.isAI) && 'cursor-not-allowed opacity-50'
                        )}
                        title={user.isAI ? 'AI-агентов нельзя удалить' : 'Удалить пользователя'}
                      >
                        {updatingIds.has(user.id) ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && !loading && (
          <ContentBlock variant="dashed" className="text-center">
            <p className="text-sm text-neutral-400">Пользователи не найдены</p>
            {searchQuery && (
              <p className="mt-2 text-xs text-neutral-500">
                Попробуйте изменить поисковый запрос или фильтр статуса
              </p>
            )}
          </ContentBlock>
        )}
        
        {/* Информация о количестве пользователей */}
        {!loading && !error && filteredUsers.length > 0 && (
          <div className="text-center text-xs text-neutral-500">
            Показано {filteredUsers.length} из {users.length} пользователей
            {searchQuery && ` (поиск: "${searchQuery}")`}
            {statusFilter !== 'all' && ` (статус: ${statusFilter})`}
          </div>
        )}
      </ContentBlock>
      )}

      {/* Модальное окно редактирования пользователя */}
      {editingUser && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingUser(null);
            }
          }}
        >
          <ContentBlock 
            className="w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-neutral-50">Редактировать пользователя</h2>
              <button
                onClick={() => setEditingUser(null)}
                className="rounded-xl p-1 text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-200"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Имя</label>
                <p className="text-neutral-100">{editingUser.displayName}</p>
                {(editingUser.displayName === 'Без имени' || editingUser.email === 'Без email') && (
                  <p className="text-xs text-orange-400 mt-1">
                    ⚠️ Это сиротская запись: пользователь есть в системе управления, но отсутствует в списке пользователей workspace
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Email</label>
                <p className="text-neutral-100">{editingUser.email}</p>
              </div>

              {(editingUser.displayName === 'Без имени' || editingUser.email === 'Без email') && (
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">User ID</label>
                  <p className="text-neutral-100 font-mono text-sm">{editingUser.id}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Статус</label>
                <select
                  value={editingUser.status}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as User['status'] })}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 transition focus:border-indigo-500 focus:outline-none"
                >
                  <option value="active">Активен</option>
                  <option value="suspended">Заблокирован</option>
                  <option value="invited">Приглашён</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: editingUser.status })
                      });

                      if (!response.ok) {
                        throw new Error('Не удалось обновить пользователя');
                      }

                      const data = (await response.json()) as { item: AdminUserView };
                      const updatedUser = convertAdminUserToUser(data.item);
                      setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? updatedUser : u)));
                      setEditingUser(null);
                      toast('Пользователь обновлён', 'success');
                    } catch (err) {
                      toast(err instanceof Error ? err.message : 'Ошибка при обновлении', 'warning');
                    }
                  }}
                  className="flex-1 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:bg-indigo-500/20"
                >
                  Сохранить
                </button>
                <button
                  onClick={() => setEditingUser(null)}
                  className="flex-1 rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800"
                >
                  Отмена
                </button>
              </div>
            </div>
          </ContentBlock>
        </div>
      )}
    </div>
  );
}

