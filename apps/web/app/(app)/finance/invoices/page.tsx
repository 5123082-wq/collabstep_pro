import AppSection from '@/components/app/AppSection';

export default function FinanceInvoicesPage() {
  return (
    <AppSection
      title="Счета"
      description="Формируйте и отправляйте счета подрядчикам и клиентам."
      access="finance"
      actions={[
        { label: 'Создать счёт', message: 'TODO: Создать счёт' },
        { label: 'Отправить напоминание', message: 'TODO: Напомнить об оплате' }
      ]}
    />
  );
}
