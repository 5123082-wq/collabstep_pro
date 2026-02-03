'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { buildLeftMenu } from '@/lib/nav/menu-builder';
import type { UserRole } from '@/lib/auth/roles';
import { useUiStore } from '@/lib/state/ui-store';
import { useMenuPreferencesStore, ALL_MENU_IDS } from '@/stores/menuPreferences';

import {
  LayoutDashboard,
  FolderKanban,
  Store,
  Megaphone,
  Sparkles,
  Users,
  Wallet,
  FileText,
  MessageSquare,
  Bell,
  User,
  Building2,
  LifeBuoy,
  ShieldCheck,
  Briefcase,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

const iconMap = {
  dashboard: LayoutDashboard,
  projects: FolderKanban,
  marketplace: Store,
  marketing: Megaphone,
  ai: Sparkles,
  community: Users,
  finance: Wallet,
  docs: FileText,
  messages: MessageSquare,
  notifications: Bell,
  profile: User,
  org: Building2,
  support: LifeBuoy,
  admin: ShieldCheck,
  performers: Briefcase
} as const;

type IconName = keyof typeof iconMap;

function MenuIcon({ name, className }: { name: IconName; className?: string }) {
  const Icon = iconMap[name];
  if (!Icon) return null;
  return <Icon className={clsx('h-3.5 w-3.5 flex-none text-indigo-200', className)} strokeWidth={1.5} />;
}

type SidebarProps = {
  roles: UserRole[];
};

import { OrganizationSwitcher } from '@/components/organizations/OrganizationSwitcher';

export default function Sidebar({ roles }: SidebarProps) {
  const pathname = usePathname();
  const [normalizedPath = ''] = (pathname ?? '').split('?');
  const [activeFlyout, setActiveFlyout] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  // Используем локальное состояние для предотвращения hydration errors
  // Инициализируем одинаковые значения на сервере и клиенте, затем синхронизируем с store после монтирования
  const [sidebarCollapsed, setLocalSidebarCollapsed] = useState(false);
  const [visibleMenuIds, setVisibleMenuIds] = useState<string[]>(ALL_MENU_IDS);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  
  // Получаем значения из stores для синхронизации после монтирования
  const storeVisibleMenuIds = useMenuPreferencesStore((state) => state.visibleMenuIds);
  const storeExpandedGroups = useUiStore((state) => state.expandedGroups);
  const { toggleGroup, sidebarCollapsed: storeSidebarCollapsed, toggleSidebarCollapsed, setSidebarCollapsed, setExpandedGroups: setStoreExpandedGroups } = useUiStore((state) => ({
    toggleGroup: state.toggleGroup,
    sidebarCollapsed: state.sidebarCollapsed,
    toggleSidebarCollapsed: state.toggleSidebarCollapsed,
    setSidebarCollapsed: state.setSidebarCollapsed,
    setExpandedGroups: state.setExpandedGroups
  }));
  
  // Вычисляем меню с использованием useMemo для стабильности
  // До монтирования используем дефолтные значения для предотвращения hydration errors
  const menu = useMemo(() => {
    // До монтирования всегда используем ALL_MENU_IDS для одинакового рендера на сервере и клиенте
    const effectiveVisibleMenuIds = isMounted ? visibleMenuIds : ALL_MENU_IDS;
    return buildLeftMenu(roles, effectiveVisibleMenuIds);
  }, [roles, visibleMenuIds, isMounted]);

  // Устанавливаем флаг монтирования и синхронизируем состояние только один раз после монтирования
  useEffect(() => {
    setIsMounted(true);
    setLocalSidebarCollapsed(storeSidebarCollapsed);
    setVisibleMenuIds(storeVisibleMenuIds);
    setExpandedGroups(storeExpandedGroups);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Синхронизируем локальное состояние с store после монтирования
  useEffect(() => {
    if (!isMounted) {
      return;
    }
    setLocalSidebarCollapsed(storeSidebarCollapsed);
  }, [storeSidebarCollapsed, isMounted]);

  // Синхронизируем visibleMenuIds с store после монтирования
  useEffect(() => {
    if (!isMounted) {
      return;
    }
    setVisibleMenuIds(storeVisibleMenuIds);
  }, [storeVisibleMenuIds, isMounted]);

  // Синхронизируем expandedGroups с store после монтирования
  useEffect(() => {
    if (!isMounted) {
      return;
    }
    setExpandedGroups(storeExpandedGroups);
  }, [storeExpandedGroups, isMounted]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isMounted) {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const applyValue = (value: boolean) => {
      setSidebarCollapsed(value);
      setLocalSidebarCollapsed(value);
    };
    applyValue(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => applyValue(event.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }

    mediaQuery.addListener(listener);
    return () => mediaQuery.removeListener(listener);
  }, [setSidebarCollapsed, isMounted]);

  const isSectionActive = (href?: string, children?: typeof menu[number]['children']) => {
    if (href && normalizedPath.startsWith(href)) {
      return true;
    }

    if (!children?.length) {
      return false;
    }

    return children.some((child) => child.type !== 'divider' && child.href && normalizedPath.startsWith(child.href));
  };

  const closeFlyout = () => setActiveFlyout(null);

  useEffect(() => {
    setActiveFlyout(null);
  }, [normalizedPath]);

  const renderExpandedMenu = () => (
    <nav 
      aria-label="Навигация приложения" 
      className="sidebar-nav mt-2 flex flex-1 flex-col gap-2 overflow-y-auto pr-0.5"
      style={{ scrollbarGutter: 'stable' }}
    >
      {menu.map((section) => {
        const isExpanded = expandedGroups.includes(section.id) || !section.children;
        const hasChildren = Boolean(section.children?.length);
        const active = isSectionActive(section.href, section.children);

        return (
          <div key={section.id} className="rounded-2xl border border-transparent hover:border-[color:var(--surface-border-subtle)]">
            <div className="flex items-center justify-between px-2 py-1.5">
              {section.href ? (
                <Link
                  href={section.href}
                  className={clsx(
                    'flex flex-1 items-center gap-2 text-sm font-semibold text-[color:var(--text-secondary)] transition hover:text-[color:var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
                    active && 'text-[color:var(--text-primary)]'
                  )}
                  onClick={() => {
                    // Ensure navigation works - don't prevent default
                    // If section has children and is not expanded, allow navigation to proceed
                    // The button handler will handle expand/collapse separately
                  }}
                >
                  <MenuIcon name={(section.icon ?? 'dashboard') as IconName} />
                  {section.label}
                </Link>
              ) : (
                <div className="flex flex-1 items-center gap-2 text-sm font-semibold text-[color:var(--text-secondary)]">
                  <MenuIcon name={(section.icon ?? 'dashboard') as IconName} />
                  {section.label}
                </div>
              )}
              {hasChildren && (
                <button
                  type="button"
                  onClick={() => {
                    toggleGroup(section.id);
                    // Обновляем локальное состояние сразу для мгновенной реакции UI
                    const currentExpanded = expandedGroups.includes(section.id);
                    const newExpandedGroups = currentExpanded
                      ? expandedGroups.filter((id) => id !== section.id)
                      : [...expandedGroups, section.id];
                    setExpandedGroups(newExpandedGroups);
                  }}
                  aria-expanded={isExpanded}
                  aria-label={(isExpanded ? 'Свернуть ' : 'Раскрыть ') + section.label}
                  className="rounded-full border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] px-2 py-1 text-xs leading-none text-[color:var(--text-tertiary)] transition hover:border-indigo-500/40 hover:text-[color:var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                >
                  {isExpanded ? '−' : '+'}
                </button>
              )}
            </div>
            {hasChildren && isExpanded && (
              <ul className="space-y-1 px-2.5 pb-2">
                {section.children?.map((child) => {
                  if (child.type === 'divider') {
                    return (
                      <li key={child.id} role="separator" className="my-2 border-t border-[color:var(--surface-border-subtle)]" />
                    );
                  }

                  return (
                    <li key={child.id}>
                      <Link
                        href={child.href}
                        className={clsx(
                          'block rounded-xl px-2.5 py-2 text-sm text-[color:var(--text-secondary)] transition hover:bg-indigo-500/10 hover:text-[color:var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
                          normalizedPath === child.href && 'bg-indigo-500/10 text-[color:var(--text-primary)]'
                        )}
                      >
                        {child.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );

  const renderCollapsedMenu = () => (
    <nav
      aria-label="Свёрнутая навигация приложения"
      className="sidebar-nav mt-4 flex flex-1 flex-col items-center gap-2 overflow-hidden pb-4 md:overflow-y-auto"
    >
      {menu.map((section) => {
        const hasChildren = Boolean(section.children?.length);
        const active = isSectionActive(section.href, section.children);
        const isFlyoutOpen = activeFlyout === section.id;

        return (
          <div
            key={section.id}
            className="relative w-full"
            onMouseLeave={() => closeFlyout()}
            onMouseEnter={() => hasChildren && setActiveFlyout(section.id)}
            onFocusCapture={() => hasChildren && setActiveFlyout(section.id)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                closeFlyout();
              }
            }}
          >
            {section.href ? (
              <Link
                href={section.href}
                className={clsx(
                  'group flex h-12 w-full items-center justify-center rounded-2xl border border-transparent text-[color:var(--text-secondary)] transition hover:border-indigo-500/40 hover:text-[color:var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
                  active && 'border-indigo-500/40 text-[color:var(--text-primary)]'
                )}
                aria-haspopup={hasChildren ? 'true' : undefined}
                aria-expanded={hasChildren ? isFlyoutOpen : undefined}
                onClick={(event) => {
                  if (hasChildren && activeFlyout !== section.id) {
                    event.preventDefault();
                    setActiveFlyout(section.id);
                    return;
                  }

                  closeFlyout();
                }}
              >
                <MenuIcon
                  name={(section.icon ?? 'dashboard') as IconName}
                  className="h-5 w-5 text-indigo-200 transition group-hover:text-indigo-100"
                />
                <span className="sr-only">{section.label}</span>
              </Link>
            ) : (
              <div
                className={clsx(
                  'flex h-12 w-full items-center justify-center rounded-2xl border border-[color:var(--surface-border-subtle)] text-[color:var(--text-secondary)]',
                  active && 'border-indigo-500/40 text-[color:var(--text-primary)]'
                )}
              >
                <MenuIcon name={(section.icon ?? 'dashboard') as IconName} className="h-5 w-5 text-indigo-200" />
                <span className="sr-only">{section.label}</span>
              </div>
            )}

            {hasChildren && (
              <div
                className={clsx(
                  'pointer-events-none absolute left-[72px] top-0 z-40 hidden w-[280px] rounded-2xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-popover)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-sm',
                  isFlyoutOpen && 'pointer-events-auto block'
                )}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[color:var(--text-primary)]">{section.label}</span>
                  <div className="mt-3 space-y-2">
                    {section.href && (
                      <Link
                        href={section.href}
                        className={clsx(
                          'block rounded-xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm font-medium text-[color:var(--text-secondary)] transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-[color:var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
                          isSectionActive(section.href) && 'border-indigo-500/40 bg-indigo-500/10 text-[color:var(--text-primary)]'
                        )}
                        onClick={() => closeFlyout()}
                      >
                        {section.label}
                      </Link>
                    )}
                    <ul className="space-y-2">
                      {section.children?.map((child) => {
                        if (child.type === 'divider') {
                          return <li key={child.id} role="separator" className="my-2 border-t border-[color:var(--surface-border-subtle)]" />;
                        }

                        return (
                          <li key={child.id}>
                            <Link
                              href={child.href}
                              className={clsx(
                                'block rounded-xl border border-transparent px-3 py-2 text-sm text-[color:var(--text-secondary)] transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-[color:var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
                                normalizedPath === child.href && 'border-indigo-500/40 bg-indigo-500/10 text-[color:var(--text-primary)]'
                              )}
                              onClick={() => closeFlyout()}
                            >
                              {child.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <aside
      className={clsx(
        'flex flex-shrink-0 flex-col overflow-hidden border-r border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] py-5 transition-[width] duration-300 ease-out',
        'h-screen md:h-full',
        sidebarCollapsed ? 'w-[72px] px-2' : 'w-[230px] px-2'
      )}
      data-collapsed={sidebarCollapsed}
    >
      <div className={clsx('flex items-center justify-between flex-shrink-0', sidebarCollapsed ? 'px-1' : 'px-1.5')}>
        {!sidebarCollapsed && (
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400">Collabverse</p>
        )}
        <div className="flex items-center gap-1.5">
          {!sidebarCollapsed && expandedGroups.length > 0 && (
            <button
              type="button"
              onClick={() => setStoreExpandedGroups([])}
              aria-label="Свернуть все"
              title="Свернуть все"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] text-[color:var(--text-tertiary)] transition hover:border-indigo-500/40 hover:text-[color:var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          )}
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] text-[color:var(--text-tertiary)] transition hover:border-indigo-500/40 hover:text-[color:var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            aria-label={sidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>
      
      <div className="mt-4 flex-shrink-0">
        <OrganizationSwitcher collapsed={sidebarCollapsed} />
      </div>

      {isMounted ? (sidebarCollapsed ? renderCollapsedMenu() : renderExpandedMenu()) : renderExpandedMenu()}
    </aside>
  );
}
