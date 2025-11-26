'use client';

import clsx from 'clsx';
import { useState } from 'react';
import { canAccessAdmin, canAccessFinance, getUserRoles } from '@/lib/auth/roles';
import { toast } from '@/lib/ui/toast';
import { ContentBlock } from '@/components/ui/content-block';

type Access = 'finance' | 'admin' | null;

type SectionAction = {
  label: string;
  message?: string;
  onClick?: () => void;
};

type AppSectionProps = {
  title: string;
  description: string;
  actions?: SectionAction[];
  access?: Access;
  emptyMessage?: string;
  errorMessage?: string;
  children?: React.ReactNode;
  hideStateToggles?: boolean;
};

const states = [
  { id: 'default', label: 'Контент' },
  { id: 'loading', label: 'Загрузка' },
  { id: 'empty', label: 'Пусто' },
  { id: 'error', label: 'Ошибка' }
] as const;

export default function AppSection({
  title,
  description,
  actions = [],
  access = null,
  emptyMessage = 'Здесь пока ничего нет. Начните с действия справа.',
  errorMessage = 'Что-то пошло не так. Повторите попытку.',
  children,
  hideStateToggles = false
}: AppSectionProps) {
  const [state, setState] = useState<(typeof states)[number]['id']>('default');
  const roles = getUserRoles();
  const hasCustomContent = !!children;

  if (access === 'admin' && !canAccessAdmin(roles)) {
    return (
      <ContentBlock variant="muted" className="text-center">
        <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Нет доступа</h2>
        <p className="mt-2 text-sm text-[color:var(--text-secondary)]">Этот раздел доступен только администраторам или модераторам.</p>
      </ContentBlock>
    );
  }

  if (access === 'finance' && !canAccessFinance(roles)) {
    return (
      <ContentBlock variant="muted" className="text-center">
        <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Нет доступа</h2>
        <p className="mt-2 text-sm text-[color:var(--text-secondary)]">Финансовые данные доступны руководителям проектов и администраторам.</p>
      </ContentBlock>
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-neutral-50">{title}</h1>
            <p className="text-sm text-neutral-400">{description}</p>
          </div>
          {actions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => {
                    if (action.onClick) {
                      action.onClick();
                    } else if (action.message) {
                      toast(action.message);
                    }
                  }}
                  className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {!hideStateToggles && !hasCustomContent && (
          <div className="flex flex-wrap gap-2 text-xs">
            {states.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setState(item.id)}
                className={clsx(
                  'rounded-full border px-3 py-1 uppercase tracking-wide transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
                  state === item.id
                    ? 'border-indigo-500/60 bg-indigo-500/20 text-indigo-100'
                    : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-indigo-500/40 hover:text-white'
                )}
                aria-pressed={state === item.id}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {state === 'loading' && (
        <ContentBlock>
          <div className="h-4 w-1/4 animate-pulse rounded bg-neutral-800" />
          <div className="space-y-3">
            <div className="h-3 w-full animate-pulse rounded bg-neutral-800" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-neutral-800" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-neutral-800" />
          </div>
        </ContentBlock>
      )}

      {state === 'empty' && (
        <ContentBlock variant="dashed" className="text-center">
          <p className="text-sm text-[color:var(--text-tertiary)]">{emptyMessage}</p>
        </ContentBlock>
      )}

      {state === 'error' && (
        <ContentBlock variant="error">
          <p>{errorMessage}</p>
          <button
            type="button"
            onClick={() => toast('TODO: Повторить загрузку')}
            className="mt-4 rounded-lg border border-rose-400/60 bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-50 transition hover:bg-rose-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400"
          >
            Повторить
          </button>
        </ContentBlock>
      )}

      {state === 'default' && (
        <>
          {hasCustomContent ? (
            children
          ) : (
            <div className="space-y-4">
              <ContentBlock>
                <p className="text-sm text-[color:var(--text-secondary)]">
                  Данные и виджеты будут подключаться на следующих этапах. Сейчас — демо-макет.
                </p>
              </ContentBlock>
              <div className="grid gap-3 md:grid-cols-2">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="content-block-sm">
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">Карточка #{index + 1}</p>
                    <p className="mt-2 text-xs text-[color:var(--text-secondary)]">
                      Данные обновятся автоматически после подключения реальных источников.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
