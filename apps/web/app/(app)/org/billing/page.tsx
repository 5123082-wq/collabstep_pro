import AppSection from '@/components/app/AppSection';

export default function OrgBillingPage() {
  return (
    <AppSection
      title="Биллинг организации"
      description="Управляйте подписками, лимитами и юридическими реквизитами."
      actions={[
        { label: 'Обновить реквизиты', message: 'TODO: Обновить реквизиты' },
        { label: 'Отправить счёт', message: 'TODO: Отправить счёт организации' }
      ]}
    />
  );
}
