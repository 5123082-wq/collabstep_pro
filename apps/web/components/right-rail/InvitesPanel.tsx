'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
// @ts-expect-error lucide-react icon types
import { ArrowLeft, Check, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ContentBlock } from '@/components/ui/content-block';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useSessionContext } from '@/components/app/SessionContext';
import { useUI } from '@/stores/ui';
import type { OrganizationInvite } from '@collabverse/api';

type OrganizationInviteDTO = Omit<OrganizationInvite, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

type InviteListItem = {
  invite: OrganizationInviteDTO;
  organization: { id: string; name: string } | null;
  inviter: { id: string; name: string | null; email: string; avatarUrl: string | null } | null;
  threadId: string;
  previewProjects?: { id: string; name: string; previewInviteToken: string | null }[];
};

type InviteThreadMessage = {
  id: string;
  threadId: string;
  authorId: string;
  body: string;
  createdAt: string;
};

type ListInvitesResponse =
  | { ok: true; data: { invites: InviteListItem[] } }
  | { ok: false; error: string; details?: string };

type ListMessagesResponse =
  | { ok: true; data: { messages: InviteThreadMessage[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } } }
  | { ok: false; error: string; details?: string };

type PostMessageResponse =
  | { ok: true; data: { message: InviteThreadMessage } }
  | { ok: false; error: string; details?: string };

function formatInviteStatus(status: OrganizationInvite['status']): string {
  if (status === 'pending') return 'Ожидает ответа';
  if (status === 'accepted') return 'Принято';
  if (status === 'rejected') return 'Отклонено';
  return status;
}

function formatRole(role: OrganizationInviteDTO['role'] | null | undefined): string {
  if (!role) return 'member';
  return role;
}

