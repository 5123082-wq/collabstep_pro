'use client';

import clsx from 'clsx';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTheme } from '@/components/theme/ThemeContext';
import { getUserType, type UserType } from '@/lib/auth/roles';
import { useMenuPreferencesStore, MENU_PRESETS } from '@/stores/menuPreferences';
import { leftMenuConfig } from './LeftMenu.config';
import type { DemoProfile } from './AppTopbar';
import { toast } from '@/lib/ui/toast';
import {
  Sun,
  Moon,
  Loader2,
  Camera,
  Trash2,
  UserCog,
  ChevronDown,
  Settings,
} from 'lucide-react';

const themeOptions = [
  {
    id: 'light' as const,
    label: 'Светлая',
    description: 'Высокая читаемость на светлом фоне',
    Icon: Sun
  },
  {
    id: 'dark' as const,
    label: 'Тёмная',
    description: 'Глубокие цвета и акцентные контуры',
    Icon: Moon
  }
];

type AccountMenuProps = {
  profile: DemoProfile;
  onLogout: () => void;
  isLoggingOut: boolean;
  onOpenSettings?: () => void;
  onOpenProfileSettings?: () => void;
  onAvatarChange?: (avatarUrl: string | null) => void;
};

const AVATAR_STORAGE_KEY = 'cv-user-avatar';

function getStoredAvatar(email: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const stored = localStorage.getItem(`${AVATAR_STORAGE_KEY}-${email}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function setStoredAvatar(email: string, avatarUrl: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (avatarUrl) {
      localStorage.setItem(`${AVATAR_STORAGE_KEY}-${email}`, JSON.stringify(avatarUrl));
    } else {
      localStorage.removeItem(`${AVATAR_STORAGE_KEY}-${email}`);
    }
  } catch (error) {
    console.error('Failed to store avatar', error);
  }
}

export default function AccountMenu({ profile, onLogout, isLoggingOut, onOpenSettings, onOpenProfileSettings, onAvatarChange }: AccountMenuProps) {
  const { mode, resolvedTheme, setMode } = useTheme();
  const [isOpen, setOpen] = useState(false);
  const [isMenuCustomizationOpen, setMenuCustomizationOpen] = useState(false);
  const [userType, setUserTypeState] = useState<UserType>(null);
  // Инициализируем только из profile.avatarUrl, чтобы избежать проблем с гидратацией
  // localStorage будет загружен только после монтирования
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatarUrl || null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const menuCustomizationPanelId = useId();
  
  const { visibleMenuIds, toggleMenuVisibility, reset: resetMenuPreferences, isMenuVisible, applyPreset } = useMenuPreferencesStore();

  useEffect(() => {
    const updateUserType = () => setUserTypeState(getUserType());
    updateUserType();
    
    // Подписываемся на изменения типа пользователя
    window.addEventListener('cv-user-type-change', updateUserType);
    window.addEventListener('storage', updateUserType);
    
    return () => {
      window.removeEventListener('cv-user-type-change', updateUserType);
      window.removeEventListener('storage', updateUserType);
    };
  }, []);

  // Загружаем avatar из localStorage только после монтирования, чтобы избежать проблем с гидратацией
  useEffect(() => {
    const stored = getStoredAvatar(profile.email);
    const current = profile.avatarUrl || stored;
    if (current !== avatarUrl) {
      setAvatarUrl(current);
    }
  }, [profile.avatarUrl, profile.email, avatarUrl]);

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

  const initials = useMemo(() => {
    const [first = ''] = profile.email;
    return first.toUpperCase();
  }, [profile.email]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      toast('Пожалуйста, выберите изображение', 'warning');
      return;
    }

    // Проверяем размер файла (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast('Размер файла не должен превышать 5MB', 'warning');
      return;
    }

    setIsUploadingAvatar(true);

    try {
      // Читаем файл как Data URL
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarUrl(result);
        setStoredAvatar(profile.email, result);
        onAvatarChange?.(result);
        toast('Фото профиля обновлено', 'success');
        setIsUploadingAvatar(false);
      };
      reader.onerror = () => {
        toast('Ошибка при загрузке фото', 'warning');
        setIsUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to upload avatar', error);
      toast('Ошибка при загрузке фото', 'warning');
      setIsUploadingAvatar(false);
    }

    // Сбрасываем input для возможности повторной загрузки того же файла
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
    setStoredAvatar(profile.email, null);
    onAvatarChange?.(null);
    toast('Фото профиля удалено', 'success');
  };

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
          'flex h-9 w-9 items-center justify-center rounded-full border text-[12.6px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 overflow-hidden',
          'border-[color:var(--theme-control-border)] bg-[color:var(--theme-control-bg)] text-[color:var(--theme-control-foreground)]',
          'hover:border-[color:var(--theme-control-border-hover)] hover:text-[color:var(--theme-control-foreground-hover)]'
        )}
        aria-haspopup="menu"
        aria-expanded={isOpen ? 'true' : 'false'}
        aria-label="Меню аккаунта"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={profile.email}
            className="h-full w-full object-cover"
          />
        ) : (
          initials
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarUpload}
        className="hidden"
        aria-label="Загрузить фото профиля"
      />
      {isOpen ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Настройки аккаунта"
          className="absolute right-0 z-[100] mt-3 w-[26rem] origin-top-right overflow-hidden rounded-2xl border border-[color:var(--surface-border-strong)] bg-[color:var(--surface-popover)] shadow-2xl"
        >
          <div className="border-b border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative group">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] text-sm font-semibold overflow-hidden shrink-0">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt={profile.email}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                    aria-label="Изменить фото профиля"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    ) : (
                      <Camera className="h-5 w-5 text-white" strokeWidth={2} />
                    )}
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)] truncate">{profile.email}</p>
                  <p className="text-xs text-[color:var(--text-secondary)]">{profile.role === 'admin' ? 'Администратор' : 'Пользователь'}</p>
                </div>
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
                  Фото профиля
                </h3>
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] px-3 py-2 text-sm font-medium text-[color:var(--text-secondary)] transition hover:border-[color:var(--accent-border)] hover:text-[color:var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploadingAvatar ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Загрузка...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4" strokeWidth={1.5} />
                      {avatarUrl ? 'Изменить фото' : 'Загрузить фото'}
                    </>
                  )}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] px-3 py-2 text-sm font-medium text-[color:var(--text-secondary)] transition hover:border-[color:var(--button-danger-border)] hover:text-[color:var(--button-danger-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    Удалить фото
                  </button>
                )}
              </div>
            </section>
            <section>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (onOpenProfileSettings) {
                    onOpenProfileSettings();
                  }
                }}
                disabled={!onOpenProfileSettings}
                className="flex w-full items-center justify-between rounded-xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] px-3 py-2 text-left text-sm font-semibold text-[color:var(--text-primary)] transition hover:border-[color:var(--accent-border)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-tertiary)]">
                  Настройки профиля
                </span>
                <UserCog className="h-4 w-4 text-[color:var(--text-tertiary)]" strokeWidth={1.5} />
              </button>
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
                  <ChevronDown
                    className={clsx('h-4 w-4 transition-transform', isMenuCustomizationOpen ? 'rotate-180' : 'rotate-0')}
                    strokeWidth={1.5}
                  />
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
                    <option.Icon className="h-4 w-4" strokeWidth={1.5} />
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
                  <Settings className="h-4 w-4 text-[color:var(--text-tertiary)]" strokeWidth={1.5} />
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
