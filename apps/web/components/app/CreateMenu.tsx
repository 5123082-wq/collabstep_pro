'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ContentBlock } from '@/components/ui/content-block';
import { toast } from '@/lib/ui/toast';
import { getUserRoles, type UserRole } from '@/lib/auth/roles';

type CreateMenuProps = {
  open: boolean;
  onClose: () => void;
};

type CreateAction = {
  id: string;
  label: string;
  description: string;
  toastMessage?: string;
  roles?: UserRole[];
  intent: 'route' | 'toast';
  href?: string;
};

type CreateContext = 'projects' | 'pm' | 'marketplace' | 'default';

const CONTEXT_ACTIONS: Record<CreateContext, CreateAction[]> = {
  projects: [
    {
      id: 'project',
      label: 'Проект',
      description: 'Быстрый мастер создания нового проекта.',
      toastMessage: 'Открываем мастер создания проекта',
      roles: ['FOUNDER', 'PM', 'ADMIN'],
      intent: 'route',
      href: '/projects/create'
    }
  ],
  pm: [
    {
      id: 'project',
      label: 'Проект',
      description: 'Создайте новый проект в рабочем пространстве.',
      toastMessage: 'Открываем мастер создания проекта',
      roles: ['FOUNDER', 'PM', 'ADMIN'],
      intent: 'route',
      href: '/projects/create'
    }
  ],
  marketplace: [],
  default: []
};

function resolveContext(pathname: string | null): CreateContext {
  if (!pathname) {
    return 'default';
  }
  if (pathname.startsWith('/projects')) {
    return 'projects';
  }
  if (pathname.startsWith('/pm/')) {
    return 'pm';
  }
  if (pathname.startsWith('/app/marketplace')) {
    return 'marketplace';
  }
  return 'default';
}

export default function CreateMenu({ open, onClose }: CreateMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const roles = useMemo(() => getUserRoles(), []);
  const context = resolveContext(pathname);
  const actions = CONTEXT_ACTIONS[context] ?? [];

  const visibleActions = useMemo(
    () =>
      actions.filter((action) => {
        if (!action.roles) {
          return true;
        }
        return action.roles.some((role) => roles.includes(role));
      }),
    [actions, roles]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const handleAction = (action: CreateAction) => {
    if (action.toastMessage) {
      toast(action.toastMessage);
    }
    onClose();

    if (action.intent === 'route' && action.href) {
      router.push(action.href);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--surface-overlay)] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-menu-title"
    >
      <ContentBlock as="div" className="w-full max-w-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-6">
          <div>
            <h2 id="create-menu-title" className="text-lg font-semibold text-[color:var(--text-primary)]">
              Меню создания
            </h2>
            <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">
              Выберите доступное действие для текущего раздела.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[color:var(--surface-border-subtle)] px-3 py-1 text-xs text-[color:var(--text-secondary)] transition hover:border-[color:var(--surface-border-strong)] hover:text-[color:var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            aria-label="Закрыть меню создания"
          >
            Esc
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <ContentBlock size="sm" variant="muted">
            <p className="text-sm text-[color:var(--text-secondary)]">
              {visibleActions.length > 0
                ? 'Доступные быстрые действия зависят от текущего раздела платформы.'
                : 'В этом разделе пока нет быстрых действий. Переключитесь в другой раздел или расширьте роли.'}
            </p>
          </ContentBlock>

          <div className="grid gap-3 sm:grid-cols-2">
            {visibleActions.length > 0 ? (
              visibleActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleAction(action)}
                  className="flex h-full flex-col justify-between rounded-xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] p-4 text-left transition hover:border-indigo-500/40 hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                >
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">{action.label}</p>
                    <p className="mt-2 text-xs text-[color:var(--text-tertiary)]">{action.description}</p>
                  </div>
                </button>
              ))
            ) : (
              <ContentBlock variant="dashed" size="sm" className="p-6 text-center">
                <p className="text-xs text-[color:var(--text-tertiary)]">
                  Нет доступных действий для текущего раздела.
                </p>
              </ContentBlock>
            )}
          </div>
        </div>
      </ContentBlock>
    </div>
  );
}
