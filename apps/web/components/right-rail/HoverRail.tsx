'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Settings, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DrawerManager } from './DrawerManager';
import { DialogManager } from './DialogManager';
import { RailItem } from './RailItem';
import { useRailConfig, type QuickActionWithBadge } from './useRailConfig';
import {
  COLLAPSED_RAIL_WIDTH,
  EXPANDED_RAIL_WIDTH,
  HOVER_RAIL_DELAY,
  RAIL_INNER_PADDING,
} from './constants';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useUI, type Dialog as DialogType, type Drawer as DrawerType } from '@/stores/ui';
import { cn } from '@/lib/utils';

const COLLAPSED_WIDTH = COLLAPSED_RAIL_WIDTH;
const EXPANDED_WIDTH = EXPANDED_RAIL_WIDTH;
const HOVER_DELAY = HOVER_RAIL_DELAY;
const INNER_COLLAPSED_WIDTH = COLLAPSED_WIDTH - RAIL_INNER_PADDING * 2;

type HoverRailProps = {
  permissions?: string[];
  featureFlags?: Record<string, boolean>;
};

export default function HoverRail({ permissions = [], featureFlags }: HoverRailProps) {
  const router = useRouter();
  const configOptions = featureFlags ? { permissions, featureFlags } : { permissions };
  const actions = useRailConfig(configOptions);
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const openDrawer = useUI((state) => state.openDrawer);
  const openDialog = useUI((state) => state.openDialog);
  const setRailExpanded = useUI((state) => state.setRailExpanded);
  const activeDrawer = useUI((state) => state.drawer);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleExpand = useCallback(() => {
    clearTimer();
    if (expanded) {
      return;
    }
    timerRef.current = window.setTimeout(() => {
      setExpanded(true);
    }, HOVER_DELAY);
  }, [clearTimer, expanded]);

  const collapse = useCallback(() => {
    clearTimer();
    setExpanded(false);
  }, [clearTimer]);

  useEffect(() => {
    if (!expanded) {
      setRailExpanded(false);
      document.documentElement.setAttribute('data-rail-expanded', 'false');
      return;
    }
    setRailExpanded(true);
    document.documentElement.setAttribute('data-rail-expanded', 'true');
  }, [expanded, setRailExpanded]);

  // Устанавливаем начальное значение при монтировании
  useEffect(() => {
    document.documentElement.setAttribute('data-rail-expanded', 'false');
    return () => {
      // При размонтировании убираем атрибут, если HoverRail был единственным
      document.documentElement.removeAttribute('data-rail-expanded');
    };
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  const hideRail = activeDrawer === 'document';

  useEffect(() => {
    if (hideRail) {
      setExpanded(false);
      setMobileOpen(false);
    }
  }, [hideRail]);

  const handleMouseEnter = useCallback(() => {
    scheduleExpand();
  }, [scheduleExpand]);

  const handleMouseLeave = useCallback(() => {
    collapse();
  }, [collapse]);

  const handleFocus = useCallback(() => {
    clearTimer();
    setExpanded(true);
  }, [clearTimer]);

  const handleBlur = useCallback(() => {
    window.setTimeout(() => {
      const element = containerRef.current;
      if (!element) {
        collapse();
        return;
      }
      const active = document.activeElement;
      if (!active || !element.contains(active)) {
        collapse();
      }
    }, 80);
  }, [collapse]);

  const handleAction = useCallback(
    (action: QuickActionWithBadge) => {
      const intent = action.intent;
      const payload = action.payload ?? {};

      if (intent === 'route') {
        const target = typeof payload.to === 'string' ? payload.to : '/dashboard';
        router.push(target);
      }

      if (intent === 'sheet') {
        const sheet = typeof payload.sheet === 'string' ? (payload.sheet as DrawerType) : null;
        if (sheet) {
          openDrawer(sheet);
        }
      }

      if (intent === 'dialog' && typeof payload.dialog === 'string') {
        openDialog(payload.dialog as DialogType);
      }

      if (intent === 'command' && typeof window !== 'undefined') {
        const event = new CustomEvent('rail:command', { detail: action });
        window.dispatchEvent(event);
      }

      if (mobileOpen) {
        setMobileOpen(false);
      }
    },
    [mobileOpen, openDialog, openDrawer, router]
  );

  const mobileActions = useMemo(() => actions, [actions]);

  const handleOpenSettings = useCallback(() => {
    openDrawer('rail-settings');
    setMobileOpen(false);
  }, [openDrawer]);

  const shouldRenderRail = !hideRail;

  return (
    <>
      {shouldRenderRail ? (
        <aside
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocusCapture={handleFocus}
        onBlurCapture={handleBlur}
        className="pointer-events-none fixed right-4 top-[140px] bottom-8 z-[60] hidden lg:flex"
        style={{ width: expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH, transition: 'width 200ms ease' }}
        data-expanded={expanded}
        >
          <div className="pointer-events-auto flex h-full w-full flex-col rounded-2xl border border-neutral-800/80 bg-neutral-900/80 p-2 backdrop-blur">
            {actions.map((action, index) => {
              const previous = index > 0 ? actions[index - 1] : undefined;
              const currentSection = action.section ?? 'default';
              const previousSection = previous?.section ?? 'default';
              const showSeparator = index > 0 && currentSection !== previousSection;
              return (
                <Fragment key={action.id}>
                  {showSeparator ? <div className="my-2 border-t border-neutral-800/60" aria-hidden="true" /> : null}
                  <RailItem
                    action={action}
                    expanded={expanded}
                    onClick={() => handleAction(action)}
                    badge={action.badge}
                    iconColumnWidth={INNER_COLLAPSED_WIDTH}
                  />
                </Fragment>
              );
            })}
            <div className="mt-auto border-t border-neutral-800/60 pt-3">
              <button
                type="button"
                onClick={handleOpenSettings}
                className={cn(
                  'flex w-full items-center justify-center rounded-xl border border-neutral-800/70 bg-neutral-950/70 text-sm font-medium text-neutral-200 transition hover:border-indigo-500/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
                  expanded ? 'gap-2 px-3 py-2' : 'h-12 px-0'
                )}
                aria-label="Настроить меню"
              >
                <Settings className="h-5 w-5" aria-hidden="true" />
                {expanded ? <span>Настроить меню</span> : <span className="sr-only">Настроить меню</span>}
              </button>
            </div>
          </div>
        </aside>
      ) : null}

      {shouldRenderRail ? (
        <button
        type="button"
        className="fixed bottom-6 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500 text-white shadow-xl transition hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 lg:hidden"
        aria-label="Открыть быстрые действия"
        onClick={() => setMobileOpen(true)}
      >
        <span className="sr-only">Открыть быстрые действия</span>
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      </button>
      ) : null}

      {shouldRenderRail ? (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen} side="bottom">
          <SheetContent side="bottom" className="max-h-[80vh] w-full rounded-t-3xl border-neutral-800 bg-neutral-900/95 p-4">
            {/* Индикатор для drag */}
            <div className="mb-3 flex justify-center">
              <div className="h-1 w-12 rounded-full bg-neutral-700" aria-hidden="true" />
            </div>
            
            <SheetHeader className="border-none pb-2">
              <div className="flex items-center justify-between">
                <SheetTitle>Быстрый доступ</SheetTitle>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                  aria-label="Закрыть"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </SheetHeader>
            <div className="mt-2 grid gap-2">
              {mobileActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-3 text-left text-sm text-neutral-100 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                    onClick={() => handleAction(action)}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      {action.label}
                    </span>
                    {typeof action.badge === 'number' && action.badge > 0 ? (
                      <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-200">{action.badge}</span>
                    ) : null}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={handleOpenSettings}
                className="mt-2 rounded-xl border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-sm font-medium text-neutral-200 transition hover:border-indigo-500/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                Настроить меню
              </button>
            </div>
          </SheetContent>
        </Sheet>
      ) : null}

      <DrawerManager />
      <DialogManager />
    </>
  );
}
