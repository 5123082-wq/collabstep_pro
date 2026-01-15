'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';
import { useOrganization } from '@/components/organizations/OrganizationContext';
import { ResponseCard } from '@/components/performers/ResponseCard';
import type { Vacancy } from '@/lib/schemas/marketplace-vacancy';

const RESPONSE_STATUSES = ['pending', 'accepted', 'rejected'] as const;

type ResponseStatus = typeof RESPONSE_STATUSES[number];

type StatusFilter = ResponseStatus | 'all';

type ResponseItem = {
  id: string;
  vacancyId: string;
  vacancyTitle: string | null;
  vacancyProject: string | null;
  performerId: string;
  performerName: string | null;
  performerHandle: string | null;
  message: string | null;
  status: ResponseStatus;
  createdAt: string;
};

type InviteItem = {
  id: string;
  status: string;
  role: string | null;
  organizationName: string | null;
  inviterName: string | null;
  previewProjects: { id: string; name: string }[];
};

type TabKey = 'incoming' | 'my';

type InvitesResponse =
  | { ok: true; data: { invites: Array<Record<string, unknown>> } }
  | { ok: false; error: string };

function toIsoDate(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  return new Date().toISOString();
}

function coerceStatus(value: unknown): ResponseStatus {
  if (typeof value === 'string' && RESPONSE_STATUSES.includes(value as ResponseStatus)) {
    return value as ResponseStatus;
  }
  return 'pending';
}

function getPayload<T>(data: unknown): T | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  if ('data' in data && data.data && typeof data.data === 'object') {
    return data.data as T;
  }
  return data as T;
}

function formatStatusLabel(value: ResponseStatus): string {
  if (value === 'pending') return 'Ожидает решения';
  if (value === 'accepted') return 'Принят';
  return 'Отклонен';
}

function isVacancyInfo(value: unknown): value is { title?: unknown; organizationId?: unknown } {
  return typeof value === 'object' && value !== null;
}

