'use client';

import clsx from 'clsx';
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
// TODO: Подключить к реальному API специалистов и вакансий
import { toast } from '@/lib/ui/toast';
import ThemeToggle from '@/components/app/ThemeToggle';
import AccountMenu from '@/components/app/AccountMenu';
import { marketingNavigation } from '@/components/marketing/app/MarketingLayoutShell';
import { MARKETING_HUB_PATH, PM_HUB_PATH } from '@/components/app/LeftMenu.config';
import { pmNavigation } from '@/components/pm/pmNavigation';
import SectionNavigationBar from '@/components/app/SectionNavigationBar';
import { marketplaceNavigation } from '@/components/marketplace/marketplaceNavigation';
import { performersNavigation } from '@/components/performers/performersNavigation';
import { aiHubNavigation } from '@/components/ai-hub/aiHubNavigation';
import { communityNavigation } from '@/components/community/communityNavigation';
import { financeNavigation } from '@/components/finance/financeNavigation';
import { docsNavigation } from '@/components/docs/docsNavigation';
import { orgNavigation } from '@/components/org/orgNavigation';
import { supportNavigation } from '@/components/support/supportNavigation';
import { adminNavigation } from '@/components/admin/adminNavigation';

type QuickSuggestion = {
  id: string;
  label: string;
  description: string;
  href: string;
  type: 'specialist' | 'vacancy';
};

const iconPaths: Record<string, string> = {
  bell: 'M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Zm8-6a2 2 0 0 1-2-2v-3a6 6 0 1 0-12 0v3a2 2 0 0 1-2 2h16Z',
  chat: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z',
  wallet: 'M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 0 4H5a2 2 0 0 1-2-2Zm0 5a2 2 0 0 1 2-2h16v8H5a2 2 0 0 1-2-2v-4Zm13 2a1 1 0 1 0 0 2h3v-2h-3Z',
  user: 'M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4 0-8 2-8 4v2h16v-2c0-2-4-4-8-4Z'
};

function resolveRoleLabel(role: DemoProfile['role']): string {
  return role === 'admin' ? 'Админ' : 'Пользователь';
}

function IconButton({ icon, label }: { icon: keyof typeof iconPaths; label: string }) {
  return (
    <button
      type="button"
      className={clsx(
        'group flex h-9 w-9 items-center justify-center rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'border-[color:var(--theme-control-border)] bg-[color:var(--theme-control-bg)] text-[color:var(--theme-control-foreground)]',
        'hover:border-[color:var(--theme-control-border-hover)] hover:text-[color:var(--theme-control-foreground-hover)]'
      )}
      aria-label={label}
    >
      <svg
        aria-hidden="true"
        className="h-[18px] w-[18px] transition group-hover:scale-105"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={iconPaths[icon]} fill="currentColor" />
      </svg>
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
  profile: DemoProfile;
  onLogout: () => void;
  isLoggingOut: boolean;
  createButtonRef?: React.RefObject<HTMLButtonElement>;
  centerModules?: React.ReactNode[];
  onAvatarChange?: (avatarUrl: string | null) => void;
};

export default function AppTopbar({ onOpenCreate, onOpenPalette, onOpenSettings, profile, onLogout, isLoggingOut, createButtonRef, centerModules, onAvatarChange }: AppTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchValue, setSearchValue] = useState('');
  const [isSearchFocused, setSearchFocused] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const internalCreateButtonRef = useRef<HTMLButtonElement>(null);
  const buttonRef = createButtonRef || internalCreateButtonRef;
  const listboxId = useId();
  const hintId = `${listboxId}-hint`;

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
  // Важно: проверяем маркетинг ПЕРЕД маркетплейсом, так как /marketing начинается с /market
  const isMarketingSection = pathname?.startsWith(MARKETING_HUB_PATH) ?? false;
  const isPMSection = (pathname?.startsWith(PM_HUB_PATH) ?? false) && !pathname?.match(/^\/pm\/projects\/[^/]+/);
  // Маркетплейс проверяем на /market/, чтобы не перехватывать /marketing
  const isMarketplaceSection = pathname?.startsWith('/market/') ?? false;
  const isPerformersSection = pathname?.startsWith('/performers') ?? false;
  const isAiHubSection = pathname?.startsWith('/ai-hub') ?? false;
  const isCommunitySection = pathname?.startsWith('/community') ?? false;
  const isFinanceSection = pathname?.startsWith('/finance') ?? false;
  const isDocsSection = pathname?.startsWith('/docs') ?? false;
  const isOrgSection = pathname?.startsWith('/org') ?? false;
  const isSupportSection = pathname?.startsWith('/support') ?? false;
  const isAdminSection = pathname?.startsWith('/admin') ?? false;

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
            <span className="text-[16.2px] leading-none">+</span>
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
            onClick={() => toast('Раздел тарифов скоро появится в демо-версии платформы', 'info')}
            className="inline-flex items-center gap-[7.2px] rounded-2xl border border-indigo-500/60 bg-indigo-500/15 px-[14.4px] py-[7.2px] text-[9.9px] font-semibold uppercase tracking-[0.18em] text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-[14.4px] w-[14.4px]"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 9.5 7 5l5 5 5-5 3 4.5V20H4z" />
              <path d="M4 15h16" />
            </svg>
            {currentSubscriptionLabel}
          </button>
          <IconButton icon="wallet" label="Кошелёк" />
          <ThemeToggle />
          <AccountMenu 
            profile={profile} 
            onLogout={onLogout} 
            isLoggingOut={isLoggingOut}
            {...(onOpenSettings && { onOpenSettings })}
            {...(onAvatarChange && { onAvatarChange })}
          />
        </div>
        <div className="flex flex-wrap items-center gap-[7.2px]">
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
          items={pmNavigation}
          ariaLabel="Навигация по разделам проектов и задач"
          basePath={PM_HUB_PATH}
        />
      )}
      {isMarketplaceSection && (
        <SectionNavigationBar
          items={marketplaceNavigation}
          ariaLabel="Навигация по разделам маркетплейса"
        />
      )}
      {isPerformersSection && (
        <SectionNavigationBar
          items={performersNavigation}
          ariaLabel="Навигация по разделам исполнителей"
        />
      )}
      {isAiHubSection && (
        <SectionNavigationBar
          items={aiHubNavigation}
          ariaLabel="Навигация по разделам AI-хаба"
        />
      )}
      {isCommunitySection && (
        <SectionNavigationBar
          items={communityNavigation}
          ariaLabel="Навигация по разделам комьюнити"
        />
      )}
      {isFinanceSection && (
        <SectionNavigationBar
          items={financeNavigation}
          ariaLabel="Навигация по разделам финансов"
        />
      )}
      {isDocsSection && (
        <SectionNavigationBar
          items={docsNavigation}
          ariaLabel="Навигация по разделам документов"
        />
      )}
      {isOrgSection && (
        <SectionNavigationBar
          items={orgNavigation}
          ariaLabel="Навигация по разделам организации"
        />
      )}
      {isSupportSection && (
        <SectionNavigationBar
          items={supportNavigation}
          ariaLabel="Навигация по разделам поддержки"
        />
      )}
      {isAdminSection && (
        <SectionNavigationBar
          items={adminNavigation}
          ariaLabel="Навигация по разделам админки"
          basePath="/admin"
        />
      )}
    </header>
  );
}
