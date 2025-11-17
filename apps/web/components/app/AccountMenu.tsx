'use client';

import clsx from 'clsx';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTheme } from '@/components/theme/ThemeContext';
import { getUserType, setUserType, type UserType } from '@/lib/auth/roles';
import { useMenuPreferencesStore, MENU_PRESETS } from '@/stores/menuPreferences';
import { leftMenuConfig } from './LeftMenu.config';
import type { DemoProfile } from './AppTopbar';

const themeOptions = [
  {
    id: 'light' as const,
    label: 'Светлая',
    description: 'Высокая читаемость на светлом фоне',
    icon:
      'M12 5a1 1 0 0 1-1-1V2a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1Zm0 14a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1Zm7-7a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2h-2a1 1 0 0 1-1-1ZM4 12a1 1 0 0 1-1 1H1a1 1 0 1 1 0-2h2a1 1 0 0 1 1 1Zm12.95-6.364a1 1 0 0 1 0-1.414l1.414-1.415a1 1 0 1 1 1.414 1.415l-1.414 1.414a1 1 0 0 1-1.414 0ZM5.636 17.95a1 1 0 0 1 0 1.414L4.222 20.78a1 1 0 1 1-1.414-1.414l1.414-1.414a1 1 0 0 1 1.414 0ZM18.364 17.95a1 1 0 0 1 1.414 0l1.414 1.414a1 1 0 1 1-1.414 1.414l-1.414-1.414a1 1 0 0 1 0-1.414ZM5.636 4.636a1 1 0 0 1-1.414 0L2.808 3.222A1 1 0 0 1 4.222 1.808l1.414 1.414a1 1 0 0 1 0 1.414ZM12 7.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5Z'
  },
  {
    id: 'dark' as const,
    label: 'Тёмная',
    description: 'Глубокие цвета и акцентные контуры',
    icon: 'M21 12.79A9 9 0 0 1 11.21 3 6.5 6.5 0 1 0 21 12.79Z'
  }
];

type AccountMenuProps = {
  profile: DemoProfile;
  onLogout: () => void;
  isLoggingOut: boolean;
  onOpenSettings?: () => void;
};

