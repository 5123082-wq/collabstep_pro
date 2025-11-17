import AppSection from '@/components/app/AppSection';

export default function ProfilePage() {
  return (
    <AppSection
      title="Профиль"
      description="Управляйте своим публичным профилем и видимостью."
      actions={[
        { label: 'Редактировать профиль', message: 'TODO: Редактировать профиль' },
        { label: 'Скопировать ссылку', message: 'TODO: Скопировать ссылку' }
      ]}
    />
  );
}
