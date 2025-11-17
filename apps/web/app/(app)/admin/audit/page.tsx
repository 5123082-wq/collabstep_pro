'use client';

// TODO: Подключить к реальному API когда backend будет готов
// - Создать API endpoints для audit logs (GET /api/admin/audit с фильтрами)
// - Заменить mockAuditEvents на реальные API вызовы
// - Добавить loading/error states и пагинацию
// - Использовать типы AuditLogEntry из @collabverse/api

import { useState } from 'react';
import { File, Search, Filter, Clock } from 'lucide-react';
import { toast } from '@/lib/ui/toast';
import clsx from 'clsx';
import { ContentBlock } from '@/components/ui/content-block';

interface AuditEvent {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId?: string;
  timestamp: string;
  ipAddress: string;
}

const mockAuditEvents: AuditEvent[] = [
  {
    id: '1',
    userId: 'admin-1',
    userName: 'Администратор',
    action: 'feature_toggled',
    resource: 'feature',
    resourceId: 'marketing-research',
    timestamp: '2025-01-30T14:30:00Z',
    ipAddress: '192.168.1.1'
  },
  {
    id: '2',
    userId: 'user-2',
    userName: 'Иван Петров',
    action: 'user_suspended',
    resource: 'user',
    resourceId: 'user-5',
    timestamp: '2025-01-30T12:15:00Z',
    ipAddress: '192.168.1.2'
  },
  {
    id: '3',
    userId: 'admin-1',
    userName: 'Администратор',
    action: 'role_granted',
    resource: 'role',
    timestamp: '2025-01-29T09:00:00Z',
    ipAddress: '192.168.1.1'
  }
];

const actionTypes = [
  { value: 'all', label: 'Все действия' },
  { value: 'feature_toggled', label: 'Включение/отключение фич' },
  { value: 'user_suspended', label: 'Блокировка пользователей' },
  { value: 'role_granted', label: 'Выдача ролей' },
  { value: 'segment_created', label: 'Создание сегментов' }
];

export default function AdminAuditPage() {
  const [events] = useState<AuditEvent[]>(mockAuditEvents);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const filteredEvents = events.filter((e) => {
    const matchesSearch = e.userName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = actionFilter === 'all' || e.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const formatAction = (action: string): string => {
    const map: Record<string, string> = {
      feature_toggled: 'Фича переключена',
      user_suspended: 'Пользователь заблокирован',
      role_granted: 'Роль выдана',
      segment_created: 'Сегмент создан'
    };
    return map[action] || action;
  };

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-neutral-50">Журнал аудита</h1>
            <p className="text-sm text-neutral-400">
              История всех административных действий и изменений
            </p>
          </div>
          <button
            onClick={() => {
              const logs = JSON.stringify(events, null, 2);
              void navigator.clipboard.writeText(logs).then(() => {
                toast('Журнал скопирован в буфер', 'success');
              });
            }}
            className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:border-indigo-500/40 hover:bg-indigo-500/10"
          >
            Экспорт
          </button>
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
              placeholder="Поиск по пользователю..."
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 py-2 pl-10 pr-4 text-sm text-neutral-100 placeholder-neutral-500 transition focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-neutral-500" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 transition focus:border-indigo-500 focus:outline-none"
            >
              {actionTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </ContentBlock>

      {/* Audit Events */}
      <div className="space-y-2">
        {filteredEvents.map((event) => (
          <ContentBlock
            key={event.id}
            size="sm"
            interactive
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-indigo-500/20 p-2">
                  <File className="h-5 w-5 text-indigo-100" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-neutral-50">{event.userName}</p>
                    <span
                      className={clsx(
                        'rounded px-2 py-0.5 text-xs font-medium',
                        event.action.includes('suspended')
                          ? 'bg-rose-500/20 text-rose-100'
                          : event.action.includes('granted')
                          ? 'bg-green-500/20 text-green-100'
                          : 'bg-blue-500/20 text-blue-100'
                      )}
                    >
                      {formatAction(event.action)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-400">
                    Ресурс: <span className="font-medium">{event.resource}</span>
                    {event.resourceId && (
                      <span className="text-neutral-500"> ({event.resourceId})</span>
                    )}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(event.timestamp).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span>IP: {event.ipAddress}</span>
                  </div>
                </div>
              </div>
            </div>
          </ContentBlock>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <ContentBlock variant="dashed" className="text-center">
          <File className="mx-auto h-12 w-12 text-neutral-700" />
          <p className="mt-4 text-sm text-neutral-400">События не найдены</p>
        </ContentBlock>
      )}
    </div>
  );
}

