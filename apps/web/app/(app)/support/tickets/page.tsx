import AppSection from '@/components/app/AppSection';

export default function SupportTicketsPage() {
  return (
    <AppSection
      title="Тикеты"
      description="Отслеживайте обращения команды и SLA по их обработке."
      actions={[
        { label: 'Создать тикет', message: 'TODO: Создать тикет' },
        { label: 'Назначить ответственного', message: 'TODO: Назначить ответственного' }
      ]}
    />
  );
}
