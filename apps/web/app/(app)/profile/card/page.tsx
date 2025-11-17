import AppSection from '@/components/app/AppSection';

export default function ProfileCardPage() {
  return (
    <AppSection
      title="Профиль-лендинг"
      description="Создайте публичную карточку с портфолио и контактами."
      actions={[
        { label: 'Настроить лендинг', message: 'TODO: Настроить лендинг' },
        { label: 'Сгенерировать ссылку', message: 'TODO: Сгенерировать ссылку' }
      ]}
    />
  );
}
