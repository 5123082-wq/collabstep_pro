'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Specialist } from '@/lib/schemas/marketplace-specialist';
import {
  applySpecialistFilters,
  buildSpecialistSearchParams,
  parseSpecialistFilters,
  type SpecialistFilters
} from '@/lib/marketplace/specialists';
import { useDebouncedValue } from '@/lib/ui/useDebouncedValue';
import { toast } from '@/lib/ui/toast';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';
import { InvitePerformerModal } from '@/components/performers/InvitePerformerModal';

const ITEMS_PER_PAGE = 9;

const WORK_FORMAT_LABEL: Record<'remote' | 'office' | 'hybrid', string> = {
  remote: 'Удалённо',
  office: 'В офисе',
  hybrid: 'Гибрид'
};

function formatCurrency(currency: string): string {
  if (currency === 'RUB') {
    return '₽';
  }
  return currency;
}

function formatPeriod(period: 'hour' | 'day' | 'project'): string {
  if (period === 'hour') {
    return 'час';
  }
  if (period === 'day') {
    return 'день';
  }
  return 'проект';
}

function formatRate(rate: Specialist['rate']): string {
  const currencySymbol = formatCurrency(rate.currency);
  const min = rate.min.toLocaleString('ru-RU');
  const max = rate.max.toLocaleString('ru-RU');
  if (rate.min === rate.max) {
    return `${min} ${currencySymbol}/${formatPeriod(rate.period)}`;
  }
  return `${min} – ${max} ${currencySymbol}/${formatPeriod(rate.period)}`;
}

type SpecialistsCatalogProps = {
  data: Specialist[];
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
    <ContentBlock as="nav" size="sm" aria-label="Пагинация" className="flex items-center justify-between px-4 py-3">
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

function SpecialistCard({ specialist, onInvite }: { specialist: Specialist; onInvite: (s: Specialist) => void }) {
  return (
    <ContentBlock
      as="article"
      interactive
      header={
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-neutral-50">{specialist.name}</h3>
            <p className="text-sm text-neutral-400">{specialist.role}</p>
          </div>
          <div className="text-right text-sm text-neutral-300">
            <p>
              <span aria-hidden="true">★</span> {specialist.rating.toFixed(1)}
            </p>
            <p className="text-xs text-neutral-500">{specialist.reviews} отзывов</p>
          </div>
        </div>
      }
      footer={
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInvite(specialist);
            }}
            className="rounded-xl border border-indigo-500/50 bg-indigo-500/15 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            Пригласить
          </button>
          <button
            type="button"
            onClick={() => toast(`Запрос на интервью отправлен ${specialist.name}`)}
            className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-indigo-500/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            Запросить интервью
          </button>
          <Link
            href={`/p/${specialist.handle}`}
            className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-indigo-500/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            Открыть визитку
          </Link>
        </div>
      }
    >
      <p className="text-sm text-neutral-300">{specialist.description}</p>
      <dl className="mt-4 space-y-2 text-sm text-neutral-300">
        <div className="flex flex-wrap items-center gap-2">
          <dt className="font-semibold text-neutral-200">Навыки:</dt>
          <dd className="flex flex-wrap gap-2">
            {specialist.skills.map((skill) => (
              <span key={skill} className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-100">
                {skill}
              </span>
            ))}
          </dd>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <dt className="font-semibold text-neutral-200">Ставка:</dt>
          <dd>{formatRate(specialist.rate)}</dd>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <dt className="font-semibold text-neutral-200">Формат:</dt>
          <dd className="flex flex-wrap gap-2">
            {specialist.workFormats.map((format) => (
              <span key={format} className="rounded-full border border-neutral-800 bg-neutral-900/80 px-3 py-1 text-xs text-neutral-300">
                {WORK_FORMAT_LABEL[format]}
              </span>
            ))}
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-400">
        {specialist.availability.map((item) => (
          <span key={item} className="rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1">
            {item}
          </span>
        ))}
        {specialist.engagement.map((item) => (
          <span key={item} className="rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1">
            {item}
          </span>
        ))}
      </div>
    </ContentBlock>
  );
}

