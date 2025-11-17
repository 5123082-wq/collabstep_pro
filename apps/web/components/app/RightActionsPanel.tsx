'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { ContentBlock } from '@/components/ui/content-block';
import { toast } from '@/lib/ui/toast';

const routeActions: Record<string, { title: string; actions: { label: string; message: string }[] }> = {
  '/dashboard': {
    title: 'Быстрые действия',
    actions: [
      { label: 'Открыть отчёт за неделю', message: 'TODO: Отчёт за неделю' },
      { label: 'Созвон с командой', message: 'TODO: Созвон' }
    ]
  },
  '/projects': {
    title: 'Проекты',
    actions: [
      { label: 'Открыть обзор проектов', message: 'Открываем новую страницу проектов' },
      { label: 'Создать проект', message: 'Используйте меню создания, чтобы запустить инициативу' }
    ]
  },
  '/marketplace': {
    title: 'Маркетплейс',
    actions: [
      { label: 'Открыть витрину', message: 'TODO: Открыть витрину решений' },
      { label: 'Добавить в корзину', message: 'TODO: Добавить товар в корзину' },
      { label: 'Перейти к заказам', message: 'TODO: Открыть историю заказов' }
    ]
  },
  '/performers': {
    title: 'Исполнители',
    actions: [
      { label: 'Найти специалиста', message: 'TODO: Найти специалиста' },
      { label: 'Разместить вакансию', message: 'TODO: Создать вакансию' },
      { label: 'Просмотреть отклики', message: 'TODO: Открыть отклики исполнителей' }
    ]
  },
  '/marketing': {
    title: 'Маркетинг',
    actions: [
      { label: 'Создать кампанию', message: 'TODO: Мастер создания кампании' },
      { label: 'Добавить исследование', message: 'TODO: Создать исследование аудитории' },
      { label: 'Подключить источник данных', message: 'TODO: Настроить интеграцию аналитики' }
    ]
  },
  '/ai-hub': {
    title: 'AI-хаб',
    actions: [
      { label: 'Запустить генерацию', message: 'TODO: Генерация' },
      { label: 'Создать промпт', message: 'TODO: Создать промпт' }
    ]
  },
  '/community': {
    title: 'Комьюнити',
    actions: [
      { label: 'Поделиться апдейтом', message: 'TODO: Поделиться апдейтом' },
      { label: 'Создать событие', message: 'TODO: Создать событие' }
    ]
  },
  '/finance': {
    title: 'Финансы',
    actions: [
      { label: 'Открыть эскроу', message: 'TODO: Открыть эскроу' },
      { label: 'Создать счёт', message: 'TODO: Создать счёт' }
    ]
  },
  '/docs': {
    title: 'Документы',
    actions: [
      { label: 'Загрузить файл', message: 'TODO: Загрузить файл' },
      { label: 'Создать шаблон', message: 'TODO: Создать шаблон' }
    ]
  },
  '/profile': {
    title: 'Профиль',
    actions: [
      { label: 'Редактировать карточку', message: 'TODO: Редактировать профиль' },
      { label: 'Запросить отзыв', message: 'TODO: Запросить отзыв' }
    ]
  },
  '/org': {
    title: 'Организация',
    actions: [
      { label: 'Добавить сотрудника', message: 'TODO: Добавить сотрудника' },
      { label: 'Синхронизировать биллинг', message: 'TODO: Синхронизировать биллинг' }
    ]
  },
  '/support': {
    title: 'Поддержка',
    actions: [
      { label: 'Создать тикет', message: 'TODO: Создать тикет' },
      { label: 'Связаться с менеджером', message: 'TODO: Связаться с менеджером' }
    ]
  }
};

export default function RightActionsPanel() {
  const pathname = usePathname();

  const matched = useMemo(() => {
    const entry = Object.entries(routeActions).find(([prefix]) => pathname.startsWith(prefix));
    return entry ? entry[1] : null;
  }, [pathname]);

  if (!matched) {
    return (
      <aside className="hidden w-[280px] flex-col border-l border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] px-4 py-6 lg:flex">
        <ContentBlock size="sm" variant="muted">
          <p className="text-sm text-[color:var(--text-tertiary)]">
            Быстрых действий пока нет.
          </p>
        </ContentBlock>
      </aside>
    );
  }

  return (
    <aside className="hidden w-[280px] flex-col border-l border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] px-4 py-6 lg:flex">
      <ContentBlock size="sm">
        <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">{matched.title}</h3>
        <ul className="mt-3 space-y-2">
          {matched.actions.map((action) => (
            <li key={action.label}>
              <button
                type="button"
                onClick={() => toast(action.message)}
                className="w-full rounded-xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] px-3 py-2 text-left text-sm text-[color:var(--text-secondary)] transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-[color:var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                {action.label}
              </button>
            </li>
          ))}
        </ul>
      </ContentBlock>
    </aside>
  );
}
