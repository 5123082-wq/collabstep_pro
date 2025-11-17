'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check, Mail } from 'lucide-react';
import { ContentBlock } from '@/components/ui/content-block';
import { toast } from '@/lib/ui/toast';
import { trackEvent } from '@/lib/telemetry';

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

export default function ProjectInviteModal({
  projectId,
  projectName,
  isOpen,
  onClose,
  onSuccess
}: ProjectInviteModalProps) {
  const [inviteLink, setInviteLink] = useState<InviteLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'MEMBER' | 'ADMIN' | 'CONTRACTOR' | 'GUEST'>('MEMBER');

  useEffect(() => {
    if (!isOpen) {
      setInviteLink(null);
      setEmail('');
      setRole('MEMBER');
      setCopied(false);
    }
  }, [isOpen]);

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
  }, [onClose, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleCreateInviteLink = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/pm/projects/${projectId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          maxUses: 10,
          email: email.trim() || undefined,
          role: role
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create invite link' }));
        
        if (response.status === 403) {
          toast('Недостаточно прав для создания приглашения. Только владелец или администратор проекта могут приглашать участников.', 'error');
        } else if (response.status === 401) {
          toast('Необходимо войти в систему', 'error');
        } else {
          throw new Error(error.error || 'Failed to create invite link');
        }
        return;
      }

      const data = await response.json();
      setInviteLink(data.inviteLink);

      trackEvent('pm_invite_link_created', {
        workspaceId: 'current',
        projectId: projectId,
        userId: 'current',
        source: 'quick_actions'
      });

      toast('Инвайт-ссылка создана', 'success');
    } catch (error) {
      console.error('Failed to create invite link:', error);
      if (error instanceof Error && !error.message.includes('Недостаточно прав')) {
        toast('Не удалось создать инвайт-ссылку', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!inviteLink) return;

    const fullLink = `${window.location.origin}/pm/projects/${projectId}/join?token=${inviteLink.token}`;
    navigator.clipboard.writeText(fullLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast('Ссылка скопирована в буфер обмена', 'success');
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

  const ROLE_LABELS: Record<string, string> = {
    MEMBER: 'Участник',
    ADMIN: 'Администратор',
    CONTRACTOR: 'Подрядчик',
    GUEST: 'Гость'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <ContentBlock as="div" className="w-full max-w-md p-6 shadow-2xl" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Пригласить в проект</h2>
            <p className="text-sm text-neutral-400 mt-1">{projectName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300 transition hover:border-neutral-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!inviteLink ? (
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateInviteLink();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="invite-email" className="text-sm font-medium text-neutral-200">
                Email (необязательно)
              </label>
              <input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
                placeholder="team@company.com"
              />
              <p className="text-xs text-neutral-500">
                Если указан email, приглашение будет отправлено на почту. Иначе создастся инвайт-ссылка.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="invite-role" className="text-sm font-medium text-neutral-200">
                Роль
              </label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value as typeof role)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="MEMBER">Участник</option>
                <option value="ADMIN">Администратор</option>
                <option value="CONTRACTOR">Подрядчик</option>
                <option value="GUEST">Гость</option>
              </select>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Создание...' : 'Создать приглашение'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-indigo-300 flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  Инвайт-ссылка создана
                </span>
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <span>Истекает: {formatExpiresAt(inviteLink.expiresAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <code className="flex-1 rounded-lg bg-neutral-900/50 px-3 py-2 text-xs text-neutral-300 break-all">
                  {window.location.origin}/pm/projects/{projectId}/join?token={inviteLink.token}
                </code>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-xs text-white transition hover:border-indigo-500/40 whitespace-nowrap"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Скопировано' : 'Копировать'}
                </button>
              </div>
              <div className="flex items-center gap-4 text-xs text-neutral-400">
                <span>Роль: {ROLE_LABELS[role]}</span>
                <span>Использований: {inviteLink.uses}</span>
                {inviteLink.maxUses && <span>Максимум: {inviteLink.maxUses}</span>}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setInviteLink(null);
                  setEmail('');
                }}
                className="flex-1 rounded-xl border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800"
              >
                Создать еще
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSuccess?.();
                }}
                className="flex-1 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
              >
                Готово
              </button>
            </div>
          </div>
        )}
      </ContentBlock>
    </div>
  );
}

