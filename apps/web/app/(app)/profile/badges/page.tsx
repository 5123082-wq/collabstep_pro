import AppSection from '@/components/app/AppSection';

export default function ProfileBadgesPage() {
  return (
    <AppSection
      title="Бейджи"
      description="Собирайте и отображайте достижения внутри сообщества."
      actions={[
        { label: 'Запросить бейдж', message: 'TODO: Запросить бейдж' },
        { label: 'Скрыть бейдж', message: 'TODO: Скрыть бейдж' }
      ]}
    />
  );
}
