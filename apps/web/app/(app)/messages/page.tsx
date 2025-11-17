import AppSection from '@/components/app/AppSection';

export default function MessagesPage() {
  return (
    <AppSection
      title="Сообщения"
      description="Все диалоги и групповые чаты в одном интерфейсе."
      actions={[
        { label: 'Начать чат', message: 'TODO: Начать чат' },
        { label: 'Создать группу', message: 'TODO: Создать группу' }
      ]}
    />
  );
}
