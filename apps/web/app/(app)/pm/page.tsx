'use client';

import { useEffect, useState } from 'react';
import PulseWidget from '@/components/pm/PulseWidget';
import ProgressWidget from '@/components/pm/ProgressWidget';
import WorkloadWidget from '@/components/pm/WorkloadWidget';
import FinanceWidget from '@/components/pm/FinanceWidget';
import { ContentBlock } from '@/components/ui/content-block';
import { trackEvent } from '@/lib/telemetry';

type DashboardData = {
  pulse: {
    activeProjects: number;
    activeProjectsByOwner: Array<{
      ownerId: string;
      ownerName: string;
      ownerEmail?: string;
      projects: Array<{ id: string; key: string; title: string; status: string }>;
    }>;
    openTasks: number;
    myOpenTasks: number;
    overdue: number;
    upcomingDeadlines: Array<{
      id: string;
      title: string;
      projectId: string;
      projectKey: string;
      dueAt: string;
      status: string;
      assigneeId?: string;
    }>;
  };
  progress: {
    burnup: Array<{ date: string; total: number; completed: number }>;
    burndown: Array<{ date: string; remaining: number }>;
  };
  workload: Array<{
    assigneeId: string;
    taskCount: number;
    projectCount: number;
    projects: string[];
  }>;
  finance: {
    expenses: Array<{
      projectId: string;
      projectKey: string;
      projectTitle: string;
      spent: string;
      limit?: string;
      remaining?: string;
      currency: string;
      categories: Array<{ name: string; spent: string; limit?: string }>;
    }>;
    totalSpent: string;
    totalLimit: string;
  };
};

export default function PMDashboardPage() {
  // Временно убираем проверку флага для отладки
  // TODO: Вернуть проверку после решения проблемы с переменными окружения
  // const pmNavEnabled = 
  //   process.env.NEXT_PUBLIC_FEATURE_PM_NAV_PROJECTS_AND_TASKS === '1' || 
  //   flags.PM_NAV_PROJECTS_AND_TASKS;

  // if (!pmNavEnabled) {
  //   return <FeatureComingSoon title="Проекты и задачи" />;
  // }

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      // Временно убираем проверку флага для отладки
      // if (!flags.PM_DASHBOARD) {
      //   setLoading(false);
      //   return;
      // }

      try {
        setLoading(true);
        const response = await fetch('/api/pm/dashboard');
        if (!response.ok) {
          throw new Error('Failed to load dashboard');
        }
        const result = await response.json();
        if (!result.ok || !result.data) {
          throw new Error('Invalid response format');
        }
        setData(result.data);
        setError(null);
        trackEvent('pm_dashboard_viewed');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, []);

  // Временно убираем проверку флага для отладки
  // if (!flags.PM_DASHBOARD) {
  //   return (
  //     <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 py-12 text-center text-neutral-300">
  //       <div className="space-y-2">
  //         <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Проекты и задачи</p>
  //         <h1 className="text-xl font-semibold text-white">Метрики</h1>
  //         <p className="max-w-md text-sm text-neutral-400">
  //           Здесь будет отображаться обзор ваших проектов и задач. Раздел находится в разработке.
  //         </p>
  //       </div>
  //     </div>
  //   );
  // }

  if (loading) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-xl font-semibold text-white">Метрики</h1>
          <p className="mt-2 text-sm text-neutral-400">Обзор проектов и задач</p>
        </header>
        <div className="grid gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-neutral-900/50" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-xl font-semibold text-white">Метрики</h1>
          <p className="mt-2 text-sm text-neutral-400">Обзор проектов и задач</p>
        </header>
        <ContentBlock variant="error">
          <p className="text-sm">Не удалось загрузить данные метрик. Попробуйте обновить страницу.</p>
        </ContentBlock>
      </div>
    );
  }

  // Ensure all required data fields exist with safe defaults
  const safeData = {
    pulse: data.pulse || {
      activeProjects: 0,
      activeProjectsByOwner: [],
      openTasks: 0,
      myOpenTasks: 0,
      overdue: 0,
      upcomingDeadlines: [],
    },
    progress: data.progress || {
      burnup: [],
      burndown: [],
    },
    workload: data.workload || [],
    finance: data.finance || {
      expenses: [],
      totalSpent: '0',
      totalLimit: '0',
    },
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-white">Метрики</h1>
        <p className="mt-2 text-sm text-neutral-400">Обзор проектов и задач</p>
      </header>

      <div className="grid gap-6">
        <PulseWidget data={safeData.pulse} />
        <ProgressWidget data={safeData.progress} />
        <WorkloadWidget data={safeData.workload} />
        <FinanceWidget data={safeData.finance} />
      </div>
    </div>
  );
}

