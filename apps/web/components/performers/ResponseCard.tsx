'use client';

import { Button } from '@/components/ui/button';
import { toast } from '@/lib/ui/toast';

type ResponseStatus = 'pending' | 'accepted' | 'rejected';

type ResponseCardProps = {
  response: {
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
  onStatusChange?: (id: string, status: ResponseStatus) => void;
};

const STATUS_LABEL: Record<ResponseStatus, string> = {
  pending: 'Ожидает решения',
  accepted: 'Принят',
  rejected: 'Отклонен'
};

const STATUS_STYLE: Record<ResponseStatus, string> = {
  pending: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  accepted: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  rejected: 'border-rose-500/30 bg-rose-500/10 text-rose-200'
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function ResponseCard({ response, onStatusChange }: ResponseCardProps) {
  const showActions = response.status === 'pending' && (typeof onStatusChange === 'function');

  const handleUpdateStatus = async (status: ResponseStatus) => {
    try {
      const request = await fetch(`/api/responses/${response.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!request.ok) {
        const data = await request.json().catch(() => null);
        const errorMessage = data?.error ?? 'Не удалось обновить статус';
        throw new Error(errorMessage);
      }

      onStatusChange?.(response.id, status);
      toast('Статус обновлен', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка обновления статуса';
      toast(errorMessage, 'warning');
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-900 bg-neutral-950/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-neutral-100">
            {response.performerName ?? response.performerHandle ?? response.performerId}
          </p>
          {response.performerHandle ? (
            <p className="text-xs text-neutral-500">@{response.performerHandle}</p>
          ) : null}
          {response.vacancyTitle ? (
            <p className="mt-2 text-xs text-neutral-500">
              Вакансия: <span className="text-neutral-300">{response.vacancyTitle}</span>
            </p>
          ) : null}
          {response.vacancyProject ? (
            <p className="text-xs text-neutral-600">Организация: {response.vacancyProject}</p>
          ) : null}
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs ${STATUS_STYLE[response.status]}`}>
          {STATUS_LABEL[response.status]}
        </span>
      </div>

      {response.message ? (
        <p className="mt-3 text-sm text-neutral-300">{response.message}</p>
      ) : (
        <p className="mt-3 text-sm text-neutral-500">Сообщение не указано.</p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-neutral-500">{formatDate(response.createdAt)}</span>
        {showActions ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleUpdateStatus('accepted')}
              disabled={response.status === 'accepted'}
            >
              Принять
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleUpdateStatus('rejected')}
              disabled={response.status === 'rejected'}
            >
              Отклонить
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
