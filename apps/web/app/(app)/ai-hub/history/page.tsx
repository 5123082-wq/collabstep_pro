import AppSection from '@/components/app/AppSection';

export default function AiHistoryPage() {
  return (
    <AppSection
      title="История AI"
      description="Просматривайте историю запросов и повторно запускайте сессии."
      actions={[
        { label: 'Повторить сессию', message: 'TODO: Повторить сессию' },
        { label: 'Экспорт в Notion', message: 'TODO: Экспорт в Notion' }
      ]}
    />
  );
}
