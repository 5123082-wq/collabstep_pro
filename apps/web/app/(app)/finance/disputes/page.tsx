import AppSection from '@/components/app/AppSection';

export default function FinanceDisputesPage() {
  return (
    <AppSection
      title="Споры и эскалации"
      description="Управляйте спорными ситуациями и взаимодействием с арбитражем."
      access="finance"
      actions={[
        { label: 'Открыть спор', message: 'TODO: Открыть спор' },
        { label: 'Назначить арбитра', message: 'TODO: Назначить арбитра' }
      ]}
    />
  );
}
