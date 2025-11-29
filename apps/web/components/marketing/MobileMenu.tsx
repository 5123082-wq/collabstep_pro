'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { NavItem } from '@/config/MarketingMenu.config';

interface MobileMenuProps {
  menu: NavItem[];
}

export default function MobileMenu({ menu }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const toggleSection = (id: string) => {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const focusableSelectors = useMemo(
    () => 'a[href], button:not([data-ignore-trap="true"])',
    []
  );

  const handleTrapFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !panelRef.current) {
      return;
    }

    const focusable = panelRef.current.querySelectorAll<HTMLElement>(focusableSelectors);
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

  const closeMenu = () => setOpen(false);

  const menuContent = open && mounted ? (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-hidden="true"
        onClick={closeMenu}
      />
      <aside
        id="mobile-menu-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Мобильная навигация"
        className="absolute inset-y-0 right-0 flex w-80 max-w-full flex-col border-l border-neutral-800 bg-neutral-900 shadow-2xl"
      >
        <div
          ref={panelRef}
          className="flex h-full flex-col overflow-y-auto px-6 py-6"
          onKeyDown={handleTrapFocus}
        >
          <div className="mb-6 flex items-center justify-between">
            <p className="text-base font-semibold text-neutral-100">Навигация</p>
            <button
              ref={closeButtonRef}
              type="button"
              className="rounded-full border border-neutral-700 px-3 py-1 text-sm text-neutral-300 transition hover:border-neutral-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              onClick={closeMenu}
            >
              Закрыть
            </button>
          </div>
          <nav className="space-y-4" aria-label="Основное меню">
            {menu.map((item) => {
              if (item.children?.length) {
                const isOpen = expanded.includes(item.id);
                return (
                  <div key={item.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg border border-neutral-800 px-4 py-3 text-left text-sm font-semibold text-neutral-100 transition hover:border-neutral-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                      aria-expanded={isOpen ? 'true' : 'false'}
                      aria-controls={`mobile-accordion-${item.id}`}
                      onClick={() => toggleSection(item.id)}
                    >
                      {item.label}
                      <span aria-hidden>{isOpen ? '−' : '+'}</span>
                    </button>
                    <div
                      id={`mobile-accordion-${item.id}`}
                      className={clsx('mt-3 space-y-3 border-l border-neutral-800 pl-4', {
                        hidden: !isOpen
                      })}
                    >
                      {item.children.map((child) => (
                        <div key={child.id} className="space-y-2">
                          <Link
                            href={child.href}
                            onClick={closeMenu}
                            className="block text-sm font-medium text-neutral-200 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                          >
                            {child.label}
                          </Link>
                          {child.cta && (
                            <Link
                              href={child.cta.href}
                              onClick={closeMenu}
                              className="inline-flex rounded-full border border-indigo-500 px-3 py-1 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                            >
                              {child.cta.label}
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={item.id}
                  href={item.href ?? '#'}
                  onClick={closeMenu}
                  className="block rounded-lg border border-neutral-800 px-4 py-3 text-sm font-semibold text-neutral-100 transition hover:border-neutral-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </div>
  ) : null;

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="rounded-full border border-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-neutral-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        aria-expanded={open ? 'true' : 'false'}
        aria-controls="mobile-menu-panel"
        aria-label="Меню"
        onClick={() => setOpen((prev) => !prev)}
      >
        Меню
      </button>
      {mounted && menuContent && createPortal(menuContent, document.body)}
    </div>
  );
}
