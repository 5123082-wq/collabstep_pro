'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import {
  Users,
  Shield,
  Flag,
  File,
  Calendar,
  CircleHelp,
  TrendingUp,
  FileText,
  RefreshCw
} from 'lucide-react';
import { toast } from '@/lib/ui/toast';
import { canAccessAdmin, getRolesForDemoAccount } from '@/lib/auth/roles';
import { ContentBlock } from '@/components/ui/content-block';
import { useSessionContext } from '@/components/app/SessionContext';

const overviewCards = [
  {
    id: 'features',
    title: 'Управление Фичами',
    description: 'Включение и отключение разделов платформы',
    icon: Flag,
    href: '/admin/features',
    color: 'bg-blue-500/10 border-blue-500/30 text-blue-100'
  },
  {
    id: 'users',
    title: 'Пользователи',
    description: 'Блокировки, разрешения и управление доступом',
    icon: Users,
    href: '/admin/users',
    color: 'bg-green-500/10 border-green-500/30 text-green-100'
  },
  {
    id: 'roles',
    title: 'Роли & Разрешения',
    description: 'Настройка прав и ролей пользователей',
    icon: Shield,
    href: '/admin/roles',
    color: 'bg-purple-500/10 border-purple-500/30 text-purple-100'
  },
  {
    id: 'segments',
    title: 'Сегменты',
    description: 'Группы тестировщиков и управление сегментами',
    icon: Users,
    href: '/admin/segments',
    color: 'bg-orange-500/10 border-orange-500/30 text-orange-100'
  },
  {
    id: 'releases',
    title: 'Релизы',
    description: 'Планировщик запуска фич по расписанию',
    icon: Calendar,
    href: '/admin/releases',
    color: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-100'
  },
  {
    id: 'audit',
    title: 'Аудит',
    description: 'История изменений и журнал действий',
    icon: File,
    href: '/admin/audit',
    color: 'bg-rose-500/10 border-rose-500/30 text-rose-100'
  },
  {
    id: 'support',
    title: 'Support Tools',
    description: 'Имперсонация, сессии, демо-данные',
    icon: CircleHelp,
    href: '/admin/support',
    color: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-100'
  },
  {
    id: 'data',
    title: 'Управление данными',
    description: 'Просмотр и удаление проектов и задач',
    icon: FileText,
    href: '/admin/data',
    color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-100'
  }
];

interface AdminStats {
  activeUsers: number;
  enabledSections: number;
  segments: number;
  auditEntries: number;
}

interface QuickStat {
  label: string;
  value: string;
  trend?: string;
}

function formatNumber(num: number): string {
  return num.toLocaleString('ru-RU');
}

export default function AdminOverviewPage() {
  const router = useRouter();
  const session = useSessionContext();
  const [stats, setStats] = useState<QuickStat[]>([
    { label: 'Активных пользователей', value: '...' },
    { label: 'Разделов включено', value: '...' },
    { label: 'Сегментов', value: '...' },
    { label: 'Записей аудита', value: '...' }
  ]);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/stats', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AdminStats] API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Ошибка ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as AdminStats;
      console.log('[AdminStats] Loaded data:', data);
      
      setStats([
        { label: 'Активных пользователей', value: formatNumber(data.activeUsers) },
        { label: 'Разделов включено', value: formatNumber(data.enabledSections) },
        { label: 'Сегментов', value: formatNumber(data.segments) },
        { label: 'Записей аудита', value: formatNumber(data.auditEntries) }
      ]);
    } catch (error) {
      console.error('[AdminStats] Error loading stats:', error);
      toast(
        error instanceof Error 
          ? `Ошибка при загрузке статистики: ${error.message}`
          : 'Ошибка при загрузке статистики',
        'warning'
      );
      // Устанавливаем значения по умолчанию при ошибке
      setStats([
        { label: 'Активных пользователей', value: '—' },
        { label: 'Разделов включено', value: '—' },
        { label: 'Сегментов', value: '—' },
        { label: 'Записей аудита', value: '—' }
      ]);
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
  }, [session, router, loadStats]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-neutral-50">Панель администратора</h1>
            <p className="text-sm text-neutral-400">
              Глобальное управление продуктом, пользователями и функциями платформы
            </p>
          </div>
          <button
            onClick={() => {
              void loadStats();
              toast('Статистика обновлена', 'success');
            }}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
            Обновить
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <ContentBlock key={stat.label} size="sm">
            <div className="flex flex-col min-h-[80px]">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 leading-tight">
                {stat.label}
              </p>
              <div className="mt-1.5 flex items-baseline justify-between">
                <p className="text-2xl font-bold text-neutral-50">
                  {loading && stat.value === '...' ? (
                    <span className="inline-flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-neutral-400" />
                      <span className="text-neutral-400">Загрузка...</span>
                    </span>
                  ) : (
                    stat.value
                  )}
                </p>
                {stat.trend && (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-500">
                    <TrendingUp className="h-3 w-3" />
                    {stat.trend}
                  </span>
                )}
              </div>
            </div>
          </ContentBlock>
        ))}
      </div>

      {/* Feature Cards */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-neutral-50">Модули админ-панели</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {overviewCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.id}
                href={card.href}
                className="group relative overflow-hidden rounded-2xl border p-6 transition hover:border-indigo-500/40"
              >
                <div className={clsx('absolute inset-0', card.color)} />
                <div className="relative space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={clsx('rounded-xl p-2', card.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-neutral-500 group-hover:text-indigo-400">
                      Перейти →
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-50">{card.title}</h3>
                    <p className="mt-1 text-sm text-neutral-400">{card.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <ContentBlock>
        <h2 className="mb-4 text-lg font-semibold text-neutral-50">Быстрые действия</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={() => toast('TODO: Включить все фичи', 'info')}
            className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 text-sm font-medium text-neutral-300 transition hover:border-green-500/40 hover:bg-green-500/10 hover:text-green-100"
          >
            Включить все фичи
          </button>
          <button
            onClick={() => toast('TODO: Отключить режим тестирования', 'info')}
            className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 text-sm font-medium text-neutral-300 transition hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-100"
          >
            Режим техобслуживания
          </button>
          <button
            onClick={() => toast('TODO: Экспорт конфигурации', 'info')}
            className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 text-sm font-medium text-neutral-300 transition hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-100"
          >
            Экспорт конфигурации
          </button>
          <button
            onClick={() => toast('TODO: Сбросить кэш', 'info')}
            className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 text-sm font-medium text-neutral-300 transition hover:border-purple-500/40 hover:bg-purple-500/10 hover:text-purple-100"
          >
            Очистить кэш
          </button>
        </div>
      </ContentBlock>
    </div>
  );
}
