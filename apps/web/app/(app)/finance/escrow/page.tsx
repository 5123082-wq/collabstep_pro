import AppSection from '@/components/app/AppSection';

export default function FinanceEscrowPage() {
  return (
    <AppSection
      title="Эскроу"
      description="Безопасные расчёты и контроль этапов выполнения."
      access="finance"
      actions={[
        { label: 'Открыть эскроу', message: 'TODO: Открыть эскроу' },
        { label: 'Запросить отчёт', message: 'TODO: Запросить отчёт' }
      ]}
    />
  );
}
