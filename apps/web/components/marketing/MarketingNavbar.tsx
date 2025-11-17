'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent
} from 'react';
import { marketingMenu, type NavItem } from '@/config/MarketingMenu.config';
import { ContentBlock } from '@/components/ui/content-block';
import MobileMenu from './MobileMenu';

const childDescriptions: Record<string, string> = {
  overview: 'Короткий обзор платформы и её ключевых возможностей.',
  'audience-home': 'Узнайте, как Collabverse помогает разным ролям и командам.',
  ai: 'Настраивайте AI-агентов, чтобы автоматизировать рутину.',
  pm: 'Готовые шаблоны и сценарии управления проектами.',
  market: 'Соберите команду из проверенных специалистов.',
  founder: 'Инструменты для оценки гипотез и контроля бюджета.',
  designers: 'Работайте с брифами и AI-ассистентами для креатива.',
  developers: 'Планируйте релизы и интеграции без хаоса.',
  marketers: 'Конструктор кампаний и помощь в создании контента.',
  contractors: 'Управляйте командой подрядчиков и предложениями.',
  feed: 'Просматривайте актуальные проекты и отправляйте отклики.',
  cases: 'Изучайте истории успеха и готовые кейсы.',
  catalog: 'Найдите специалистов по навыкам и опыту.',
  rating: 'Узнайте, как формируются рейтинги и отзывы.',
  pro: 'Профессиональные тарифы для специалистов.',
  teams: 'Комплексные планы для команд и агентств.',
  articles: 'Подборка статей и гайдбуков по запуску проектов.',
  webinars: 'Расписание вебинаров и практических сессий.'
};

const focusableSelectors = 'a[href], button';

export default function MarketingNavbar() {
  const pathname = usePathname();
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setOpenItemId(null);
  }, [pathname]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated || openItemId) {
      return;
    }

    if (typeof document === 'undefined') {
      return;
    }

    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLElement)) {
      return;
    }

    if (!navRef.current?.contains(activeElement)) {
      return;
    }

    const navItemId = activeElement.getAttribute('data-nav-item');
    if (navItemId) {
      setOpenItemId(navItemId);
    }
  }, [isHydrated, openItemId]);

  useEffect(() => {
    if (!openItemId) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setOpenItemId(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenItemId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [openItemId]);

  const handlePanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>, itemId: string) => {
    if (event.key !== 'Tab') {
      return;
    }

    const panel = panelRefs.current[itemId];
    if (!panel) {
      return;
    }

    const focusable = panel.querySelectorAll<HTMLElement>(focusableSelectors);
    if (focusable.length === 0) {
      return;
    }

    const first = focusable.item(0);
    const last = focusable.item(focusable.length - 1);
    if (!first || !last) {
      return;
    }
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey) {
      if (active === first) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const isItemActive = useMemo(() => {
    const normalizedPath = pathname?.split('#')[0] ?? '/';
    return (item: NavItem) => {
      if (item.href) {
        return normalizedPath === item.href;
      }

      if (!item.children) {
        return false;
      }

      return item.children.some((child) => {
        const [hrefPath] = child.href.split('#');
        return normalizedPath === hrefPath;
      });
    };
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-900 bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="text-base font-semibold text-neutral-100 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        >
          Collabverse
        </Link>
        <nav
          ref={navRef}
          className="hidden items-center gap-6 md:flex"
          aria-label="Основная навигация"
          data-menu-ready={isHydrated ? 'true' : undefined}
        >
          {marketingMenu.map((item) => {
            const active = isItemActive(item);
            if (!item.children?.length) {
              return (
                <Link
                  key={item.id}
                  href={item.href ?? '#'}
                  className={clsx(
                    'text-sm font-semibold text-neutral-200 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
                    active && 'text-white'
                  )}
                >
                  {item.label}
                </Link>
              );
            }

            const isOpen = openItemId === item.id;
            return (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => setOpenItemId(item.id)}
                onMouseLeave={() => setOpenItemId((current) => (current === item.id ? null : current))}
                onFocusCapture={() => setOpenItemId(item.id)}
                onBlur={(event: ReactFocusEvent<HTMLDivElement>) => {
                  const nextTarget = event.relatedTarget;
                  if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
                    setOpenItemId((current) => (current === item.id ? null : current));
                  }
                }}
              >
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={isOpen ? 'true' : 'false'}
                  aria-controls={`mega-${item.id}`}
                  id={`mega-trigger-${item.id}`}
                  data-nav-item={item.id}
                  className={clsx(
                    'text-sm font-semibold text-neutral-200 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
                    active && 'text-white'
                  )}
                  onFocus={() => setOpenItemId(item.id)}
                  onClick={() => setOpenItemId((current) => (current === item.id ? null : item.id))}
                  onKeyDown={(event: ReactKeyboardEvent<HTMLButtonElement>) => {
                    if (event.key === 'Escape') {
                      setOpenItemId(null);
                      return;
                    }

                    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
                      event.preventDefault();
                      setOpenItemId(item.id);
                    }
                  }}
                >
                  {item.label}
                </button>
                {/* Невидимый мост между кнопкой и меню для поддержания hover */}
                <div
                  className={clsx(
                    'absolute left-1/2 top-full h-4 w-[28rem] -translate-x-1/2',
                    isOpen ? 'pointer-events-auto' : 'pointer-events-none'
                  )}
                  aria-hidden="true"
                />
                <div
                  id={`mega-${item.id}`}
                  ref={(node) => {
                    panelRefs.current[item.id] = node;
                  }}
                  onKeyDown={(event) => handlePanelKeyDown(event, item.id)}
                  role="menu"
                  aria-labelledby={`mega-trigger-${item.id}`}
                  className={clsx(
                    'absolute left-1/2 z-30 mt-0 w-[28rem] -translate-x-1/2 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 pt-6 text-left shadow-2xl transition-opacity',
                    isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                  )}
                >
                  <div className="space-y-4">
                    {item.children.map((child) => (
                      <ContentBlock key={child.id} size="sm" className="p-4">
                        <Link
                          href={child.href}
                          onClick={() => setOpenItemId(null)}
                          role="menuitem"
                          className="text-sm font-semibold text-neutral-100 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                        >
                          {child.label}
                        </Link>
                        <p className="mt-2 text-xs text-neutral-400">
                          {childDescriptions[child.id] ?? 'Узнать подробнее.'}
                        </p>
                        {child.cta && (
                          <Link
                            href={child.cta.href}
                            onClick={() => setOpenItemId(null)}
                            role="menuitem"
                            className="mt-3 inline-flex rounded-full border border-indigo-500 px-3 py-1 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                          >
                            {child.cta.label}
                          </Link>
                        )}
                      </ContentBlock>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
        <MobileMenu menu={marketingMenu} />
      </div>
    </header>
  );
}
