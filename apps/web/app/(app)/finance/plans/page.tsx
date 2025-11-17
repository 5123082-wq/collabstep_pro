import AppSection from '@/components/app/AppSection';

export default function FinancePlansPage() {
  return (
    <AppSection
      title="Тарифы и планы"
      description="Выбирайте и настраивайте тарифы для команды и клиентов."
      access="finance"
      actions={[
        { label: 'Обновить тариф', message: 'TODO: Обновить тариф' },
        { label: 'Согласовать контракт', message: 'TODO: Согласовать контракт' }
      ]}
    />
  );
}
