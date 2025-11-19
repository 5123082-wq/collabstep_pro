'use client';

// @ts-ignore
import { CheckCircle, Clock, DollarSign, MessageSquare } from 'lucide-react';
import { type Project } from '@/types/pm';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

type ActivityItem = {
  id: string;
  type: 'task' | 'comment' | 'expense' | 'status_change';
  title: string;
  description?: string;
  userId: string;
  timestamp: string;
};

type ProjectActivityProps = {
  project: Project;
};

// Моковые данные активности (в реальном приложении будут загружаться с сервера)
const MOCK_ACTIVITIES: ActivityItem[] = [
  {
    id: '1',
    type: 'task',
    title: 'Создана задача "Настроить CI/CD"',
    userId: 'user@example.com',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    type: 'comment',
    title: 'Добавлен комментарий к задаче',
    description: 'Нужно проверить конфигурацию',
    userId: 'user@example.com',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    type: 'expense',
    title: 'Создана трата "Хостинг"',
    description: '5000 ₽',
    userId: 'user@example.com',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '4',
    type: 'status_change',
    title: 'Статус проекта изменён на "Активен"',
    userId: 'user@example.com',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const ACTIVITY_ICONS = {
  task: CheckCircle,
  comment: MessageSquare,
  expense: DollarSign,
  status_change: Clock
};

const ACTIVITY_COLORS = {
  task: 'text-emerald-400',
  comment: 'text-indigo-400',
  expense: 'text-amber-400',
  status_change: 'text-neutral-400'
};

export default function ProjectActivity({ project }: ProjectActivityProps) {
  // В реальном приложении здесь будет загрузка активности за последние 7 дней
  const activities = MOCK_ACTIVITIES.slice(0, project.metrics?.activity7d || 0);

  const formatTimestamp = (timestamp: string) => {
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
  };

  if (activities.length === 0) {
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
        {activities.map((activity) => {
          const Icon = ACTIVITY_ICONS[activity.type];
          const iconColor = ACTIVITY_COLORS[activity.type];

          return (
            <div key={activity.id} className="flex items-start gap-3 rounded-lg border border-neutral-800/50 bg-neutral-900/30 p-3">
              <Icon className={`h-5 w-5 flex-shrink-0 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">{activity.title}</div>
                {activity.description && (
                  <div className="mt-1 text-xs text-neutral-400">{activity.description}</div>
                )}
                <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                  <span>{activity.userId}</span>
                  <span>•</span>
                  <span>{formatTimestamp(activity.timestamp)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ContentBlock>
  );
}

