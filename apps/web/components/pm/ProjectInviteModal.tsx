'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Link2, Loader2, Search, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { ContentBlock } from '@/components/ui/content-block';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/ui/toast';
import { trackEvent } from '@/lib/telemetry';
import { useDebouncedValue } from '@/lib/ui/useDebouncedValue';

type ProjectInviteModalProps = {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

type InviteLink = {
  id: string;
  token: string;
  expiresAt: string;
  maxUses: number | null;
  uses: number;
  createdBy: string;
  createdAt: string;
};

type ProjectMemberCandidate = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  title?: string;
  relationship: 'project_member' | 'organization_member' | 'platform_user';
  inProject: boolean;
  inOrganization: boolean | null;
};

type CandidatesResponse =
  | { ok: true; data: { items: ProjectMemberCandidate[]; organizationId?: string } }
  | { ok: false; error: string; details?: string };

type ProjectRoleOption = 'ADMIN' | 'MEMBER' | 'GUEST';

const ROLE_LABELS: Record<ProjectRoleOption, string> = {
  ADMIN: 'Администратор',
  MEMBER: 'Участник',
  GUEST: 'Гость'
};

const RELATIONSHIP_META: Record<
  ProjectMemberCandidate['relationship'],
  { label: string; className: string }
> = {
  project_member: {
    label: 'Уже в проекте',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
  },
  organization_member: {
    label: 'В команде организации',
    className: 'border-sky-500/30 bg-sky-500/10 text-sky-200'
  },
  platform_user: {
    label: 'На платформе',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-200'
  }
};

function formatExpiresAt(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'U';
  }
  const [first, second] = trimmed.split(/\s+/);
  return `${first?.[0] ?? ''}${second?.[0] ?? ''}`.toUpperCase() || trimmed.charAt(0).toUpperCase();
}