function formatTimeShort(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function InvitesPanel() {
  const session = useSessionContext();
  const setUnreadInvites = useUI((state) => state.setUnreadInvites);
  const unreadInvites = useUI((state) => state.unreadInvites);

  const [invites, setInvites] = useState<InviteListItem[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [invitesError, setInvitesError] = useState<string | null>(null);

  const [activeInviteId, setActiveInviteId] = useState<string | null>(null);
  const [messagesByThreadId, setMessagesByThreadId] = useState<Record<string, InviteThreadMessage[]>>({});
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [postAcceptOrgId, setPostAcceptOrgId] = useState<string | null>(null);

  const activeInvite = useMemo(
    () => (activeInviteId ? invites.find((item) => item.invite.id === activeInviteId) ?? null : null),
    [activeInviteId, invites]
  );

  const loadInvites = useCallback(async () => {
    setInvitesError(null);
    setLoadingInvites(true);
    try {
      const response = await fetch('/api/invites');
      const data = (await response.json().catch(() => null)) as ListInvitesResponse | null;
      if (!response.ok || !data || !data.ok) {
        setInvitesError(data && !data.ok ? data.error : 'Не удалось загрузить приглашения');
        return;
      }
      setInvites(data.data.invites);
    } catch (error) {
      setInvitesError('Не удалось загрузить приглашения');
    } finally {
      setLoadingInvites(false);
    }
  }, []);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

  const loadMessages = useCallback(async (threadId: string) => {
    setLoadingMessages(true);
    try {
      const response = await fetch(`/api/invites/threads/${threadId}/messages?page=1&pageSize=50`);
      const data = (await response.json().catch(() => null)) as ListMessagesResponse | null;
      if (!response.ok || !data || !data.ok) {
        return;
      }
      const sortedOldestFirst = [...data.data.messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setMessagesByThreadId((prev) => ({ ...prev, [threadId]: sortedOldestFirst }));
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (!activeInvite?.threadId) {
      return;
    }
    void loadMessages(activeInvite.threadId);
  }, [activeInvite?.threadId, loadMessages]);

  const activeMessages = useMemo(() => {
    const threadId = activeInvite?.threadId;
    if (!threadId) return [];
    return messagesByThreadId[threadId] ?? [];
  }, [activeInvite?.threadId, messagesByThreadId]);

  const optimisticMarkInviteResolved = useCallback(
    (invite: OrganizationInviteDTO) => {
      if (invite.status !== 'pending') {
        return;
      }
      setUnreadInvites(Math.max(0, unreadInvites - 1));
    },
    [setUnreadInvites, unreadInvites]
  );

  const handleAccept = useCallback(async () => {
    if (!activeInvite) return;
    const invite = activeInvite.invite;
    if (invite.status !== 'pending') return;

    try {
      const response = await fetch(`/api/invites/${invite.id}/accept`, { method: 'POST' });
      const data = (await response.json().catch(() => null)) as { ok: boolean; data?: { invite?: OrganizationInviteDTO } } | null;
      if (!response.ok || !data?.ok) {
        return;
      }

      optimisticMarkInviteResolved(invite);

      const nextInvite = data.data?.invite ?? invite;
      setInvites((prev) => prev.map((item) => (item.invite.id === invite.id ? { ...item, invite: nextInvite } : item)));
      // Use organizationId from the invite directly, fallback to organization?.id, then to postAcceptOrgId
      const orgId = (nextInvite as { organizationId?: string }).organizationId ?? activeInvite.organization?.id ?? null;
      setPostAcceptOrgId(orgId && orgId.trim() !== '' ? orgId : null);
    } catch (error) {
      // noop (keep UI stable)
    }
  }, [activeInvite, optimisticMarkInviteResolved]);

  const handleReject = useCallback(async () => {
    if (!activeInvite) return;
    const invite = activeInvite.invite;
    if (invite.status !== 'pending') return;

    try {
      const response = await fetch(`/api/invites/${invite.id}/reject`, { method: 'POST' });
      const data = (await response.json().catch(() => null)) as { ok: boolean; data?: { invite?: OrganizationInviteDTO } } | null;
      if (!response.ok || !data?.ok) {
        return;
      }

      optimisticMarkInviteResolved(invite);

      const nextInvite = data.data?.invite ?? invite;
      setInvites((prev) => prev.map((item) => (item.invite.id === invite.id ? { ...item, invite: nextInvite } : item)));
    } catch (error) {
      // noop
    }
  }, [activeInvite, optimisticMarkInviteResolved]);

  const handleSendMessage = useCallback(async () => {
    if (!activeInvite) return;
    if (sending) return;
    if (activeInvite.invite.status !== 'pending') return;
    const threadId = activeInvite.threadId;
    const body = messageDraft.trim();
    if (!body) return;

    setSending(true);
    try {
      const response = await fetch(`/api/invites/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body })
      });
      const data = (await response.json().catch(() => null)) as PostMessageResponse | null;
      if (!response.ok || !data || !data.ok) {
        return;
      }
      const message = data.data.message;
      setMessagesByThreadId((prev) => ({
        ...prev,
        [threadId]: [...(prev[threadId] ?? []), message].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
      }));
      setMessageDraft('');
    } finally {
      setSending(false);
    }
  }, [activeInvite, messageDraft, sending]);

  if (loadingInvites) {
    return <div className="flex h-full items-center justify-center text-sm text-neutral-400">Загрузка...</div>;
  }

  if (invitesError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-sm text-neutral-300">Не удалось загрузить приглашения</div>
        <div className="text-xs text-neutral-500">{invitesError}</div>
        <button
          type="button"
          onClick={() => void loadInvites()}
          className="rounded-xl border border-transparent bg-indigo-500/10 px-3 py-2 text-sm text-indigo-200 transition hover:border-indigo-500/50 hover:bg-indigo-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        >
          Повторить
        </button>
      </div>
    );
  }

  if (!activeInvite) {
    return (
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <ScrollArea className="flex-1 px-6 pb-6 pr-4 pt-6">
          {invites.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400">Нет приглашений</div>
          ) : (
            <ul className="space-y-3">
              {invites.map((item) => {
                const status = item.invite.status;
                const showDot = status === 'pending';
                return (
                  <li key={item.invite.id}>
                    <ContentBlock
                      as="button"
                      type="button"
                      size="sm"
                      interactive
                      onClick={() => setActiveInviteId(item.invite.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-medium text-[color:var(--text-primary)]">
                              {item.organization?.name ?? 'Организация'}
                            </div>
                            {showDot ? <div className="h-2 w-2 rounded-full bg-indigo-500" /> : null}
                          </div>
                          <div className="mt-1 text-xs text-[color:var(--text-secondary)]">
                            От: {item.inviter?.name ?? item.inviter?.email ?? 'Пользователь'} · Роль: {formatRole(item.invite.role)}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-tertiary)]">
                            <span>{formatInviteStatus(item.invite.status)}</span>
                            <span aria-hidden="true">·</span>
                            <span>{formatTimeShort(item.invite.createdAt)}</span>
                          </div>
                        </div>
                        <span className="text-xs text-indigo-200">Открыть</span>
                      </div>
                    </ContentBlock>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </div>
    );
  }

  const canRespond = activeInvite.invite.status === 'pending';
  // Get organizationId from invite directly, fallback to organization?.id, then to postAcceptOrgId
  const inviteOrgId = (activeInvite.invite as { organizationId?: string }).organizationId ?? activeInvite.organization?.id ?? postAcceptOrgId;
  const acceptedOrgId = activeInvite.invite.status === 'accepted' && inviteOrgId && inviteOrgId.trim() !== '' ? inviteOrgId : null;

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-[color:var(--surface-border-subtle)] px-6 py-4">
        <button
          type="button"
          onClick={() => setActiveInviteId(null)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-[color:var(--surface-muted)] text-[color:var(--text-secondary)] transition hover:border-[color:var(--surface-border-strong)] hover:text-[color:var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          aria-label="Назад к списку приглашений"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-[color:var(--text-primary)]">
            {activeInvite.organization?.name ?? 'Организация'}
          </div>
          <div className="mt-1 truncate text-xs text-[color:var(--text-secondary)]">
            Пригласил: {activeInvite.inviter?.name ?? activeInvite.inviter?.email ?? 'Пользователь'} · Роль: {formatRole(activeInvite.invite.role)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleReject()}
            disabled={!canRespond}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
              canRespond
                ? 'bg-red-500/10 text-red-200 hover:border-red-500/40 hover:bg-red-500/20'
                : 'cursor-not-allowed bg-[color:var(--surface-muted)] text-[color:var(--text-tertiary)]'
            )}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Отклонить
          </button>
          <button
            type="button"
            onClick={() => void handleAccept()}
            disabled={!canRespond}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
              canRespond
                ? 'bg-indigo-500/10 text-indigo-200 hover:border-indigo-500/50 hover:bg-indigo-500/20'
                : 'cursor-not-allowed bg-[color:var(--surface-muted)] text-[color:var(--text-tertiary)]'
            )}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Принять
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {acceptedOrgId ? (
          <div className="border-b border-[color:var(--surface-border-subtle)] px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3">
              <div className="text-sm text-[color:var(--text-primary)]">
                Приглашение принято. Вы можете перейти к настройке команды.
              </div>
              <Link
                href={`/org/${acceptedOrgId}/team`}
                className="rounded-xl border border-transparent bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                Перейти в команду
              </Link>
            </div>
          </div>
        ) : null}
        <div className="border-b border-[color:var(--surface-border-subtle)] px-6 py-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">Контекст</div>
          {activeInvite.previewProjects && activeInvite.previewProjects.length > 0 ? (
            <div className="mt-3 space-y-2">
              <div className="text-sm text-[color:var(--text-secondary)]">
                Приглашающий открыл доступ к проектам для ознакомления:
              </div>
              <ul className="space-y-2">
                {activeInvite.previewProjects.map((project) => {
                  const href = project.previewInviteToken ? `/invite/project/${project.previewInviteToken}` : null;
                  return (
                    <li key={project.id} className="flex items-center justify-between gap-3 rounded-xl bg-[color:var(--surface-muted)] px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-[color:var(--text-primary)]">{project.name}</div>
                        <div className="truncate text-xs text-[color:var(--text-tertiary)]">{project.id}</div>
                      </div>
                      {href ? (
                        <Link
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 rounded-xl border border-transparent bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-200 transition hover:border-indigo-500/50 hover:bg-indigo-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                        >
                          Открыть превью
                        </Link>
                      ) : (
                        <span className="shrink-0 rounded-xl bg-[color:var(--surface-base)] px-3 py-2 text-xs text-[color:var(--text-tertiary)]">
                          Превью недоступно
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="text-xs text-[color:var(--text-tertiary)]">
                Превью-режим предназначен для ознакомления до принятия приглашения.
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-[color:var(--text-secondary)]">
              Контекст проектов не задан. Используйте чат, чтобы уточнить детали перед принятием.
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 px-6 pb-6 pr-4 pt-6">
          {loadingMessages ? (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400">Загрузка чата...</div>
          ) : activeMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400">
              Сообщений пока нет — напишите первым
            </div>
          ) : (
            <ul className="space-y-3">
              {activeMessages.map((message) => {
                const isMe = message.authorId === session.userId;
                return (
                  <li key={message.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl border px-4 py-3 text-sm shadow-sm',
                        isMe
                          ? 'border-indigo-500/30 bg-indigo-500/10 text-[color:var(--text-primary)]'
                          : 'border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] text-[color:var(--text-primary)]'
                      )}
                    >
                      <div className="whitespace-pre-wrap">{message.body}</div>
                      <div className="mt-2 text-right text-[11px] text-[color:var(--text-tertiary)]">
                        {formatTimeShort(message.createdAt)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        <div className="border-t border-[color:var(--surface-border-subtle)] px-6 py-4">
          <div className="flex gap-3">
            <Textarea
              value={messageDraft}
              onChange={(event) => setMessageDraft(event.target.value)}
              placeholder={canRespond ? 'Напишите сообщение…' : 'Чат доступен только для просмотра'}
              disabled={!canRespond || sending}
              className="min-h-[44px]"
            />
            <button
              type="button"
              onClick={() => void handleSendMessage()}
              disabled={!canRespond || sending || !messageDraft.trim()}
              className={cn(
                'h-[44px] shrink-0 rounded-xl border border-transparent px-4 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
                canRespond && messageDraft.trim() && !sending
                  ? 'bg-indigo-500 text-white hover:bg-indigo-400'
                  : 'cursor-not-allowed bg-[color:var(--surface-muted)] text-[color:var(--text-tertiary)]'
              )}
            >
              Отправить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


