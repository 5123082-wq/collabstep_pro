'use client';

// @ts-expect-error lucide-react icon types
import { CheckCircle, MessageSquare, Notebook } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { type Project } from '@/types/pm';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';
import { Button } from '@/components/ui/button';

type ActivityItem = {
  id: string;
  type: 'task_created' | 'comment_added';
  title: string;
  description?: string;
  userId?: string;
  timestamp: string;
  taskId?: string;
};

type ActivityDayGroup = {
  dateLabel: string;
  items: ActivityItem[];
};

type ProjectActivityProps = {
  project: Project;
};

const ACTIVITY_ICONS = {
  task_created: CheckCircle,
  comment_added: MessageSquare
};

const ACTIVITY_COLORS = {
  task_created: 'text-emerald-400',
  comment_added: 'text-indigo-400'
};

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    return 'Только что';
  }
  if (diffHours < 24) {
    return `${diffHours} ч. назад`;
  }
  if (diffDays < 7) {
    return `${diffDays} дн. назад`;
  }
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export default function ProjectActivity({ project }: ProjectActivityProps) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/pm/projects/${project.id}/activity?days=7`, {
          signal: controller.signal,
          headers: { 'cache-control': 'no-store' }
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || 'Не удалось загрузить активность');
        }
        const payload = Array.isArray(data?.items) ? (data.items as ActivityItem[]) : [];
        setItems(payload);
        // По умолчанию открываем сегодняшний день
        if (payload.length > 0) {
          const first = payload[0];
          if (first) {
            const label = new Date(first.timestamp).toLocaleDateString('ru-RU', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            });
            setExpandedDays(new Set([label]));
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Ошибка загрузки активности');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [project.id]);

  const grouped: ActivityDayGroup[] = useMemo(() => {
    const byDay = new Map<string, ActivityItem[]>();
    for (const item of items) {
      const date = new Date(item.timestamp);
      const label = date.toLocaleDateString('ru-RU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
      const arr = byDay.get(label) ?? [];
      arr.push(item);
      byDay.set(label, arr);
    }
    return Array.from(byDay.entries()).map(([dateLabel, groupItems]) => ({
      dateLabel,
      items: groupItems
    }));
  }, [items]);

  const toggleDay = (label: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <ContentBlock size="sm">
        <ContentBlockTitle as="h3">Активность (7 дней)</ContentBlockTitle>
        <p className="text-sm text-neutral-400">Загрузка...</p>
      </ContentBlock>
    );
  }

  if (error) {
    return (
      <ContentBlock size="sm">
        <ContentBlockTitle as="h3">Активность (7 дней)</ContentBlockTitle>
        <div className="mb-3 text-sm text-rose-200">{error}</div>
        <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
          Обновить
        </Button>
      </ContentBlock>
    );
  }

  if (items.length === 0) {
    return (
      <ContentBlock size="sm">
        <ContentBlockTitle as="h3">Активность (7 дней)</ContentBlockTitle>
        <p className="text-sm text-neutral-400">Нет активности за последние 7 дней</p>
      </ContentBlock>
    );
  }

  return (
    <ContentBlock size="sm">
      <ContentBlockTitle as="h3">Активность (7 дней)</ContentBlockTitle>
      <div className="space-y-3">
        {grouped.map((group) => {
          const isOpen = expandedDays.has(group.dateLabel);
          return (
            <div key={group.dateLabel} className="rounded-xl border border-neutral-800/60 bg-neutral-900/30">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-white"
                onClick={() => toggleDay(group.dateLabel)}
              >
                <span>{group.dateLabel}</span>
                <span className="text-xs text-neutral-400">
                  {group.items.length} {group.items.length === 1 ? 'событие' : 'событий'}
                </span>
              </button>
              {isOpen && (
                <div className="divide-y divide-neutral-800">
                  {group.items.map((activity) => {
                    const Icon = ACTIVITY_ICONS[activity.type] ?? Notebook;
                    const iconColor = ACTIVITY_COLORS[activity.type] ?? 'text-neutral-400';
                    return (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 px-4 py-3"
                      >
                        <Icon className={`h-5 w-5 flex-shrink-0 ${iconColor}`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-white">{activity.title}</div>
                          {activity.description && (
                            <div className="mt-1 text-xs text-neutral-400 line-clamp-2">
                              {activity.description}
                            </div>
                          )}
                          <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                            {activity.userId ? <span>{activity.userId}</span> : null}
                            {activity.userId ? <span>•</span> : null}
                            <span>{formatTimestamp(activity.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ContentBlock>
  );
}