export default function AccountMenu({ profile, onLogout, isLoggingOut, onOpenSettings }: AccountMenuProps) {
  const { mode, resolvedTheme, setMode } = useTheme();
  const [isOpen, setOpen] = useState(false);
  const [isMenuCustomizationOpen, setMenuCustomizationOpen] = useState(false);
  const [userType, setUserTypeState] = useState<UserType>(() => getUserType());
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuCustomizationPanelId = useId();
  
  const { visibleMenuIds, toggleMenuVisibility, reset: resetMenuPreferences, isMenuVisible, applyPreset } = useMenuPreferencesStore();

  // Применяем предустановку при первой загрузке, если тип пользователя установлен
  // и настройки меню еще не кастомизированы (для совместимости со старыми настройками)
  useEffect(() => {
    if (userType !== null) {
      const key = userType ?? 'null';
      const preset = MENU_PRESETS[key as keyof typeof MENU_PRESETS];
      const presetSet = new Set(preset);
      const currentSet = new Set(visibleMenuIds);
      // Если текущее меню не соответствует предустановке, применяем её
      // Это происходит только если пользователь не кастомизировал меню вручную
      if (preset.length !== visibleMenuIds.length || 
          preset.some(id => !currentSet.has(id)) ||
          visibleMenuIds.some(id => !presetSet.has(id))) {
        // Применяем предустановку только если это первая загрузка (все меню видимы)
        // или если пользователь только что выбрал тип
        const isFirstLoad = visibleMenuIds.length === leftMenuConfig.length;
        if (isFirstLoad) {
          applyPreset(userType);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userType, visibleMenuIds.length, applyPreset]);

  const handleUserTypeChange = (type: UserType) => {
    setUserType(type);
    setUserTypeState(type);
    // Применяем предустановку меню для типа пользователя
    const { applyPreset } = useMenuPreferencesStore.getState();
    applyPreset(type);
    // Обновляем страницу для применения изменений
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const initials = useMemo(() => {
    const [first = ''] = profile.email;
    return first.toUpperCase();
  }, [profile.email]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={clsx(
          'flex h-9 w-9 items-center justify-center rounded-full border text-[12.6px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
          'border-[color:var(--theme-control-border)] bg-[color:var(--theme-control-bg)] text-[color:var(--theme-control-foreground)]',
          'hover:border-[color:var(--theme-control-border-hover)] hover:text-[color:var(--theme-control-foreground-hover)]'
        )}
        aria-haspopup="menu"
        aria-expanded={isOpen ? 'true' : 'false'}
        aria-label="Меню аккаунта"
      >
        {initials}
      </button>
      {isOpen ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Настройки аккаунта"
          className="absolute right-0 z-[100] mt-3 w-[26rem] origin-top-right overflow-hidden rounded-2xl border border-[color:var(--surface-border-strong)] bg-[color:var(--surface-popover)] shadow-2xl"
        >
          <div className="border-b border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">{profile.email}</p>
                <p className="text-xs text-[color:var(--text-secondary)]">{profile.role === 'admin' ? 'Администратор' : 'Пользователь'}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                disabled={isLoggingOut}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                  isLoggingOut
                    ? 'cursor-not-allowed border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] text-[color:var(--text-tertiary)]'
                    : 'border-[color:var(--button-danger-border)] bg-[color:var(--button-danger-bg)] text-[color:var(--button-danger-foreground)] hover:border-[color:var(--button-danger-border-strong)] hover:bg-[color:var(--button-danger-bg-hover)] focus-visible:outline-[color:var(--button-danger-border-strong)]'
                )}
              >
                {isLoggingOut ? 'Выход…' : 'Выйти'}
              </button>
            </div>
          </div>
          <div className="space-y-4 px-4 py-3">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-tertiary)]">
                  Тип пользователя
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={userType === 'performer'}
                  onClick={() => handleUserTypeChange('performer')}
                  className={clsx(
                    'flex flex-col items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                    userType === 'performer'
                      ? 'border-[color:var(--button-primary-border)] bg-[color:var(--button-primary-bg)] text-[color:var(--button-primary-foreground)] shadow-sm focus-visible:outline-[color:var(--button-primary-border-strong)]'
                      : 'border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] text-[color:var(--text-secondary)] hover:border-[color:var(--button-primary-border)] hover:text-[color:var(--text-primary)] focus-visible:outline-[color:var(--surface-border-strong)]'
                  )}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Исполнитель
                  <span className="text-xs text-[color:var(--text-tertiary)]">
                    Маркетплейс и вакансии
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={userType === 'marketer'}
                  onClick={() => handleUserTypeChange('marketer')}
                  className={clsx(
                    'flex flex-col items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                    userType === 'marketer'
                      ? 'border-[color:var(--button-primary-border)] bg-[color:var(--button-primary-bg)] text-[color:var(--button-primary-foreground)] shadow-sm focus-visible:outline-[color:var(--button-primary-border-strong)]'
                      : 'border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] text-[color:var(--text-secondary)] hover:border-[color:var(--button-primary-border)] hover:text-[color:var(--text-primary)] focus-visible:outline-[color:var(--surface-border-strong)]'
                  )}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <path d="m22 6-10 7L2 6" />
                  </svg>
                  Маркетолог
                  <span className="text-xs text-[color:var(--text-tertiary)]">Маркетинг блок</span>
                </button>
              </div>
              {userType && (
                <button
                  type="button"
                  onClick={() => handleUserTypeChange(null)}
                  className="mt-2 w-full rounded-lg border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] px-3 py-1.5 text-xs text-[color:var(--text-secondary)] transition hover:text-[color:var(--text-primary)]"
                >
                  Сбросить выбор
                </button>
              )}
            </section>
            <section>
              <button
                type="button"
                onClick={() => setMenuCustomizationOpen((value) => !value)}
                className="flex w-full items-center justify-between rounded-xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] px-3 py-2 text-left text-sm font-semibold text-[color:var(--text-primary)] transition hover:border-[color:var(--accent-border)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                aria-expanded={isMenuCustomizationOpen}
                aria-controls={menuCustomizationPanelId}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-tertiary)]">Кастомизация меню</span>
                <span className="flex items-center gap-2 text-xs text-[color:var(--text-tertiary)]">
                  {visibleMenuIds.length} / {leftMenuConfig.length}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className={clsx('h-4 w-4 transition-transform', isMenuCustomizationOpen ? 'rotate-180' : 'rotate-0')}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </button>
              <div
                id={menuCustomizationPanelId}
                className={clsx('space-y-2 pt-3', isMenuCustomizationOpen ? 'mt-1' : 'mt-1 hidden')}
              >
                <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                  {leftMenuConfig.map((section) => {
                    const isVisible = isMenuVisible(section.id);
                    return (
                      <label
                        key={section.id}
                        className={clsx(
                          'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition cursor-pointer',
                          isVisible
                            ? 'border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] hover:border-[color:var(--accent-border)]'
                            : 'border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] opacity-60 hover:opacity-80'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => toggleMenuVisibility(section.id)}
                          className="h-4 w-4 rounded border-[color:var(--surface-border-strong)] accent-[color:var(--accent-fg)]"
                        />
                        <span className="flex-1 text-[color:var(--text-primary)]">{section.label}</span>
                      </label>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetMenuPreferences();
                  }}
                  className="mt-2 w-full rounded-lg border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] px-3 py-1.5 text-xs text-[color:var(--text-secondary)] transition hover:text-[color:var(--text-primary)]"
                >
                  Сбросить к полному меню
                </button>
              </div>
            </section>
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-tertiary)]">Тема</h3>
                <span className="rounded-full border border-[color:var(--surface-border-subtle)] px-2 py-0.5 text-xs text-[color:var(--text-tertiary)]">
                  {resolvedTheme === 'dark' ? 'Тёмная' : 'Светлая'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {themeOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={mode === option.id}
                    onClick={() => setMode(option.id)}
                    className={clsx(
                      'flex flex-col items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                      mode === option.id
                        ? 'border-[color:var(--button-primary-border)] bg-[color:var(--button-primary-bg)] text-[color:var(--button-primary-foreground)] shadow-sm focus-visible:outline-[color:var(--button-primary-border-strong)]'
                        : 'border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] text-[color:var(--text-secondary)] hover:border-[color:var(--button-primary-border)] hover:text-[color:var(--text-primary)] focus-visible:outline-[color:var(--surface-border-strong)]'
                    )}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={option.icon} fill="currentColor" />
                    </svg>
                    {option.label}
                  </button>
                ))}
              </div>
            </section>
            {onOpenSettings && (
              <section>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onOpenSettings();
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] px-3 py-2 text-left text-sm font-semibold text-[color:var(--text-primary)] transition hover:border-[color:var(--accent-border)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-tertiary)]">
                    Настройки платформы
                  </span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4 text-[color:var(--text-tertiary)]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22a10 10 0 1 1 10-10 10 10 0 0 1-10 10Z" />
                    <path d="M12 18a6 6 0 0 1-6-6 6 6 0 0 1 6-6 6 6 0 0 1 6 6 6 6 0 0 1-6 6Z" />
                    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                  </svg>
                </button>
              </section>
            )}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-tertiary)]">
                Скоро
              </h3>
              <div className="space-y-2">
                {[{ label: 'Часовой пояс' }, { label: 'Валюта' }, { label: 'Язык интерфейса' }].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    disabled
                    className="flex w-full items-center justify-between rounded-xl border border-dashed border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] px-3 py-2 text-left text-sm text-[color:var(--text-tertiary)] opacity-70"
                  >
                    {item.label}
                    <span className="text-xs uppercase tracking-[0.2em]">Скоро</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
