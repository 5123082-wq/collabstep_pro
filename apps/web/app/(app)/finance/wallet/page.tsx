import AppSection from '@/components/app/AppSection';

export default function FinanceWalletPage() {
  return (
    <AppSection
      title="Кошелёк"
      description="Управление балансом и внутренними расчётами."
      access="finance"
      actions={[
        { label: 'Пополнить баланс', message: 'TODO: Пополнить баланс' },
        { label: 'Выплатить вознаграждение', message: 'TODO: Выплатить вознаграждение' }
      ]}
    />
  );
}