export default function ProjectInviteModal({
  projectId,
  projectName,
  isOpen,
  onClose,
  onSuccess
}: ProjectInviteModalProps) {
  const [inviteLink, setInviteLink] = useState<InviteLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [creatingInviteLink, setCreatingInviteLink] = useState(false);

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 250);
  const [selectedRole, setSelectedRole] = useState<ProjectRoleOption>('MEMBER');
  const [candidates, setCandidates] = useState<ProjectMemberCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [organizationScoped, setOrganizationScoped] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setInviteLink(null);
      setCopied(false);
      setQuery('');
      setCandidates([]);
      setCandidatesError(null);
      setAddingUserId(null);
      setSelectedRole('MEMBER');
      setOrganizationScoped(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const controller = new AbortController();
    setLoadingCandidates(true);
    setCandidatesError(null);

    const params = new URLSearchParams();
    const normalizedQuery = debouncedQuery.trim();
    if (normalizedQuery) {
      params.set('q', normalizedQuery);
    }

    void (async () => {
      try {
        const suffix = params.toString() ? `?${params.toString()}` : '';
        const response = await fetch(`/api/pm/projects/${projectId}/member-candidates${suffix}`, {
          signal: controller.signal
        });
        const data = (await response.json().catch(() => null)) as CandidatesResponse | null;
        if (controller.signal.aborted) {
          return;
        }
        if (!response.ok || !data || !data.ok) {
          const message = data && !data.ok ? data.details || data.error : 'Не удалось загрузить пользователей';
          setCandidatesError(message);
          setCandidates([]);
          return;
        }

        setCandidates(data.data.items);
        setOrganizationScoped(Boolean(data.data.organizationId));
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setCandidatesError('Не удалось загрузить пользователей');
        setCandidates([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoadingCandidates(false);
        }
      }
    })();

    return () => controller.abort();
  }, [debouncedQuery, isOpen, projectId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleCreateInviteLink = async () => {
    try {
      setCreatingInviteLink(true);
      const response = await fetch(`/api/pm/projects/${projectId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxUses: 10 })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create invite link' }));
        if (response.status === 403) {
          toast('Недостаточно прав для создания приглашения', 'warning');
          return;
        }
        if (response.status === 401) {
          toast('Необходимо войти в систему', 'warning');
          return;
        }
        throw new Error(error.error || 'Failed to create invite link');
      }

      const data = await response.json();
      setInviteLink(data.data?.inviteLink ?? data.inviteLink ?? null);

      trackEvent('pm_project_member_invited', {
        project_id: projectId,
        member_role: selectedRole.toLowerCase(),
        source: 'project_invite_link'
      });

      toast('Инвайт-ссылка создана', 'success');
    } catch (error) {
      console.error('Failed to create invite link:', error);
      toast('Не удалось создать инвайт-ссылку', 'warning');
    } finally {
      setCreatingInviteLink(false);
    }
  };

  const handleCopyLink = () => {
    if (!inviteLink) {
      return;
    }

    const fullLink = `${window.location.origin}/pm/projects/${projectId}/join?token=${inviteLink.token}`;
    void navigator.clipboard.writeText(fullLink).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast('Ссылка скопирована в буфер обмена', 'success');
    }).catch((error) => {
      console.error('Error copying to clipboard:', error);
      toast('Не удалось скопировать ссылку', 'warning');
    });
  };

  const handleAddCandidate = async (candidate: ProjectMemberCandidate) => {
    if (candidate.inProject) {
      return;
    }

    try {
      setAddingUserId(candidate.id);
      const response = await fetch(`/api/pm/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: candidate.id,
          role: selectedRole
        })
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof data?.details === 'string'
            ? data.details
            : typeof data?.error === 'string'
              ? data.error
              : 'Не удалось добавить участника';
        throw new Error(message);
      }

      trackEvent('pm_project_member_added', {
        project_id: projectId,
        member_id: candidate.id,
        member_role: selectedRole.toLowerCase(),
        source: candidate.relationship === 'organization_member' ? 'organization_people_picker' : 'platform_people_picker'
      });

      toast(`Пользователь ${candidate.name} добавлен в проект`, 'success');
      onSuccess?.();

      const normalizedQuery = debouncedQuery.trim();
      const params = new URLSearchParams();
      if (normalizedQuery) {
        params.set('q', normalizedQuery);
      }
      const suffix = params.toString() ? `?${params.toString()}` : '';
      const refreshResponse = await fetch(`/api/pm/projects/${projectId}/member-candidates${suffix}`);
      const refreshData = (await refreshResponse.json().catch(() => null)) as CandidatesResponse | null;
      if (refreshResponse.ok && refreshData && refreshData.ok) {
        setCandidates(refreshData.data.items);
      }
    } catch (error) {
      console.error('Failed to add project member:', error);
      toast(error instanceof Error ? error.message : 'Не удалось добавить участника', 'warning');
    } finally {
      setAddingUserId(null);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl">
        <ContentBlock
          as="div"
          className="max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
          role="dialog"
          aria-modal="true"
        >
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Добавить людей в проект</h2>
              <p className="mt-1 text-sm text-neutral-400">{projectName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300 transition hover:border-neutral-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Закрыть
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                  <Users className="h-4 w-4 text-indigo-300" />
                  Поиск по платформе
                </div>

                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                  <label className="space-y-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                      Имя, email или должность
                    </span>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                      <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Например: anna@company.com"
                        className="h-11 border-neutral-800 bg-neutral-950 pl-10 text-white"
                      />
                    </div>
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                      Роль в проекте
                    </span>
                    <select
                      value={selectedRole}
                      onChange={(event) => setSelectedRole(event.target.value as ProjectRoleOption)}
                      className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="MEMBER">Участник</option>
                      <option value="ADMIN">Администратор</option>
                      <option value="GUEST">Гость</option>
                    </select>
                  </label>
                </div>

                <p className="mt-3 text-xs text-neutral-500">
                  В задачи назначаются только участники проекта. Сначала найдите человека здесь и добавьте его в команду.
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-white">Кандидаты</div>
                    <div className="text-xs text-neutral-500">
                      {organizationScoped
                        ? 'Сначала показываем участников вашей организации, затем остальных зарегистрированных пользователей платформы.'
                        : 'Показываем зарегистрированных пользователей платформы, которых можно добавить в проект.'}
                    </div>
                  </div>
                  {loadingCandidates && <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />}
                </div>

                {candidatesError ? (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {candidatesError}
                  </div>
                ) : null}

                {!candidatesError && candidates.length === 0 && !loadingCandidates ? (
                  <div className="rounded-xl border border-dashed border-neutral-800 px-4 py-6 text-sm text-neutral-400">
                    {query.trim()
                      ? 'Никого не нашли. Попробуйте другой email или создайте инвайт-ссылку справа.'
                      : 'Пока нечего показывать. Начните вводить имя или email пользователя.'}
                  </div>
                ) : null}

                <div className="space-y-3">
                  {candidates.map((candidate) => {
                    const meta = RELATIONSHIP_META[candidate.relationship];
                    const isBusy = addingUserId === candidate.id;
                    const actionLabel = candidate.inProject
                      ? 'Уже в проекте'
                      : candidate.inOrganization === false
                        ? 'Добавить как внешнего'
                        : 'Добавить в проект';

                    return (
                      <div
                        key={candidate.id}
                        className="flex flex-col gap-4 rounded-2xl border border-neutral-800/80 bg-neutral-950/50 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <Avatar className="h-10 w-10 border border-neutral-800">
                            <AvatarImage src={candidate.avatarUrl ?? ''} alt={candidate.name} />
                            <AvatarFallback className="bg-neutral-900 text-xs text-neutral-200">
                              {getInitials(candidate.name)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="truncate text-sm font-medium text-white">{candidate.name}</div>
                              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.className}`}>
                                {meta.label}
                              </span>
                            </div>
                            <div className="truncate text-sm text-neutral-400">{candidate.email}</div>
                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-neutral-500">
                              {candidate.title ? <span>{candidate.title}</span> : null}
                              {candidate.inOrganization === false ? (
                                <span>Будет добавлен только в этот проект</span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={candidate.inProject || isBusy}
                          onClick={() => void handleAddCandidate(candidate)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:border-indigo-500/40 hover:bg-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                          {actionLabel}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                  <ShieldCheck className="h-4 w-4 text-indigo-300" />
                  Выбранная роль
                </div>
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-100">
                  {ROLE_LABELS[selectedRole]}
                </div>
                <p className="mt-3 text-xs text-neutral-500">
                  <span className="font-medium text-neutral-300">Администратор</span> управляет командой и задачами.{' '}
                  <span className="font-medium text-neutral-300">Участник</span> работает с задачами.{' '}
                  <span className="font-medium text-neutral-300">Гость</span> получает read-only доступ.
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                  <Link2 className="h-4 w-4 text-indigo-300" />
                  Инвайт-ссылка
                </div>

                {!inviteLink ? (
                  <>
                    <p className="text-sm text-neutral-400">
                      Если нужного человека ещё нет на платформе или вы хотите отправить доступ вручную, создайте общую ссылку.
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleCreateInviteLink()}
                      disabled={creatingInviteLink}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {creatingInviteLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                      Создать инвайт-ссылку
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-indigo-200">
                        Ссылка готова
                      </div>
                      <div className="break-all rounded-lg bg-neutral-950/70 px-3 py-2 text-xs text-neutral-200">
                        {window.location.origin}/pm/projects/{projectId}/join?token={inviteLink.token}
                      </div>
                      <div className="mt-3 text-xs text-neutral-400">
                        Истекает: {formatExpiresAt(inviteLink.expiresAt)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:border-indigo-500/40 hover:bg-indigo-500/10"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? 'Скопировано' : 'Скопировать ссылку'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setInviteLink(null);
                        setCopied(false);
                      }}
                      className="inline-flex w-full items-center justify-center rounded-xl border border-neutral-800 px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800"
                    >
                      Создать новую ссылку
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ContentBlock>
      </div>
    </div>
  );
}