export default function SpecialistsCatalog({ data, error }: SpecialistsCatalogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const urlFilters = useMemo(() => parseSpecialistFilters(searchParams), [searchParams]);
  const [filters, setFilters] = useState<SpecialistFilters>(urlFilters);
  const filtersRef = useRef(filters);

  const [searchDraft, setSearchDraft] = useState(filters.query ?? '');
  const [rateMinDraft, setRateMinDraft] = useState(filters.rateMin !== null ? String(filters.rateMin) : '');
  const [rateMaxDraft, setRateMaxDraft] = useState(filters.rateMax !== null ? String(filters.rateMax) : '');
  const debouncedQuery = useDebouncedValue(searchDraft, 400);
  const debouncedRateMin = useDebouncedValue(rateMinDraft, 400);
  const debouncedRateMax = useDebouncedValue(rateMaxDraft, 400);
  const listRef = useRef<HTMLDivElement>(null);

  const [invitePerformer, setInvitePerformer] = useState<Specialist | null>(null);

  useEffect(() => {
    setFilters(urlFilters);
  }, [urlFilters]);

  useEffect(() => {
    setSearchDraft(filters.query ?? '');
  }, [filters.query]);

  useEffect(() => {
    setRateMinDraft(filters.rateMin !== null ? String(filters.rateMin) : '');
  }, [filters.rateMin]);

  useEffect(() => {
    setRateMaxDraft(filters.rateMax !== null ? String(filters.rateMax) : '');
  }, [filters.rateMax]);

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
    (patch: Partial<SpecialistFilters>, options: { resetPage?: boolean; scroll?: boolean } = {}) => {
      const current = filtersRef.current;
      const merged: SpecialistFilters = {
        ...current,
        ...patch
      };

      if (options.resetPage !== false) {
        merged.page = 1;
      }

      filtersRef.current = merged;
      setFilters(merged);

      const params = buildSpecialistSearchParams(merged);
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
    if (debouncedQuery === normalized) {
      return;
    }
    const value = debouncedQuery.trim();
    updateFilters({ query: value || null });
  }, [debouncedQuery, filters.query, updateFilters]);

  useEffect(() => {
    const current = filters.rateMin !== null ? String(filters.rateMin) : '';
    if (debouncedRateMin === current) {
      return;
    }
    const parsed = debouncedRateMin ? Number.parseInt(debouncedRateMin, 10) : null;
    if (debouncedRateMin && Number.isNaN(parsed)) {
      return;
    }
    updateFilters({ rateMin: parsed }, { scroll: false });
  }, [debouncedRateMin, filters.rateMin, updateFilters]);

  useEffect(() => {
    const current = filters.rateMax !== null ? String(filters.rateMax) : '';
    if (debouncedRateMax === current) {
      return;
    }
    const parsed = debouncedRateMax ? Number.parseInt(debouncedRateMax, 10) : null;
    if (debouncedRateMax && Number.isNaN(parsed)) {
      return;
    }
    updateFilters({ rateMax: parsed }, { scroll: false });
  }, [debouncedRateMax, filters.rateMax, updateFilters]);

  const filteredItems = useMemo(() => applySpecialistFilters(data, filters), [data, filters]);
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
    () => Array.from(new Set(data.map((item) => item.role))).sort((a, b) => a.localeCompare(b, 'ru-RU')),
    [data]
  );
  const skills = useMemo(
    () => Array.from(new Set(data.flatMap((item) => item.skills))).sort((a, b) => a.localeCompare(b, 'ru-RU')),
    [data]
  );
  const languages = useMemo(
    () => Array.from(new Set(data.flatMap((item) => item.languages))).sort((a, b) => a.localeCompare(b, 'ru-RU')),
    [data]
  );

  if (error) {
    return (
      <ContentBlock variant="error">
        <p>Не удалось загрузить каталог специалистов. Попробуйте обновить страницу.</p>
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
            description="Фильтруйте каталог по ролям, навыкам, языку и ставке."
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
            Поиск специалистов
          </ContentBlockTitle>
        }
      >
        <div className="grid gap-4 md:grid-cols-4">
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
            <span className="text-xs uppercase tracking-wide text-neutral-500">Навыки</span>
            <select
              value={filters.skills.length > 0 ? filters.skills[0] : ''}
              onChange={(event) => updateFilters({ skills: event.target.value ? [event.target.value] : [] })}
              className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Все навыки</option>
              {skills.map((skill) => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
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
          <label className="flex flex-col gap-2 text-sm text-neutral-300">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Формат</span>
            <select
              value={filters.workFormat ?? ''}
              onChange={(event) => updateFilters({ workFormat: (event.target.value as SpecialistFilters['workFormat']) || null })}
              className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Любой формат</option>
              <option value="remote">Удалённо</option>
              <option value="office">В офисе</option>
              <option value="hybrid">Гибрид</option>
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Ставка (₽/час)</span>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={rateMinDraft}
                onChange={(event) => setRateMinDraft(event.target.value)}
                placeholder="от"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
              />
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={rateMaxDraft}
                onChange={(event) => setRateMaxDraft(event.target.value)}
                placeholder="до"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm text-neutral-300 md:col-span-2">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Поиск</span>
            <input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Например: research или Swift"
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-neutral-300">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Сортировка</span>
            <select
              value={filters.sort}
              onChange={(event) => updateFilters({ sort: event.target.value as SpecialistFilters['sort'] }, { resetPage: false })}
              className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
            >
              <option value="rating">По рейтингу</option>
              <option value="cost">По стоимости</option>
              <option value="new">Сначала обновлённые</option>
            </select>
          </label>
        </div>
      </ContentBlock>

      <div ref={listRef} className="flex items-center justify-between text-sm text-neutral-400">
        <p>
          Найдено специалистов: <span className="font-semibold text-neutral-100">{total}</span>
        </p>
        {isPending && <p className="text-xs text-indigo-300">Обновляем результаты…</p>}
      </div>

      {pageItems.length === 0 ? (
        <ContentBlock variant="dashed" className="p-10 text-center text-sm text-neutral-400">
          Ничего не найдено. Измените фильтры.
        </ContentBlock>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {pageItems.map((specialist) => (
            <SpecialistCard key={specialist.id} specialist={specialist} onInvite={setInvitePerformer} />
          ))}
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onChange={(page) => updateFilters({ page }, { resetPage: false })} />
      
      <InvitePerformerModal 
        open={!!invitePerformer} 
        onOpenChange={(open) => !open && setInvitePerformer(null)}
        performer={invitePerformer} 
      />
    </section>
  );
}
