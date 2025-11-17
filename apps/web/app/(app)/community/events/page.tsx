import AppSection from '@/components/app/AppSection';

export default function CommunityEventsPage() {
  return (
    <AppSection
      title="События"
      description="Планируйте митапы, вебинары и AMA-сессии."
      actions={[
        { label: 'Создать событие', message: 'TODO: Создать событие' },
        { label: 'Записаться', message: 'TODO: Записаться на событие' }
      ]}
    />
  );
}
