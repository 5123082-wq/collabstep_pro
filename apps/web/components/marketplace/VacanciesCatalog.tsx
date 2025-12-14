'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Vacancy } from '@/lib/schemas/marketplace-vacancy';
import {
  applyVacancyFilters,
  buildVacancySearchParams,
  parseVacancyFilters,
  type VacancyFilters
} from '@/lib/marketplace/vacancies';
import { useDebouncedValue } from '@/lib/ui/useDebouncedValue';
import { toast } from '@/lib/ui/toast';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

const ITEMS_PER_PAGE = 8;

const EMPLOYMENT_LABEL: Record<'project' | 'part-time' | 'full-time', string> = {
  project: 'Проектная занятость',
  'part-time': 'Частичная занятость',
  'full-time': 'Полная занятость'
};

const FORMAT_LABEL: Record<'remote' | 'office' | 'hybrid', string> = {
  remote: 'Удалённо',
  office: 'В офисе',
  hybrid: 'Гибрид'
};

function formatReward(reward: Vacancy['reward']): string {
  if (reward.type === 'rate') {
    const min = reward.min.toLocaleString('ru-RU');
    const max = reward.max.toLocaleString('ru-RU');
    const period = reward.period === 'hour' ? 'час' : reward.period === 'day' ? 'день' : 'проект';
    const currency = reward.currency === 'RUB' ? '₽' : reward.currency;
    if (reward.min === reward.max) {
      return `${min} ${currency}/${period}`;
    }
    return `${min} – ${max} ${currency}/${period}`;
  }
  if (reward.type === 'salary') {
    const amount = reward.amount.toLocaleString('ru-RU');
    const currency = reward.currency === 'RUB' ? '₽' : reward.currency;
    return `${amount} ${currency}/мес.`;
  }
  return `Доля ${reward.share}`;
}

function formatDeadline(date: string): string {
  return new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

type VacanciesCatalogProps = {
  data: Vacancy[];
  error: string | null;
};

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
};

function Pagination({ currentPage, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  return (
    <ContentBlock as="nav" size="sm" aria-label="Пагинация вакансий" className="flex items-center justify-between px-4 py-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-300 transition hover:border-indigo-500/40 hover:text-white disabled:cursor-not-allowed disabled:border-neutral-900 disabled:text-neutral-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        aria-label="Предыдущая страница"
      >
        Назад
      </button>
      <div className="flex items-center gap-2">
        {pages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onChange(page)}
            className={`rounded-xl border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${
              page === currentPage
                ? 'border-indigo-500/60 bg-indigo-500/20 text-indigo-100'
                : 'border-neutral-800 bg-neutral-900/70 text-neutral-300 hover:border-indigo-500/40 hover:text-white'
            }`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-300 transition hover:border-indigo-500/40 hover:text-white disabled:cursor-not-allowed disabled:border-neutral-900 disabled:text-neutral-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        aria-label="Следующая страница"
      >
        Вперёд
      </button>
    </ContentBlock>
  );
}

function VacancyCard({ vacancy }: { vacancy: Vacancy }) {
  return (
    <ContentBlock interactive as="article" className="flex h-full flex-col justify-between">
      <div className="space-y-3">
        <header>
          <p className="text-xs uppercase tracking-wide text-indigo-300">{vacancy.project}</p>
          <h3 className="mt-1 text-lg font-semibold text-neutral-50">{vacancy.title}</h3>
        </header>
        <p className="text-sm text-neutral-300">{vacancy.summary}</p>
        <div className="flex flex-wrap gap-2 text-xs text-neutral-400">
          {vacancy.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1">
              {tag}
            </span>
          ))}
        </div>
        <dl className="grid gap-2 text-sm text-neutral-300">
          <div className="flex flex-wrap gap-2">
            <dt className="font-semibold text-neutral-200">Уровень:</dt>
            <dd>{vacancy.level}</dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="font-semibold text-neutral-200">Занятость:</dt>
            <dd>{EMPLOYMENT_LABEL[vacancy.employment]}</dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="font-semibold text-neutral-200">Формат:</dt>
            <dd className="flex flex-wrap gap-2">
              {vacancy.format.map((format) => (
                <span key={format} className="rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1 text-xs text-neutral-300">
                  {FORMAT_LABEL[format]}
                </span>
              ))}
            </dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="font-semibold text-neutral-200">Вознаграждение:</dt>
            <dd>{formatReward(vacancy.reward)}</dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="font-semibold text-neutral-200">Дедлайн:</dt>
            <dd>{formatDeadline(vacancy.deadline)}</dd>
          </div>
        </dl>
      </div>
      <footer className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => toast('Перейдите в карточку вакансии, чтобы отправить отклик')}
          className="rounded-xl border border-indigo-500/50 bg-indigo-500/15 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        >
          Откликнуться
        </button>
        <button
          type="button"
          onClick={() => toast('Вакансия сохранена в подборку (mock)')}
          className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-indigo-500/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        >
          Сохранить
        </button>
        <button
          type="button"
          onClick={() => toast('Подписка на обновления оформлена (mock)')}
          className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-indigo-500/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        >
          Подписаться
        </button>
        <Link
          href={`/app/marketplace/vacancies/${vacancy.id}`}
          className="ml-auto rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-200 transition hover:border-indigo-500/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        >
          Подробнее
        </Link>
      </footer>
    </ContentBlock>
  );
}

type VacanciesCatalogPropsWithPath = VacanciesCatalogProps & { basePath?: string };

