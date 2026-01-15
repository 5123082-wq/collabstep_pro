'use client';

import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

type ReviewItem = {
  id: string;
  rating: number;
  review: string | null;
  createdAt: string;
  raterName: string | null;
  projectId: string | null;
};

type PerformerRatingProps = {
  average: number;
  count: number;
  reviews: ReviewItem[];
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function PerformerRating({ average, count, reviews }: PerformerRatingProps) {
  const visibleReviews = reviews.filter((review) => review.review && review.review.trim().length > 0);

  return (
    <ContentBlock
      as="section"
      header={
        <ContentBlockTitle
          as="h2"
          description={count > 0 ? `Всего отзывов: ${count}` : 'Пока нет отзывов'}
        >
          Рейтинг исполнителя
        </ContentBlockTitle>
      }
    >
      <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-200">
        <span className="text-2xl font-semibold">{average.toFixed(1)}</span>
        <span className="text-sm text-neutral-400">★</span>
        <span className="text-xs text-neutral-500">{count > 0 ? 'Средняя оценка' : 'Нет оценок'}</span>
      </div>

      {visibleReviews.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-400">Отзывы появятся после завершения первых проектов.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {visibleReviews.map((review) => (
            <div key={review.id} className="rounded-2xl border border-neutral-900 bg-neutral-950/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-neutral-200">
                  <span className="font-semibold">{review.raterName ?? 'Клиент'}</span>
                  {review.projectId ? (
                    <span className="ml-2 text-xs text-neutral-500">Проект: {review.projectId}</span>
                  ) : null}
                </div>
                <div className="text-sm text-neutral-300">★ {review.rating.toFixed(1)}</div>
              </div>
              <p className="mt-2 text-sm text-neutral-300">{review.review}</p>
              <p className="mt-2 text-xs text-neutral-500">{formatDate(review.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </ContentBlock>
  );
}
