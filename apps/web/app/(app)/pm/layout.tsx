'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackEvent } from '@/lib/telemetry';
import { flags } from '@/lib/flags';

type PMLayoutProps = {
  children: React.ReactNode;
};

export default function PMLayout({ children }: PMLayoutProps) {
  const pathname = usePathname();

  useEffect(() => {
    // Проверяем флаг перед отправкой аналитики
    if (!flags.PM_NAV_PROJECTS_AND_TASKS) {
      return;
    }

    // Отправляем событие открытия раздела PM
    trackEvent('pm_nav_opened', {
      workspaceId: 'current', // TODO: получить из контекста
      userId: 'current', // TODO: получить из сессии
      source: 'navigation'
    });

    // Определяем текущую вкладку
    let tab = 'dashboard';
    if (pathname?.startsWith('/pm/projects')) {
      tab = 'projects';
    } else if (pathname?.startsWith('/pm/tasks')) {
      tab = 'tasks';
    } else if (pathname?.startsWith('/pm/archive')) {
      tab = 'archive';
    }

    // Отправляем событие смены вкладки
    trackEvent('pm_tab_changed', {
      workspaceId: 'current',
      userId: 'current',
      tab,
      source: 'navigation'
    });
  }, [pathname]);

  return <>{children}</>;
}

