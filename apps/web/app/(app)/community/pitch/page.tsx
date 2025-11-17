import AppSection from '@/components/app/AppSection';

export default function CommunityPitchPage() {
  return (
    <AppSection
      title="Питч дня"
      description="Расскажите о продукте, получите обратную связь и поддержку сообщества."
      actions={[
        { label: 'Опубликовать питч', message: 'TODO: Опубликовать питч' },
        { label: 'Запросить ревью', message: 'TODO: Запросить ревью' }
      ]}
    />
  );
}