export function ResponsesList() {
  const { currentOrgId } = useOrganization();
  const [activeTab, setActiveTab] = useState<TabKey>('incoming');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [vacancyFilter, setVacancyFilter] = useState('all');

  const [incomingResponses, setIncomingResponses] = useState<ResponseItem[]>([]);
  const [incomingVacancies, setIncomingVacancies] = useState<Vacancy[]>([]);
  const [incomingError, setIncomingError] = useState<string | null>(null);
  const [incomingLoading, setIncomingLoading] = useState(false);

  const [myResponses, setMyResponses] = useState<ResponseItem[]>([]);
  const [myError, setMyError] = useState<string | null>(null);
  const [myLoading, setMyLoading] = useState(false);

  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);

  const loadInvites = useCallback(async () => {
    setInvitesLoading(true);
    try {
      const response = await fetch('/api/invites');
      const data = (await response.json().catch(() => null)) as InvitesResponse | null;
      if (!response.ok || !data || !data.ok) {
        setInvites([]);
        return;
      }

      const items = (data.data.invites ?? []).map((item) => {
        const invite = (item as { invite?: Record<string, unknown> }).invite ?? {};
        const organization = (item as { organization?: { name?: string | null } }).organization ?? null;
        const inviter = (item as { inviter?: { name?: string | null } }).inviter ?? null;
        const previewProjectsRaw = (item as { previewProjects?: Array<Record<string, unknown>> }).previewProjects ?? [];
        const previewProjects = previewProjectsRaw
          .map((project) => ({
            id: typeof project.id === 'string' ? project.id : '',
            name: typeof project.name === 'string' ? project.name : ''
          }))
          .filter((project) => project.id && project.name);

        return {
          id: typeof invite.id === 'string' ? invite.id : '',
          status: typeof invite.status === 'string' ? invite.status : 'pending',
          role: typeof invite.role === 'string' ? invite.role : null,
          organizationName: organization?.name ?? null,
          inviterName: inviter?.name ?? null,
          previewProjects
        };
      });

      setInvites(items.filter((item) => item.id));
    } finally {
      setInvitesLoading(false);
    }
  }, []);

  const loadIncomingResponses = useCallback(async () => {
    if (!currentOrgId) {
      setIncomingResponses([]);
      setIncomingVacancies([]);
      setIncomingError(null);
      return;
    }

    setIncomingLoading(true);
    setIncomingError(null);

    try {
      const vacanciesResponse = await fetch(`/api/vacancies?organizationId=${currentOrgId}`);
      if (!vacanciesResponse.ok) {
        throw new Error('Не удалось загрузить вакансии');
      }

      const vacanciesJson = await vacanciesResponse.json().catch(() => null);
      const vacanciesPayload = getPayload<{ vacancies: Vacancy[] }>(vacanciesJson);
      const vacancies = Array.isArray(vacanciesPayload?.vacancies) ? vacanciesPayload.vacancies : [];
      setIncomingVacancies(vacancies);

      const responsesByVacancy = await Promise.all(
        vacancies.map(async (vacancy) => {
          const response = await fetch(`/api/vacancies/${vacancy.id}/responses`);
          const json = await response.json().catch(() => null);
          const payload = getPayload<{ responses: Array<Record<string, unknown>> }>(json);
          const responses = payload?.responses ?? [];
          return responses.map((entry) => ({
            id: typeof entry.id === 'string' ? entry.id : '',
            vacancyId: vacancy.id,
            vacancyTitle: vacancy.title,
            vacancyProject: vacancy.project,
            performerId: typeof entry.performerId === 'string' ? entry.performerId : '',
            performerName: null,
            performerHandle: null,
            message: typeof entry.message === 'string' ? entry.message : null,
            status: coerceStatus(entry.status),
            createdAt: toIsoDate(entry.createdAt)
          }));
        })
      );

      const flattened = responsesByVacancy.flat().filter((item) => item.id && item.performerId);

      const performerIds = Array.from(new Set(flattened.map((response) => response.performerId)));
      const performerHandles = await Promise.all(
        performerIds.map(async (performerId) => {
          const response = await fetch(`/api/performers/${performerId}`);
          if (!response.ok) {
            return null;
          }
          const json = await response.json().catch(() => null);
          const payload = getPayload<{ profile?: { handle?: string | null } }>(json);
          if (!payload?.profile) {
            return null;
          }
          return { performerId, handle: payload.profile.handle ?? null };
        })
      );

      const handleMap = new Map(
        performerHandles
          .filter((item): item is { performerId: string; handle: string | null } => Boolean(item))
          .map((item) => [item.performerId, item.handle])
      );

      const hydrated = flattened.map((response) => ({
        ...response,
        performerHandle: handleMap.get(response.performerId) ?? null
      }));

      setIncomingResponses(hydrated);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка загрузки откликов';
      setIncomingError(message);
    } finally {
      setIncomingLoading(false);
    }
  }, [currentOrgId]);

  const loadMyResponses = useCallback(async () => {
    setMyLoading(true);
    setMyError(null);

    try {
      const response = await fetch('/api/responses');
      if (!response.ok) {
        throw new Error('Не удалось загрузить мои отклики');
      }

      const json = await response.json().catch(() => null);
      const payload = getPayload<{ responses: Array<Record<string, unknown>> }>(json);
      const responses = payload?.responses ?? [];

      const mapped = responses.map((entry) => {
        const vacancyInfo = isVacancyInfo(entry.vacancy) ? entry.vacancy : null;
        const vacancyTitle = vacancyInfo && typeof vacancyInfo.title === 'string' ? vacancyInfo.title : null;
        const vacancyProject =
          vacancyInfo && typeof vacancyInfo.organizationId === 'string' ? vacancyInfo.organizationId : null;

        return {
          id: typeof entry.id === 'string' ? entry.id : '',
          vacancyId: typeof entry.vacancyId === 'string' ? entry.vacancyId : '',
          vacancyTitle,
          vacancyProject,
          performerId: typeof entry.performerId === 'string' ? entry.performerId : '',
          performerName: 'Вы',
          performerHandle: null,
          message: typeof entry.message === 'string' ? entry.message : null,
          status: coerceStatus(entry.status),
          createdAt: toIsoDate(entry.createdAt)
        };
      });

      setMyResponses(mapped.filter((item) => item.id && item.vacancyId));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка загрузки откликов';
      setMyError(message);
    } finally {
      setMyLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

  useEffect(() => {
    void loadIncomingResponses();
  }, [loadIncomingResponses]);

  useEffect(() => {
    void loadMyResponses();
  }, [loadMyResponses]);

  const vacancyOptions = useMemo(() => {
    if (activeTab === 'incoming') {
      return incomingVacancies.map((vacancy) => ({ id: vacancy.id, label: vacancy.title }));
    }
    const uniqueVacancies = new Map(
      myResponses
        .filter((response) => response.vacancyTitle)
        .map((response) => [response.vacancyId, response.vacancyTitle as string])
    );
    return Array.from(uniqueVacancies.entries()).map(([id, label]) => ({ id, label }));
  }, [activeTab, incomingVacancies, myResponses]);

  useEffect(() => {
    if (vacancyFilter === 'all') {
      return;
    }
    const exists = vacancyOptions.some((option) => option.id === vacancyFilter);
    if (!exists) {
      setVacancyFilter('all');
    }
  }, [vacancyFilter, vacancyOptions]);

  const filteredIncoming = useMemo(() => {
    return incomingResponses.filter((response) => {
      if (statusFilter !== 'all' && response.status !== statusFilter) {
        return false;
      }
      if (vacancyFilter !== 'all' && response.vacancyId !== vacancyFilter) {
        return false;
      }
      return true;
    });
  }, [incomingResponses, statusFilter, vacancyFilter]);

  const filteredMy = useMemo(() => {
    return myResponses.filter((response) => {
      if (statusFilter !== 'all' && response.status !== statusFilter) {
        return false;
      }
      if (vacancyFilter !== 'all' && response.vacancyId !== vacancyFilter) {
        return false;
      }
      return true;
    });
  }, [myResponses, statusFilter, vacancyFilter]);

  return (
    <div className="space-y-6">
      <ContentBlock
        as="section"
        header={<ContentBlockTitle as="h2">Приглашения</ContentBlockTitle>}
      >
        {invitesLoading ? (
          <p className="text-sm text-neutral-400">Загрузка приглашений...</p>
        ) : invites.length === 0 ? (
          <p className="text-sm text-neutral-400">Новых приглашений нет.</p>
        ) : (
          <div className="space-y-3">
            {invites.map((invite) => (
              <div key={invite.id} className="rounded-2xl border border-neutral-900 bg-neutral-950/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-100">
                      {invite.organizationName ?? 'Организация'}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Пригласил: {invite.inviterName ?? 'Команда'} · Роль: {invite.role ?? 'member'}
                    </p>
                  </div>
                  <span className="rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1 text-xs text-neutral-300">
                    {invite.status}
                  </span>
                </div>
                {invite.previewProjects.length > 0 ? (
                  <div className="mt-3 text-xs text-neutral-400">
                    Проекты: {invite.previewProjects.map((project) => project.name).join(', ')}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </ContentBlock>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="incoming">Входящие отклики</TabsTrigger>
            <TabsTrigger value="my">Мои отклики</TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-3">
            <select
              className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-xs font-semibold text-neutral-200"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            >
              <option value="all">Все статусы</option>
              {RESPONSE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-xs font-semibold text-neutral-200"
              value={vacancyFilter}
              onChange={(event) => setVacancyFilter(event.target.value)}
            >
              <option value="all">Все вакансии</option>
              {vacancyOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <TabsContent value="incoming">
          {incomingLoading ? (
            <ContentBlock>
              <p className="text-sm text-neutral-400">Загрузка откликов...</p>
            </ContentBlock>
          ) : incomingError ? (
            <ContentBlock>
              <p className="text-sm text-rose-300">{incomingError}</p>
            </ContentBlock>
          ) : !currentOrgId ? (
            <ContentBlock>
              <p className="text-sm text-neutral-400">Выберите организацию для просмотра входящих откликов.</p>
            </ContentBlock>
          ) : filteredIncoming.length === 0 ? (
            <ContentBlock>
              <p className="text-sm text-neutral-400">Нет откликов по выбранным фильтрам.</p>
            </ContentBlock>
          ) : (
            <div className="space-y-4">
              {filteredIncoming.map((response) => (
                <ResponseCard
                  key={response.id}
                  response={response}
                  onStatusChange={(id, status) => {
                    setIncomingResponses((prev) =>
                      prev.map((item) => (item.id === id ? { ...item, status } : item))
                    );
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my">
          {myLoading ? (
            <ContentBlock>
              <p className="text-sm text-neutral-400">Загрузка моих откликов...</p>
            </ContentBlock>
          ) : myError ? (
            <ContentBlock>
              <p className="text-sm text-rose-300">{myError}</p>
            </ContentBlock>
          ) : filteredMy.length === 0 ? (
            <ContentBlock>
              <p className="text-sm text-neutral-400">Отклики не найдены.</p>
            </ContentBlock>
          ) : (
            <div className="space-y-4">
              {filteredMy.map((response) => (
                <ResponseCard key={response.id} response={response} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
