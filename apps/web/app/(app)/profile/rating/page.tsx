import AppSection from '@/components/app/AppSection';

export default function ProfileRatingPage() {
  return (
    <AppSection
      title="Рейтинг"
      description="Следите за динамикой рейтинга и отзывами коллег."
      actions={[
        { label: 'Запросить отзыв', message: 'TODO: Запросить отзыв' },
        { label: 'Поделиться достижением', message: 'TODO: Поделиться достижением' }
      ]}
    />
  );
}
