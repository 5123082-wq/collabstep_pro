'use client';

import { useState } from 'react';
// @ts-ignore
import { Check, Clock, Copy, Mail, MoreHorizontal, Shield, Trash2, UserPlus, Users, X } from 'lucide-react';
import { type Project, type ProjectMember } from '@/types/pm';
import { trackEvent } from '@/lib/telemetry';
import { toast } from '@/lib/ui/toast';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

type ProjectTeamProps = {
  project: Project;
  currentUserId: string;
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

const ROLE_LABELS: Record<ProjectMember['role'], string> = {
  OWNER: 'Владелец',
  ADMIN: 'Администратор',
  MEMBER: 'Участник',
  CONTRACTOR: 'Подрядчик',
  GUEST: 'Гость'
};

export default function ProjectTeam({ project, currentUserId }: ProjectTeamProps) {
  const [inviteLink, setInviteLink] = useState<InviteLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const canManageTeam = project.members.some(
    (m) => m.userId === currentUserId && (m.role === 'OWNER' || m.role === 'ADMIN')
  );

  const handleCreateInviteLink = async () => {
    if (!canManageTeam) {
      toast('Недостаточно прав для создания инвайт-ссылки', 'warning');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/pm/projects/${project.id}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxUses: 10 })
      });

      if (!response.ok) {
        throw new Error('Failed to create invite link');
      }

      const data = await response.json();
      setInviteLink(data.inviteLink);

      trackEvent('pm_invite_link_created', {
        workspaceId: 'current',
        projectId: project.id,
        userId: currentUserId,
        source: 'project_team'
      });
    } catch (error) {
      toast('Не удалось создать инвайт-ссылку', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!inviteLink) return;

    const fullLink = `${window.location.origin}/pm/projects/${project.id}/join?token=${inviteLink.token}`;
    void navigator.clipboard.writeText(fullLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast('Ссылка скопирована', 'success');
    }).catch((error) => {
      console.error('Error copying to clipboard:', error);
    });
  };

  const formatExpiresAt = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ContentBlock size="sm">
      <ContentBlockTitle
        as="h3"
        actions={
          canManageTeam ? (
            <button
              type="button"
              onClick={handleCreateInviteLink}
              disabled={loading}
              className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-2 text-sm font-medium text-white transition hover:border-indigo-500/40 hover:bg-indigo-500/10 disabled:opacity-50"
            >
              {loading ? 'Создание...' : 'Создать инвайт-ссылку'}
            </button>
          ) : undefined
        }
      >
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Команда
        </div>
      </ContentBlockTitle>

      {/* Инвайт-ссылка */}
      {inviteLink && (
        <div className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-indigo-300">Инвайт-ссылка</span>
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <Clock className="h-3 w-3" />
              <span>Истекает: {formatExpiresAt(inviteLink.expiresAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-neutral-900/50 px-3 py-2 text-xs text-neutral-300">
              {window.location.origin}/pm/projects/{project.id}/join?token={inviteLink.token}
            </code>
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-xs text-white transition hover:border-indigo-500/40"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Скопировано' : 'Копировать'}
            </button>
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs text-neutral-400">
            <span>Использований: {inviteLink.uses}</span>
            {inviteLink.maxUses && <span>Максимум: {inviteLink.maxUses}</span>}
          </div>
        </div>
      )}

      {/* Список участников */}
      <div className="space-y-2">
        {project.members.map((member) => (
          <div
            key={member.userId}
            className="flex items-center justify-between rounded-lg border border-neutral-800/50 bg-neutral-900/30 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-medium text-indigo-300">
                {member.userId.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium text-white">{member.userId}</div>
                <div className="text-xs text-neutral-400">{ROLE_LABELS[member.role]}</div>
              </div>
            </div>
            {member.userId === project.ownerId && (
              <span className="rounded-full bg-indigo-500/20 px-2 py-1 text-xs font-medium uppercase tracking-wider text-indigo-300">
                Владелец
              </span>
            )}
          </div>
        ))}
      </div>
    </ContentBlock>
  );
}

