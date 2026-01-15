'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/lib/ui/toast';

type PerformerReviewFormProps = {
  performerId: string;
  onSubmitted?: () => void;
};

type MessageState = { type: 'success' | 'error'; text: string } | null;

export function PerformerReviewForm({ performerId, onSubmitted }: PerformerReviewFormProps) {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [projectId, setProjectId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const trimmedReview = review.trim();
    const trimmedProject = projectId.trim();
    const payload = {
      rating,
      ...(trimmedReview ? { review: trimmedReview } : {}),
      ...(trimmedProject ? { projectId: trimmedProject } : {})
    };

    try {
      const response = await fetch(`/api/performers/${performerId}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const details = data?.error ?? 'Не удалось отправить отзыв';
        throw new Error(details);
      }

      setMessage({ type: 'success', text: 'Спасибо за отзыв!' });
      setReview('');
      setProjectId('');
      setRating(5);
      toast('Отзыв отправлен', 'success');
      onSubmitted?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка отправки отзыва';
      setMessage({ type: 'error', text: errorMessage });
      toast(errorMessage, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <label className="flex flex-col gap-2 text-sm text-neutral-300">
        <span>Оценка</span>
        <select
          value={rating}
          onChange={(event) => setRating(Number(event.target.value))}
          className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
        >
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value} ★
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2 text-sm text-neutral-300">
        <span>Комментарий</span>
        <Textarea
          value={review}
          onChange={(event) => setReview(event.target.value)}
          rows={4}
          placeholder="Что понравилось в работе?"
          className="rounded-xl border border-neutral-800 bg-neutral-900/70 text-neutral-100"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm text-neutral-300">
        <span>Проект (опционально)</span>
        <Input
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          placeholder="ID проекта или ссылка"
          className="rounded-xl border border-neutral-800 bg-neutral-900/70 text-neutral-100"
        />
      </label>

      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting} disabled={isSubmitting || !performerId}>
          Отправить отзыв
        </Button>
      </div>
    </form>
  );
}
