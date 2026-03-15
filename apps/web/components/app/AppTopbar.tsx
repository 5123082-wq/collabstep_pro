'use client';

import clsx from 'clsx';
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
// TODO: Подключить к реальному API специалистов и вакансий
import { SubscriptionModal } from '@/components/subscriptions/SubscriptionModal';
import ThemeToggle from '@/components/app/ThemeToggle';
import AccountMenu from '@/components/app/AccountMenu';
import { getUserType, type UserType } from '@/lib/auth/roles';
import { MARKETING_HUB_PATH, PM_HUB_PATH } from '@/components/app/LeftMenu.config';
import { marketingNavigation } from '@/components/marketing/app/MarketingLayoutShell';
import SectionNavigationBar from '@/components/app/SectionNavigationBar';
import {
  getPMNavigation,
  getMarketplaceNavigation,
  getPerformersNavigation,
  getAIHubNavigation,
  getCommunityNavigation,
  getFinanceNavigation,
  getDocsNavigation,
  getSupportNavigation,
  getAdminNavigation,
  getOrgNavigationWithRbac,
  extractOrgIdFromPath
} from '@/lib/nav/navigation-utils';
import { useUI } from '@/stores/ui';
import type { OrganizationMember } from '@collabverse/api';
import { Bell, MessageCircle, Wallet, User, Search, CreditCard, Plus } from 'lucide-react';

type QuickSuggestion = {
  id: string;
  label: string;
  description: string;
  href: string;
  type: 'specialist' | 'vacancy';
};

const iconMap = {
  bell: Bell,
  chat: MessageCircle,
  wallet: Wallet,
  user: User
} as const;

function resolveRoleLabel(role: DemoProfile['role']): string {
  return role === 'admin' ? 'Админ' : 'Пользователь';
}