export default function VacanciesCatalog({ data, error, basePath }: VacanciesCatalogPropsWithPath) {
  const router = useRouter();
  const pathname = basePath ?? '/performers/vacancies';
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const urlFilters = useMemo(() => parseVacancyFilters(searchParams), [searchParams]);
  const [filters, setFilters] = useState<VacancyFilters>(urlFilters);
  const filtersRef = useRef(filters);
  const [searchDraft, setSearchDraft] = useState(filters.query ?? '');
  const debouncedQuery = useDebouncedValue(searchDraft, 400);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFilters(urlFilters);
  }, [urlFilters]);

  useEffect(() => {
    setSearchDraft(filters.query ?? '');
  }, [filters.query]);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const scrollToTop = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.requestAnimationFrame(() => {
      const target = listRef.current;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }, []);

  const updateFilters = useCallback(
    (patch: Partial<VacancyFilters>, options: { resetPage?: boolean; scroll?: boolean } = {}) => {
      const current = filtersRef.current;
      const merged: VacancyFilters = {
        ...current,
        ...patch
      };

      if (options.resetPage !== false) {
        merged.page = 1;
      }

      filtersRef.current = merged;
      setFilters(merged);

      const params = buildVacancySearchParams(merged);
      startTransition(() => {
        router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
      });

      if (options.scroll !== false) {
        scrollToTop();
      }
    },
    [pathname, router, scrollToTop, startTransition]
  );

  useEffect(() => {
    const normalized = filters.query ?? '';
    if (normalized === debouncedQuery) {
      return;
    }
    const value = debouncedQuery.trim();
    updateFilters({ query: value || null });
  }, [debouncedQuery, filters.query, updateFilters]);

  const filteredItems = useMemo(() => applyVacancyFilters(data, filters), [data, filters]);
  const total = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const currentPage = Math.min(filters.page, totalPages);
  const pageItems = useMemo(
    () => filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredItems, currentPage]
  );

  useEffect(() => {
    if (filters.page > totalPages) {
      updateFilters({ page: totalPages }, { resetPage: false, scroll: false });
    }
  }, [filters.page, totalPages, updateFilters]);

  const roles = useMemo(
    () => Array.from(new Set(data.map((item) => item.title))).sort((a, b) => a.localeCompare(b, 'ru-RU')),
    [data]
  );
  const languages = useMemo(
    () => Array.from(new Set(data.map((item) => item.language))).sort((a, b) => a.localeCompare(b, 'ru-RU')),
    [data]
  );

  if (error) {
    return (
      <ContentBlock variant="error">
        <p>Не удалось загрузить вакансии. Попробуйте обновить страницу.</p>
      </ContentBlock>
    );
  }

  const handleReset = () => {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
    scrollToTop();
  };

  return (
    <section className="space-y-6" aria-live="polite">
      <ContentBlock
        header={
          <ContentBlockTitle
            description="Подберите задачи по роли, уровню, формату и типу вознаграждения."
            actions={
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-indigo-500/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                Сбросить фильтры
              </button>
            }
          >
            Каталог вакансий
          </ContentBlockTitle>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm text-neutral-300">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Роль</span>
            <select
              value={filters.role ?? ''}
              onChange={(event) => updateFilters({ role: event.target.value || null })}
              className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Все роли</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-neutral-300">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Уровень</span>
            <select
              value={filters.level ?? ''}
              onChange={(event) => updateFilters({ level: (event.target.value as VacancyFilters['level']) || null })}
              className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Любой уровень</option>
              <option value="Junior">Junior</option>
              <option value="Middle">Middle</option>
              <option value="Senior">Senior</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-neutral-300">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Язык</span>
            <select
              value={filters.language ?? ''}
              onChange={(event) => updateFilters({ language: event.target.value || null })}
              className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Все языки</option>
              {languages.map((language) => (
                <option key={language} value={language}>
                  {language.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm text-neutral-300">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Тип занятости</span>
            <select
              value={filters.employment ?? ''}
              onChange={(event) => updateFilters({ employment: (event.target.value as VacancyFilters['employment']) || null })}
              className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Любой</option>
              <option value="project">Проектная</option>
              <option value="part-time">Частичная</option>
              <option value="full-time">Полная</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-neutral-300">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Формат</span>
            <select
              value={filters.format ?? ''}
              onChange={(event) => updateFilters({ format: (event.target.value as VacancyFilters['format']) || null })}
              className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Любой</option>
              <option value="remote">Удалённо</option>
              <option value="office">В офисе</option>
              <option value="hybrid">Гибрид</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-neutral-300">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Вознаграждение</span>
            <select
              value={filters.rewardType ?? ''}
              onChange={(event) => updateFilters({ rewardType: (event.target.value as VacancyFilters['rewardType']) || null })}
              className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Все варианты</option>
              <option value="rate">Ставка</option>
              <option value="salary">Зарплата</option>
              <option value="equity">Доля</option>
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm text-neutral-300 md:col-span-3">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Поиск</span>
            <input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Например: маркетинг или Python"
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
            />
          </label>
        </div>
      </ContentBlock>

      <div ref={listRef} className="flex items-center justify-between text-sm text-neutral-400">
        <p>
          Найдено вакансий: <span className="font-semibold text-neutral-100">{total}</span>
        </p>
        {isPending && <p className="text-xs text-indigo-300">Обновляем результаты…</p>}
      </div>

      {pageItems.length === 0 ? (
        <ContentBlock variant="dashed" className="p-10 text-center text-sm text-neutral-400">
          Ничего не найдено. Измените фильтры.
        </ContentBlock>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {pageItems.map((vacancy) => (
            <VacancyCard key={vacancy.id} vacancy={vacancy} />
          ))}
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onChange={(page) => updateFilters({ page }, { resetPage: false })} />
    </section>
  );
}
