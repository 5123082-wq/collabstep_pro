import AppSection from '@/components/app/AppSection';

export default function CommunityRatingPage() {
  return (
    <AppSection
      title="Рейтинг сообщества"
      description="Прозрачные метрики вклада и достижения участников."
      actions={[
        { label: 'Запросить отзыв', message: 'TODO: Запросить отзыв' },
        { label: 'Отправить благодарность', message: 'TODO: Отправить благодарность' }
      ]}
    />
  );
}
