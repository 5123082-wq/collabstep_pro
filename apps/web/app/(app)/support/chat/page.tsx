import AppSection from '@/components/app/AppSection';

export default function SupportChatPage() {
  return (
    <AppSection
      title="Чат поддержки"
      description="Быстрые ответы от команды Customer Success."
      actions={[
        { label: 'Начать чат', message: 'TODO: Начать чат с поддержкой' },
        { label: 'Поделиться логами', message: 'TODO: Поделиться логами' }
      ]}
    />
  );
}
