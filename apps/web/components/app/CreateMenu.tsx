'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getUserRoles, type UserRole } from '@/lib/auth/roles';

type CreateMenuProps = {
  open: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement>;
};

type CreateAction = {
  id: string;
  label: string;
  description: string;
  roles?: UserRole[];
  intent: 'route' | 'modal';
  href?: string;
  modalComponent?: string;
};

type CreateContext = 'projects' | 'pm' | 'marketplace' | 'finance' | 'community' | 'ai-hub' | 'default';

const CONTEXT_ACTIONS: Record<CreateContext, CreateAction[]> = {
  projects: [
    {
      id: 'project',
      label: 'Проект',
      description: 'Создайте новый проект',
      roles: ['FOUNDER', 'PM', 'ADMIN'],
      intent: 'route',
      href: '/projects/create'
    }
  ],
  pm: [
    {
      id: 'project',
      label: 'Проект',
      description: 'Создайте новый проект в рабочем пространстве',
      roles: ['FOUNDER', 'PM', 'ADMIN'],
      intent: 'route',
      href: '/pm/projects/create'
    },
    {
      id: 'task',
      label: 'Задача',
      description: 'Создайте новую задачу в проекте',
      roles: ['FOUNDER', 'PM', 'ADMIN'],
      intent: 'modal',
      modalComponent: 'createTask'
    }
  ],
  marketplace: [
    {
      id: 'vacancy',
      label: 'Вакансия',
      description: 'Создайте новую вакансию в маркетплейсе',
      intent: 'modal',
      modalComponent: 'createVacancy'
    },
    {
      id: 'service',
      label: 'Услуга',
      description: 'Добавьте новую услугу в каталог',
      intent: 'modal',
      modalComponent: 'createService'
    }
  ],
  finance: [
    {
      id: 'transaction',
      label: 'Транзакция',
      description: 'Добавьте финансовую транзакцию',
      intent: 'modal',
      modalComponent: 'createTransaction'
    }
  ],
  community: [
    {
      id: 'post',
      label: 'Пост',
      description: 'Создайте новый пост в сообществе',
      intent: 'modal',
      modalComponent: 'createPost'
    }
  ],
  'ai-hub': [
    {
      id: 'prompt',
      label: 'Промпт',
      description: 'Создайте промпт-шаблон',
      intent: 'modal',
      modalComponent: 'createPrompt'
    },
    {
      id: 'ai-agent',
      label: 'AI Agent',
      description: 'Create a new AI agent',
      intent: 'modal',
      modalComponent: 'createAIAgent'
    }
  ],
  default: []
};

function resolveContext(pathname: string | null): CreateContext {
  if (!pathname) return 'default';
  // Проверяем PM ПЕРЕД projects, так как /pm/projects должен быть в контексте pm
  // Также проверяем /pm (без слэша) для дашборда
  if (pathname.startsWith('/pm')) return 'pm';
  if (pathname.startsWith('/projects') || pathname.startsWith('/project')) return 'projects';
  if (pathname.startsWith('/market/')) return 'marketplace';
  if (pathname.startsWith('/finance')) return 'finance';
  if (pathname.startsWith('/community')) return 'community';
  if (pathname.startsWith('/ai-hub')) return 'ai-hub';
  return 'default';
}

export default function CreateMenu({ open, onClose, triggerRef }: CreateMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const roles = useMemo(() => getUserRoles(), []);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const visibleActions = useMemo(() => {
    const context = resolveContext(pathname);
    const actions = CONTEXT_ACTIONS[context] ?? [];
    return actions.filter((action) => {
      if (!action.roles) {
        return true;
      }
      return action.roles.some((role) => roles.includes(role));
    });
  }, [pathname, roles]);

  // Сброс активного индекса при изменении списка действий
  useEffect(() => {
    setActiveIndex(0);
    buttonRefs.current = [];
  }, [visibleActions.length]);

  // Позиционирование dropdown относительно кнопки
  useEffect(() => {
    if (!open || !triggerRef?.current) {
      setPosition(null);
      setIsVisible(false);
      return;
    }

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const menuWidth = 280; // min-w-[280px]
      const menuHeight = visibleActions.length * 60 + 16; // примерная высота меню
      const spacing = 8; // отступ снизу

      // Проверяем, не выходит ли меню за правую границу экрана
      let left = rect.left;
      if (left + menuWidth > window.innerWidth) {
        left = window.innerWidth - menuWidth - 16; // 16px отступ от края
      }

      // Проверяем, не выходит ли меню за левую границу экрана
      if (left < 16) {
        left = 16;
      }

      // Проверяем, не выходит ли меню за нижнюю границу экрана
      let top = rect.bottom + spacing;
      if (top + menuHeight > window.innerHeight) {
        // Показываем меню сверху от кнопки
        top = rect.top - menuHeight - spacing;
        // Если и сверху не помещается, прижимаем к верху экрана
        if (top < 16) {
          top = 16;
        }
      }

      setPosition({
        top,
        left
      });
      // Включаем видимость после установки позиции для анимации
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, triggerRef, visibleActions.length]);

  const handleAction = useCallback((action: CreateAction) => {
    onClose();

    if (action.intent === 'route' && action.href) {
      router.push(action.href);
    } else if (action.intent === 'modal' && action.modalComponent) {
      // Эмитируем событие для открытия соответствующего модального окна
      window.dispatchEvent(
        new CustomEvent<{ component: string }>('open-create-modal', {
          detail: { component: action.modalComponent }
        })
      );
    }
  }, [onClose, router]);

  // Фокус на первом элементе при открытии
  useEffect(() => {
    if (open && visibleActions.length > 0) {
      // Небольшая задержка для корректного позиционирования
      const timer = setTimeout(() => {
        buttonRefs.current[0]?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open, visibleActions.length]);

  // Закрытие при клике вне меню и обработка клавиатуры
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target) || triggerRef?.current?.contains(target)) {
        return;
      }
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        triggerRef?.current?.focus();
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % Math.max(visibleActions.length, 1));
        buttonRefs.current[(activeIndex + 1) % visibleActions.length]?.focus();
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const newIndex = (activeIndex - 1 + visibleActions.length) % visibleActions.length;
        setActiveIndex(newIndex);
        buttonRefs.current[newIndex]?.focus();
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (visibleActions[activeIndex]) {
          handleAction(visibleActions[activeIndex]);
        }
        return;
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, triggerRef, visibleActions, activeIndex, handleAction]);

  if (!open || !position) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Меню создания"
      className="fixed z-[100] min-w-[280px] origin-top-left overflow-hidden rounded-2xl border border-[color:var(--surface-border-strong)] bg-[color:var(--surface-popover)] shadow-2xl transition-all duration-200 ease-out"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.95)',
        pointerEvents: isVisible ? 'auto' : 'none'
      }}
    >
      <div className="p-2">
        {visibleActions.length > 0 ? (
          <div className="space-y-1">
            {visibleActions.map((action, index) => (
              <button
                key={action.id}
                ref={(el) => {
                  buttonRefs.current[index] = el;
                }}
                type="button"
                role="menuitem"
                aria-current={activeIndex === index ? 'true' : undefined}
                onClick={() => handleAction(action)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${activeIndex === index
                  ? 'bg-[color:var(--surface-muted)]'
                  : 'hover:bg-[color:var(--surface-muted)]'
                  }`}
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                    {action.label}
                  </p>
                  <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)]">
                    {action.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-3 py-4 text-center">
            <p className="text-xs text-[color:var(--text-tertiary)]">
              Нет доступных действий для этого раздела
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
