'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface InvitePreview {
  name: string;
  description: string;
  stage: string;
  inviteStatus: string;
}

export function ProjectInviteLandingClient({ token }: { token: string }) {
  const router = useRouter();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/invites/${token}`)
      .then(res => {
        if (!res.ok) throw new Error('Приглашение не найдено или истекло');
        return res.json();
      })
      .then(data => setPreview(data.preview))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const res = await fetch(`/api/projects/invites/${token}/accept`, { method: 'POST' });
      
      if (res.status === 401) {
        // Redirect to login with callback
        const callbackUrl = encodeURIComponent(window.location.href);
        window.location.href = `/login?callbackUrl=${callbackUrl}`;
        return;
      }
      
      if (!res.ok) {
        throw new Error('Не удалось принять приглашение');
      }
      
      const data = await res.json();
      
      // Success - redirect to project if returned, or dashboard
      if (data.projectId) {
        router.push(`/pm/projects/${data.projectId}`);
      } else {
        router.push('/pm/projects');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка при принятии приглашения');
      setIsAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[color:var(--surface-base)]">
        <div className="text-[color:var(--text-secondary)]">Загрузка информации о проекте...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[color:var(--surface-base)]">
        <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
          <h3 className="text-lg font-semibold">Ошибка</h3>
          <p className="mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!preview) return null;

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-[color:var(--surface-base)] p-4">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-popover)] p-8 shadow-xl">
        <div className="text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">
            Вас приглашают в проект
          </h2>
          <div className="mt-6 space-y-4">
            <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-2xl font-bold text-indigo-500">
                    {preview.name.charAt(0).toUpperCase()}
                </div>
            </div>
            <h3 className="text-2xl font-bold text-[color:var(--text-primary)]">{preview.name}</h3>
            {preview.description && (
                <p className="text-[color:var(--text-secondary)]">{preview.description}</p>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-[color:var(--surface-muted)] p-4 text-center text-sm text-[color:var(--text-secondary)]">
            Стадия проекта: <span className="font-medium text-[color:var(--text-primary)]">{preview.stage || 'Не указана'}</span>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Button onClick={handleAccept} disabled={isAccepting} size="lg" className="w-full">
            {isAccepting ? 'Обработка...' : 'Принять приглашение'}
          </Button>
          <p className="text-center text-xs text-[color:var(--text-tertiary)]">
            Нажимаете «Принять», вы соглашаетесь с правилами платформы
          </p>
        </div>
      </div>
    </div>
  );
}

