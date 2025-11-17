import AppSection from '@/components/app/AppSection';

export default function CommunityRoomsPage() {
  return (
    <AppSection
      title="Комнаты сообщества"
      description="Создавайте тематические комнаты и подключайте менторов."
      actions={[
        { label: 'Создать комнату', message: 'TODO: Создать комнату' },
        { label: 'Пригласить участников', message: 'TODO: Пригласить участников' }
      ]}
    />
  );
}
