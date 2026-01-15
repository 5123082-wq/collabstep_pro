'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/lib/ui/toast';

type ResponseFormProps = {
  vacancyId: string;
  onSuccess?: () => void;
};

export function ResponseForm({ vacancyId, onSuccess }: ResponseFormProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!vacancyId) {
      return;
    }

    setIsSubmitting(true);

    const trimmedMessage = message.trim();
    const payload = trimmedMessage ? { message: trimmedMessage } : {};

    try {
      const response = await fetch(`/api/vacancies/${vacancyId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const errorMessage = data?.error ?? 'Не удалось отправить отклик';
        throw new Error(errorMessage);
      }

      setMessage('');
      toast('Отклик отправлен', 'success');
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка отправки отклика';
      toast(errorMessage, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="flex flex-col gap-2 text-sm text-neutral-300">
        <span>Комментарий</span>
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
          className="rounded-xl border border-neutral-800 bg-neutral-900/70 text-neutral-100"
          placeholder="Опишите опыт и подход к задаче"
        />
      </label>
      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
          Отправить отклик
        </Button>
      </div>
    </form>
  );
}