function IconButton({
  icon,
  label,
  onClick,
  badge
}: {
  icon: keyof typeof iconMap;
  label: string;
  onClick?: () => void;
  badge?: number;
}) {
  const Icon = iconMap[icon];
  const showBadge = typeof badge === 'number' && badge > 0;
  return (
    <button
      type="button"
      className={clsx(
        'group relative flex h-9 w-9 items-center justify-center rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'border-[color:var(--theme-control-border)] bg-[color:var(--theme-control-bg)] text-[color:var(--theme-control-foreground)]',
        'hover:border-[color:var(--theme-control-border-hover)] hover:text-[color:var(--theme-control-foreground-hover)]'
      )}
      aria-label={label}
      onClick={onClick}
    >
      <Icon
        aria-hidden="true"
        className="h-[18px] w-[18px] transition group-hover:scale-105"
        strokeWidth={1.5}
      />
      {showBadge ? (
        <span className="absolute -top-1 -right-1 rounded-full bg-indigo-500 px-1.5 py-[1px] text-[10px] font-semibold text-white shadow">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export type DemoProfile = {
  email: string;
  role: 'admin' | 'user';
  avatarUrl?: string;
};

type AppTopbarProps = {
  onOpenCreate: () => void;
  onOpenPalette: () => void;
  onOpenSettings?: () => void;
  onOpenProfileSettings?: () => void;
  profile: DemoProfile;
  onLogout: () => void;
  isLoggingOut: boolean;
  createButtonRef?: React.RefObject<HTMLButtonElement>;
  centerModules?: React.ReactNode[];
  onAvatarChange?: (avatarUrl: string | null) => void;
};

export default function AppTopbar({ onOpenCreate, onOpenPalette, onOpenSettings, onOpenProfileSettings, profile, onLogout, isLoggingOut, createButtonRef, centerModules, onAvatarChange }: AppTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const unreadNotifications = useUI((state) => state.unreadNotifications);
  const unreadInvites = useUI((state) => state.unreadInvites);
  const unreadTotal = unreadNotifications + unreadInvites;
  const [searchValue, setSearchValue] = useState('');
  const [isSearchFocused, setSearchFocused] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const internalCreateButtonRef = useRef<HTMLButtonElement>(null);
  const buttonRef = createButtonRef || internalCreateButtonRef;
  const listboxId = useId();
  const hintId = `${listboxId}-hint`;
  const [userType, setUserTypeState] = useState<UserType>(null);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);

  useEffect(() => {
    const updateUserType = () => setUserTypeState(getUserType());
    updateUserType();
    
    // Обработчик для кастомного события с правильной типизацией
    const handleUserTypeChange = (e: Event) => {
      const customEvent = e as CustomEvent<UserType>;
      // Используем detail из события, если оно есть, иначе читаем из localStorage
      const newType = customEvent.detail ?? getUserType();
      setUserTypeState(newType);
    };
    
    window.addEventListener('cv-user-type-change', handleUserTypeChange);
    window.addEventListener('storage', updateUserType);
    return () => {
      window.removeEventListener('cv-user-type-change', handleUserTypeChange);
      window.removeEventListener('storage', updateUserType);
    };
  }, []);

  const openCommunications = useCallback((tab: 'notifications' | 'invites') => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('rail:command', {
        detail: { id: tab, payload: { command: 'open-chats-modal', tab } }
      })
    );
  }, []);

  const suggestions: QuickSuggestion[] = useMemo(() => {
    // TODO: Подключить к реальному API специалистов и вакансий
    const specialistItems: Array<{ id: string; name: string; role: string; skills: string[]; handle: string }> = [];
    const vacancyItems: Array<{ id: string; title: string; project: string; summary: string; tags: string[]; level: string }> = [];
    
    const trimmed = searchValue.trim();
    if (!trimmed) {
      return [];
    }
    const mask = trimmed[0];
    const keyword = trimmed.slice(1).trim().toLowerCase();
    if (mask === '@') {
      if (!keyword) {
        return [];
      }
      return specialistItems
        .filter((specialist) => {
          const haystack = [
            specialist.name,
            specialist.role,
            specialist.skills.join(' ')
          ]
            .join(' ')
            .toLowerCase();
          return haystack.includes(keyword);
        })
        .slice(0, 6)
        .map<QuickSuggestion>((specialist) => ({
          id: `specialist-${specialist.id}`,
          label: specialist.name,
          description: `${specialist.role} · ${specialist.skills.slice(0, 3).join(', ')}`,
          href: `/p/${specialist.handle}`,
          type: 'specialist'
        }));
    }
    if (mask === '#') {
      if (!keyword) {
        return [];
      }
      return vacancyItems
        .filter((vacancy) => {
          const haystack = [
            vacancy.title,
            vacancy.project,
            vacancy.summary,
            vacancy.tags.join(' ')
          ]
            .join(' ')
            .toLowerCase();
          return haystack.includes(keyword);
        })
        .slice(0, 6)
        .map<QuickSuggestion>((vacancy) => ({
          id: `vacancy-${vacancy.id}`,
          label: vacancy.title,
          description: `${vacancy.project} · ${vacancy.level}`,
          href: `/app/marketplace/vacancies/${vacancy.id}`,
          type: 'vacancy'
        }));
    }
    return [];
  }, [searchValue]);

  useEffect(() => {
    setActiveSuggestion(0);
  }, [suggestions]);

  const handleSelectSuggestion = useCallback(
    (suggestion: QuickSuggestion) => {
      router.push(suggestion.href);
      setSearchValue('');
      setSearchFocused(false);
      setActiveSuggestion(0);
      inputRef.current?.blur();
    },
    [router]
  );

  const handleSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenPalette();
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveSuggestion((index) => (index + 1) % Math.max(suggestions.length, 1));
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveSuggestion((index) => (index - 1 + Math.max(suggestions.length, 1)) % Math.max(suggestions.length, 1));
        return;
      }
      if (event.key === 'Enter') {
        if (suggestions.length > 0) {
          event.preventDefault();
          const target = suggestions[activeSuggestion];
          if (target) {
            handleSelectSuggestion(target);
          }
        }
        return;
      }
      if (event.key === 'Escape') {
        setSearchValue('');
        setSearchFocused(false);
        setActiveSuggestion(0);
        inputRef.current?.blur();
      }
    },
    [activeSuggestion, handleSelectSuggestion, onOpenPalette, suggestions]
  );

  const trimmedQuery = searchValue.trim();
  const maskSymbol = trimmedQuery[0];
  const maskKeyword = trimmedQuery.slice(1).trim();
  const isMaskQuery = maskSymbol === '@' || maskSymbol === '#';
  const showSuggestionList = isSearchFocused && suggestions.length > 0;
  const showMaskHint = isSearchFocused && isMaskQuery && maskKeyword.length === 0;
  const showEmptyState = isSearchFocused && isMaskQuery && maskKeyword.length > 0 && suggestions.length === 0;
  const showSuggestionPanel = showSuggestionList || showMaskHint || showEmptyState;
  const activeSuggestionId = showSuggestionList
    ? `${listboxId}-option-${suggestions[activeSuggestion]?.id ?? activeSuggestion}`
    : undefined;
  const currentSubscriptionLabel = 'Подписка Pro';

  // Определяем текущий раздел для отображения панели навигации
  // Важно: проверяем маркетинг ПЕРЕД каталогом, так как /marketing начинается с /market
  const isMarketingSection = pathname?.startsWith(MARKETING_HUB_PATH) ?? false;
  const isPMSection = (pathname?.startsWith(PM_HUB_PATH) ?? false) && !pathname?.match(/^\/pm\/projects\/[^/]+/);
  // Каталог проверяем после /marketing и учитываем корневой /market
  const isMarketplaceSection = pathname === '/market' || (pathname?.startsWith('/market/') ?? false);
  const isPerformersSection = pathname?.startsWith('/performers') ?? false;
  const isAiHubSection = pathname?.startsWith('/ai-hub') ?? false;
  const isCommunitySection = pathname?.startsWith('/community') ?? false;
  const isFinanceSection = pathname?.startsWith('/finance') ?? false;
  const isDocsSection = pathname?.startsWith('/docs') ?? false;
  const isOrgSection = pathname?.startsWith('/org') ?? false;
  const orgId = isOrgSection ? extractOrgIdFromPath(pathname) : null;
  type OrgMembership = Pick<OrganizationMember, 'role' | 'status'>;
  const [orgMembership, setOrgMembership] = useState<OrgMembership | null | undefined>(undefined);
  const isSupportSection = pathname?.startsWith('/support') ?? false;
  const isAdminSection = pathname?.startsWith('/admin') ?? false;

  useEffect(() => {
    if (!isOrgSection || !orgId) {
      setOrgMembership(undefined);
      return;
    }

    const controller = new AbortController();
    setOrgMembership(undefined);

    void (async () => {
      try {
        const res = await fetch(`/api/organizations/${orgId}/membership`, {
          signal: controller.signal
        });

        if (!res.ok) {
          setOrgMembership(null);
          return;
        }

        const payload = (await res.json()) as
          | { ok: true; data: { member: OrgMembership | null } }
          | { ok: false; error: string };

        if (!payload.ok) {
          setOrgMembership(null);
          return;
        }

        setOrgMembership(payload.data.member);
      } catch (error) {
        if ((error as { name?: string } | null)?.name === 'AbortError') {
          return;
        }
        setOrgMembership(null);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [isOrgSection, orgId]);

  const orgNavigation = isOrgSection ? getOrgNavigationWithRbac(orgId, orgMembership) : [];

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-900/40 bg-white/10 dark:bg-neutral-950/40 backdrop-blur-md">
      <div className="flex items-center justify-between gap-[21.6px] px-[21.6px] py-[14.4px] min-w-0">
        <div className="flex flex-1 items-center gap-[10.8px] min-w-0">
          <form
            className="relative hidden max-w-md flex-1 md:block"
            role="search"
            onSubmit={(event) => event.preventDefault()}
          >
            <label htmlFor="app-search" className="sr-only">
              Поиск по приложению
            </label>
            <input
              id="app-search"
              ref={inputRef}
              type="search"
              value={searchValue}
              onChange={(event) => {
                setSearchValue(event.target.value);
                setActiveSuggestion(0);
              }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => {
                if (typeof window !== 'undefined') {
                  window.setTimeout(() => setSearchFocused(false), 120);
                }
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Поиск по платформе…"
              aria-expanded={showSuggestionPanel}
              aria-autocomplete="list"
              aria-controls={showSuggestionList ? listboxId : undefined}
              aria-activedescendant={activeSuggestionId}
              aria-describedby={showMaskHint || showEmptyState ? hintId : undefined}
              role="combobox"
              aria-haspopup="listbox"
              className="w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 px-[18px] py-[7.2px] text-[12.6px] text-neutral-100 shadow-inner shadow-neutral-950/20 transition focus:border-indigo-500 focus:outline-none"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={onOpenPalette}
              className="absolute right-[10.8px] top-1/2 hidden -translate-y-1/2 rounded-full border border-neutral-700 px-[7.2px] py-[3.6px] text-[9px] uppercase tracking-wide text-neutral-500 transition hover:border-indigo-500/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 md:flex"
            >
              ⌘K
            </button>
            {showSuggestionPanel && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/95 shadow-xl">
                {showSuggestionList ? (
                  <ul id={listboxId} role="listbox" className="max-h-72 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                      <li key={suggestion.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={index === activeSuggestion}
                          id={`${listboxId}-option-${suggestion.id}`}
                          onMouseEnter={() => setActiveSuggestion(index)}
                          onClick={() => handleSelectSuggestion(suggestion)}
                          className={`flex w-full items-center justify-between gap-[10.8px] px-[14.4px] py-[10.8px] text-left text-[12.6px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${
                            index === activeSuggestion ? 'bg-indigo-500/10' : 'bg-transparent'
                          }`}
                        >
                          <div>
                            <p className="font-medium text-neutral-100">{suggestion.label}</p>
                            <p className="text-[10.8px] text-neutral-500">{suggestion.description}</p>
                          </div>
                          <span className="text-[9.9px] uppercase tracking-wide text-neutral-500">
                            {suggestion.type === 'specialist' ? 'специалист' : 'вакансия'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div id={hintId} className="px-[14.4px] py-[10.8px] text-[12.6px] text-neutral-400">
                    {showMaskHint
                      ? 'Введите текст после маски @ или #, чтобы искать специалистов или вакансии.'
                      : 'Совпадений не найдено. Попробуйте изменить запрос.'}
                  </div>
                )}
              </div>
            )}
          </form>
          <button
            ref={buttonRef}
            type="button"
            onClick={onOpenCreate}
            className="inline-flex items-center gap-[7.2px] rounded-2xl border border-indigo-500/50 bg-indigo-500/10 px-[14.4px] py-[7.2px] text-[12.6px] font-semibold text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            <Plus className="h-[16.2px] w-[16.2px]" strokeWidth={1.5} />
            Создать
          </button>
        </div>
        {/* Центральные модули (KPI и другие) */}
        {centerModules && centerModules.length > 0 && (
          <div className="hidden items-center gap-[10.8px] lg:flex">
            {centerModules.map((module, index) => (
              <React.Fragment key={index}>{module}</React.Fragment>
            ))}
          </div>
        )}
        <div className="hidden items-center gap-[7.2px] md:flex">
          <button
            type="button"
            onClick={() => setSubscriptionModalOpen(true)}
            className="inline-flex items-center gap-[7.2px] rounded-2xl border border-indigo-500/60 bg-indigo-500/15 px-[14.4px] py-[7.2px] text-[9.9px] font-semibold uppercase tracking-[0.18em] text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            <CreditCard className="h-[14.4px] w-[14.4px]" strokeWidth={1.5} />
            {currentSubscriptionLabel}
          </button>
          <SubscriptionModal open={subscriptionModalOpen} onOpenChange={setSubscriptionModalOpen} />
          <IconButton
            icon="bell"
            label="Уведомления"
            badge={unreadTotal}
            onClick={() => {
              openCommunications(unreadInvites > 0 ? 'invites' : 'notifications');
            }}
          />
          <IconButton icon="wallet" label="Кошелёк" />
          <ThemeToggle />
          <AccountMenu 
            profile={profile} 
            onLogout={onLogout} 
            isLoggingOut={isLoggingOut}
            {...(onOpenSettings && { onOpenSettings })}
            {...(onOpenProfileSettings && { onOpenProfileSettings })}
            {...(onAvatarChange && { onAvatarChange })}
          />
        </div>
        {/* Мобильная версия: поиск и меню пользователя */}
        <div className="flex items-center gap-[7.2px] md:hidden">
          <IconButton
            icon="bell"
            label="Уведомления"
            badge={unreadTotal}
            onClick={() => {
              openCommunications(unreadInvites > 0 ? 'invites' : 'notifications');
            }}
          />
          <button
            type="button"
            onClick={onOpenPalette}
            className="flex h-9 w-9 items-center justify-center rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 border-[color:var(--theme-control-border)] bg-[color:var(--theme-control-bg)] text-[color:var(--theme-control-foreground)] hover:border-[color:var(--theme-control-border-hover)] hover:text-[color:var(--theme-control-foreground-hover)]"
            aria-label="Поиск"
          >
            <Search className="h-[14px] w-[14px]" strokeWidth={1.5} />
          </button>
          <AccountMenu 
            profile={profile} 
            onLogout={onLogout} 
            isLoggingOut={isLoggingOut}
            {...(onOpenSettings && { onOpenSettings })}
            {...(onOpenProfileSettings && { onOpenProfileSettings })}
            {...(onAvatarChange && { onAvatarChange })}
          />
        </div>
        <div className="flex flex-wrap items-center gap-[7.2px]">
          {userType === 'performer' && (
            <span
              className="rounded-full bg-purple-500/20 text-purple-100 ring-1 ring-inset ring-purple-500/50 px-[10.8px] py-[3.6px] text-[10.8px] font-semibold uppercase tracking-wide"
            >
              Исполнитель
            </span>
          )}
          <span
            data-testid="role-badge"
            className={clsx(
              'rounded-full px-[10.8px] py-[3.6px] text-[10.8px] font-semibold uppercase tracking-wide text-neutral-100',
              profile.role === 'admin'
                ? 'bg-amber-500/20 text-amber-100 ring-1 ring-inset ring-amber-500/50'
                : 'bg-indigo-500/20 text-indigo-100 ring-1 ring-inset ring-indigo-500/50'
            )}
          >
            {resolveRoleLabel(profile.role)}
          </span>
        </div>
      </div>
      {/* Панель навигации для всех разделов платформы */}
      {isMarketingSection && (
        <SectionNavigationBar
          items={marketingNavigation}
          ariaLabel="Навигация по разделам маркетинга"
          basePath={MARKETING_HUB_PATH}
          exactMatch={true}
        />
      )}
      {isPMSection && (
        <SectionNavigationBar
          items={getPMNavigation()}
          ariaLabel="Навигация по разделам проектов и задач"
          basePath={PM_HUB_PATH}
        />
      )}
      {isMarketplaceSection && (
        <SectionNavigationBar
          items={getMarketplaceNavigation()}
          ariaLabel="Навигация по разделам каталога"
          basePath="/market"
        />
      )}
      {isPerformersSection && (
        <SectionNavigationBar
          items={getPerformersNavigation()}
          ariaLabel="Навигация по разделам исполнителей"
        />
      )}
      {isAiHubSection && (
        <SectionNavigationBar
          items={getAIHubNavigation()}
          ariaLabel="Навигация по разделам AI-хаба"
        />
      )}
      {isCommunitySection && (
        <SectionNavigationBar
          items={getCommunityNavigation()}
          ariaLabel="Навигация по разделам комьюнити"
        />
      )}
      {isFinanceSection && (
        <SectionNavigationBar
          items={getFinanceNavigation()}
          ariaLabel="Навигация по разделам финансов"
        />
      )}
      {isDocsSection && (
        <SectionNavigationBar
          items={getDocsNavigation()}
          ariaLabel="Навигация по разделам документов"
        />
      )}
      {isOrgSection && orgNavigation.length > 0 && (
        <SectionNavigationBar
          items={orgNavigation}
          ariaLabel="Навигация по разделам организации"
        />
      )}
      {isSupportSection && (
        <SectionNavigationBar
          items={getSupportNavigation()}
          ariaLabel="Навигация по разделам поддержки"
        />
      )}
      {isAdminSection && (
        <SectionNavigationBar
          items={getAdminNavigation()}
          ariaLabel="Навигация по разделам админки"
          basePath="/admin"
          exactMatch={true}
        />
      )}
    </header>
  );
}
