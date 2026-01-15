'use client';

import { useCallback, useEffect, useState } from 'react';
import { useOrganization } from '@/components/organizations/OrganizationContext';
import VacanciesCatalog from '@/components/marketplace/VacanciesCatalog';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';
import type { Vacancy } from '@/lib/schemas/marketplace-vacancy';

export default function PerformersMyVacanciesPage() {
  const { currentOrgId, currentOrganization } = useOrganization();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'closed'>('all');

  const openCreateVacancy = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent('open-create-modal', { detail: { component: 'createVacancy' } })
    );
  }, []);

  const loadVacancies = useCallback(async () => {
    if (!currentOrgId) {
      setVacancies([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      const response = await fetch(`/api/vacancies?organizationId=${currentOrgId}${statusParam}`);
      if (!response.ok) {
        throw new Error('Не удалось загрузить вакансии');
      }

      const data = await response.json().catch(() => null);
      const payload = data?.data ?? data;
      const items = Array.isArray(payload?.vacancies) ? payload.vacancies : [];
      setVacancies(items);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка загрузки вакансий';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [currentOrgId, statusFilter]);

  useEffect(() => {
    void loadVacancies();
  }, [loadVacancies]);

  useEffect(() => {
    const handleCreated = () => {
      void loadVacancies();
    };

    window.addEventListener('vacancy-created', handleCreated);
    return () => window.removeEventListener('vacancy-created', handleCreated);
  }, [loadVacancies]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-neutral-50">Мои вакансии</h1>
          <button
            type="button"
            onClick={openCreateVacancy}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/50 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            <span className="text-base leading-none">+</span>
            Создать
          </button>
        </div>
        <p className="text-sm text-neutral-400">
          {currentOrganization?.name
            ? `Организация: ${currentOrganization.name}`
            : 'Выберите организацию, чтобы управлять вакансиями.'}
        </p>
      </header>

      <ContentBlock as="section" size="sm" header={<ContentBlockTitle as="h2">Фильтры</ContentBlockTitle>}>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-neutral-400">Статус</label>
          <select
            className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-xs font-semibold text-neutral-200"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          >
            <option value="all">Все</option>
            <option value="draft">Черновик</option>
            <option value="published">Опубликовано</option>
            <option value="closed">Закрыто</option>
          </select>
        </div>
      </ContentBlock>

      <ContentBlock
        as="section"
        header={<ContentBlockTitle as="h2">Опубликованные вакансии</ContentBlockTitle>}
      >
        {isLoading ? (
          <p className="text-sm text-neutral-400">Загрузка вакансий...</p>
        ) : error ? (
          <p className="text-sm text-rose-300">{error}</p>
        ) : (
          <VacanciesCatalog
            data={vacancies}
            error={null}
            basePath="/performers/my-vacancies"
            detailPath="/performers/vacancies"
          />
        )}
      </ContentBlock>
    </div>
  );
}
