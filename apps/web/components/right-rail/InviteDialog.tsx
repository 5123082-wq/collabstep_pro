'use client';

import { useEffect, useState } from 'react';
import { ContentBlock } from '@/components/ui/content-block';
import { toast } from '@/lib/ui/toast';
import { useUI } from '@/stores/ui';

export default function InviteDialog() {
  const dialog = useUI((state) => state.dialog);
  const closeDialog = useUI((state) => state.closeDialog);
  const isOpen = dialog === 'invite';
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');

  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setRole('editor');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDialog();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [closeDialog, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast('Укажите email для приглашения');
      return;
    }
    toast(`Приглашение отправлено на ${trimmed}`);
    closeDialog();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 backdrop-blur-sm">
      <ContentBlock as="div" className="w-full max-w-md p-6 shadow-2xl" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-50">Пригласить участника</h2>
            <p className="text-sm text-neutral-400">Отправьте приглашение с ролью и доступом к проекту.</p>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300 transition hover:border-neutral-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            Esc
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="invite-email" className="text-sm font-medium text-neutral-200">
              Email
            </label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
              placeholder="team@company.com"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="invite-role" className="text-sm font-medium text-neutral-200">
              Роль
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
            >
              <option value="owner">Владелец</option>
              <option value="editor">Редактор</option>
              <option value="viewer">Наблюдатель</option>
            </select>
          </div>
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Дополнительно</span>
            <label className="flex items-center gap-3 text-sm text-neutral-300">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border border-neutral-700 bg-neutral-900 text-indigo-500 focus:ring-2 focus:ring-indigo-400" />
              Отправить приветственное письмо
            </label>
          </div>
          <div className="pt-2">
            <button
              type="submit"
              className="w-full rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
            >
              Отправить приглашение
            </button>
          </div>
        </form>
      </ContentBlock>
    </div>
  );
}

